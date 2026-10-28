<script setup lang="ts">
  import { ref, computed, watch } from 'vue'
  import { useIirgdReports, type IirgdErrorReportData } from '~/composables/useIirgdReports'
  import { useIirgdDemands, type IirgdDemand } from '~/composables/useIirgdDemands'

  interface Props {
    modelValue: boolean
    stationFilter?: string | null
    searchQuery?: string
    selectedDemands?: IirgdDemand[]
    totalFilteredCount?: number
  }

  const props = withDefaults(defineProps<Props>(), {
    stationFilter: null,
    searchQuery: '',
    selectedDemands: () => [],
    totalFilteredCount: 0,
  })

  const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void
  }>()

  const isOpen = computed({
    get: () => props.modelValue,
    set: (val) => emit('update:modelValue', val),
  })

  const { fetchDemands } = useIirgdDemands()
  const { buildErrorReportData, printErrorReport, exportErrorReportToCsv } = useIirgdReports()
  const toast = useToast()

  const scope = ref<'all' | 'selected'>('all')
  const isLoading = ref(false)
  const isPrinting = ref(false)
  const isExportingCsv = ref(false)
  const errorMessage = ref('')
  const reportData = ref<IirgdErrorReportData | null>(null)

  const hasSelectedDemands = computed(() => (props.selectedDemands?.length || 0) > 0)

  // Initialize or re-fetch report data when modal opens or scope changes
  const loadReportData = async () => {
    if (!isOpen.value) return

    isLoading.value = true
    errorMessage.value = ''

    try {
      if (scope.value === 'selected' && hasSelectedDemands.value) {
        reportData.value = buildErrorReportData(props.selectedDemands, {
          stationCode: props.stationFilter,
          searchQuery: props.searchQuery,
          isSelectionOnly: true,
        })
      } else {
        // Fetch all error demands matching current filters
        const res = await fetchDemands({
          noPagination: true,
          statusGroup: 'errors',
          searchQuery: props.searchQuery || undefined,
          stationCode:
            props.stationFilter === 'Todos' || !props.stationFilter
              ? undefined
              : props.stationFilter,
        })

        reportData.value = buildErrorReportData((res.data || []) as IirgdDemand[], {
          stationCode: props.stationFilter,
          searchQuery: props.searchQuery,
          isSelectionOnly: false,
        })
      }
    } catch (err: unknown) {
      errorMessage.value =
        err instanceof Error ? err.message : 'Erro ao compilar dados do relatório.'
    } finally {
      isLoading.value = false
    }
  }

  watch(isOpen, (newVal) => {
    if (newVal) {
      scope.value = hasSelectedDemands.value ? 'selected' : 'all'
      loadReportData()
    } else {
      errorMessage.value = ''
      reportData.value = null
    }
  })

  watch(scope, () => {
    if (isOpen.value) {
      loadReportData()
    }
  })

  const handlePrint = async () => {
    if (!reportData.value || reportData.value.items.length === 0) {
      toast.warning('Nenhum registro para imprimir.')
      return
    }

    isPrinting.value = true
    try {
      await printErrorReport(reportData.value)
      toast.success('Visualização do relatório aberta para impressão.')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao gerar impressão.'
      toast.error(msg)
    } finally {
      isPrinting.value = false
    }
  }

  const handleExportCsv = async () => {
    if (!reportData.value || reportData.value.items.length === 0) {
      toast.warning('Nenhum registro para exportar.')
      return
    }

    isExportingCsv.value = true
    try {
      await exportErrorReportToCsv(reportData.value)
      toast.success('Planilha CSV baixada com sucesso!')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao exportar CSV.'
      toast.error(msg)
    } finally {
      isExportingCsv.value = false
    }
  }
</script>

<template>
  <UiModal v-model="isOpen" max-width="640px" title="Relatório de Inconsistências e Erros">
    <UiAlert v-if="errorMessage" class="mb-4" size="sm" type="error" variant="soft">
      {{ errorMessage }}
    </UiAlert>

    <!-- Escolha do Escopo do Relatório -->
    <div class="mb-4">
      <div class="text-caption font-weight-bold text-medium-emphasis mb-2 text-uppercase">
        Escopo do Relatório
      </div>

      <UiRadioGroup v-model="scope" class="mt-1" hide-details inline>
        <UiRadio
          :disabled="!hasSelectedDemands"
          :label="`Apenas selecionadas (${props.selectedDemands?.length || 0})`"
          value="selected"
        />
        <UiRadio
          :label="`Todas as inconsistências filtradas (${props.totalFilteredCount})`"
          value="all"
        />
      </UiRadioGroup>
    </div>

    <!-- Indicador de Carregamento -->
    <div v-if="isLoading" class="d-flex align-center justify-center pa-6">
      <UiProgressCircular color="primary" indeterminate size="36" />
      <span class="ml-3 text-body-2 text-medium-emphasis">Carregando dados das demandas...</span>
    </div>

    <!-- Painel Resumido / Prévia Amigável -->
    <div v-else-if="reportData" class="mb-4">
      <UiCard class="pa-4 bg-surface-variant rounded-lg border" variant="flat">
        <div class="d-flex align-center justify-space-between mb-3">
          <div class="d-flex align-center ga-2">
            <UiIcon class="text-error" name="alertCircle" />
            <span class="text-subtitle-2 font-weight-bold">
              {{ reportData.summary.totalErrors }} inconsistência(s) encontrada(s)
            </span>
          </div>
          <UiChip color="error" size="xs" variant="soft">
            {{ reportData.filters.isSelectionOnly ? 'Selecionadas' : 'Listagem Filtrada' }}
          </UiChip>
        </div>

        <!-- Metadados de Filtro -->
        <div class="text-caption text-medium-emphasis mb-3">
          <span v-if="props.stationFilter && props.stationFilter !== 'Todos'">
            <strong>Posto:</strong> {{ props.stationFilter }} &bull;
          </span>
          <span v-if="props.searchQuery">
            <strong>Busca:</strong> "{{ props.searchQuery }}" &bull;
          </span>
          <span><strong>Data de corte:</strong> {{ reportData.generatedAt }}</span>
        </div>

        <!-- Distribuição por Status -->
        <div class="mb-2">
          <div class="text-caption font-weight-bold text-medium-emphasis mb-1">
            Distribuição por Tipo de Erro:
          </div>
          <div class="d-flex flex-wrap ga-1">
            <UiChip
              v-for="(count, statusName) in reportData.summary.byStatus"
              :key="statusName"
              color="error"
              size="xs"
              variant="outline"
            >
              {{ statusName }}: <strong>{{ count }}</strong>
            </UiChip>
          </div>
        </div>

        <!-- Distribuição por Posto -->
        <div v-if="Object.keys(reportData.summary.byStation).length > 1" class="mt-2 pt-2 border-t">
          <div class="text-caption font-weight-bold text-medium-emphasis mb-1">
            Distribuição por Posto:
          </div>
          <div class="d-flex flex-wrap ga-1">
            <UiChip
              v-for="(count, stCode) in reportData.summary.byStation"
              :key="stCode"
              color="default"
              size="xs"
              variant="soft"
            >
              Posto {{ stCode }}: {{ count }}
            </UiChip>
          </div>
        </div>
      </UiCard>

      <div class="mt-3 text-caption text-medium-emphasis">
        <UiIcon class="mr-1" name="info" size="xs" />
        O relatório amigável para impressão inclui o cabeçalho oficial da Secretaria de Segurança
        Pública e IIRGD, detalhamento dos cidadãos e campos de observação com os motivos das
        inconsistências.
      </div>
    </div>

    <!-- Ações do Modal -->
    <template #actions>
      <UiButton
        :disabled="isLoading || isPrinting || isExportingCsv"
        variant="ghost"
        @click="isOpen = false"
      >
        Fechar
      </UiButton>

      <UiButton
        color="secondary"
        :disabled="isLoading || !reportData || reportData.items.length === 0"
        :loading="isExportingCsv"
        prepend-icon="download"
        variant="soft"
        @click="handleExportCsv"
      >
        Exportar CSV
      </UiButton>

      <UiButton
        color="primary"
        :disabled="isLoading || !reportData || reportData.items.length === 0"
        :loading="isPrinting"
        prepend-icon="printer"
        variant="solid"
        @click="handlePrint"
      >
        Imprimir / Salvar PDF
      </UiButton>
    </template>
  </UiModal>
</template>
