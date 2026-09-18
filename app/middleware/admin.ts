export default defineNuxtRouteMiddleware(async () => {
  const user = useSupabaseUser()

  // Regra 1: Precisa estar logado
  if (!user.value) {
    return navigateTo('/login')
  }

  const { profile, fetchProfile } = useProfile()

  // Garante que o perfil do usuário está carregado na memória
  if (!profile.value) {
    await fetchProfile()
  }

  // Regra 2: Verifica a regra de negócio (Apenas Admin)
  if (profile.value?.role !== 'admin') {
    // Opcional: Aqui você poderia redirecionar para uma rota '/403' (Acesso Negado)
    return navigateTo('/')
  }
})
