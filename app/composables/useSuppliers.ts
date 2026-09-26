import type { Database } from '~/types/database.types'

export type SupplierRow = Database['public']['Tables']['suppliers']['Row']
export type SupplierInsert = Database['public']['Tables']['suppliers']['Insert']
export type SupplierUpdate = Database['public']['Tables']['suppliers']['Update']

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

  return {
    fetchSuppliers,
    fetchAllActiveSuppliers,
    createSupplier,
    createSupplierFast,
    updateSupplier,
    toggleSupplierStatus,
  }
}
