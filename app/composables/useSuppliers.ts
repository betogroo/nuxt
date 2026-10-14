import type { Database } from '~/types/database.types'

export type SupplierRow = Database['public']['Tables']['suppliers']['Row']
export type SupplierInsert = Database['public']['Tables']['suppliers']['Insert']
export type SupplierUpdate = Database['public']['Tables']['suppliers']['Update']

export interface SupplierWonItem {
  id: string
  demand_id: string
  product_name_snapshot: string | null
  unit_name_snapshot: string | null
  quantity: number
  reference_price: number | null
  winning_bid_amount: number
  subtotal: number
}

export interface SupplierWonDemand {
  demand_id: string
  demand_name: string
  process_number: string | null
  status: Database['public']['Enums']['demand_status']
  type: Database['public']['Enums']['demand_type']
  dispute_date: string | null
  items_count: number
  total_amount: number
  items: SupplierWonItem[]
}

export interface SupplierWonDemandsSummary {
  totalDemandsWon: number
  totalItemsWon: number
  totalAmountWon: number
  averageDemandAmount: number
  demands: SupplierWonDemand[]
}

export interface ProductWithRelations {
  id: string
  demand_id: string
  product_name_snapshot: string | null
  unit_name_snapshot: string | null
  quantity: number
  reference_price: number | null
  demands: {
    id: string
    name: string
    process_number: string | null
    status: Database['public']['Enums']['demand_status']
    type: Database['public']['Enums']['demand_type']
    dispute_date: string | null
  } | null
  demand_product_bids: {
    id: string
    supplier_id: string
    amount: number
  }[]
}

export const useSuppliers = () => {
  const supabase = useSupabaseClient<Database>()
  const user = useSupabaseUser()
  const { logAction } = useLogger()

  const fetchSuppliers = async (params: {
    page: number
    itemsPerPage: number
    searchQuery: string
  }) => {
    const from = (params.page - 1) * params.itemsPerPage
    const to = from + params.itemsPerPage - 1

    let query = supabase
      .from('suppliers')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)

    if (params.searchQuery) {
      query = query.or(
        `company_name.ilike.%${params.searchQuery}%,cnpj.ilike.%${params.searchQuery}%,email.ilike.%${params.searchQuery}%`,
      )
    }

    const { data, count, error } = await query

    if (error) {
      console.error(error)
      throw error
    }

    return { data: data as SupplierRow[], count: count || 0 }
  }

  const fetchSupplierById = async (id: string) => {
    const { data, error } = await supabase.from('suppliers').select('*').eq('id', id).single()
    if (error) throw error
    return data as SupplierRow
  }
  const fetchAllActiveSuppliers = async () => {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('is_active', true)
      .order('company_name', { ascending: true })

    if (error) throw error
    return data as SupplierRow[]
  }

  const createSupplier = async (payload: SupplierInsert) => {
    const { error } = await supabase.from('suppliers').insert(payload)

    if (error) throw error

    await logAction(
      'CREATE_SUPPLIER',
      `Novo fornecedor cadastrado: ${payload.company_name} (${payload.cnpj})`,
      user.value?.id,
    )
  }

  const createSupplierFast = async (cnpj: string, company_name: string, email: string) => {
    const payload: SupplierInsert = { cnpj, company_name, email }
    const { data, error } = await supabase.from('suppliers').insert(payload).select().single()

    if (error) throw error

    await logAction(
      'CREATE_SUPPLIER_FAST',
      `Fornecedor cadastrado rapidamente na cotação: ${company_name} (${cnpj})`,
      user.value?.id,
    )

    return data as SupplierRow
  }

  const updateSupplier = async (id: string, payload: SupplierUpdate) => {
    const { error } = await supabase.from('suppliers').update(payload).eq('id', id)

    if (error) throw error

    await logAction(
      'UPDATE_SUPPLIER',
      `Fornecedor atualizado: ${payload.company_name} (${payload.cnpj})`,
      user.value?.id,
    )
  }

  const toggleSupplierStatus = async (supplier: SupplierRow) => {
    const newStatus = !supplier.is_active
    const { error } = await supabase
      .from('suppliers')
      .update({ is_active: newStatus })
      .eq('id', supplier.id)

    if (error) throw error

    await logAction(
      'TOGGLE_SUPPLIER_STATUS',
      `Fornecedor ${supplier.company_name} alterado para ${newStatus ? 'ATIVO' : 'INATIVO'}`,
      user.value?.id,
    )
  }

  const fetchSupplierWonDemands = async (
    supplierId: string,
  ): Promise<SupplierWonDemandsSummary> => {
    const { data: supplierBids, error: bidsError } = await supabase
      .from('demand_product_bids')
      .select('demand_product_id, amount')
      .eq('supplier_id', supplierId)

    if (bidsError) {
      console.error(bidsError)
      throw bidsError
    }

    if (!supplierBids || supplierBids.length === 0) {
      return {
        totalDemandsWon: 0,
        totalItemsWon: 0,
        totalAmountWon: 0,
        averageDemandAmount: 0,
        demands: [],
      }
    }

    const productIds = Array.from(new Set(supplierBids.map((b) => b.demand_product_id)))

    const { data: productsData, error: productsError } = await supabase
      .from('demand_products')
      .select(
        `
        id,
        demand_id,
        product_name_snapshot,
        unit_name_snapshot,
        quantity,
        reference_price,
        demands (
          id,
          name,
          process_number,
          status,
          type,
          dispute_date
        ),
        demand_product_bids (
          id,
          supplier_id,
          amount
        )
      `,
      )
      .in('id', productIds)

    if (productsError) {
      console.error(productsError)
      throw productsError
    }

    const wonItems: SupplierWonItem[] = []
    const demandsMap = new Map<string, SupplierWonDemand>()

    const products = (productsData || []) as unknown as ProductWithRelations[]

    for (const product of products) {
      const bids = product.demand_product_bids || []
      const winningBid = getWinningBid(bids)

      if (winningBid && winningBid.supplier_id === supplierId) {
        const qty = product.quantity || 1
        const subtotal = getItemSubtotal(winningBid.amount, qty)

        const wonItem: SupplierWonItem = {
          id: product.id,
          demand_id: product.demand_id,
          product_name_snapshot: product.product_name_snapshot,
          unit_name_snapshot: product.unit_name_snapshot,
          quantity: qty,
          reference_price: product.reference_price,
          winning_bid_amount: winningBid.amount,
          subtotal,
        }
        wonItems.push(wonItem)

        const demand = product.demands
        if (demand) {
          if (!demandsMap.has(demand.id)) {
            demandsMap.set(demand.id, {
              demand_id: demand.id,
              demand_name: demand.name,
              process_number: demand.process_number,
              status: demand.status,
              type: demand.type,
              dispute_date: demand.dispute_date,
              items_count: 0,
              total_amount: 0,
              items: [],
            })
          }

          const demandEntry = demandsMap.get(demand.id)!
          demandEntry.items_count += 1
          demandEntry.total_amount += subtotal
          demandEntry.items.push(wonItem)
        }
      }
    }

    const wonDemandsList = Array.from(demandsMap.values())
    wonDemandsList.sort((a, b) => {
      if (a.dispute_date && b.dispute_date) {
        return new Date(b.dispute_date).getTime() - new Date(a.dispute_date).getTime()
      }
      return a.demand_name.localeCompare(b.demand_name)
    })

    const totalDemandsWon = wonDemandsList.length
    const totalItemsWon = wonDemandsList.reduce((acc, d) => acc + d.items_count, 0)
    const totalAmountWon = wonDemandsList.reduce((acc, d) => acc + d.total_amount, 0)
    const averageDemandAmount = totalDemandsWon > 0 ? totalAmountWon / totalDemandsWon : 0

    return {
      totalDemandsWon,
      totalItemsWon,
      totalAmountWon,
      averageDemandAmount,
      demands: wonDemandsList,
    }
  }

  return {
    fetchSuppliers,
    fetchAllActiveSuppliers,
    fetchSupplierById,
    fetchSupplierWonDemands,
    createSupplier,
    createSupplierFast,
    updateSupplier,
    toggleSupplierStatus,
  }
}
