<script setup lang="ts">
  const title = 'Home'
  useHead({ title })
</script>
<template>
  <div>
    <PageHeader subtitle="Bem-vindo ao sistema de controle." title="Página Inicial" />

    <UiCard>
      <div class="pa-4 text-center text-body-1">
        Navegue pelo menu lateral para acessar as funcionalidades do sistema.
      </div>
    </UiCard>
  </div>
</template>
