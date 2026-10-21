export const useAuthSession = () => {
  const user = useSupabaseUser()
  const supabase = useSupabaseClient()

  /**
   * Garante que o usuário autenticado esteja populado no estado reativo do Nuxt.
   * Se user.value ainda estiver nulo (por exemplo, durante a hidratação inicial do cliente),
   * consulta assincronamente a sessão e claims do Supabase antes de concluir que não há usuário.
   */
  const ensureUser = async () => {
    if (user.value) {
      return user.value
    }

    try {
      const { data } = await supabase.auth.getSession()
      if (data?.session) {
        const sessionState = useSupabaseSession()
        sessionState.value = data.session

        const { data: claimsData } = await supabase.auth.getClaims()
        user.value = claimsData?.claims ?? data.session.user
      }
    } catch {
      // Resiliência caso haja falha temporária de comunicação
    }

    return user.value
  }

  return {
    ensureUser,
  }
}
