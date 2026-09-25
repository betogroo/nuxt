<script setup lang="ts">
  useHead({ title: 'Confirmando...' })
  const { user } = useAuth()

  const { logAction } = useLogger()

  // Vigia o estado do usuário. Assim que ele for preenchido (login concluído),
  // redireciona para a Home. O `immediate: true` faz a checagem rodar
  // assim que a página carrega, caso o usuário já esteja logado.
  watch(
    user,
    async () => {
      if (user.value) {
        await logAction('LOGIN', 'Acesso via link mágico ou confirmação', user.value.id)
        return navigateTo(useCookie('sb-redirect-path').value || '/', { replace: true })
      }
    },
    { immediate: true },
  )
</script>

<template>
  <div>
    <v-progress-circular indeterminate />
    <p>Autenticando...</p>
  </div>
</template>
