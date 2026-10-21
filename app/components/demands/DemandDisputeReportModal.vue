<script setup lang="ts">
  import { ref, computed } from 'vue'
  import type { DemandRow } from '~/composables/useDemands'
  import type { DemandProductRow } from '~/composables/useDemandProducts'
  import { useDemandReports } from '~/composables/useDemandReports'
  import { formatCurrency } from '~/utils/formatters'

  const props = defineProps<{
    demand: DemandRow | null | undefined
    items: DemandProductRow[] | null | undefined
  }>()

  const isModalOpen = defineModel<boolean>({ default: false })

  const { generateDisputeReportData, exportDisputeReportToCsv, printDisputeReport } =
    useDemandReports()

  const reportData = computed(() => {
    return generateDisputeReportData(props.demand, props.items)
  })

  const isExportingCsv = ref(false)
  const isPrintingPdf = ref(false)

  const handleExportCsv = async () => {
    if (isExportingCsv.value || reportData.value.totalItemsCount === 0) return
    isExportingCsv.value = true
    try {
      await exportDisputeReportToCsv(reportData.value)
    } finally {
      isExportingCsv.value = false
    }
  }

  const handlePrintPdf = async () => {
    if (isPrintingPdf.value || reportData.value.totalItemsCount === 0) return
    isPrintingPdf.value = true
    try {
      await printDisputeReport(reportData.value)
    } finally {
      isPrintingPdf.value = false
    }
  }

  const getBecProductUrl = (catBec: string | number) => {
    return `https://www.bec.sp.gov.br/bec_pregao_ui/Catalogo/BEC_Catalogo_Pesquisa.aspx?chave=${catBec}`
  }

  const isNonWinnersVisible = ref(false)
</script>

<template>
  <UiModal
    v-model="isModalOpen"
    class="dispute-report-modal"
    max-width="1280px"
    scrollable
    title="Relatório de Homologação da Disputa"
  >
    <div class="dispute-report-container pa-2">
      <!-- 1. CABEÇALHO COM INFORMAÇÕES DA DEMANDA -->
      <UiCard class="mb-4 pa-4 bg-surface elevation-1 border" variant="outlined">
        <div class="d-flex flex-wrap justify-space-between align-center mb-3">
          <div>
            <span class="text-caption text-medium-emphasis text-uppercase font-weight-bold">
              Demanda
            </span>
            <h2 class="text-h6 font-weight-bold text-high-emphasis mb-0">
              {{ reportData.demand.name }}
            </h2>
          </div>
          <div class="d-flex ga-2 mt-2 mt-sm-0">
            <UiChip color="primary" size="small" variant="flat">
              {{ reportData.demand.typeLabel }}
            </UiChip>
            <UiChip color="info" size="small" variant="outlined">
              {{ reportData.demand.statusLabel }}
            </UiChip>
          </div>
        </div>

        <UiDivider class="mb-3" />

        <UiRow dense>
          <UiCol cols="12" md="3" sm="6">
            <div class="text-caption text-medium-emphasis">Nº Processo</div>
            <div class="text-body-2 font-weight-medium">
              {{ reportData.demand.processNumber }}
            </div>
          </UiCol>
          <UiCol cols="12" md="3" sm="6">
            <div class="text-caption text-medium-emphasis">Processo Interno</div>
            <div class="text-body-2 font-weight-medium">
              {{ reportData.demand.internalProcessNumber }}
            </div>
          </UiCol>
          <UiCol cols="12" md="3" sm="6">
            <div class="text-caption text-medium-emphasis">Aviso de Contratação</div>
            <div class="text-body-2 font-weight-medium">
              {{ reportData.demand.biddingNoticeNumber }}
            </div>
          </UiCol>
          <UiCol cols="12" md="3" sm="6">
            <div class="text-caption text-medium-emphasis">Nº da Disputa</div>
            <div class="text-body-2 font-weight-medium">
              {{ reportData.demand.disputeNumber }}
            </div>
          </UiCol>
          <UiCol cols="12" md="3" sm="6">
            <div class="text-caption text-medium-emphasis">Data da Disputa</div>
            <div class="text-body-2 font-weight-medium">
              {{ reportData.demand.disputeDate }}
            </div>
          </UiCol>
          <UiCol cols="12" md="3" sm="6">
            <div class="text-caption text-medium-emphasis">Abertura de Ofertas</div>
            <div class="text-body-2 font-weight-medium">
              {{ reportData.demand.offerOpeningDate }}
            </div>
          </UiCol>
          <UiCol cols="12" md="3" sm="6">
            <div class="text-caption text-medium-emphasis">PCA</div>
            <div class="text-body-2 font-weight-medium">
              {{ reportData.demand.idPca }}
            </div>
          </UiCol>
          <UiCol cols="12" md="3" sm="6">
            <div class="text-caption text-medium-emphasis">Total Homologado</div>
            <div class="text-body-2 font-weight-bold text-success">
              {{ formatCurrency(reportData.grandTotalValorFinal) }}
            </div>
          </UiCol>
        </UiRow>
      </UiCard>

      <!-- 2. CARDS DE RESUMO RÁPIDO -->
      <UiRow class="mb-4" dense>
        <UiCol cols="6" md="3" sm="6">
          <UiCard class="pa-3 text-center bg-surface-variant" variant="flat">
            <div class="text-caption text-medium-emphasis">Total de Itens</div>
            <div class="text-h6 font-weight-bold">{{ reportData.totalItemsCount }}</div>
          </UiCard>
        </UiCol>
        <UiCol cols="6" md="3" sm="6">
          <UiCard class="pa-3 text-center bg-surface-variant" variant="flat">
            <div class="text-caption text-success font-weight-bold">Vencedores</div>
            <div class="text-h6 font-weight-bold text-success">
              {{ reportData.winnersCount }}
            </div>
          </UiCard>
        </UiCol>
        <UiCol cols="6" md="3" sm="6">
          <UiCard class="pa-3 text-center bg-surface-variant" variant="flat">
            <div class="text-caption text-error font-weight-bold">Fracassados</div>
            <div class="text-h6 font-weight-bold text-error">
              {{ reportData.failedCount }}
            </div>
          </UiCard>
        </UiCol>
        <UiCol cols="6" md="3" sm="6">
          <UiCard class="pa-3 text-center bg-surface-variant" variant="flat">
            <div class="text-caption text-warning font-weight-bold">Desertos</div>
            <div class="text-h6 font-weight-bold text-warning">
              {{ reportData.desertedCount }}
            </div>
          </UiCard>
        </UiCol>
      </UiRow>

      <!-- 3. LISTAGEM AGRUPADA POR CADA VENCEDOR -->
      <div
        v-if="reportData.winnerGroups.length === 0"
        class="py-6 text-center text-medium-emphasis"
      >
        Nenhum item vencedor homologado nesta demanda.
      </div>

      <div v-else class="winner-groups-wrapper">
        <div
          v-for="group in reportData.winnerGroups"
          :key="group.supplier.id"
          class="winner-supplier-block mb-6 border rounded overflow-hidden bg-surface"
        >
          <!-- Bloco com os dados disponíveis do vencedor -->
          <div class="pa-4 bg-surface-variant border-bottom">
            <div class="d-flex flex-wrap justify-space-between align-center mb-2">
              <div class="d-flex align-center ga-2">
                <UiIcon class="text-primary" name="company" size="20" />
                <span class="text-subtitle-1 font-weight-bold text-high-emphasis">
                  {{ group.supplier.companyName }}
                </span>
              </div>
              <div class="d-flex ga-2 mt-1 mt-sm-0">
                <UiChip
                  v-if="group.supplier.isSimplesOptant"
                  color="success"
                  size="x-small"
                  variant="flat"
                >
                  Simples Nacional
                </UiChip>
                <UiChip
                  v-if="group.supplier.hasBbAccount"
                  color="primary"
                  size="x-small"
                  variant="outlined"
                >
                  Conta BB: {{ group.supplier.hasBbAccount }}
                </UiChip>
              </div>
            </div>

            <UiRow dense>
              <UiCol cols="12" md="3" sm="6">
                <span class="text-caption text-medium-emphasis">CNPJ: </span>
                <span class="text-caption font-weight-medium">
                  {{ group.supplier.cnpjFormatted || '-' }}
                </span>
              </UiCol>
              <UiCol cols="12" md="3" sm="6">
                <span class="text-caption text-medium-emphasis">Responsável: </span>
                <span class="text-caption font-weight-medium">
                  {{ group.supplier.responsibleName || '-' }}
                </span>
              </UiCol>
              <UiCol cols="12" md="3" sm="6">
                <span class="text-caption text-medium-emphasis">E-mail: </span>
                <span class="text-caption font-weight-medium">
                  {{ group.supplier.email || '-' }}
                </span>
              </UiCol>
              <UiCol cols="12" md="3" sm="6">
                <span class="text-caption text-medium-emphasis">Telefones: </span>
                <span class="text-caption font-weight-medium">
                  {{
                    [group.supplier.cellPhone, group.supplier.landline]
                      .filter(Boolean)
                      .join(' / ') || '-'
                  }}
                </span>
              </UiCol>
              <UiCol v-if="group.supplier.address" cols="12">
                <span class="text-caption text-medium-emphasis">Endereço: </span>
                <span class="text-caption font-weight-medium">{{ group.supplier.address }}</span>
              </UiCol>
            </UiRow>
          </div>

          <!-- Tabela de Itens Vencidos pelo Fornecedor -->
          <div class="table-responsive">
            <table class="w-100 text-body-2" style="border-collapse: collapse">
              <thead>
                <tr
                  class="bg-surface text-caption font-weight-bold text-uppercase border-bottom text-medium-emphasis"
                >
                  <th class="pa-2 text-left" style="width: 130px">NATUREZA</th>
                  <th class="pa-2 text-left" style="width: 110px">ITEM BEC</th>
                  <th class="pa-2 text-left">ESPECIFICAÇÃO</th>
                  <th class="pa-2 text-left" style="width: 140px">Unidade BEC</th>
                  <th class="pa-2 text-right" style="width: 80px">QTD</th>
                  <th class="pa-2 text-right" style="width: 130px">Valor Ofertado</th>
                  <th class="pa-2 text-right" style="width: 140px">Valor Final</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in group.items" :key="item.id" class="border-top">
                  <td class="pa-2 text-left text-medium-emphasis">{{ item.natureza }}</td>
                  <td class="pa-2 text-left font-weight-medium">
                    <a
                      v-if="item.itemBec && item.itemBec !== '-'"
                      class="text-primary text-decoration-none font-weight-bold d-inline-flex align-center ga-1"
                      :href="getBecProductUrl(item.itemBec)"
                      rel="noopener noreferrer"
                      target="_blank"
                      title="Abrir no catálogo BEC"
                    >
                      {{ item.itemBec }}
                      <UiIcon class="no-print" name="externalLink" size="12" />
                    </a>
                    <span v-else>{{ item.itemBec }}</span>
                  </td>
                  <td class="pa-2 text-left">
                    <span>{{ item.especificacao }}</span>
                  </td>
                  <td class="pa-2 text-left">{{ item.unidadeBec }}</td>
                  <td class="pa-2 text-right font-weight-medium">{{ item.qtd }}</td>
                  <td class="pa-2 text-right">
                    <span v-if="item.valorOfertado != null">
                      {{ formatCurrency(item.valorOfertado) }}
                    </span>
                    <span v-else class="text-medium-emphasis text-caption"> - </span>
                  </td>
                  <td class="pa-2 text-right font-weight-medium">
                    <span v-if="item.valorFinal != null">
                      {{ formatCurrency(item.valorFinal) }}
                    </span>
                    <span v-else class="text-medium-emphasis text-caption"> - </span>
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <!-- Linha de Subtotal do Fornecedor -->
                <tr class="bg-surface-variant font-weight-bold border-top text-high-emphasis">
                  <td class="pa-2 text-right text-subtitle-2" colspan="6">
                    SUBTOTAL ({{ group.supplier.companyName }}):
                  </td>
                  <td class="pa-2 text-right text-subtitle-2 text-primary font-weight-bold">
                    {{ formatCurrency(group.subtotalValorFinal) }}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <!-- TOTAL GERAL HOMOLOGADO -->
        <UiCard class="pa-4 bg-primary text-white font-weight-bold text-right elevation-2 mb-4">
          <div class="d-flex justify-space-between align-center">
            <span class="text-subtitle-1 font-weight-bold">
              TOTAL GERAL HOMOLOGADO DA DISPUTA:
            </span>
            <span class="text-h6 font-weight-bold">
              {{ formatCurrency(reportData.grandTotalValorFinal) }}
            </span>
          </div>
        </UiCard>
      </div>

      <!-- ITENS NÃO HOMOLOGADOS (DESERTOS / FRACASSADOS) - SEÇÃO COLAPSÁVEL -->
      <div v-if="reportData.nonWinnerItems.length > 0" class="mt-4 no-print">
        <UiButton
          class="mb-2"
          size="sm"
          variant="ghost"
          @click="isNonWinnersVisible = !isNonWinnersVisible"
        >
          <UiIcon
            class="mr-1"
            :name="isNonWinnersVisible ? 'chevronUp' : 'chevronDown'"
            size="16"
          />
          {{ isNonWinnersVisible ? 'Ocultar' : 'Visualizar' }} Itens Não Homologados ({{
            reportData.nonWinnerItems.length
          }})
        </UiButton>

        <div v-if="isNonWinnersVisible" class="border rounded overflow-hidden mb-4">
          <table class="w-100 text-body-2" style="border-collapse: collapse">
            <thead>
              <tr
                class="bg-surface-variant text-caption font-weight-bold text-uppercase border-bottom"
              >
                <th class="pa-2 text-left">ITEM BEC</th>
                <th class="pa-2 text-left">ESPECIFICAÇÃO</th>
                <th class="pa-2 text-left">NATUREZA</th>
                <th class="pa-2 text-right">QTD</th>
                <th class="pa-2 text-center">SITUAÇÃO</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in reportData.nonWinnerItems" :key="item.id" class="border-top">
                <td class="pa-2 text-left">{{ item.itemBec }}</td>
                <td class="pa-2 text-left">{{ item.especificacao }}</td>
                <td class="pa-2 text-left text-medium-emphasis">{{ item.natureza }}</td>
                <td class="pa-2 text-right">{{ item.qtd }}</td>
                <td class="pa-2 text-center">
                  <UiChip
                    :color="item.outcome === 'failed' ? 'error' : 'warning'"
                    size="x-small"
                    variant="flat"
                  >
                    {{ item.outcomeLabel }}
                  </UiChip>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <template #actions>
      <div class="d-flex justify-space-between w-100 align-center no-print">
        <UiButton variant="ghost" @click="isModalOpen = false">Fechar</UiButton>
        <div class="d-flex ga-2">
          <UiButton
            color="secondary"
            :disabled="reportData.totalItemsCount === 0 || isPrintingPdf"
            :loading="isPrintingPdf"
            prepend-icon="printer"
            variant="outline"
            @click="handlePrintPdf"
          >
            Exportar PDF
          </UiButton>
          <UiButton
            color="primary"
            :disabled="reportData.totalItemsCount === 0 || isExportingCsv"
            :loading="isExportingCsv"
            prepend-icon="download"
            variant="solid"
            @click="handleExportCsv"
          >
            Exportar CSV
          </UiButton>
        </div>
      </div>
    </template>
  </UiModal>
</template>

<style scoped>
  .table-responsive {
    overflow-x: auto;
  }
</style>
