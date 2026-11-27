import type { Database } from '~/types/database.types'
import { getItemDisputeResult } from '~/utils/bids'

export type DemandModality = Database['public']['Enums']['demand_modality']

export interface DemandModalityOption {
  title: string
  value: DemandModality
  disabled?: boolean
  props?: {
    disabled?: boolean
    subtitle?: string
  }
}

export interface ClassCeilingCheckItem {
  id?: string
  quantity?: number | string | null
  reference_price?: number | string | null
  product_name_snapshot?: string | null
  product?: {
    id?: string | null
    name?: string | null
    product_class_id?: string | null
    product_classes?: { id: string; name: string } | null
  } | null
  demand_product_bids?: Parameters<typeof getItemDisputeResult>[0]['demand_product_bids']
}

export interface ExceedingProductClassSummary {
  classId: string
  className: string
  label: string
  itemsCount: number
  totalAmount: number
  itemNames: string[]
}

export interface DemandClassCeilingCheckResult {
  isExceeded: boolean
  ceilingAmount: number
  maxClassTotal: number
  exceedingClasses: ExceedingProductClassSummary[]
}

/**
 * Resolves the effective total amount of a demand item:
 * 1. Primary: `quantity * reference_price` (when reference_price > 0)
 * 2. Fallback: winning bid total amount (when reference_price is not set)
 */
export function resolveDemandItemEffectiveTotal(item: ClassCeilingCheckItem): number {
  const qty = Number(item.quantity) || 0
  const refPrice = Number(item.reference_price) || 0
  if (qty > 0 && refPrice > 0) {
    return Number((qty * refPrice).toFixed(2))
  }

  if (item.demand_product_bids && item.demand_product_bids.length > 0) {
    const dispute = getItemDisputeResult({
      quantity: qty,
      reference_price: item.reference_price ?? null,
      demand_product_bids: item.demand_product_bids,
    })
    if (dispute.outcome === 'winner' && dispute.totalFinal != null && dispute.totalFinal > 0) {
      return Number(dispute.totalFinal.toFixed(2))
    }
  }

  return 0
}

/**
 * Checks whether the sum of items of the same product class in a demand
 * exceeds the configured annual ceiling per product class.
 */
export function checkDemandClassExceedsAnnualCeiling(
  items: ClassCeilingCheckItem[] | null | undefined,
  ceilingAmount: number,
): DemandClassCeilingCheckResult {
  const normalizedCeiling = Number(Number(ceilingAmount || 0).toFixed(2))
  if (!items || items.length === 0 || normalizedCeiling <= 0) {
    return {
      isExceeded: false,
      ceilingAmount: normalizedCeiling,
      maxClassTotal: 0,
      exceedingClasses: [],
    }
  }

  const classTotalsMap = new Map<
    string,
    {
      classId: string
      className: string
      label: string
      itemsCount: number
      totalAmount: number
      itemNames: string[]
    }
  >()

  items.forEach((item, idx) => {
    const itemTotal = resolveDemandItemEffectiveTotal(item)
    if (itemTotal <= 0) return

    const itemName =
      item.product_name_snapshot?.trim() || item.product?.name?.trim() || `Item #${idx + 1}`

    const rawClassId =
      item.product?.product_classes?.id?.trim() || item.product?.product_class_id?.trim() || ''
    const rawClassName = item.product?.product_classes?.name?.trim() || ''

    // Group items that share the same product_class_id; keep unclassed items isolated per item
    const groupKey = rawClassId || `__UNCLASSED_${item.id || idx}`
    const classId = rawClassId || 'SEM_CLASSE'
    const className = rawClassName || (rawClassId ? `Classe ${rawClassId}` : itemName)
    const label =
      rawClassId && rawClassName && rawClassName !== rawClassId
        ? `${rawClassId} - ${rawClassName}`
        : className

    const existing = classTotalsMap.get(groupKey)
    if (existing) {
      existing.itemsCount += 1
      existing.totalAmount = Number((existing.totalAmount + itemTotal).toFixed(2))
      if (!existing.itemNames.includes(itemName)) {
        existing.itemNames.push(itemName)
      }
    } else {
      classTotalsMap.set(groupKey, {
        classId,
        className,
        label,
        itemsCount: 1,
        totalAmount: itemTotal,
        itemNames: [itemName],
      })
    }
  })

  let maxClassTotal = 0
  const exceedingClasses: ExceedingProductClassSummary[] = []

  for (const entry of classTotalsMap.values()) {
    if (entry.totalAmount > maxClassTotal) {
      maxClassTotal = entry.totalAmount
    }
    if (entry.totalAmount > normalizedCeiling) {
      exceedingClasses.push(entry)
    }
  }

  return {
    isExceeded: exceedingClasses.length > 0,
    ceilingAmount: normalizedCeiling,
    maxClassTotal,
    exceedingClasses,
  }
}

/**
 * Builds the options for the Demand Modality `<UiSelect>`, disabling 'dispensation'
 * when the sum of items of any product class exceeds the annual ceiling.
 */
export function buildDemandModalityOptions(
  isDispensationDisabled: boolean = false,
): DemandModalityOption[] {
  return [
    {
      title: isDispensationDisabled
        ? 'Dispensa (Indisponível - Teto por classe excedido)'
        : 'Dispensa',
      value: 'dispensation',
      disabled: isDispensationDisabled,
      props: {
        disabled: isDispensationDisabled,
      },
    },
    {
      title: 'Pregão',
      value: 'bidding',
      disabled: false,
      props: {
        disabled: false,
      },
    },
  ]
}
