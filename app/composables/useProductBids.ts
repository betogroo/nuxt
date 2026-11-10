import type { Database } from '~/types/database.types'
import {
  compareBids,
  DISQUALIFICATION_REASON_ABOVE_REFERENCE,
  getItemDisputeResult,
  type BidStatus,
} from '~/utils/bids'

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
      Math.round(finalAmount * 10000) > Math.round(numericRefPrice * 10000)

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

  const syncProductCommitmentIfFailed = async (demandProductId: string) => {
    try {
      const { data: prod } = await supabase
        .from('demand_products')
        .select(
          'id, commitment_number, execution_status, demand_product_bids(id, supplier_id, amount, status, created_at)',
        )
        .eq('id', demandProductId)
        .maybeSingle()

      if (!prod || !prod.commitment_number) return

      const dispute = getItemDisputeResult(prod)
      if (dispute.outcome !== 'winner') {
        const now = new Date().toISOString()
        await supabase
          .from('demand_products')
          .update({
            commitment_number: null,
            execution_status: 'homologated',
            execution_error_details: null,
            execution_status_updated_at: now,
          })
          .eq('id', demandProductId)

        await supabase.from('demand_item_status_history').insert({
          demand_product_id: demandProductId,
          status: 'homologated',
          commitment_number: null,
          observation: 'Empenho desvinculado automaticamente: item fracassado na disputa',
          created_by: user.value?.id || null,
        })
      }
    } catch (err) {
      console.error('Erro ao sincronizar desvinculação de empenho:', err)
    }
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

    const { data: bidData } = await supabase
      .from('demand_product_bids')
      .select('demand_product_id')
      .eq('id', bidId)
      .maybeSingle()

    const { error } = await supabase
      .from('demand_product_bids')
      .update({
        status,
        disqualification_reason: cleanReason,
      })
      .eq('id', bidId)

    if (error) throw error

    if (bidData?.demand_product_id) {
      await syncProductCommitmentIfFailed(bidData.demand_product_id)
    }

    const statusLabel = status === 'disqualified' ? 'DESCLASSIFICADO' : 'CLASSIFICADO'
    const reasonSuffix = cleanReason ? ` (Motivo: ${cleanReason})` : ''

    await logAction(
      'UPDATE_PRODUCT_BID_STATUS',
      `Lance (ID: ${bidId}) alterado para ${statusLabel}${reasonSuffix}`,
      user.value?.id,
    )
  }

  const removeBid = async (bidId: string) => {
    const { data: bidData } = await supabase
      .from('demand_product_bids')
      .select('demand_product_id')
      .eq('id', bidId)
      .maybeSingle()

    const { error } = await supabase.from('demand_product_bids').delete().eq('id', bidId)

    if (error) throw error

    if (bidData?.demand_product_id) {
      await syncProductCommitmentIfFailed(bidData.demand_product_id)
    }

    await logAction('REMOVE_PRODUCT_BID', `Lance (ID: ${bidId}) removido`, user.value?.id)
  }

  return {
    fetchBidsByProduct,
    addBid,
    updateBidStatus,
    removeBid,
  }
}
