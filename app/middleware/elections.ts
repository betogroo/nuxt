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

  const allowedRoles = [
    ROLES.ADMIN,
    ROLES.USER_ELECTION,
    ROLES.MANAGER_ELECTION,
    ROLES.ADMIN_ELECTION,
  ]

  const userRole = profile.value?.role

  if (!userRole || !allowedRoles.includes(userRole as (typeof allowedRoles)[number])) {
    return navigateTo('/')
  }
})
