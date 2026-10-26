<script setup lang="ts">
  import { ref, computed } from 'vue'
  import { useIirgdReports } from '~/composables/useIirgdReports'
  import { IIRGD_STATION_CODES } from '~/constants/iirgd-stations'

  definePageMeta({
    icon: 'chart',
    middleware: ['iirgd'],
    layout: 'default',
    navLabel: 'Relatórios',
    navSubtitle: 'Relatórios do módulo IIRGD',
    navColor: 'deep-purple',
    navGroup: 'iirgd',
    navOrder: 30,
    roles: ['admin', 'iirgd_manager'],
    showIn: ['drawer'],
  })

  useHead({
    title: 'Relatórios IIRGD - Demandas Emitidas',
  })

  const { fetchIssuedDemandsByDocumentType, exportIssuedDemandsToCsv } = useIirgdReports()

  function formatDateToInput(d: Date): string {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const presets = [
    { id: '7d', label: 'Últimos 7 dias' },
    { id: '15d', label: 'Últimos 15 dias' },
    { id: '30d', label: 'Últimos 30 dias' },
    { id: 'this_month', label: 'Este Mês' },
    { id: 'last_month', label: 'Mês Anterior' },
  ] as const

  const selectedPreset = ref<string>('30d')
  const startDate = ref<string>('')
  const endDate = ref<string>('')
  const selectedStation = ref<string | null>(null)
  const hideZeroCount = ref<boolean>(false)
  const isExporting = ref(false)

  function applyPreset(presetId: string) {
    selectedPreset.value = presetId
    const today = new Date()

    if (presetId === '7d') {
      const past = new Date(today)
      past.setDate(today.getDate() - 6)
      startDate.value = formatDateToInput(past)
      endDate.value = formatDateToInput(today)
    } else if (presetId === '15d') {
      const past = new Date(today)
      past.setDate(today.getDate() - 14)
      startDate.value = formatDateToInput(past)
      endDate.value = formatDateToInput(today)
    } else if (presetId === '30d') {
      const past = new Date(today)
      past.setDate(today.getDate() - 29)
      startDate.value = formatDateToInput(past)
      endDate.value = formatDateToInput(today)
    } else if (presetId === 'this_month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
      startDate.value = formatDateToInput(firstDay)
      endDate.value = formatDateToInput(today)
    } else if (presetId === 'last_month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const lastDay = new Date(today.getFullYear(), today.getMonth(), 0)
      startDate.value = formatDateToInput(firstDay)
      endDate.value = formatDateToInput(lastDay)
    }
  }

  // Initialize with 30d preset
  applyPreset('30d')

  function onCustomDateChange() {
    selectedPreset.value = 'custom'
  }

  const stationOptions = [
    { label: 'Todos os Postos', value: null },
    ...IIRGD_STATION_CODES.map((code) => ({ label: `Posto ${code}`, value: code })),
  ]

  const {
    data: reportData,
    pending: loading,
    refresh,
  } = useAsyncData(
    'iirgd-report-issued-demands',
    () =>
      fetchIssuedDemandsByDocumentType({
        startDate: startDate.value,
        endDate: endDate.value,
        stationCode: selectedStation.value,
      }),
    {
      default: () => ({
        items: [],
        totalIssued: 0,
        topDocumentType: null,
        dailyAverage: 0,
        periodDays: 0,
        startDate: startDate.value,
        endDate: endDate.value,
        stations: [...IIRGD_STATION_CODES],
        stationTotals: {},
      }),
    },
  )

  function onPresetClick(presetId: string) {
    applyPreset(presetId)
    refresh()
  }

  const isAllStations = computed(() => !selectedStation.value)

  const displayedItems = computed(() => {
    if (!reportData.value?.items) return []
    if (hideZeroCount.value) {
      return reportData.value.items.filter((item) => item.count > 0)
    }
    return reportData.value.items
  })

  const distinctIssuedTypesCount = computed(() => {
    return reportData.value?.items.filter((i) => i.count > 0).length || 0
  })

  const activeTypesTotal = computed(() => {
    return reportData.value?.items.length || 0
  })

  const chartItems = computed(() => {
    return reportData.value?.items.filter((i) => i.count > 0) || []
  })

  const chartOptions = computed(() => ({
    chart: {
      type: 'bar',
      fontFamily: 'inherit',
      toolbar: { show: false },
    },
    plotOptions: {
      bar: {
        horizontal: true,
        borderRadius: 4,
        barHeight: '65%',
        distributed: true,
      },
    },
    colors: [
      '#673ab7',
      '#3f51b5',
      '#2196f3',
      '#03a9f4',
      '#00bcd4',
      '#009688',
      '#4caf50',
      '#8bc34a',
      '#ffc107',
      '#ff9800',
      '#ff5722',
      '#795548',
    ],
    dataLabels: {
      enabled: true,
      textAnchor: 'start',
      formatter: (val: number) => (val > 0 ? val.toString() : ''),
      offsetX: 10,
      style: {
        fontSize: '12px',
        fontWeight: 'bold',
        colors: ['#374151'],
      },
    },
    xaxis: {
      categories: chartItems.value.map((i) => i.documentTypeName),
      labels: {
        formatter: (val: number) => Math.round(val).toString(),
      },
    },
    yaxis: {
      labels: {
        style: {
          fontSize: '13px',
          fontWeight: 500,
        },
      },
    },
    legend: { show: false },
    tooltip: {
      y: {
        formatter: (val: number) => `${val} demandas emitidas`,
      },
    },
    noData: {
      text: 'Nenhuma emissão registrada no período selecionado',
      align: 'center',
      verticalAlign: 'middle',
      style: {
        fontSize: '14px',
        fontFamily: 'inherit',
      },
    },
  }))

  const chartSeries = computed(() => [
    {
      name: 'Demandas Emitidas',
      data: chartItems.value.map((i) => i.count),
    },
  ])

  const tableHeaders = computed(() => {
    if (isAllStations.value && reportData.value?.stations && reportData.value.stations.length > 0) {
      return [
        { text: 'Tipo de Documento', value: 'documentTypeName' },
        ...reportData.value.stations.map((st) => ({
          text: `Posto ${st}`,
          value: `station_${st}`,
          align: 'center' as const,
        })),
        { text: 'Total Geral', value: 'count', align: 'center' as const },
        { text: 'Percentual', value: 'percentage', align: 'right' as const },
      ]
    }
    return [
      { text: 'Tipo de Documento', value: 'documentTypeName' },
      { text: 'Quantidade Emitida', value: 'count', align: 'center' as const },
      { text: 'Percentual do Total', value: 'percentage', align: 'right' as const },
    ]
  })

  const handleExport = async () => {
    if (!reportData.value || reportData.value.items.length === 0) return
    isExporting.value = true
    try {
      await exportIssuedDemandsToCsv(reportData.value)
    } finally {
      isExporting.value = false
    }
  }
</script>

<template>
  <div>
    <!-- Page Header -->
    <UiPageHeader
      subtitle="Relatório de emissão de documentos por tipo e período no módulo IIRGD"
      title="Relatórios IIRGD"
    >
      <template #actions>
        <UiButton
          :disabled="!reportData || reportData.totalIssued === 0 || isExporting"
          prepend-icon="download"
          size="sm"
          variant="outline"
          @click="handleExport"
        >
          Exportar CSV
        </UiButton>
      </template>
    </UiPageHeader>

    <UiContainer>
      <!-- Filters Card -->
      <UiCard class="mb-6" title="Filtros e Intervalo de Tempo" variant="outline">
        <div class="d-flex flex-wrap align-center ga-2 mb-4">
          <span class="text-caption font-weight-bold text-medium-emphasis me-2 text-uppercase">
            Períodos Rápidos:
          </span>
          <UiButton
            v-for="preset in presets"
            :key="preset.id"
            :color="selectedPreset === preset.id ? 'primary' : 'default'"
            size="sm"
            :variant="selectedPreset === preset.id ? 'solid' : 'outline'"
            @click="onPresetClick(preset.id)"
          >
            {{ preset.label }}
          </UiButton>
        </div>

        <UiRow dense>
          <UiCol cols="12" md="3" sm="6">
            <UiInput
              v-model="startDate"
              label="Data Inicial"
              size="sm"
              type="date"
              variant="outline"
              @update:model-value="onCustomDateChange"
            />
          </UiCol>
          <UiCol cols="12" md="3" sm="6">
            <UiInput
              v-model="endDate"
              label="Data Final"
              size="sm"
              type="date"
              variant="outline"
              @update:model-value="onCustomDateChange"
            />
          </UiCol>
          <UiCol cols="12" md="3" sm="6">
            <UiSelect
              v-model="selectedStation"
              item-title="label"
              item-value="value"
              :items="stationOptions"
              label="Posto de Atendimento"
              size="sm"
              variant="outline"
            />
          </UiCol>
          <UiCol class="d-flex align-center pb-3" cols="12" md="3" sm="6">
            <UiButton
              block
              color="primary"
              :loading="loading"
              prepend-icon="refresh"
              size="sm"
              @click="refresh"
            >
              Atualizar Relatório
            </UiButton>
          </UiCol>
        </UiRow>
      </UiCard>

      <!-- KPI Summary Cards -->
      <UiRow class="mb-6">
        <UiCol cols="12" md="3" sm="6">
          <UiCard class="h-100" variant="outline">
            <div class="d-flex align-center justify-space-between pa-4">
              <div>
                <div class="text-caption text-uppercase font-weight-bold text-medium-emphasis mb-1">
                  Total Emitido
                </div>
                <div class="text-h4 font-weight-bold">
                  {{ reportData?.totalIssued ?? 0 }}
                </div>
                <div class="text-caption text-medium-emphasis mt-1">
                  em {{ reportData?.periodDays ?? 0 }} dias
                </div>
              </div>
              <UiAvatar color="success" size="lg" variant="soft">
                <UiIcon name="success" size="28" />
              </UiAvatar>
            </div>
          </UiCard>
        </UiCol>

        <UiCol cols="12" md="3" sm="6">
          <UiCard class="h-100" variant="outline">
            <div class="d-flex align-center justify-space-between pa-4">
              <div>
                <div class="text-caption text-uppercase font-weight-bold text-medium-emphasis mb-1">
                  Tipo Mais Emitido
                </div>
                <div class="text-h6 font-weight-bold text-truncate" style="max-width: 170px">
                  {{ reportData?.topDocumentType ?? 'Nenhum' }}
                </div>
                <div class="text-caption text-medium-emphasis mt-1">
                  {{
                    reportData?.items[0]?.count
                      ? `${reportData.items[0].percentage}% do total`
                      : '-'
                  }}
                </div>
              </div>
              <UiAvatar color="primary" size="lg" variant="soft">
                <UiIcon name="recordsList" size="28" />
              </UiAvatar>
            </div>
          </UiCard>
        </UiCol>

        <UiCol cols="12" md="3" sm="6">
          <UiCard class="h-100" variant="outline">
            <div class="d-flex align-center justify-space-between pa-4">
              <div>
                <div class="text-caption text-uppercase font-weight-bold text-medium-emphasis mb-1">
                  Média Diária
                </div>
                <div class="text-h4 font-weight-bold">
                  {{ reportData?.dailyAverage ?? 0 }}
                </div>
                <div class="text-caption text-medium-emphasis mt-1">demandas / dia</div>
              </div>
              <UiAvatar color="info" size="lg" variant="soft">
                <UiIcon name="time" size="28" />
              </UiAvatar>
            </div>
          </UiCard>
        </UiCol>

        <UiCol cols="12" md="3" sm="6">
          <UiCard class="h-100" variant="outline">
            <div class="d-flex align-center justify-space-between pa-4">
              <div>
                <div class="text-caption text-uppercase font-weight-bold text-medium-emphasis mb-1">
                  Tipos Atendidos
                </div>
                <div class="text-h4 font-weight-bold">
                  {{ distinctIssuedTypesCount }}
                </div>
                <div class="text-caption text-medium-emphasis mt-1">
                  de {{ activeTypesTotal }} tipos cadastrados
                </div>
              </div>
              <UiAvatar color="deep-purple" size="lg" variant="soft">
                <UiIcon name="categories" size="28" />
              </UiAvatar>
            </div>
          </UiCard>
        </UiCol>
      </UiRow>

      <!-- Chart and Table Content -->
      <UiRow>
        <!-- Bar Chart -->
        <UiCol cols="12" lg="6">
          <UiCard class="h-100" title="Distribuição por Tipo de Documento" variant="outline">
            <div class="pa-2">
              <UiChart height="350" :options="chartOptions" :series="chartSeries" type="bar" />
            </div>
          </UiCard>
        </UiCol>

        <!-- Detailed Table -->
        <UiCol cols="12" lg="6">
          <UiCard class="h-100" variant="outline">
            <template #header>
              <div class="d-flex align-center justify-space-between w-100 flex-wrap ga-2">
                <span class="text-subtitle-1 font-weight-bold">Detalhamento dos Tipos</span>
                <div class="d-flex align-center ga-3">
                  <UiSwitch
                    v-model="hideZeroCount"
                    hide-details
                    label="Ocultar sem emissões"
                    size="sm"
                  />
                  <UiButton
                    :disabled="!reportData || reportData.totalIssued === 0 || isExporting"
                    prepend-icon="download"
                    size="sm"
                    variant="outline"
                    @click="handleExport"
                  >
                    Exportar
                  </UiButton>
                </div>
              </div>
            </template>

            <UiTable :headers="tableHeaders" :items="displayedItems" :loading="loading">
              <template #item-documentTypeName="{ item }">
                <div class="d-flex align-center">
                  <UiIcon class="me-2 text-medium-emphasis" name="document" size="18" />
                  <span class="font-weight-medium">{{ item.documentTypeName }}</span>
                </div>
              </template>

              <!-- Dynamic slot for each station column when all stations is selected -->
              <template
                v-for="st in reportData?.stations || []"
                :key="st"
                #[`item-station_${st}`]="{ item }"
              >
                <UiChip
                  :color="(item.stationCounts?.[st] || 0) > 0 ? 'primary' : 'default'"
                  size="sm"
                  :variant="(item.stationCounts?.[st] || 0) > 0 ? 'soft' : 'outline'"
                >
                  {{ item.stationCounts?.[st] || 0 }}
                </UiChip>
              </template>

              <template #item-count="{ item }">
                <UiChip
                  :color="item.count > 0 ? (isAllStations ? 'secondary' : 'primary') : 'default'"
                  size="sm"
                  :variant="item.count > 0 ? 'solid' : 'outline'"
                >
                  {{ item.count }}
                </UiChip>
              </template>

              <template #item-percentage="{ item }">
                <span
                  :class="item.count > 0 ? 'font-weight-bold text-primary' : 'text-medium-emphasis'"
                >
                  {{ item.percentage.toFixed(1) }}%
                </span>
              </template>

              <template #empty>
                <div class="py-6 text-center text-medium-emphasis">
                  Nenhum tipo de documento emitido no período selecionado.
                </div>
              </template>
            </UiTable>

            <!-- Total Row Footer -->
            <div
              v-if="reportData && reportData.totalIssued > 0"
              class="d-flex justify-space-between align-center flex-wrap pa-4 bg-surface-variant rounded-b-lg mt-3 ga-2"
            >
              <span class="text-subtitle-2 font-weight-bold">TOTAL GERAL EMITIDO</span>
              <div class="d-flex align-center flex-wrap ga-3">
                <template v-if="isAllStations && reportData.stations">
                  <div v-for="st in reportData.stations" :key="st" class="d-flex align-center ga-1">
                    <span class="text-caption text-medium-emphasis">Posto {{ st }}:</span>
                    <UiChip color="primary" size="sm" variant="soft">
                      {{ reportData.stationTotals?.[st] ?? 0 }}
                    </UiChip>
                  </div>
                </template>
                <div class="d-flex align-center ga-1 ms-2">
                  <span class="text-caption font-weight-bold">Total:</span>
                  <UiChip color="success" size="sm" variant="solid">
                    {{ reportData.totalIssued }}
                  </UiChip>
                </div>
                <span class="text-subtitle-2 font-weight-bold ms-2">100.0%</span>
              </div>
            </div>
          </UiCard>
        </UiCol>
      </UiRow>
    </UiContainer>
  </div>
</template>
