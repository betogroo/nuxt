<script setup lang="ts">
  import { computed, ref } from 'vue'
  import {
    useDemandGeneralReports,
    type IrRetentionReportRow,
    type CommitmentExecutionRow,
  } from '~/composables/useDemandGeneralReports'
  import { formatCurrency, formatDate } from '~/utils/formatters'
  import { APP_ROUTES } from '~/utils/routes'

  definePageMeta({
    icon: 'chart',
    middleware: ['uge'],
    layout: 'default',
    navLabel: 'Relatórios de Demandas',
    navSubtitle: 'Retenção de IR e execução orçamentária',
    navColor: 'indigo',
    navGroup: 'management',
    navOrder: 18,
    roles: ['admin', 'uge'],
    showIn: ['drawer'],
  })

  useHead({
    title: 'Central de Relatórios de Demandas - Licitações',
  })

  const toast = useToast()
  const {
    fetchIrRetentionReport,
    exportIrRetentionToCsv,
    exportIrRetentionToPdf,
    fetchCommitmentExecutionReport,
    exportExecutionToCsv,
  } = useDemandGeneralReports()

  const activeTab = ref<'ir-retention' | 'execution' | 'shortcuts'>('ir-retention')

  // -------------------------------------------------------------
  // Helpers de Data
  // -------------------------------------------------------------
  function formatDateToInput(d: Date): string {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // -------------------------------------------------------------
  // Aba 1: Relatório de Retenção de IR
  // -------------------------------------------------------------
  const irPresets = [
    { id: '7d', label: '7 dias' },
    { id: '15d', label: '15 dias' },
    { id: '30d', label: '30 dias' },
    { id: 'this_month', label: 'Este Mês' },
    { id: 'last_month', label: 'Mês Anterior' },
    { id: 'this_year', label: 'Ano Atual' },
    { id: 'all', label: 'Todos' },
  ] as const

  const irSelectedPreset = ref<string>('30d')
  const irStartDate = ref<string>('')
  const irEndDate = ref<string>('')
  const irPaymentStatus = ref<'all' | 'paid' | 'pending'>('all')
  const irSearchQuery = ref<string>('')
  const isExportingIrCsv = ref(false)
  const isExportingIrPdf = ref(false)

  function applyIrPreset(presetId: string) {
    irSelectedPreset.value = presetId
    const today = new Date()

    if (presetId === '7d') {
      const past = new Date(today)
      past.setDate(today.getDate() - 6)
      irStartDate.value = formatDateToInput(past)
      irEndDate.value = formatDateToInput(today)
    } else if (presetId === '15d') {
      const past = new Date(today)
      past.setDate(today.getDate() - 14)
      irStartDate.value = formatDateToInput(past)
      irEndDate.value = formatDateToInput(today)
    } else if (presetId === '30d') {
      const past = new Date(today)
      past.setDate(today.getDate() - 29)
      irStartDate.value = formatDateToInput(past)
      irEndDate.value = formatDateToInput(today)
    } else if (presetId === 'this_month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
      irStartDate.value = formatDateToInput(firstDay)
      irEndDate.value = formatDateToInput(today)
    } else if (presetId === 'last_month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const lastDay = new Date(today.getFullYear(), today.getMonth(), 0)
      irStartDate.value = formatDateToInput(firstDay)
      irEndDate.value = formatDateToInput(lastDay)
    } else if (presetId === 'this_year') {
      const firstDay = new Date(today.getFullYear(), 0, 1)
      irStartDate.value = formatDateToInput(firstDay)
      irEndDate.value = formatDateToInput(today)
    } else if (presetId === 'all') {
      irStartDate.value = ''
      irEndDate.value = ''
    }
  }

  // Inicializa com os últimos 30 dias
  applyIrPreset('30d')

  function onCustomIrDateChange() {
    irSelectedPreset.value = 'custom'
  }

  const {
    data: irDataPayload,
    pending: irPending,
    refresh: refreshIrData,
  } = useAsyncData('demands-ir-retention-report', () =>
    fetchIrRetentionReport({
      startDate: irStartDate.value || null,
      endDate: irEndDate.value || null,
      paymentStatus: irPaymentStatus.value,
    }),
  )

  const irRows = computed<IrRetentionReportRow[]>(() => irDataPayload.value?.rows || [])
  const irSummary = computed(
    () =>
      irDataPayload.value?.summary || {
        totalIrRetentionAmount: 0,
        totalCommitmentAmount: 0,
        liquidationsCount: 0,
        commitmentsCount: 0,
        suppliersCount: 0,
        paidLiquidationsCount: 0,
        pendingLiquidationsCount: 0,
      },
  )

  const filteredIrRows = computed<IrRetentionReportRow[]>(() => {
    const q = irSearchQuery.value.trim().toLowerCase()
    if (!q) return irRows.value

    return irRows.value.filter((r) => {
      return (
        r.commitmentNumber.toLowerCase().includes(q) ||
        r.liquidationNumber.toLowerCase().includes(q) ||
        r.supplierName.toLowerCase().includes(q) ||
        r.supplierCnpj.includes(q) ||
        (r.disbursementProgramNumber && r.disbursementProgramNumber.toLowerCase().includes(q)) ||
        (r.bankOrderNumber && r.bankOrderNumber.toLowerCase().includes(q)) ||
        r.demandName.toLowerCase().includes(q) ||
        (r.demandProcessNumber && r.demandProcessNumber.toLowerCase().includes(q))
      )
    })
  })

  const handleIrPresetClick = (presetId: string) => {
    applyIrPreset(presetId)
    refreshIrData()
  }

  const handleExportIrCsv = () => {
    if (filteredIrRows.value.length === 0) {
      toast.warning('Nenhum registro para exportar.')
      return
    }
    isExportingIrCsv.value = true
    try {
      exportIrRetentionToCsv(filteredIrRows.value)
      toast.success('Relatório de Retenção de IR exportado em CSV com sucesso!')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao exportar CSV.')
    } finally {
      isExportingIrCsv.value = false
    }
  }

  const handleExportIrPdf = async () => {
    if (filteredIrRows.value.length === 0) {
      toast.warning('Nenhum registro para gerar o PDF.')
      return
    }
    isExportingIrPdf.value = true
    try {
      const periodLabel =
        irStartDate.value && irEndDate.value
          ? `${formatDate(irStartDate.value)} a ${formatDate(irEndDate.value)}`
          : 'Todos os registros'

      await exportIrRetentionToPdf({
        rows: filteredIrRows.value,
        summary: irSummary.value,
        periodLabel,
      })
      toast.success('Relatório de Retenção de IR em PDF gerado com sucesso!')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao gerar PDF.')
    } finally {
      isExportingIrPdf.value = false
    }
  }

  // -------------------------------------------------------------
  // Aba 2: Relatório de Execução Financeira
  // -------------------------------------------------------------
  const execSearchQuery = ref<string>('')
  const isExportingExecCsv = ref(false)

  const {
    data: execDataPayload,
    pending: execPending,
    refresh: refreshExecData,
  } = useAsyncData('demands-financial-execution-report', () => fetchCommitmentExecutionReport())

  const execRows = computed<CommitmentExecutionRow[]>(() => execDataPayload.value?.rows || [])
  const execSummary = computed(
    () =>
      execDataPayload.value?.summary || {
        totalCommittedAmount: 0,
        totalPaidCommitmentsAmount: 0,
        paidCommitmentsCount: 0,
        pendingCommitmentsCount: 0,
        commitmentsCount: 0,
      },
  )

  const filteredExecRows = computed<CommitmentExecutionRow[]>(() => {
    const q = execSearchQuery.value.trim().toLowerCase()
    if (!q) return execRows.value

    return execRows.value.filter((r) => {
      return (
        r.commitmentNumber.toLowerCase().includes(q) ||
        r.supplierName.toLowerCase().includes(q) ||
        r.supplierCnpj.includes(q) ||
        r.demandName.toLowerCase().includes(q) ||
        (r.disbursementProgramNumber && r.disbursementProgramNumber.toLowerCase().includes(q)) ||
        (r.bankOrderNumber && r.bankOrderNumber.toLowerCase().includes(q))
      )
    })
  })

  const handleExportExecCsv = () => {
    if (filteredExecRows.value.length === 0) {
      toast.warning('Nenhum registro de execução para exportar.')
      return
    }
    isExportingExecCsv.value = true
    try {
      exportExecutionToCsv(filteredExecRows.value)
      toast.success('Relatório de Execução exportado em CSV com sucesso!')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao exportar CSV.')
    } finally {
      isExportingExecCsv.value = false
    }
  }

  const irTableHeaders = [
    { text: 'Pagamento PD', value: 'is_paid', width: 120 },
    { text: 'Data Pgto PD', value: 'pd_paid_date', width: 110 },
    { text: 'NE (Empenho)', value: 'commitment_number', width: 130 },
    { text: 'Fornecedor', value: 'supplier', width: 230 },
    { text: 'NL (Liquidação)', value: 'liquidation_number', width: 130 },
    {
      text: 'Valor Retenção IR',
      value: 'ir_retention_amount',
      align: 'right' as const,
      width: 140,
    },
    { text: 'Valor da NE', value: 'commitment_amount', align: 'right' as const, width: 130 },
    { text: 'PD / OB', value: 'pd_ob', width: 160 },
    { text: 'Demanda', value: 'demand', width: 200 },
  ]

  const execTableHeaders = [
    { text: 'NE (Empenho)', value: 'commitment_number', width: 130 },
    { text: 'Emissão', value: 'issue_date', width: 100 },
    { text: 'Fornecedor', value: 'supplier', width: 200 },
    { text: 'Demanda', value: 'demand', width: 180 },
    { text: 'Valor Empenhado', value: 'committed_amount', align: 'right' as const, width: 140 },
    { text: 'Status Pagamento', value: 'status', width: 140 },
    { text: 'NLs Ordinárias', value: 'liquidated_count', align: 'center' as const, width: 120 },
    { text: 'PD / OB', value: 'pd_ob', width: 160 },
  ]
</script>

<template>
  <div class="demands-reports-page">
    <UiPageHeader
      back-to="/demands"
      subtitle="Painel consolidado de apurações fiscais, retenções de IR, notas de liquidação e execução orçamentária"
      title="Central de Relatórios de Demandas"
    >
      <template #actions>
        <div class="d-flex align-center ga-2 flex-wrap">
          <UiButton
            color="primary"
            prepend-icon="finances"
            size="sm"
            to="/commitments"
            variant="outline"
          >
            Ver Notas de Empenho
          </UiButton>
          <UiButton
            color="teal"
            prepend-icon="chart"
            size="sm"
            to="/demands/class-spending"
            variant="outline"
          >
            Gastos por Classe
          </UiButton>
        </div>
      </template>
    </UiPageHeader>

    <!-- Navegação por Abas -->
    <UiTabs v-model="activeTab" class="mb-5" color="indigo" size="sm">
      <UiTab value="ir-retention">
        <UiIcon class="mr-2" name="badge" size="18" />
        Retenção de Imposto de Renda (IR)
        <UiBadge
          v-if="irSummary.liquidationsCount > 0"
          class="ml-2"
          color="error"
          :content="irSummary.liquidationsCount"
          inline
        />
      </UiTab>
      <UiTab value="execution">
        <UiIcon class="mr-2" name="finances" size="18" />
        Execução Financeira (NE / NL / PD / OB)
      </UiTab>
      <UiTab value="shortcuts">
        <UiIcon class="mr-2" name="link" size="18" />
        Outros Relatórios & Atalhos
      </UiTab>
    </UiTabs>

    <!-- ============================================================= -->
    <!-- ABA 1: RELATÓRIO DE RETENÇÃO DE IMPOSTO DE RENDA (IR)          -->
    <!-- ============================================================= -->
    <div v-if="activeTab === 'ir-retention'">
      <!-- Painel de Filtros e Períodos Rápidos -->
      <UiCard class="mb-4">
        <div class="d-flex flex-column ga-3">
          <div class="d-flex align-center justify-space-between flex-wrap ga-2">
            <span class="text-caption font-weight-bold text-uppercase text-medium-emphasis">
              Filtrar por Período de Pagamento da PD / Cadastro da NL:
            </span>
            <div class="d-flex align-center ga-1 flex-wrap">
              <UiChip
                v-for="preset in irPresets"
                :key="preset.id"
                :color="irSelectedPreset === preset.id ? 'indigo' : 'default'"
                filter
                size="sm"
                :variant="irSelectedPreset === preset.id ? 'solid' : 'soft'"
                @click="handleIrPresetClick(preset.id)"
              >
                {{ preset.label }}
              </UiChip>
            </div>
          </div>

          <UiRow dense>
            <UiCol cols="12" md="3" sm="6">
              <UiInput
                v-model="irStartDate"
                hide-details
                label="Data Inicial"
                size="sm"
                type="date"
                variant="outline"
                @change="onCustomIrDateChange"
                @update:model-value="refreshIrData"
              />
            </UiCol>
            <UiCol cols="12" md="3" sm="6">
              <UiInput
                v-model="irEndDate"
                hide-details
                label="Data Final"
                size="sm"
                type="date"
                variant="outline"
                @change="onCustomIrDateChange"
                @update:model-value="refreshIrData"
              />
            </UiCol>
            <UiCol cols="12" md="3" sm="6">
              <UiSelect
                v-model="irPaymentStatus"
                hide-details
                :items="[
                  { title: 'Todas as Retenções', value: 'all' },
                  { title: 'Pagas (com data da PD)', value: 'paid' },
                  { title: 'Pendentes de Pagamento', value: 'pending' },
                ]"
                label="Status de Pagamento da PD"
                size="sm"
                variant="outline"
                @update:model-value="refreshIrData"
              />
            </UiCol>
            <UiCol cols="12" md="3" sm="6">
              <UiInput
                v-model="irSearchQuery"
                clearable
                hide-details
                label="Buscar Fornecedor, NE, NL, OB..."
                prepend-inner-icon="search"
                size="sm"
                variant="outline"
              />
            </UiCol>
          </UiRow>
        </div>
      </UiCard>

      <!-- Cards de Métricas (KPIs) -->
      <UiRow class="mb-4" dense>
        <UiCol cols="12" lg="3" sm="6">
          <UiCard class="pa-4 bg-red-lighten-5 border border-red-lighten-3">
            <div class="d-flex align-center justify-space-between mb-1">
              <span class="text-caption font-weight-bold text-red-darken-3 text-uppercase">
                Total de Retenção de IR
              </span>
              <UiIcon color="error" name="badge" size="20" />
            </div>
            <div class="text-h5 font-weight-bold text-red-darken-4">
              {{ formatCurrency(irSummary.totalIrRetentionAmount) }}
            </div>
            <div class="text-caption text-red-darken-2 mt-1">
              Retido na fonte de fornecedores não-simples
            </div>
          </UiCard>
        </UiCol>

        <UiCol cols="12" lg="3" sm="6">
          <UiCard class="pa-4 bg-blue-grey-lighten-5 border">
            <div class="d-flex align-center justify-space-between mb-1">
              <span class="text-caption font-weight-bold text-blue-grey-darken-3 text-uppercase">
                Total Empenhado (NEs com IR)
              </span>
              <UiIcon color="primary" name="finances" size="20" />
            </div>
            <div class="text-h5 font-weight-bold text-blue-grey-darken-4">
              {{ formatCurrency(irSummary.totalCommitmentAmount) }}
            </div>
            <div class="text-caption text-medium-emphasis mt-1">
              Valor das NEs com NLs marcadas com IR
            </div>
          </UiCard>
        </UiCol>

        <UiCol cols="12" lg="3" sm="6">
          <UiCard class="pa-4 border">
            <div class="d-flex align-center justify-space-between mb-1">
              <span class="text-caption font-weight-bold text-medium-emphasis text-uppercase">
                Qtd. Notas de Liquidação (NLs)
              </span>
              <UiIcon color="info" name="document" size="20" />
            </div>
            <div class="text-h5 font-weight-bold">
              {{ irSummary.liquidationsCount }}
            </div>
            <div class="text-caption text-success mt-1">
              {{ irSummary.paidLiquidationsCount }} pagas •
              {{ irSummary.pendingLiquidationsCount }} pendentes
            </div>
          </UiCard>
        </UiCol>

        <UiCol cols="12" lg="3" sm="6">
          <UiCard class="pa-4 border">
            <div class="d-flex align-center justify-space-between mb-1">
              <span class="text-caption font-weight-bold text-medium-emphasis text-uppercase">
                Fornecedores Impactados
              </span>
              <UiIcon color="secondary" name="account" size="20" />
            </div>
            <div class="text-h5 font-weight-bold">
              {{ irSummary.suppliersCount }}
            </div>
            <div class="text-caption text-medium-emphasis mt-1">
              Distribuição em {{ irSummary.commitmentsCount }} Notas de Empenho
            </div>
          </UiCard>
        </UiCol>
      </UiRow>

      <!-- Tabela Detalhada com Botões de Ação -->
      <UiCard>
        <template #header>
          <div class="d-flex align-center justify-space-between w-100 flex-wrap ga-2">
            <div class="d-flex align-center ga-2">
              <span class="text-subtitle-1 font-weight-bold">
                Detalhamento das Retenções de IR por Nota de Liquidação
              </span>
              <UiChip color="indigo" label size="sm" variant="soft">
                {{ filteredIrRows.length }} registros
              </UiChip>
            </div>
            <div class="d-flex align-center ga-2 flex-wrap">
              <UiActionButton
                action="refresh"
                :loading="irPending"
                tooltip="Atualizar dados"
                variant="soft"
                @click="refreshIrData"
              />
              <UiButton
                color="secondary"
                :disabled="filteredIrRows.length === 0 || isExportingIrCsv"
                :loading="isExportingIrCsv"
                prepend-icon="download"
                size="sm"
                variant="outline"
                @click="handleExportIrCsv"
              >
                Exportar CSV
              </UiButton>
              <UiButton
                color="primary"
                :disabled="filteredIrRows.length === 0 || isExportingIrPdf"
                :loading="isExportingIrPdf"
                prepend-icon="printer"
                size="sm"
                variant="solid"
                @click="handleExportIrPdf"
              >
                Baixar PDF (A4)
              </UiButton>
            </div>
          </div>
        </template>

        <UiTable :headers="irTableHeaders" :items="filteredIrRows" :loading="irPending">
          <!-- Status de Pagamento -->
          <template #item-is_paid="{ item }">
            <UiChip
              :color="(item as unknown as IrRetentionReportRow).isPaid ? 'success' : 'warning'"
              label
              size="sm"
              variant="soft"
            >
              {{ (item as unknown as IrRetentionReportRow).isPaid ? 'Pago' : 'Pendente' }}
            </UiChip>
          </template>

          <!-- Data de Pagamento da PD -->
          <template #item-pd_paid_date="{ item }">
            <span
              v-if="(item as unknown as IrRetentionReportRow).disbursementProgramPaidAt"
              class="font-weight-medium"
            >
              {{ formatDate((item as unknown as IrRetentionReportRow).disbursementProgramPaidAt) }}
            </span>
            <span v-else class="text-caption text-medium-emphasis"> Aguardando </span>
          </template>

          <!-- NE (Empenho) -->
          <template #item-commitment_number="{ item }">
            <NuxtLink
              class="font-weight-bold text-decoration-none text-primary"
              :to="
                APP_ROUTES.commitments.detail(
                  (item as unknown as IrRetentionReportRow).commitmentNumber,
                )
              "
            >
              {{ (item as unknown as IrRetentionReportRow).commitmentNumber }}
            </NuxtLink>
          </template>

          <!-- Fornecedor -->
          <template #item-supplier="{ item }">
            <div>
              <div class="font-weight-medium text-truncate" style="max-width: 220px">
                {{ (item as unknown as IrRetentionReportRow).supplierName }}
              </div>
              <div class="text-caption text-medium-emphasis">
                {{ (item as unknown as IrRetentionReportRow).supplierCnpjFormatted }}
              </div>
            </div>
          </template>

          <!-- NL (Liquidação) -->
          <template #item-liquidation_number="{ item }">
            <span class="font-weight-bold">
              {{ (item as unknown as IrRetentionReportRow).liquidationNumber }}
            </span>
          </template>

          <!-- Valor de Retenção de IR -->
          <template #item-ir_retention_amount="{ item }">
            <span class="font-weight-bold text-error">
              {{ formatCurrency((item as unknown as IrRetentionReportRow).irRetentionAmount) }}
            </span>
          </template>

          <!-- Valor Total da NE -->
          <template #item-commitment_amount="{ item }">
            <span>
              {{ formatCurrency((item as unknown as IrRetentionReportRow).commitmentTotalAmount) }}
            </span>
          </template>

          <!-- PD / OB -->
          <template #item-pd_ob="{ item }">
            <div>
              <div class="font-weight-medium">
                PD: {{ (item as unknown as IrRetentionReportRow).disbursementProgramNumber || '-' }}
              </div>
              <div class="text-caption text-medium-emphasis">
                OB: {{ (item as unknown as IrRetentionReportRow).bankOrderNumber || '-' }}
              </div>
            </div>
          </template>

          <!-- Demanda -->
          <template #item-demand="{ item }">
            <div>
              <div class="text-truncate font-weight-medium" style="max-width: 190px">
                {{ (item as unknown as IrRetentionReportRow).demandName }}
              </div>
              <div
                v-if="(item as unknown as IrRetentionReportRow).demandProcessNumber"
                class="text-caption text-medium-emphasis"
              >
                Proc. {{ (item as unknown as IrRetentionReportRow).demandProcessNumber }}
              </div>
            </div>
          </template>
        </UiTable>
      </UiCard>
    </div>

    <!-- ============================================================= -->
    <!-- ABA 2: RELATÓRIO DE EXECUÇÃO FINANCEIRA (NE/NL/PD/OB)          -->
    <!-- ============================================================= -->
    <div v-if="activeTab === 'execution'">
      <!-- Cards de Métricas da Execução -->
      <UiRow class="mb-4" dense>
        <UiCol cols="12" md="4" sm="6">
          <UiCard class="pa-4 bg-indigo-lighten-5 border">
            <span class="text-caption font-weight-bold text-indigo-darken-3 text-uppercase">
              Total Empenhado (NEs)
            </span>
            <div class="text-h5 font-weight-bold text-indigo-darken-4 mt-1">
              {{ formatCurrency(execSummary.totalCommittedAmount) }}
            </div>
            <div class="text-caption text-medium-emphasis mt-1">
              {{ execSummary.commitmentsCount }} empenhos emitidos
            </div>
          </UiCard>
        </UiCol>

        <UiCol cols="12" md="4" sm="6">
          <UiCard class="pa-4 bg-green-lighten-5 border">
            <span class="text-caption font-weight-bold text-green-darken-3 text-uppercase">
              Total Pago com OB
            </span>
            <div class="text-h5 font-weight-bold text-green-darken-4 mt-1">
              {{ formatCurrency(execSummary.totalPaidCommitmentsAmount) }}
            </div>
            <div class="text-caption text-green-darken-2 mt-1">
              {{ execSummary.paidCommitmentsCount }} empenhos pagos com OB
            </div>
          </UiCard>
        </UiCol>

        <UiCol cols="12" md="4" sm="6">
          <UiCard class="pa-4 bg-amber-lighten-5 border">
            <span class="text-caption font-weight-bold text-amber-darken-3 text-uppercase">
              Empenhos Pendentes de Pagamento
            </span>
            <div class="text-h5 font-weight-bold text-amber-darken-4 mt-1">
              {{ execSummary.pendingCommitmentsCount }}
            </div>
            <div class="text-caption text-amber-darken-2 mt-1">
              Aguardando emissão ou quitação de OB
            </div>
          </UiCard>
        </UiCol>
      </UiRow>

      <!-- Tabela da Execução -->
      <UiCard>
        <template #header>
          <div class="d-flex align-center justify-space-between w-100 flex-wrap ga-2">
            <div class="d-flex align-center ga-2">
              <span class="text-subtitle-1 font-weight-bold"> Execução por Nota de Empenho </span>
              <UiChip color="primary" label size="sm" variant="soft">
                {{ filteredExecRows.length }} empenhos
              </UiChip>
            </div>
            <div class="d-flex align-center ga-2 flex-wrap">
              <UiInput
                v-model="execSearchQuery"
                clearable
                hide-details
                label="Buscar empenho, fornecedor..."
                prepend-inner-icon="search"
                size="sm"
                style="max-width: 240px"
                variant="outline"
              />
              <UiActionButton
                action="refresh"
                :loading="execPending"
                tooltip="Atualizar execução"
                variant="soft"
                @click="refreshExecData"
              />
              <UiButton
                color="secondary"
                :disabled="filteredExecRows.length === 0 || isExportingExecCsv"
                :loading="isExportingExecCsv"
                prepend-icon="download"
                size="sm"
                variant="outline"
                @click="handleExportExecCsv"
              >
                Exportar CSV
              </UiButton>
            </div>
          </div>
        </template>

        <UiTable :headers="execTableHeaders" :items="filteredExecRows" :loading="execPending">
          <!-- NE -->
          <template #item-commitment_number="{ item }">
            <NuxtLink
              class="font-weight-bold text-decoration-none text-primary"
              :to="
                APP_ROUTES.commitments.detail(
                  (item as unknown as CommitmentExecutionRow).commitmentNumber,
                )
              "
            >
              {{ (item as unknown as CommitmentExecutionRow).commitmentNumber }}
            </NuxtLink>
          </template>

          <!-- Emissão -->
          <template #item-issue_date="{ item }">
            <span>{{ formatDate((item as unknown as CommitmentExecutionRow).issueDate) }}</span>
          </template>

          <!-- Fornecedor -->
          <template #item-supplier="{ item }">
            <div class="text-truncate" style="max-width: 190px">
              {{ (item as unknown as CommitmentExecutionRow).supplierName }}
            </div>
          </template>

          <!-- Demanda -->
          <template #item-demand="{ item }">
            <div class="text-truncate" style="max-width: 170px">
              {{ (item as unknown as CommitmentExecutionRow).demandName }}
            </div>
          </template>

          <!-- Valor Empenhado -->
          <template #item-committed_amount="{ item }">
            <span class="font-weight-medium">
              {{ formatCurrency((item as unknown as CommitmentExecutionRow).committedAmount) }}
            </span>
          </template>

          <!-- Status Pagamento -->
          <template #item-status="{ item }">
            <UiChip
              :color="(item as unknown as CommitmentExecutionRow).isPaid ? 'success' : 'warning'"
              label
              size="sm"
              variant="soft"
            >
              {{ (item as unknown as CommitmentExecutionRow).isPaid ? 'Pago com OB' : 'Pendente' }}
            </UiChip>
          </template>

          <!-- Qtd NLs Ordinárias -->
          <template #item-liquidated_count="{ item }">
            <UiChip size="sm" variant="soft">
              {{ (item as unknown as CommitmentExecutionRow).liquidatedCount }}
            </UiChip>
          </template>

          <!-- PD / OB -->
          <template #item-pd_ob="{ item }">
            <div class="text-caption">
              <div>
                PD:
                {{ (item as unknown as CommitmentExecutionRow).disbursementProgramNumber || '-' }}
              </div>
              <div>
                OB: {{ (item as unknown as CommitmentExecutionRow).bankOrderNumber || '-' }}
              </div>
            </div>
          </template>
        </UiTable>
      </UiCard>
    </div>

    <!-- ============================================================= -->
    <!-- ABA 3: OUTROS RELATÓRIOS & ATALHOS DO MÓDULO                   -->
    <!-- ============================================================= -->
    <div v-if="activeTab === 'shortcuts'">
      <UiRow>
        <UiCol cols="12" md="4">
          <UiCard class="pa-4 h-100 d-flex flex-column justify-space-between">
            <div>
              <div class="d-flex align-center ga-2 mb-2">
                <UiIcon color="teal" name="chart" size="24" />
                <span class="text-subtitle-1 font-weight-bold">Gastos por Classe de Material</span>
              </div>
              <p class="text-body-2 text-medium-emphasis">
                Apuração e controle do teto anual de compras por classe de produtos para cumprimento
                dos limites da Lei 14.133/2021.
              </p>
            </div>
            <div class="mt-4">
              <UiButton
                block
                color="teal"
                prepend-icon="link"
                size="sm"
                to="/demands/class-spending"
                variant="solid"
              >
                Acessar Gastos por Classe
              </UiButton>
            </div>
          </UiCard>
        </UiCol>

        <UiCol cols="12" md="4">
          <UiCard class="pa-4 h-100 d-flex flex-column justify-space-between">
            <div>
              <div class="d-flex align-center ga-2 mb-2">
                <UiIcon color="primary" name="finances" size="24" />
                <span class="text-subtitle-1 font-weight-bold"
                  >Painel de Notas de Empenho (NEs)</span
                >
              </div>
              <p class="text-body-2 text-medium-emphasis">
                Gestão completa de empenhos, inclusão de Notas de Liquidação ordinárias e de IR,
                registro de PDs e emissão de OBs.
              </p>
            </div>
            <div class="mt-4">
              <UiButton
                block
                color="primary"
                prepend-icon="link"
                size="sm"
                to="/commitments"
                variant="solid"
              >
                Acessar Notas de Empenho
              </UiButton>
            </div>
          </UiCard>
        </UiCol>

        <UiCol cols="12" md="4">
          <UiCard class="pa-4 h-100 d-flex flex-column justify-space-between">
            <div>
              <div class="d-flex align-center ga-2 mb-2">
                <UiIcon color="indigo" name="document" size="24" />
                <span class="text-subtitle-1 font-weight-bold"
                  >Relatórios das Licitações (Atas / Disputas)</span
                >
              </div>
              <p class="text-body-2 text-medium-emphasis">
                Emissão individual de termos de encerramento, atas de realização de disputa, mapa de
                propostas e relatórios homologados por demanda.
              </p>
            </div>
            <div class="mt-4">
              <UiButton
                block
                color="indigo"
                prepend-icon="link"
                size="sm"
                to="/demands"
                variant="solid"
              >
                Ver Lista de Demandas
              </UiButton>
            </div>
          </UiCard>
        </UiCol>
      </UiRow>
    </div>
  </div>
</template>

<style scoped>
  .demands-reports-page {
    width: 100%;
  }
</style>
