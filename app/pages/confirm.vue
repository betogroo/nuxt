<script setup lang="ts">
  const user = useSupabaseUser()

  // Vigia o estado do usuário. Assim que ele for preenchido (login concluído),
  // redireciona para a Home. O `immediate: true` faz a checagem rodar
  // assim que a página carrega, caso o usuário já esteja logado.
  watch(
    user,
    () => {
      if (user.value) {
        return navigateTo('/')
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
