export default defineNuxtRouteMiddleware(async (to) => {
  const user = useSupabaseUser()

  if (!user.value) {
    return navigateTo('/login')
  }

  const { profile, fetchProfile } = useProfile()

  // Ensure profile is loaded
  if (!profile.value) {
    await fetchProfile()
  }

  if (profile.value?.role !== 'admin' && profile.value?.role !== 'uge' && profile.value?.role !== 'user') {
    return navigateTo('/')
  }
})
