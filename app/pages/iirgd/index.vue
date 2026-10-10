<script setup lang="ts">
  import { useIirgdDemands } from '~/composables/useIirgdDemands'
  import { ROLES } from '~/constants/roles'

  definePageMeta({
    icon: 'userBadge',
    middleware: ['iirgd'],
    layout: 'default',
    navLabel: 'IIRGD',
    navSubtitle: 'Módulo de gestão IIRGD',
    navColor: 'deep-purple',
    navGroup: 'iirgd',
    navOrder: 40,
    roles: ['admin', 'iirgd_user', 'iirgd_manager'],
    showIn: ['drawer', 'home'],
  })

  useHead({
    title: 'Dashboard IIRGD',
  })

  const { fetchDemandCounts, fetchIssuedDemandsTrend } = useIirgdDemands()

  const { data: trendData } = useAsyncData(
    'iirgd-demand-trend',
    () => fetchIssuedDemandsTrend(30),
    {
      default: () => ({ labels: [] as string[], series: [] as number[] }),
    },
  )

  const statusChartOptions = computed(() => ({
    chart: { type: 'donut', fontFamily: 'inherit' },
    labels: ['Em Andamento', 'Consultados', 'Liberados', 'Emitidos', 'Erros'],
    colors: ['#2196F3', '#1976D2', '#009688', '#4CAF50', '#F44336'],
    plotOptions: {
      pie: { donut: { size: '70%' } },
    },
    dataLabels: { enabled: false },
    legend: { position: 'bottom' },
  }))

  const statusChartSeries = computed(() => [
    counts.value.inProgress,
    counts.value.consulted,
    counts.value.released,
    counts.value.issued,
    counts.value.errors,
  ])

  const trendChartOptions = computed(() => ({
    chart: { type: 'area', fontFamily: 'inherit', toolbar: { show: false } },
    colors: ['#4CAF50'],
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2 },
    noData: {
      text: 'Nenhuma emissão registrada nos últimos 30 dias',
      align: 'center',
      verticalAlign: 'middle',
      style: {
        fontSize: '14px',
        fontFamily: 'inherit',
      },
    },
    xaxis: {
      categories: trendData.value?.labels || [],
      type: 'datetime',
      labels: { datetimeFormatter: { year: 'yyyy', month: "MMM 'yy", day: 'dd MMM' } },
    },
    yaxis: {
      min: 0,
      forceNiceScale: true,
      labels: {
        formatter: (val: number) => Math.round(val).toString(),
      },
    },
    fill: {
      type: 'gradient',
      gradient: { shadeIntensity: 1, opacityFrom: 0.7, opacityTo: 0.1, stops: [0, 90, 100] },
    },
    tooltip: {
      x: {
        format: 'dd/MM/yyyy',
      },
    },
  }))

  const trendChartSeries = computed(() => [
    { name: 'Demandas Emitidas', data: trendData.value?.series || [] },
  ])

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

  const { profile } = useProfile()
  const isModalOpen = ref(false)

  const cards = computed(() => {
    const all = [
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
        icon: 'close',
        color: 'error',
      },
    ]

    if (profile.value?.role === ROLES.IIRGD_USER) {
      return all.filter((c) => ['in-progress', 'issued', 'errors'].includes(c.group))
    }
    return all
  })
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
      <UiRow v-if="[ROLES.ADMIN, ROLES.IIRGD_MANAGER].includes(profile?.role as string)" class="mt-6">
        <UiCol cols="12">
          <UiCard
            class="cursor-pointer transition-swing"
            hover
            @click="navigateTo('/iirgd/reports')"
          >
            <div class="d-flex align-center justify-space-between pa-4">
              <div>
                <div class="text-h6 mb-1">Relatórios IIRGD</div>
                <div class="text-body-2 text-medium-emphasis">Acesse a página de relatórios para extração de dados.</div>
              </div>
              <UiAvatar color="deep-purple" size="lg" variant="soft">
                <UiIcon name="recordsList" />
              </UiAvatar>
            </div>
          </UiCard>
        </UiCol>
      </UiRow>
      <UiRow class="mt-6">
        <UiCol cols="12" md="6">
          <UiCard class="h-100">
            <div class="pa-4">
              <div class="text-h6 mb-4">Distribuição de Status</div>
              <UiChart
                height="300"
                :options="statusChartOptions"
                :series="statusChartSeries"
                type="donut"
              />
            </div>
          </UiCard>
        </UiCol>
        <UiCol cols="12" md="6">
          <UiCard class="h-100">
            <div class="pa-4">
              <div class="text-h6 mb-4">Emissões (Últimos 30 dias)</div>
              <UiChart
                height="300"
                :options="trendChartOptions"
                :series="trendChartSeries"
                type="area"
              />
            </div>
          </UiCard>
        </UiCol>
      </UiRow>
    </UiContainer>

    <!-- Modal isolado de nova demanda -->
    <IirgdNewDemandModal v-model="isModalOpen" @created="refresh" />
  </div>
</template>
