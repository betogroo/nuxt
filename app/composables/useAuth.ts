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
    let path = '/'
    if (process.server) {
      const event = useRequestEvent()
      const cookieStr = event?.node?.req?.headers?.cookie || ''
      const match = cookieStr.match(/sb-[^;]*redirect-path=([^;]+)/)
      if (match && match[1]) path = decodeURIComponent(match[1])
    } else {
      const match = document.cookie.match(/sb-[^;]*redirect-path=([^;]+)/)
      if (match && match[1]) path = decodeURIComponent(match[1])
      
      // Limpar o cookie no client para não ficar preso
      if (match) {
        const cookieName = match[0].split('=')[0]
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
      }
    }
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
