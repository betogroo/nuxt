export const useLogger = () => {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  const logAction = async (action: string, description?: string, customUserId?: string) => {
    let userId = customUserId || user.value?.id

    if (!userId) {
      const { data } = await supabase.auth.getSession()
      userId = data.session?.user?.id
    }

    if (!userId) {
      console.warn(
        'useLogger: Não foi possível identificar o usuário para registrar a ação:',
        action,
      )
      return
    }

    try {
      const { error } = await supabase.from('logs').insert({
        user_id: userId,
        action,
        description,
      })
      if (error) {
        console.error('useLogger: Erro no Supabase ao inserir log:', error)
      }
    } catch (e) {
      console.error('useLogger: Exceção ao registrar ação:', e)
    }
  }

  const fetchLogs = async (currentPage: number, itemsPerPage: number) => {
    const from = (currentPage - 1) * itemsPerPage
    const to = from + itemsPerPage - 1

    const { data, count, error } = await supabase
      .from('logs')
      .select(
        `
        id,
        action,
        description,
        created_at,
        profiles (
          id,
          name,
          avatar_url
        )
      `,
        { count: 'exact' },
      )
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) {
      console.error(error)
      throw error
    }

    return { data: data || [], count: count || 0 }
  }

  return {
    logAction,
    fetchLogs,
  }
}
