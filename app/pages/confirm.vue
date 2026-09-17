<script setup lang="ts">
  // O módulo @nuxtjs/supabase já trata a lógica de troca de token automaticamente
  // quando o usuário acessa esta rota com o hash correto.
  // Este componente só precisa existir e estar acessível.
</script>

<template>
  <div>
    <v-progress-circular indeterminate />
    <p>Autenticando...</p>
  </div>
</template>
