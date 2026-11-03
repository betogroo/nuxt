import type { Database } from '~/types/database.types'
import { compareBids, DISQUALIFICATION_REASON_ABOVE_REFERENCE, type BidStatus } from '~/utils/bids'

export type DemandProductBidRow = Database['public']['Tables']['demand_product_bids']['Row']
export type DemandProductBidInsert = Database['public']['Tables']['demand_product_bids']['Insert']
export type { BidStatus }

export interface AddBidOptions {
  referencePrice?: number | string | null
}

export const useProductBids = () => {
  const supabase = useSupabaseClient<Database>()
  const user = useSupabaseUser()
  const { logAction } = useLogger()

  const fetchBidsByProduct = async (demandProductId: string) => {
    const { data, error } = await supabase
      .from('demand_product_bids')
      .select('*, suppliers(*)')
      .eq('demand_product_id', demandProductId)
      .order('amount', { ascending: true })

    if (error) throw error
    return data ? [...data].sort(compareBids) : []
  }

  const addBid = async (
    demandProductId: string,
    supplierIdOrPayload:
      | string
      | {
          supplier_id: string
          amount: number | string
          reference_price?: number | string | null
          [key: string]: unknown
        },
    amountOrOptions?: number | string | AddBidOptions,
    optionsParam?: AddBidOptions,
  ) => {
    let supplier_id: string
    let rawAmount: unknown
    let options: AddBidOptions | undefined

    if (typeof supplierIdOrPayload === 'string') {
      supplier_id = supplierIdOrPayload
      rawAmount = amountOrOptions
      options = optionsParam
    } else {
      supplier_id = supplierIdOrPayload.supplier_id
      rawAmount = supplierIdOrPayload.amount
      options =
        typeof amountOrOptions === 'object' && amountOrOptions !== null
          ? (amountOrOptions as AddBidOptions)
          : optionsParam
      if (!options && 'reference_price' in supplierIdOrPayload) {
        options = {
          referencePrice: supplierIdOrPayload.reference_price as number | string | null,
        }
      }
    }

    const finalAmount = Number(rawAmount)

    let refPrice = options?.referencePrice
    if (refPrice === undefined) {
      try {
        const { data: prod } = await supabase
          .from('demand_products')
          .select('reference_price')
          .eq('id', demandProductId)
          .maybeSingle()
        refPrice = prod?.reference_price ?? null
      } catch {
        refPrice = null
      }
    }

    const numericRefPrice = refPrice != null ? Number(refPrice) : null
    const isAboveReference =
      numericRefPrice !== null &&
      !Number.isNaN(numericRefPrice) &&
      numericRefPrice > 0 &&
      finalAmount > numericRefPrice

    const payload: DemandProductBidInsert = {
      demand_product_id: demandProductId,
      supplier_id,
      amount: finalAmount,
    }

    if (isAboveReference) {
      payload.status = 'disqualified'
      payload.disqualification_reason = DISQUALIFICATION_REASON_ABOVE_REFERENCE
    }

    const { error } = await supabase.from('demand_product_bids').insert(payload)

    if (error) throw error

    const statusSuffix = isAboveReference
      ? ` (DESCLASSIFICADO: ${DISQUALIFICATION_REASON_ABOVE_REFERENCE})`
      : ''

    await logAction(
      'ADD_PRODUCT_BID',
      `Lance de R$ ${finalAmount} adicionado para o produto da demanda (ID: ${demandProductId})${statusSuffix}`,
      user.value?.id,
    )
  }

  const updateBidStatus = async (
    bidId: string,
    status: BidStatus,
    disqualificationReason?: string | null,
  ) => {
    const cleanReason =
      status === 'disqualified' && disqualificationReason?.trim()
        ? disqualificationReason.trim()
        : null

    const { error } = await supabase
      .from('demand_product_bids')
      .update({
        status,
        disqualification_reason: cleanReason,
      })
      .eq('id', bidId)

    if (error) throw error

    const statusLabel = status === 'disqualified' ? 'DESCLASSIFICADO' : 'CLASSIFICADO'
    const reasonSuffix = cleanReason ? ` (Motivo: ${cleanReason})` : ''

    await logAction(
      'UPDATE_PRODUCT_BID_STATUS',
      `Lance (ID: ${bidId}) alterado para ${statusLabel}${reasonSuffix}`,
      user.value?.id,
    )
  }

  const removeBid = async (bidId: string) => {
    const { error } = await supabase.from('demand_product_bids').delete().eq('id', bidId)

    if (error) throw error

    await logAction('REMOVE_PRODUCT_BID', `Lance (ID: ${bidId}) removido`, user.value?.id)
  }

  return {
    fetchBidsByProduct,
    addBid,
    updateBidStatus,
    removeBid,
  }
}
