import {
  hasItemCommitmentIssued,
  resolveDemandYear,
  type DemandWithClassProductsRow,
} from '~/composables/useDemandReports'
import { getItemDisputeResult } from '~/utils/bids'
import type { DemandTermsItem } from '~/utils/demandTermsOfReferenceTable'
import { formatCurrency } from '~/utils/formatters'
import { escapeHtml } from '~/utils/reportHtml'

export interface DemandClassBalanceRow {
  classId: string
  className: string
  itemsCount: number
  ceilingAmount: number
  committedInOtherDemands: number
  currentDemandAmount: number
  remainingBalance: number
  isExceeded: boolean
}

export interface DemandClassBalanceTableOptions {
  includeItemsCount?: boolean
  includeTotalsFooter?: boolean
}

export interface BuildDemandClassBalanceRowsParams {
  currentDemandId?: string | null
  currentItems: DemandTermsItem[] | null | undefined
  allDemands?: DemandWithClassProductsRow[] | null
  year: number
  ceilingAmount: number
}

function resolveItemClassInfo(item: {
  product?: {
    product_class_id?: string | null
    product_classes?: { id: string; name: string } | null
  } | null
}): { classId: string; className: string } {
  const rawClassId =
    item.product?.product_classes?.id || item.product?.product_class_id || 'SEM_CLASSE'
  const classId = String(rawClassId).trim() || 'SEM_CLASSE'
  const rawClassName = item.product?.product_classes?.name || 'Sem Classe Vinculada'
  const className = String(rawClassName).trim() || 'Sem Classe Vinculada'
  return { classId, className }
}

/**
 * Formata a descrição da classe incluindo o código (ex.: "7530 - Papelaria e Papel").
 */
export function formatClassBalanceLabel(
  row: Pick<DemandClassBalanceRow, 'classId' | 'className'>,
): string {
  if (!row.classId || row.classId === 'SEM_CLASSE') {
    return row.className || 'Sem Classe Vinculada'
  }
  if (row.className && row.className !== row.classId) {
    return `${row.classId} - ${row.className}`
  }
  return row.classId
}

/**
 * Calcula as linhas de saldo por classe para as classes presentes nos itens da demanda atual,
 * cruzando com o total já empenhado em outras demandas do mesmo exercício e com o teto anual.
 */
export function buildDemandClassBalanceRows(
  params: BuildDemandClassBalanceRowsParams,
): DemandClassBalanceRow[] {
  const { currentDemandId, currentItems, allDemands, year, ceilingAmount } = params
  const items = currentItems || []
  if (items.length === 0) return []

  const normalizedCeiling = Number(Number(ceilingAmount || 0).toFixed(2))

  // 1. Agrupar as classes presentes na demanda atual
  const currentClassMap = new Map<
    string,
    {
      classId: string
      className: string
      itemsCount: number
      currentDemandAmount: number
    }
  >()

  for (const item of items) {
    const { classId, className } = resolveItemClassInfo(item)
    const quantity = Number(item.quantity) || 0
    const unitPrice = Number(item.reference_price) || 0
    const itemTotal = quantity * unitPrice

    const existing = currentClassMap.get(classId)
    if (existing) {
      existing.itemsCount += 1
      existing.currentDemandAmount += itemTotal
    } else {
      currentClassMap.set(classId, {
        classId,
        className,
        itemsCount: 1,
        currentDemandAmount: itemTotal,
      })
    }
  }

  // 2. Calcular o total já empenhado em OUTRAS demandas ativas do mesmo ano para essas classes
  const committedByClassMap = new Map<string, number>()

  for (const demand of allDemands || []) {
    if (demand.deleted_at || demand.status === 'cancelled') continue
    if (currentDemandId && demand.id === currentDemandId) continue
    if (resolveDemandYear(demand) !== year) continue

    const demandItems = demand.demand_products || []
    for (const demandItem of demandItems) {
      if (!hasItemCommitmentIssued(demandItem)) continue

      const { classId } = resolveItemClassInfo(demandItem)
      if (!currentClassMap.has(classId)) continue

      const disputeRes = getItemDisputeResult(demandItem)
      if (
        disputeRes.outcome !== 'winner' ||
        disputeRes.totalFinal == null ||
        disputeRes.totalFinal <= 0
      ) {
        continue
      }

      const itemFinal = Number(disputeRes.totalFinal.toFixed(2))
      committedByClassMap.set(classId, (committedByClassMap.get(classId) || 0) + itemFinal)
    }
  }

  // 3. Montar e ordenar as linhas consolidadas
  return Array.from(currentClassMap.values())
    .map((entry) => {
      const committedInOtherDemands = Number(
        (committedByClassMap.get(entry.classId) || 0).toFixed(2),
      )
      const currentDemandAmount = Number(entry.currentDemandAmount.toFixed(2))
      const remainingBalance = Number(
        (normalizedCeiling - committedInOtherDemands - currentDemandAmount).toFixed(2),
      )

      return {
        classId: entry.classId,
        className: entry.className,
        itemsCount: entry.itemsCount,
        ceilingAmount: normalizedCeiling,
        committedInOtherDemands,
        currentDemandAmount,
        remainingBalance,
        isExceeded: remainingBalance < 0,
      }
    })
    .sort((a, b) =>
      formatClassBalanceLabel(a).localeCompare(formatClassBalanceLabel(b), 'pt-BR', {
        numeric: true,
      }),
    )
}

/**
 * Gera tabela HTML de Saldo por Classe compatível com CKEditor / compras.gov.br / SEI
 */
export function generateDemandClassBalanceTableHtml(
  rows: DemandClassBalanceRow[],
  year: number,
  options: DemandClassBalanceTableOptions = {},
): string {
  const { includeItemsCount = false, includeTotalsFooter = true } = options

  const tableStyle =
    'width: 100%; max-width: 672px; margin: 0 auto; border-collapse: collapse; font-family: Arial, Helvetica, sans-serif; font-size: 9.5pt; line-height: 1.4; color: #1f2937; border: 1px solid #cbd5e1;'
  const thStyle =
    'border: 1px solid #cbd5e1; padding: 7px 6px; font-weight: bold; background-color: #1e3a5f; color: #ffffff;'
  const tdBaseStyle = 'border: 1px solid #cbd5e1; padding: 6px 7px;'

  let totalCeiling = 0
  let totalCommitted = 0
  let totalCurrentDemand = 0
  let totalRemaining = 0

  const rowsHtml = rows
    .map((row, index) => {
      const itemNumber = index + 1
      const isEven = index % 2 === 1
      const rowBg = isEven ? 'background-color: #f8fafc;' : 'background-color: #ffffff;'

      totalCeiling += row.ceilingAmount
      totalCommitted += row.committedInOtherDemands
      totalCurrentDemand += row.currentDemandAmount
      totalRemaining += row.remainingBalance

      const classDisplayLabel = formatClassBalanceLabel(row)
      const countSuffix = includeItemsCount
        ? ` <span style="font-size: 8.5pt; color: #64748b; font-weight: normal;">(${row.itemsCount} ${row.itemsCount === 1 ? 'item' : 'itens'})</span>`
        : ''

      const balanceColor = row.isExceeded ? '#dc2626' : '#0f172a'

      return `
      <tr style="${rowBg}">
        <td style="${tdBaseStyle} text-align: center; font-weight: bold; vertical-align: middle; width: 32px;">
          ${itemNumber}
        </td>
        <td style="${tdBaseStyle} text-align: left; vertical-align: middle;">
          <span style="font-weight: 600; color: #0f172a;">${escapeHtml(classDisplayLabel)}</span>${countSuffix}
        </td>
        <td style="${tdBaseStyle} text-align: right; white-space: nowrap; vertical-align: middle; width: 115px;">
          ${formatCurrency(row.ceilingAmount)}
        </td>
        <td style="${tdBaseStyle} text-align: right; white-space: nowrap; vertical-align: middle; width: 120px;">
          ${formatCurrency(row.committedInOtherDemands)}
        </td>
        <td style="${tdBaseStyle} text-align: right; white-space: nowrap; font-weight: 600; vertical-align: middle; width: 115px;">
          ${formatCurrency(row.currentDemandAmount)}
        </td>
        <td style="${tdBaseStyle} text-align: right; white-space: nowrap; font-weight: 700; color: ${balanceColor}; vertical-align: middle; width: 115px;">
          ${formatCurrency(row.remainingBalance)}
        </td>
      </tr>`
    })
    .join('')

  const footerBalanceColor = totalRemaining < 0 ? '#dc2626' : '#1e3a5f'
  const footerHtml = includeTotalsFooter
    ? `
    <tfoot>
      <tr style="background-color: #f1f5f9; font-weight: bold; border-top: 2px solid #cbd5e1;">
        <td colspan="2" style="${tdBaseStyle} text-align: right; font-size: 9.5pt; color: #0f172a; padding: 8px 10px;">
          Totais Consolidados (${rows.length} ${rows.length === 1 ? 'classe' : 'classes'}):
        </td>
        <td style="${tdBaseStyle} text-align: right; font-size: 9.5pt; color: #334155; padding: 8px 7px; white-space: nowrap;">
          ${formatCurrency(totalCeiling)}
        </td>
        <td style="${tdBaseStyle} text-align: right; font-size: 9.5pt; color: #334155; padding: 8px 7px; white-space: nowrap;">
          ${formatCurrency(totalCommitted)}
        </td>
        <td style="${tdBaseStyle} text-align: right; font-size: 9.5pt; color: #1e3a5f; padding: 8px 7px; white-space: nowrap;">
          ${formatCurrency(totalCurrentDemand)}
        </td>
        <td style="${tdBaseStyle} text-align: right; font-size: 9.5pt; color: ${footerBalanceColor}; padding: 8px 7px; white-space: nowrap;">
          ${formatCurrency(totalRemaining)}
        </td>
      </tr>
    </tfoot>`
    : ''

  return `<table style="${tableStyle}">
  <thead>
    <tr>
      <th style="${thStyle} text-align: center; width: 32px;">#</th>
      <th style="${thStyle} text-align: left;">Classe de Materiais</th>
      <th style="${thStyle} text-align: right; width: 115px;">Teto Anual (${year})</th>
      <th style="${thStyle} text-align: right; width: 120px;">Já Empenhado (Outras Demandas)</th>
      <th style="${thStyle} text-align: right; width: 115px;">Valor Nesta Demanda</th>
      <th style="${thStyle} text-align: right; width: 115px;">Saldo Restante</th>
    </tr>
  </thead>
  <tbody>
    ${rowsHtml}
  </tbody>
  ${footerHtml}
</table>`
}

/**
 * Gera versão em texto simples tabulado para fallback na área de transferência
 */
export function generateDemandClassBalanceTableText(
  rows: DemandClassBalanceRow[],
  year: number,
  options: DemandClassBalanceTableOptions = {},
): string {
  const { includeItemsCount = false, includeTotalsFooter = true } = options

  const headers = [
    '#',
    'Classe de Materiais',
    `Teto Anual (${year})`,
    'Já Empenhado (Outras Demandas)',
    'Valor Nesta Demanda',
    'Saldo Restante',
  ]

  let totalCeiling = 0
  let totalCommitted = 0
  let totalCurrentDemand = 0
  let totalRemaining = 0

  const lines: string[] = [headers.join('\t')]

  rows.forEach((row, index) => {
    totalCeiling += row.ceilingAmount
    totalCommitted += row.committedInOtherDemands
    totalCurrentDemand += row.currentDemandAmount
    totalRemaining += row.remainingBalance

    const baseClassLabel = formatClassBalanceLabel(row)
    const classLabel = includeItemsCount
      ? `${baseClassLabel} (${row.itemsCount} ${row.itemsCount === 1 ? 'item' : 'itens'})`
      : baseClassLabel

    lines.push(
      [
        String(index + 1),
        classLabel,
        formatCurrency(row.ceilingAmount),
        formatCurrency(row.committedInOtherDemands),
        formatCurrency(row.currentDemandAmount),
        formatCurrency(row.remainingBalance),
      ].join('\t'),
    )
  })

  if (includeTotalsFooter && rows.length > 0) {
    lines.push(
      [
        '',
        `Totais Consolidados (${rows.length} ${rows.length === 1 ? 'classe' : 'classes'}):`,
        formatCurrency(totalCeiling),
        formatCurrency(totalCommitted),
        formatCurrency(totalCurrentDemand),
        formatCurrency(totalRemaining),
      ].join('\t'),
    )
  }

  return lines.join('\n')
}
