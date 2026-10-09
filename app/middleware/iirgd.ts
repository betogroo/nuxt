import { ROLES } from '~/constants/roles'
export default defineNuxtRouteMiddleware(async () => {
  const user = useSupabaseUser()

  if (!user.value) {
    return navigateTo('/login')
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
