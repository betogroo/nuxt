export const useAuth = () => {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()
  const { logAction } = useLogger()

  const signInWithPassword = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (!error && data.user) {
      await logAction('LOGIN', 'Acesso via senha', data.user.id)
    }

    return { data, error }
  }

  const sendOtp = async (email: string, emailRedirectTo?: string) => {
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo,
      },
    })
    return { data, error }
  }

  const verifyOtpCode = async (email: string, token: string) => {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    })

    if (!error && data.user) {
      await logAction('LOGIN', 'Acesso via código OTP', data.user.id)
    }

    return { data, error }
  }

  const getRedirectUrl = () => {
    const redirectCookie = useCookie('sb-redirect-path')
    const path = redirectCookie.value || '/'
    // Limpa o cookie
    redirectCookie.value = null
    return path
  }

  const signUp = async (email: string, password: string, emailRedirectTo: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo,
      },
    })

    if (!error && data.session) {
      await logAction(
        'REGISTER',
        'Novo usuário registrado no sistema (login automático)',
        data.session.user.id,
      )
    }

    return { data, error }
  }

  return {
    user,
    signInWithPassword,
    sendOtp,
    verifyOtpCode,
    getRedirectUrl,
    signUp,
  }
}
