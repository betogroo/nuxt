<script setup lang="ts">
  definePageMeta({
    middleware: ['iirgd'],
    layout: 'default'
  })

  useHead({
    title: 'Dashboard - IIRGD'
  })
</script>

<template>
  <div>
    <PageHeader 
      subtitle="Sistema independente do IIRGD" 
      title="Dashboard IIRGD" 
    />
    
    <v-row>
      <v-col cols="12" md="4">
        <UiCard>
          <template #header>
            <span class="text-subtitle-1 font-weight-bold">Visão Geral</span>
          </template>
          <div class="pa-4">
            <p class="text-body-2 text-grey-darken-1">
              Bem-vindo ao dashboard do IIRGD. Novas métricas e informações serão adicionadas aqui em breve.
            </p>
          </div>
        </UiCard>
      </v-col>
    </v-row>
  </div>
</template>
