import { useAuthSession } from '~/composables/useAuthSession'

export default defineNuxtRouteMiddleware(async (to) => {
  // Ignora rotas públicas
  const publicRoutes = ['/login', '/register', '/about']
  if (publicRoutes.includes(to.path)) {
    return
  }

  const { ensureUser } = useAuthSession()
  const user = await ensureUser()
  if (!user) return

  const { profile, fetchProfile } = useProfile()

  if (!profile.value) {
    await fetchProfile()
  }

  // Se o usuário estiver inativo, faz o logout e redireciona
  if (profile.value && profile.value.is_active === false) {
    const { signOut } = useAuth()
    return await signOut('/login?error=inactive')
  }
})
