import type { Database } from '~/types/database.types'
import { compareBids } from '~/utils/bids'

export type DemandProductBidRow = Database['public']['Tables']['demand_product_bids']['Row']
export type DemandProductBidInsert = Database['public']['Tables']['demand_product_bids']['Insert']
export type BidStatus = Database['public']['Enums']['bid_status']

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
      string | { supplier_id: string; amount: number | string; [key: string]: unknown },
    amount?: number | string,
  ) => {
    const supplier_id =
      typeof supplierIdOrPayload === 'string'
        ? supplierIdOrPayload
        : supplierIdOrPayload.supplier_id

    const rawAmount = typeof supplierIdOrPayload === 'string' ? amount : supplierIdOrPayload.amount

    const finalAmount = Number(rawAmount)

    const payload: DemandProductBidInsert = {
      demand_product_id: demandProductId,
      supplier_id,
      amount: finalAmount,
    }

    const { error } = await supabase.from('demand_product_bids').insert(payload)

    if (error) throw error

    await logAction(
      'ADD_PRODUCT_BID',
      `Lance de R$ ${finalAmount} adicionado para o produto da demanda (ID: ${demandProductId})`,
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
