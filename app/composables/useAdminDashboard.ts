import type { Database } from '~/types/database.types'

export type RecentLog = Database['public']['Tables']['logs']['Row'] & {
  profiles?: { name: string } | null
}

export const useAdminDashboard = () => {
  const supabase = useSupabaseClient<Database>()

  const fetchDashboardMetrics = async () => {
    // Run all count queries concurrently for maximum performance
    const [usersRes, productsRes, demandsRes, categoriesRes, logsRes] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('products').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('demands').select('*', { count: 'exact', head: true }),
      supabase.from('product_categories').select('*', { count: 'exact', head: true }),
      supabase
        .from('logs')
        .select('*, profiles(name)')
        .order('created_at', { ascending: false })
        .limit(6),
    ])

    return {
      usersCount: usersRes.count || 0,
      productsCount: productsRes.count || 0,
      demandsCount: demandsRes.count || 0,
      categoriesCount: categoriesRes.count || 0,
      recentLogs: (logsRes.data as RecentLog[]) || [],
    }
  }

  const getLogColor = (action: string) => {
    if (action.includes('CREATE') || action.includes('ADD')) return 'success'
    if (action.includes('DELETE') || action.includes('REMOVE')) return 'error'
    if (action.includes('UPDATE')) return 'warning'
    return 'primary'
  }

  return {
    fetchDashboardMetrics,
    getLogColor,
  }
}
