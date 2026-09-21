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

  const totalPending = computed(() => {
    return pendingCategoriesCount.value
  })

  const refreshAll = async () => {
    await Promise.all([refreshPendingCategories()])
  }

  return {
    pendingCategoriesCount,
    totalPending,
    refreshAll,
    refreshPendingCategories,
  }
}
