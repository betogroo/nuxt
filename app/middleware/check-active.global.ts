export default defineNuxtRouteMiddleware(async (to) => {
  // Ignora rotas públicas
  const publicRoutes = ['/login', '/register', '/about']
  if (publicRoutes.includes(to.path)) {
    return
  }

  const user = useSupabaseUser()
  if (!user.value) return

  const { profile, fetchProfile } = useProfile()

  if (!profile.value) {
    await fetchProfile()
  }

  // Se o usuário estiver inativo, faz o logout e redireciona
  if (profile.value && profile.value.is_active === false) {
    const supabase = useSupabaseClient()
    await supabase.auth.signOut()

    // Mostramos uma mensagem ou só redirecionamos
    return navigateTo('/login?error=inactive')
  }
})
