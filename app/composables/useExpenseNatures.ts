import type { Database } from '~/types/database.types'

export type ExpenseNatureRow = Database['public']['Tables']['expense_natures']['Row']
export type ExpenseNatureInsert = Database['public']['Tables']['expense_natures']['Insert']

export const useExpenseNatures = () => {
  const supabase = useSupabaseClient<Database>()
  const user = useSupabaseUser()
  const { logAction } = useLogger()

  const fetchExpenseNatures = async (
    currentPage: number,
    itemsPerPage: number,
    searchQuery?: string
  ) => {
    const from = (currentPage - 1) * itemsPerPage
    const to = from + itemsPerPage - 1

    let query = supabase
      .from('expense_natures')
      .select('*', { count: 'exact' })
      .order('id', { ascending: true })
      .range(from, to)

    if (searchQuery) {
      query = query.or('id.ilike.%' + searchQuery + '%,name.ilike.%' + searchQuery + '%')
    }

    const { data, count, error } = await query

    if (error) throw error
    return { data: data as ExpenseNatureRow[], count: count || 0 }
  }

  const fetchAllActiveExpenseNatures = async () => {
    const { data, error } = await supabase
      .from('expense_natures')
      .select('*')
      .eq('is_active', true)
      .order('id', { ascending: true })

    if (error) throw error
    return data as ExpenseNatureRow[]
  }

  const fetchPendingExpenseNatures = async () => {
    const { data, error } = await supabase
      .from('expense_natures')
      .select('*')
      .eq('is_pending', true)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as ExpenseNatureRow[]
  }

  const createExpenseNature = async (payload: ExpenseNatureInsert) => {
    const { error } = await supabase.from('expense_natures').insert(payload)

    if (error) throw error

    await logAction(
      'CREATE_EXPENSE_NATURE',
      `Nova natureza de despesa cadastrada: ${payload.name}`,
      user.value?.id,
    )
  }

  
  const toggleExpenseNatureStatus = async (expenseNature: ExpenseNatureRow) => {
    const newStatus = !expenseNature.is_active
    const { error } = await supabase
      .from('expense_natures')
      .update({ is_active: newStatus })
      .eq('id', expenseNature.id)

    if (error) throw error

    await logAction(
      'TOGGLE_EXPENSE_NATURE_STATUS',
      `Status da Natureza de Despesa ${expenseNature.id} alterado para ${newStatus ? 'Ativo' : 'Inativo'}`,
      user.value?.id,
    )
  }

  const updateExpenseNature = async (id: string, payload: Partial<ExpenseNatureInsert>) => {
    const { error } = await supabase.from('expense_natures').update(payload).eq('id', id)

    if (error) throw error

    await logAction(
      'UPDATE_EXPENSE_NATURE',
      `Natureza de despesa atualizada: ${id}`,
      user.value?.id,
    )
  }

  const deleteExpenseNature = async (id: string) => {
    const { error } = await supabase.from('expense_natures').delete().eq('id', id)

    if (error) throw error

    await logAction('DELETE_EXPENSE_NATURE', `Natureza de despesa removida: ${id}`, user.value?.id)
  }

  return {
    fetchExpenseNatures,
    fetchAllActiveExpenseNatures,
    fetchPendingExpenseNatures,
    createExpenseNature,
    updateExpenseNature,
    deleteExpenseNature,
    toggleExpenseNatureStatus,
  }
}
