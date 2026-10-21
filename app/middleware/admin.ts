import { ROLES } from '~/constants/roles'
import { useAuthSession } from '~/composables/useAuthSession'

export default defineNuxtRouteMiddleware(async (to) => {
  const { ensureUser } = useAuthSession()
  const user = await ensureUser()

  // Regra 1: Precisa estar logado
  if (!user) {
    try {
      const redirectInfo = useSupabaseCookieRedirect()
      if (redirectInfo?.path) {
        redirectInfo.path.value = to.fullPath
      }
    } catch {
      // Ignora erro fora de contexto
    }
    return navigateTo({
      path: '/login',
      query: { redirect: to.fullPath },
    })
  }

  const { profile, fetchProfile } = useProfile()

  // Garante que o perfil do usuário está carregado na memória
  if (!profile.value) {
    await fetchProfile()
  }

  // Regra 2: Verifica a regra de negócio (Apenas Admin)
  if (profile.value?.role !== ROLES.ADMIN) {
    // Opcional: Aqui você poderia redirecionar para uma rota '/403' (Acesso Negado)
    return navigateTo('/')
  }
})
