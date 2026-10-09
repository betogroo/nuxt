<script setup lang="ts">
  import { useIirgdDemands } from '~/composables/useIirgdDemands'

  definePageMeta({
    icon: 'userBadge',
    middleware: ['iirgd'],
    layout: 'default',
    navLabel: 'IIRGD',
    navSubtitle: 'Módulo de gestão IIRGD',
    navColor: 'deep-purple',
    navGroup: 'iirgd',
    navOrder: 40,
    roles: ['admin', 'iirgd'],
    showIn: ['drawer', 'home'],
  })

  useHead({
    title: 'Dashboard IIRGD',
  })

  const { fetchDemandCounts } = useIirgdDemands()

  // Buscar apenas as contagens
  const { data: counts, refresh } = useAsyncData('iirgd-demand-counts', fetchDemandCounts, {
    default: () => ({
      inProgress: 0,
      consulted: 0,
      released: 0,
      issued: 0,
      errors: 0,
    }),
  })

  const isModalOpen = ref(false)

  const cards = computed(() => [
    {
      group: 'in-progress',
      label: 'Em Andamento',
      count: counts.value.inProgress,
      icon: 'time',
      color: 'primary',
    },
    {
      group: 'consulted',
      label: 'Consultado',
      count: counts.value.consulted,
      icon: 'search',
      color: 'info',
    },
    {
      group: 'released',
      label: 'Liberado',
      count: counts.value.released,
      icon: 'check',
      color: 'teal',
    },
    {
      group: 'issued',
      label: 'Emitidos',
      count: counts.value.issued,
      icon: 'success',
      color: 'success',
    },
    {
      group: 'errors',
      label: 'Erros',
      count: counts.value.errors,
      icon: 'alert',
      color: 'error',
    },
  ])
</script>

<template>
  <div>
    <UiPageHeader
      subtitle="Visão geral e acesso rápido às demandas do Instituto de Identificação"
      title="Dashboard IIRGD"
    >
      <template #actions>
        <UiButton color="primary" prepend-icon="add" @click="isModalOpen = true">
          Nova Demanda
        </UiButton>
      </template>
    </UiPageHeader>

    <UiContainer>
      <UiRow>
        <UiCol v-for="card in cards" :key="card.group" cols="12" md="4" sm="6">
          <UiCard
            class="cursor-pointer transition-swing"
            hover
            @click="navigateTo(`/iirgd/status/${card.group}`)"
          >
            <div class="d-flex align-center justify-space-between pa-4">
              <div>
                <div class="text-subtitle-1 text-medium-emphasis mb-1">{{ card.label }}</div>
                <div class="text-h4 font-weight-bold">{{ card.count }}</div>
              </div>
              <UiAvatar :color="card.color" size="lg" variant="soft">
                <UiIcon :name="card.icon" />
              </UiAvatar>
            </div>
          </UiCard>
        </UiCol>
      </UiRow>
    </UiContainer>

    <!-- Modal isolado de nova demanda -->
    <IirgdNewDemandModal v-model="isModalOpen" @created="refresh" />
  </div>
</template>
