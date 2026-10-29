<script setup lang="ts">
  import { computed, ref } from 'vue'
  import type {
    ClassSpendingSummaryItem,
    DemandWithClassProductsRow,
  } from '~/composables/useDemandReports'
  import { DEFAULT_CLASS_CEILING_2026 } from '~/schemas/forms/system-settings'
  import { formatCurrency, formatUnitPrice } from '~/utils/formatters'

  definePageMeta({
    icon: 'chart',
    middleware: ['uge'],
    navLabel: 'Gastos por Classe',
    navSubtitle: 'Acumulado anual e saldo por classe de produtos',
    navColor: 'teal',
    navGroup: 'management',
    navOrder: 12,
    roles: ['admin', 'uge'],
    showIn: ['drawer', 'home', 'admin-shortcuts'],
  })

  useHead({ title: 'Gastos Anuais por Classe de Produtos' })

  const { isAdmin } = usePermissions()
  const toast = useToast()

  const { fetchProductClassAnnualCeilings, getCeilingForYear } = useSystemSettings()
  const {
    fetchDemandsForClassSpending,
    resolveDemandYear,
    calculateClassSpendingByYear,
    printClassSpendingReport,
    exportClassSpendingToPdf,
    exportClassSpendingToCsv,
  } = useDemandReports()

  const selectedYear = ref<number>(2026)
  const searchQuery = ref('')
  const includeItemsDetailInPrint = ref(true)
  const isExporting = ref(false)

  const detailModal = useFormModal<ClassSpendingSummaryItem>()

  const {
    data: loadedPayload,
    pending,
    refresh,
  } = useAsyncData('demands-class-spending-data', async () => {
    const [ceilings, demands] = await Promise.all([
      fetchProductClassAnnualCeilings(),
      fetchDemandsForClassSpending(),
    ])
    return {
      ceilings,
      demands,
    }
  })

  const ceilingsMap = computed<Record<string, number>>(() => {
    return loadedPayload.value?.ceilings || { '2026': DEFAULT_CLASS_CEILING_2026 }
  })

  const demandsList = computed<DemandWithClassProductsRow[]>(() => {
    return loadedPayload.value?.demands || []
  })

  const availableYearOptions = computed(() => {
    const yearsSet = new Set<number>([2026, new Date().getFullYear()])

    for (const yrKey of Object.keys(ceilingsMap.value)) {
      const parsed = Number(yrKey)
      if (Number.isInteger(parsed) && parsed >= 1990 && parsed <= 2100) {
        yearsSet.add(parsed)
      }
    }

    for (const demand of demandsList.value) {
      if (!demand.deleted_at && demand.status !== 'cancelled') {
        const dYear = resolveDemandYear(demand)
        if (Number.isInteger(dYear) && dYear >= 1990 && dYear <= 2100) {
          yearsSet.add(dYear)
        }
      }
    }

    return Array.from(yearsSet)
      .sort((a, b) => b - a)
      .map((yr) => {
        const configuredVal = ceilingsMap.value[String(yr)]
        const subtitle =
          configuredVal != null
            ? `${yr} — Teto: ${formatCurrency(configuredVal)}`
            : `${yr} — Sem teto específico`
        return {
          title: subtitle,
          value: yr,
        }
      })
  })

  const ceilingResolution = computed(() => {
    return getCeilingForYear(ceilingsMap.value, selectedYear.value)
  })

  const reportData = computed(() => {
    return calculateClassSpendingByYear({
      demands: demandsList.value,
      year: selectedYear.value,
      ceilingAmount: ceilingResolution.value.amount,
      isCeilingConfigured: ceilingResolution.value.isConfigured,
    })
  })

  const filteredClasses = computed<ClassSpendingSummaryItem[]>(() => {
    const q = searchQuery.value.trim().toLowerCase()
    if (!q) return reportData.value.classes
    return reportData.value.classes.filter(
      (cls) => cls.classId.toLowerCase().includes(q) || cls.className.toLowerCase().includes(q),
    )
  })

  const topSpentClass = computed<ClassSpendingSummaryItem | null>(() => {
    return reportData.value.classes[0] || null
  })

  const getUsageColor = (cls: ClassSpendingSummaryItem): string => {
    if (cls.isExceeded) return 'error'
    if (cls.usagePercentage >= 80) return 'warning'
    return 'success'
  }

  const handlePrintReport = async () => {
    if (reportData.value.classes.length === 0) {
      toast.warning('Não há classes com empenho emitido neste ano para gerar o relatório.')
      return
    }
    isExporting.value = true
    try {
      await printClassSpendingReport(reportData.value, includeItemsDetailInPrint.value)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao imprimir relatório.')
    } finally {
      isExporting.value = false
    }
  }

  const handleExportPdf = async () => {
    if (reportData.value.classes.length === 0) {
      toast.warning('Não há classes com empenho emitido neste ano para exportar.')
      return
    }
    isExporting.value = true
    try {
      await exportClassSpendingToPdf(reportData.value)
      toast.success('Relatório PDF exportado com sucesso!')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao exportar PDF.')
    } finally {
      isExporting.value = false
    }
  }

  const handleExportCsv = async () => {
    if (reportData.value.classes.length === 0) {
      toast.warning('Não há classes com empenho emitido neste ano para exportar.')
      return
    }
    isExporting.value = true
    try {
      await exportClassSpendingToCsv(reportData.value)
      toast.success('Planilha CSV exportada com sucesso!')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao exportar CSV.')
    } finally {
      isExporting.value = false
    }
  }
</script>

<template>
  <div>
    <UiPageHeader
      back-to="/demands"
      subtitle="Apuração anual do acumulado gasto e saldo disponível por classe de produtos (apenas itens com empenho emitido pelo valor do resultado da disputa)"
      title="Gastos por Classe de Produtos"
    >
      <template #actions>
        <div class="d-flex align-center ga-2 flex-wrap">
          <UiButton
            v-if="isAdmin"
            color="primary"
            prepend-icon="settings"
            size="sm"
            to="/admin/settings"
            variant="outline"
          >
            Configurar Teto Anual
          </UiButton>
          <UiButton
            color="primary"
            :disabled="reportData.classes.length === 0 || isExporting"
            :loading="isExporting"
            prepend-icon="printer"
            size="sm"
            variant="solid"
            @click="handlePrintReport"
          >
            Imprimir Relatório (A4)
          </UiButton>
          <UiButton
            color="secondary"
            :disabled="reportData.classes.length === 0 || isExporting"
            prepend-icon="download"
            size="sm"
            variant="soft"
            @click="handleExportPdf"
          >
            Baixar PDF
          </UiButton>
          <UiButton
            color="teal"
            :disabled="reportData.classes.length === 0 || isExporting"
            prepend-icon="document"
            size="sm"
            variant="soft"
            @click="handleExportCsv"
          >
            Exportar CSV
          </UiButton>
        </div>
      </template>
    </UiPageHeader>

    <UiAlert
      v-if="!reportData.isCeilingConfigured"
      class="mb-4"
      size="sm"
      type="warning"
      variant="soft"
    >
      <div class="d-flex align-center justify-space-between flex-wrap ga-2">
        <span>
          O exercício de <strong>{{ selectedYear }}</strong> ainda não possui um teto anual
          específico cadastrado. O cálculo está utilizando como referência o valor base de
          <strong>{{ formatCurrency(reportData.ceilingAmount) }}</strong
          >.
        </span>
        <UiButton
          v-if="isAdmin"
          color="warning"
          prepend-icon="settings"
          size="xs"
          to="/admin/settings"
          variant="solid"
        >
          Cadastrar Teto de {{ selectedYear }}
        </UiButton>
      </div>
    </UiAlert>

    <!-- Cards de Resumo (KPIs) -->
    <UiRow class="mb-4" dense>
      <UiCol cols="12" md="3" sm="6">
        <UiCard class="h-100">
          <div class="d-flex align-center justify-space-between mb-1">
            <span class="text-caption font-weight-bold text-uppercase text-medium-emphasis">
              Teto por Classe ({{ selectedYear }})
            </span>
            <UiIcon color="primary" name="finances" size="20" />
          </div>
          <div class="text-h6 font-weight-bold text-primary">
            {{ formatCurrency(reportData.ceilingAmount) }}
          </div>
          <div class="text-caption text-medium-emphasis">Limite anual por classe no exercício</div>
        </UiCard>
      </UiCol>

      <UiCol cols="12" md="3" sm="6">
        <UiCard class="h-100">
          <div class="d-flex align-center justify-space-between mb-1">
            <span class="text-caption font-weight-bold text-uppercase text-medium-emphasis">
              Classes com Empenho
            </span>
            <UiIcon color="teal" name="categories" size="20" />
          </div>
          <div class="text-h6 font-weight-bold text-high-emphasis">
            {{ reportData.totalClassesWithCommitment }}
          </div>
          <div class="text-caption text-medium-emphasis">
            {{ reportData.totalCommittedItems }} item(ns) com empenho emitido
          </div>
        </UiCard>
      </UiCol>

      <UiCol cols="12" md="3" sm="6">
        <UiCard class="h-100">
          <div class="d-flex align-center justify-space-between mb-1">
            <span class="text-caption font-weight-bold text-uppercase text-medium-emphasis">
              Acumulado Gasto no Ano
            </span>
            <UiIcon color="success" name="currency" size="20" />
          </div>
          <div class="text-h6 font-weight-bold text-success">
            {{ formatCurrency(reportData.grandTotalSpent) }}
          </div>
          <div class="text-caption text-medium-emphasis">
            Soma dos resultados de disputa empenhados
          </div>
        </UiCard>
      </UiCol>

      <UiCol cols="12" md="3" sm="6">
        <UiCard class="h-100">
          <div class="d-flex align-center justify-space-between mb-1">
            <span class="text-caption font-weight-bold text-uppercase text-medium-emphasis">
              Maior Consumo no Ano
            </span>
            <UiIcon color="warning" name="trendingUp" size="20" />
          </div>
          <div class="text-subtitle-1 font-weight-bold text-truncate">
            {{
              topSpentClass
                ? `${topSpentClass.classId} (${formatCurrency(topSpentClass.accumulatedSpent)})`
                : '—'
            }}
          </div>
          <div class="text-caption text-medium-emphasis text-truncate">
            {{ topSpentClass ? topSpentClass.className : 'Nenhum empenho registrado no ano' }}
          </div>
        </UiCard>
      </UiCol>
    </UiRow>

    <!-- Tabela Principal de Classes com Empenho Emitido -->
    <UiCard>
      <template #header>
        <UiIcon class="mr-2" color="primary" name="chart" />
        <span>Relatório de Consumo e Saldo por Classe ({{ selectedYear }})</span>
        <UiChip v-if="filteredClasses.length > 0" class="ml-2" label size="xs" variant="soft">
          {{ filteredClasses.length }} classe(s)
        </UiChip>
        <UiSpacer />

        <div class="d-flex align-center ga-3 flex-wrap">
          <UiSwitch
            v-model="includeItemsDetailInPrint"
            color="primary"
            hide-details
            label="Detalhar itens na impressão"
            size="sm"
          />
          <UiSelect
            v-model="selectedYear"
            hide-details
            item-title="title"
            item-value="value"
            :items="availableYearOptions"
            label="Ano (Exercício)"
            rounded="lg"
            size="sm"
            style="min-width: 240px"
            variant="outline"
          />
          <UiInput
            v-model="searchQuery"
            clearable
            hide-details
            label="Filtrar classe..."
            prepend-inner-icon="search"
            rounded="lg"
            size="sm"
            style="min-width: 210px; max-width: 260px"
            variant="outline"
          />
          <UiActionButton
            action="refresh"
            :loading="pending"
            tooltip="Atualizar apuração"
            variant="soft"
            @click="refresh"
          />
        </div>
      </template>

      <UiTable
        :headers="[
          { text: 'Código', value: 'classId' },
          { text: 'Classe de Produtos', value: 'className' },
          { text: 'Itens Empenhados', value: 'itemsCount', align: 'center' },
          { text: `Teto no Ano (${selectedYear})`, value: 'ceilingAmount', align: 'right' },
          { text: 'Acumulado Gasto no Ano', value: 'accumulatedSpent', align: 'right' },
          { text: 'Saldo até a Data', value: 'remainingBalance', align: 'right' },
          { text: '% Utilizado', value: 'usagePercentage', align: 'center' },
          { text: 'Ações', value: 'actions', align: 'right' },
        ]"
        :items="filteredClasses"
        :loading="pending"
      >
        <template #empty>
          <div class="text-center pa-8 text-medium-emphasis">
            <UiIcon class="mb-2" color="grey" name="info" size="36" />
            <div class="font-weight-medium">
              Nenhuma classe com empenho emitido encontrada para o exercício de {{ selectedYear }}.
            </div>
            <div class="text-caption mt-1">
              Apenas classes que possuam itens com empenho emitido e valor vencedor na disputa são
              exibidas neste relatório.
            </div>
          </div>
        </template>

        <template #item-classId="{ item }">
          <UiChip color="primary" label size="sm" variant="soft">
            {{ item.classId }}
          </UiChip>
        </template>

        <template #item-className="{ item }">
          <span class="font-weight-medium text-high-emphasis">
            {{ item.className }}
          </span>
        </template>

        <template #item-itemsCount="{ item }">
          <div class="d-flex flex-column align-center">
            <span class="font-weight-bold">{{ item.itemsCount }} item(ns)</span>
            <span class="text-caption text-medium-emphasis">
              {{ item.demandsCount }} demanda(s)
            </span>
          </div>
        </template>

        <template #item-ceilingAmount="{ item }">
          <span class="text-medium-emphasis">
            {{ formatCurrency(item.ceilingAmount) }}
          </span>
        </template>

        <template #item-accumulatedSpent="{ item }">
          <span class="font-weight-bold text-high-emphasis">
            {{ formatCurrency(item.accumulatedSpent) }}
          </span>
        </template>

        <template #item-remainingBalance="{ item }">
          <span
            class="font-weight-bold"
            :class="
              item.isExceeded
                ? 'text-error'
                : item.usagePercentage >= 80
                  ? 'text-warning'
                  : 'text-success'
            "
          >
            {{ formatCurrency(item.remainingBalance) }}
          </span>
        </template>

        <template #item-usagePercentage="{ item }">
          <UiChip :color="getUsageColor(item)" label size="sm" variant="soft">
            {{ item.usagePercentage.toFixed(2).replace('.', ',') }}%
          </UiChip>
        </template>

        <template #item-actions="{ item }">
          <div class="d-flex justify-end">
            <UiButton
              color="primary"
              prepend-icon="searchDocument"
              size="xs"
              variant="soft"
              @click="detailModal.openForTarget(item)"
            >
              Ver Empenhos
            </UiButton>
          </div>
        </template>
      </UiTable>
    </UiCard>

    <!-- Modal de Detalhamento dos Itens Empenhados da Classe -->
    <UiModal
      v-model="detailModal.isOpen.value"
      max-width="960px"
      :title="
        detailModal.target.value
          ? `Empenhos da Classe ${detailModal.target.value.classId} — ${detailModal.target.value.className} (${selectedYear})`
          : 'Detalhamento da Classe'
      "
    >
      <div v-if="detailModal.target.value">
        <UiRow class="mb-4" dense>
          <UiCol cols="12" sm="4">
            <div class="pa-3 rounded border bg-surface-variant">
              <div class="text-caption text-uppercase text-medium-emphasis font-weight-bold">
                Teto da Classe ({{ selectedYear }})
              </div>
              <div class="text-subtitle-1 font-weight-bold text-primary">
                {{ formatCurrency(detailModal.target.value.ceilingAmount) }}
              </div>
            </div>
          </UiCol>
          <UiCol cols="12" sm="4">
            <div class="pa-3 rounded border bg-surface-variant">
              <div class="text-caption text-uppercase text-medium-emphasis font-weight-bold">
                Acumulado Gasto no Ano
              </div>
              <div class="text-subtitle-1 font-weight-bold text-high-emphasis">
                {{ formatCurrency(detailModal.target.value.accumulatedSpent) }}
              </div>
            </div>
          </UiCol>
          <UiCol cols="12" sm="4">
            <div class="pa-3 rounded border bg-surface-variant">
              <div class="text-caption text-uppercase text-medium-emphasis font-weight-bold">
                Saldo até a Data
              </div>
              <div
                class="text-subtitle-1 font-weight-bold"
                :class="detailModal.target.value.isExceeded ? 'text-error' : 'text-success'"
              >
                {{ formatCurrency(detailModal.target.value.remainingBalance) }}
              </div>
            </div>
          </UiCol>
        </UiRow>

        <UiTable
          density="compact"
          :headers="[
            { text: 'Demanda / Processo', value: 'demandName' },
            { text: 'Nº Empenho', value: 'commitmentNumber' },
            { text: 'Produto / Item BEC', value: 'productName' },
            { text: 'Fornecedor Vencedor', value: 'winnerSupplierName' },
            { text: 'Qtd', value: 'quantity', align: 'right' },
            { text: 'Vl. Unit. Disputa', value: 'winningUnitPrice', align: 'right' },
            { text: 'Total Item', value: 'totalFinal', align: 'right' },
          ]"
          :items="detailModal.target.value.committedItems"
        >
          <template #item-demandName="{ item }">
            <div class="d-flex flex-column py-1">
              <NuxtLink
                class="text-primary font-weight-bold text-decoration-none"
                :to="`/demands/${item.demandId}`"
              >
                {{ item.demandName }}
              </NuxtLink>
              <span class="text-caption text-medium-emphasis">
                Proc.:
                {{ item.processNumber !== '-' ? item.processNumber : item.internalProcessNumber }}
              </span>
            </div>
          </template>

          <template #item-commitmentNumber="{ item }">
            <div class="d-flex flex-column">
              <span class="font-weight-bold">{{ item.commitmentNumber }}</span>
              <span class="text-caption text-medium-emphasis">{{ item.executionStatusLabel }}</span>
            </div>
          </template>

          <template #item-productName="{ item }">
            <div class="d-flex flex-column">
              <span class="font-weight-medium">{{ item.productName }}</span>
              <span class="text-caption text-medium-emphasis">CATBEC: {{ item.catBec }}</span>
            </div>
          </template>

          <template #item-winningUnitPrice="{ item }">
            {{ formatUnitPrice(item.winningUnitPrice) }}
          </template>

          <template #item-totalFinal="{ item }">
            <span class="font-weight-bold text-primary">
              {{ formatCurrency(item.totalFinal) }}
            </span>
          </template>
        </UiTable>
      </div>

      <template #actions>
        <UiButton variant="ghost" @click="detailModal.close"> Fechar </UiButton>
      </template>
    </UiModal>
  </div>
</template>
