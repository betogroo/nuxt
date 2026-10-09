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
  const {
    data: counts,
    pending,
    refresh,
  } = useAsyncData('iirgd-demand-counts', fetchDemandCounts, {
    default: () => ({
      em_andamento: 0,
      consultado: 0,
      liberado: 0,
      emitidos: 0,
      erros: 0,
    }),
  })

  const isModalOpen = ref(false)

  const cards = computed(() => [
    {
      group: 'em-andamento',
      label: 'Em Andamento',
      count: counts.value.em_andamento,
      icon: 'time',
      color: 'primary',
    },
    {
      group: 'consultado',
      label: 'Consultado',
      count: counts.value.consultado,
      icon: 'search',
      color: 'info',
    },
    {
      group: 'liberado',
      label: 'Liberado',
      count: counts.value.liberado,
      icon: 'check',
      color: 'teal',
    },
    {
      group: 'emitidos',
      label: 'Emitidos',
      count: counts.value.emitidos,
      icon: 'success',
      color: 'success',
    },
    {
      group: 'erros',
      label: 'Erros',
      count: counts.value.erros,
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
        <UiButton
          class="mr-2"
          color="secondary"
          icon="refresh"
          :loading="pending"
          size="sm"
          variant="soft"
          @click="refresh"
        />
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
