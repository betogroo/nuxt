import type { Database } from '~/types/database.types'

export const usePendingTasks = () => {
  const supabase = useSupabaseClient<Database>()

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
      (pendingUnitsCount.value || 0) +
      (pendingReturnsCount.value || 0) + 
      (pendingExpenseNaturesCount.value || 0)
    )
  })

  const refreshAll = async () => {
    await Promise.all([refreshPendingUnits(), refreshPendingReturns(), refreshPendingExpenseNatures()])
  }

  return {
    pendingUnitsCount, 
    pendingExpenseNaturesCount,
    pendingReturnsCount,
    totalPending,
    refreshAll,
    refreshPendingUnits, 
    refreshPendingExpenseNatures,
    refreshPendingReturns,
  }
}
