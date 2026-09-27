export default defineNuxtRouteMiddleware(async () => {
  const user = useSupabaseUser()
  const { profile, fetchProfile } = useProfile()
  
  if (!user.value) {
    return navigateTo('/login')
  }

  // Ensure profile is loaded
  if (!profile.value) {
    await fetchProfile()
  }

  if (profile.value?.role !== 'admin' && profile.value?.role !== 'iirgd') {
    return navigateTo('/')
  }
})
