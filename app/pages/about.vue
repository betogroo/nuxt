<script setup lang="ts">
  const title = 'Sobre'
  useHead({ title })
</script>
<template>
  <div class="mx-auto" style="max-width: 800px">
    <PageHeader subtitle="Informações sobre a aplicação" title="Sobre o Sistema" />

    <UiCard>
      <div class="pa-4 text-body-1">
        <p>
          Este sistema tem o objetivo de gerenciar o fluxo de demandas, unidades de medidas e
          categorias de produtos com segurança, utilizando autenticação Supabase e um visual moderno
          em Vuetify.
        </p>
        <p class="mt-4">Versão: 1.0.0</p>
      </div>
    </UiCard>
  </div>
</template>
