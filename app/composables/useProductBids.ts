import type { Database } from '~/types/database.types'

export type DemandProductBidRow = Database['public']['Tables']['demand_product_bids']['Row']
export type DemandProductBidInsert = Database['public']['Tables']['demand_product_bids']['Insert']

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
    return data
  }

  const addBid = async (demandProductId: string, supplierId: string, amount: number) => {
    const payload: DemandProductBidInsert = {
      demand_product_id: demandProductId,
      supplier_id: supplierId,
      amount,
    }

    const { error } = await supabase.from('demand_product_bids').insert(payload)

    if (error) throw error

    await logAction(
      'ADD_PRODUCT_BID',
      Lance de R$ \ adicionado para o produto da demanda (ID: \),
      user.value?.id,
    )
  }

  const removeBid = async (bidId: string) => {
    const { error } = await supabase.from('demand_product_bids').delete().eq('id', bidId)

    if (error) throw error

    await logAction('REMOVE_PRODUCT_BID', Lance (ID: \) removido, user.value?.id)
  }

  return {
    fetchBidsByProduct,
    addBid,
    removeBid,
  }
}
