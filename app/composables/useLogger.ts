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

  return {
    logAction,
  }
}
