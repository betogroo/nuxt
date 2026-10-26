import { ROLES } from '~/constants/roles'
import { useAuthSession } from '~/composables/useAuthSession'

export default defineNuxtRouteMiddleware(async (to) => {
  const { ensureUser } = useAuthSession()
  const user = await ensureUser()

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

  // Ensure profile is loaded
  if (!profile.value) {
    await fetchProfile()
  }

  const isAllowed =
    profile.value?.role === ROLES.ADMIN ||
    profile.value?.role === ROLES.IIRGD_USER ||
    profile.value?.role === ROLES.IIRGD_MANAGER

  if (!isAllowed) {
    return navigateTo('/')
  }
})
