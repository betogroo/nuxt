import type { Database } from '~/types/database.types'

export const usePendingTasks = () => {
  const supabase = useSupabaseClient<Database>()

  const { data: pendingCategoriesCount, refresh: refreshPendingCategories } = useAsyncData(
    'pending-categories-count',
    async () => {
      const { count, error } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .not('suggested_category', 'is', null)

      if (error) {
        console.error('Erro ao buscar categorias pendentes:', error)
        return 0
      }

      return count || 0
    },
    { default: () => 0 },
  )

  const { data: pendingUnitsCount, refresh: refreshPendingUnits } = useAsyncData(
    'pending-units-count',
    async () => {
      const { count, error } = await supabase
        .from('measurement_units')
        .select('*', { count: 'exact', head: true })
        .eq('is_pending', true)

      if (error) {
        console.error('Erro ao buscar unidades pendentes:', error)
        return 0
      }

      return count || 0
    },
    { default: () => 0 },
  )

  const { data: pendingExpenseNaturesCount, refresh: refreshPendingExpenseNatures } = useAsyncData(
    'pending-expense-natures-count',
    async () => {
      const { count, error } = await supabase
        .from('expense_natures')
        .select('*', { count: 'exact', head: true })
        .eq('is_pending', true)
      if (error) {
        console.error('Erro ao buscar naturezas pendentes:', error)
        return 0
      }
      return count || 0
    },
    { default: () => 0 },
  )
  const { data: pendingReturnsCount, refresh: refreshPendingReturns } = useAsyncData(
    'pending-returns-count',
    async () => {
      const { count, error } = await supabase
        .from('demands')
        .select('*', { count: 'exact', head: true })
        .eq('is_return_requested', true)

      if (error) {
        console.error('Erro ao buscar demandas com retorno solicitado:', error)
        return 0
      }

      return count || 0
    },
    { default: () => 0 },
  )

  const totalPending = computed(() => {
    return (
      (pendingCategoriesCount.value || 0) +
      (pendingUnitsCount.value || 0) +
      (pendingReturnsCount.value || 0) + (pendingExpenseNaturesCount.value || 0)
    )
  })

  const refreshAll = async () => {
    await Promise.all([refreshPendingCategories(), refreshPendingUnits(), refreshPendingReturns(), refreshPendingExpenseNatures()])
  }

  return {
    pendingCategoriesCount,
    pendingUnitsCount, pendingExpenseNaturesCount,
    pendingReturnsCount,
    totalPending,
    refreshAll,
    refreshPendingCategories,
    refreshPendingUnits, refreshPendingExpenseNatures,
    refreshPendingReturns,
  }
}
