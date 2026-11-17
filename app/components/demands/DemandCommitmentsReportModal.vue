<script setup lang="ts">
  import { ref, computed } from 'vue'
  import type { DemandRow } from '~/composables/useDemands'
  import type { DemandProductRow } from '~/composables/useDemandProducts'
  import type { CommitmentRow } from '~/composables/useCommitments'
  import {
    useDemandReports,
    generateDemandCommitmentsReportData,
    type DemandCommitmentsReportData,
    type DemandCommitmentReportItem,
  } from '~/composables/useDemandReports'
  import { formatCurrency, formatUnitPrice, formatDate } from '~/utils/formatters'
  import { APP_ROUTES } from '~/utils/routes'

  const props = defineProps<{
    demand: DemandRow | null | undefined
    items: DemandProductRow[] | null | undefined
    commitments: CommitmentRow[] | null | undefined
  }>()

  const isModalOpen = defineModel<boolean>({ default: false })

  const { printDemandCommitmentsReport, exportDemandCommitmentsReportToCsv } = useDemandReports()

  const reportData = computed<DemandCommitmentsReportData>(() => {
    return generateDemandCommitmentsReportData(props.demand, props.commitments, props.items)
  })

  const isPrinting = ref(false)
  const isExportingCsv = ref(false)

  const handlePrint = async () => {
    if (isPrinting.value || reportData.value.totalCommitmentsCount === 0) return
    isPrinting.value = true
    try {
      await printDemandCommitmentsReport(reportData.value)
    } finally {
      isPrinting.value = false
    }
  }

  const handleExportCsv = async () => {
    if (isExportingCsv.value || reportData.value.totalCommitmentsCount === 0) return
    isExportingCsv.value = true
    try {
      await exportDemandCommitmentsReportToCsv(reportData.value)
    } finally {
      isExportingCsv.value = false
    }
  }

  const itemsTableHeaders = [
    { text: 'Item', value: 'itemBec', width: '90px' },
    { text: 'Especificação', value: 'description' },
    { text: 'Unid.', value: 'unit', align: 'center' as const, width: '70px' },
    { text: 'Qtd.', value: 'quantity', align: 'right' as const, width: '80px' },
    { text: 'Valor Unit.', value: 'unitPrice', align: 'right' as const, width: '120px' },
    { text: 'Subtotal', value: 'totalPrice', align: 'right' as const, width: '130px' },
  ]
</script>

<template>
  <UiModal
    v-model="isModalOpen"
    class="commitments-report-modal"
    max-width="1280px"
    scrollable
    title="Relatório de Execução dos Empenhos"
  >
    <div class="pa-2">
      <!-- 1. Cabeçalho com Informações da Demanda -->
      <UiCard class="mb-4 pa-4 bg-surface elevation-1 border" variant="outlined">
        <div class="d-flex flex-wrap justify-space-between align-center mb-3">
          <div>
            <span class="text-caption text-medium-emphasis text-uppercase font-weight-bold">
              Demanda
            </span>
            <h2 class="text-h6 font-weight-bold text-high-emphasis mb-0">
              {{ reportData.demandName }}
            </h2>
          </div>
          <div class="d-flex ga-2 mt-2 mt-sm-0">
            <UiChip color="success" size="small" variant="flat">
              {{ reportData.statusLabel }}
            </UiChip>
          </div>
        </div>

        <UiDivider class="mb-3" />

        <UiRow dense>
          <UiCol cols="12" md="3" sm="6">
            <div class="text-caption text-medium-emphasis">Nº Processo</div>
            <div class="text-body-2 font-weight-medium">
              {{ reportData.processNumber }}
            </div>
          </UiCol>
          <UiCol cols="12" md="3" sm="6">
            <div class="text-caption text-medium-emphasis">Processo Interno</div>
            <div class="text-body-2 font-weight-medium">
              {{ reportData.internalProcessNumber }}
            </div>
          </UiCol>
          <UiCol cols="12" md="3" sm="6">
            <div class="text-caption text-medium-emphasis">Aviso de Contratação</div>
            <div class="text-body-2 font-weight-medium">
              {{ reportData.biddingNoticeNumber }}
            </div>
          </UiCol>
          <UiCol cols="12" md="3" sm="6">
            <div class="text-caption text-medium-emphasis">Data de Geração</div>
            <div class="text-body-2 font-weight-medium">
              {{ reportData.generatedAt }}
            </div>
          </UiCol>
        </UiRow>
      </UiCard>

      <!-- 2. Cards de Resumo e Métricas (KPIs) -->
      <UiRow class="mb-4" dense>
        <UiCol cols="12" md="3" sm="6">
          <UiCard class="pa-3 bg-blue-grey-lighten-5 border">
            <div class="text-caption font-weight-bold text-blue-grey-darken-3 text-uppercase">
              Total Empenhado
            </div>
            <div class="text-h6 font-weight-bold text-primary mt-1">
              {{ formatCurrency(reportData.totalCommittedAmount) }}
            </div>
          </UiCard>
        </UiCol>
        <UiCol cols="12" md="3" sm="6">
          <UiCard class="pa-3 bg-green-lighten-5 border">
            <div class="text-caption font-weight-bold text-green-darken-3 text-uppercase">
              Total Pago com OB
            </div>
            <div class="text-h6 font-weight-bold text-green-darken-4 mt-1">
              {{ formatCurrency(reportData.totalPaidAmount) }}
            </div>
          </UiCard>
        </UiCol>
        <UiCol cols="12" md="3" sm="6">
          <UiCard class="pa-3 bg-indigo-lighten-5 border">
            <div class="text-caption font-weight-bold text-indigo-darken-3 text-uppercase">
              Empenhos Emitidos
            </div>
            <div class="text-h6 font-weight-bold text-indigo-darken-4 mt-1">
              {{ reportData.totalCommitmentsCount }}
            </div>
          </UiCard>
        </UiCol>
        <UiCol cols="12" md="3" sm="6">
          <UiCard class="pa-3 bg-grey-lighten-4 border">
            <div class="text-caption font-weight-bold text-grey-darken-3 text-uppercase">
              Itens Homologados
            </div>
            <div class="text-h6 font-weight-bold text-grey-darken-4 mt-1">
              {{ reportData.totalItemsCount }}
            </div>
          </UiCard>
        </UiCol>
      </UiRow>

      <!-- 3. Lista de Empenhos -->
      <div v-if="reportData.commitments.length === 0">
        <UiAlert class="my-4" type="info" variant="soft">
          Nenhum empenho cadastrado nesta demanda.
        </UiAlert>
      </div>

      <div v-else class="d-flex flex-column ga-4">
        <UiCard v-for="c in reportData.commitments" :key="c.id" class="border" variant="outline">
          <!-- Cabeçalho do Empenho -->
          <template #header>
            <div class="d-flex align-center justify-space-between w-100 flex-wrap ga-2 py-1">
              <div class="d-flex align-center ga-2 flex-wrap">
                <NuxtLink
                  class="text-decoration-none"
                  :to="APP_ROUTES.commitments.detail(c.commitmentNumber)"
                >
                  <UiChip
                    class="cursor-pointer font-weight-bold"
                    color="purple"
                    prepend-icon="document"
                    size="sm"
                    title="Abrir página da Nota de Empenho"
                    variant="solid"
                  >
                    NE {{ c.commitmentNumber }}
                  </UiChip>
                </NuxtLink>
                <UiChip color="primary" size="xs" variant="soft">
                  {{ c.statusLabel }}
                </UiChip>
                <span v-if="c.issueDate" class="text-caption text-medium-emphasis">
                  Emissão: {{ formatDate(c.issueDate) }}
                </span>
              </div>
              <div class="text-subtitle-1 font-weight-bold text-primary">
                {{ formatCurrency(c.totalAmount) }}
              </div>
            </div>
          </template>

          <div class="pa-3">
            <!-- Informações do Fornecedor e Despesa -->
            <div class="d-flex flex-wrap ga-4 mb-3 text-body-2">
              <div>
                <span class="text-caption text-medium-emphasis">Fornecedor:</span>
                <span class="font-weight-medium ml-1">{{ c.supplierName }}</span>
              </div>
              <div>
                <span class="text-caption text-medium-emphasis">CNPJ:</span>
                <span class="font-weight-medium ml-1">{{ c.supplierCnpjFormatted }}</span>
              </div>
              <div v-if="c.expenseNatureName">
                <span class="text-caption text-medium-emphasis">Natureza de Despesa:</span>
                <span class="font-weight-medium ml-1">{{ c.expenseNatureName }}</span>
              </div>
            </div>

            <!-- Tabela de Itens do Empenho -->
            <div class="mb-3">
              <span
                class="text-caption font-weight-bold text-uppercase text-medium-emphasis mb-1 d-block"
              >
                Itens Vinculados ao Empenho:
              </span>
              <UiTable density="compact" :headers="itemsTableHeaders" :items="c.items">
                <template #empty>
                  <div class="text-caption text-grey text-center py-2">
                    Nenhum item individual vinculado diretamente a este empenho.
                  </div>
                </template>

                <template #item-itemBec="{ item }">
                  <span class="font-weight-bold">
                    {{ (item as unknown as DemandCommitmentReportItem).itemBec }}
                  </span>
                </template>

                <template #item-description="{ item }">
                  <span class="text-truncate">
                    {{ (item as unknown as DemandCommitmentReportItem).description }}
                  </span>
                </template>

                <template #item-unit="{ item }">
                  <span>{{ (item as unknown as DemandCommitmentReportItem).unit }}</span>
                </template>

                <template #item-quantity="{ item }">
                  <span class="font-weight-bold">
                    {{ (item as unknown as DemandCommitmentReportItem).quantity }}
                  </span>
                </template>

                <template #item-unitPrice="{ item }">
                  <span>
                    {{ formatUnitPrice((item as unknown as DemandCommitmentReportItem).unitPrice) }}
                  </span>
                </template>

                <template #item-totalPrice="{ item }">
                  <span class="font-weight-bold">
                    {{ formatCurrency((item as unknown as DemandCommitmentReportItem).totalPrice) }}
                  </span>
                </template>
              </UiTable>
            </div>

            <!-- Bloco de Documentos Financeiros SIAFEM -->
            <UiCard class="pa-3 bg-grey-lighten-5 border" variant="outlined">
              <span
                class="text-caption font-weight-bold text-uppercase text-medium-emphasis mb-2 d-block"
              >
                Documentos SIAFEM (Execução Financeira):
              </span>

              <div class="d-flex flex-column ga-2 text-caption">
                <!-- Notas de Liquidação (NLs) - SEM data de emissão! -->
                <div class="d-flex align-center flex-wrap ga-2">
                  <span class="font-weight-bold text-grey-darken-3" style="min-width: 170px">
                    Notas de Liquidação (NL):
                  </span>
                  <div v-if="c.liquidations.length === 0" class="text-grey font-italic">
                    Nenhuma NL cadastrada
                  </div>
                  <div v-else class="d-flex align-center flex-wrap ga-1">
                    <template v-for="nl in c.liquidations" :key="nl.id">
                      <UiChip color="default" size="xs" variant="outlined">
                        {{ nl.liquidationNumber }}
                      </UiChip>
                      <UiChip v-if="nl.isIrRetention" color="warning" size="xs" variant="soft">
                        Retenção IR:
                        {{
                          nl.irRetentionAmount != null ? formatCurrency(nl.irRetentionAmount) : '-'
                        }}
                      </UiChip>
                      <UiChip v-if="nl.isCancellation" color="error" size="xs" variant="soft">
                        Cancelamento
                      </UiChip>
                    </template>
                  </div>
                </div>

                <!-- Programa de Desembolso (PD) -->
                <div class="d-flex align-center flex-wrap ga-2">
                  <span class="font-weight-bold text-grey-darken-3" style="min-width: 170px">
                    Programa de Desembolso (PD):
                  </span>
                  <span v-if="!c.disbursementProgramNumber" class="text-grey font-italic">
                    Não emitido
                  </span>
                  <div v-else class="d-flex align-center ga-1">
                    <UiChip color="default" size="xs" variant="outlined">
                      {{ c.disbursementProgramNumber }}
                    </UiChip>
                    <UiChip
                      :color="c.disbursementProgramPaidAt ? 'success' : 'warning'"
                      size="xs"
                      variant="soft"
                    >
                      {{
                        c.disbursementProgramPaidAt
                          ? `Pago em ${formatDate(c.disbursementProgramPaidAt)}`
                          : 'Aguardando Pagamento'
                      }}
                    </UiChip>
                  </div>
                </div>

                <!-- Ordem Bancária (OB) -->
                <div class="d-flex align-center flex-wrap ga-2">
                  <span class="font-weight-bold text-grey-darken-3" style="min-width: 170px">
                    Ordem Bancária (OB):
                  </span>
                  <span v-if="!c.bankOrderNumber" class="text-grey font-italic"> Não emitida </span>
                  <div v-else class="d-flex align-center ga-1">
                    <UiChip color="success" size="xs" variant="solid">
                      {{ c.bankOrderNumber }}
                    </UiChip>
                    <UiChip
                      :color="c.bankOrderPaidAt ? 'success' : 'warning'"
                      size="xs"
                      variant="soft"
                    >
                      {{
                        c.bankOrderPaidAt
                          ? `Paga em ${formatDate(c.bankOrderPaidAt)}`
                          : 'Aguardando Liquidação'
                      }}
                    </UiChip>
                  </div>
                </div>
              </div>
            </UiCard>
          </div>
        </UiCard>
      </div>
    </div>

    <!-- Rodapé com Ações -->
    <template #actions>
      <div class="d-flex justify-space-between w-100 align-center no-print">
        <UiButton variant="ghost" @click="isModalOpen = false">Fechar</UiButton>
        <div class="d-flex ga-2">
          <UiButton
            color="secondary"
            :disabled="reportData.totalCommitmentsCount === 0 || isExportingCsv"
            :loading="isExportingCsv"
            prepend-icon="download"
            variant="outline"
            @click="handleExportCsv"
          >
            Exportar CSV
          </UiButton>
          <UiButton
            color="primary"
            :disabled="reportData.totalCommitmentsCount === 0 || isPrinting"
            :loading="isPrinting"
            prepend-icon="printer"
            variant="solid"
            @click="handlePrint"
          >
            Imprimir / PDF
          </UiButton>
        </div>
      </div>
    </template>
  </UiModal>
</template>
