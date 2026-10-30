<script setup lang="ts">
  import { ref, computed, watch } from 'vue'
  import { useCopyToClipboard } from '~/composables/useCopyToClipboard'
  import {
    useDemandReports,
    resolveDemandYear,
    type DemandWithClassProductsRow,
  } from '~/composables/useDemandReports'
  import type { DemandRow } from '~/composables/useDemands'
  import { useSystemSettings } from '~/composables/useSystemSettings'
  import { DEFAULT_CLASS_CEILING_2026 } from '~/schemas/forms/system-settings'
  import {
    buildDemandClassBalanceRows,
    generateDemandClassBalanceTableHtml,
    generateDemandClassBalanceTableText,
  } from '~/utils/demandClassBalanceTable'
  import type { DemandTermsItem } from '~/utils/demandTermsOfReferenceTable'
  import { formatCurrency } from '~/utils/formatters'

  export type DemandClassBalanceModalDemand = Pick<
    DemandRow,
    'id' | 'name' | 'dispute_date' | 'internal_process_number' | 'created_at'
  >

  const props = withDefaults(
    defineProps<{
      demand?: DemandClassBalanceModalDemand | null
      items?: DemandTermsItem[] | null
    }>(),
    {
      demand: null,
      items: () => [],
    },
  )

  const isModalOpen = defineModel<boolean>({ default: false })

  const includeItemsCount = ref(false)
  const includeTotalsFooter = ref(true)
  const isLoading = ref(false)

  const ceilingsMap = ref<Record<string, number>>({
    '2026': DEFAULT_CLASS_CEILING_2026,
  })
  const allDemands = ref<DemandWithClassProductsRow[]>([])

  const { fetchProductClassAnnualCeilings, getCeilingForYear } = useSystemSettings()
  const { fetchDemandsForClassSpending } = useDemandReports()
  const { copy, copyHtml } = useCopyToClipboard()

  const isCopied = ref(false)
  const isHtmlCopied = ref(false)

  const loadSpendingContext = async () => {
    isLoading.value = true
    try {
      const [ceilings, demands] = await Promise.all([
        fetchProductClassAnnualCeilings(),
        fetchDemandsForClassSpending(),
      ])
      if (ceilings) {
        ceilingsMap.value = ceilings
      }
      if (demands) {
        allDemands.value = demands
      }
    } finally {
      isLoading.value = false
    }
  }

  watch(
    () => isModalOpen.value,
    (open) => {
      if (open) {
        loadSpendingContext()
      }
    },
    { immediate: true },
  )

  const itemsList = computed<DemandTermsItem[]>(() => {
    return props.items || []
  })

  const demandYear = computed<number>(() => {
    if (!props.demand) return new Date().getFullYear()
    return resolveDemandYear(props.demand)
  })

  const ceilingInfo = computed(() => {
    return getCeilingForYear(ceilingsMap.value, demandYear.value)
  })

  const classBalanceRows = computed(() => {
    return buildDemandClassBalanceRows({
      currentDemandId: props.demand?.id,
      currentItems: itemsList.value,
      allDemands: allDemands.value,
      year: demandYear.value,
      ceilingAmount: ceilingInfo.value.amount,
    })
  })

  const exceededClasses = computed(() => {
    return classBalanceRows.value.filter((row) => row.isExceeded)
  })

  const generatedHtml = computed(() => {
    return generateDemandClassBalanceTableHtml(classBalanceRows.value, demandYear.value, {
      includeItemsCount: includeItemsCount.value,
      includeTotalsFooter: includeTotalsFooter.value,
    })
  })

  const generatedText = computed(() => {
    return generateDemandClassBalanceTableText(classBalanceRows.value, demandYear.value, {
      includeItemsCount: includeItemsCount.value,
      includeTotalsFooter: includeTotalsFooter.value,
    })
  })

  const handleCopyFormatted = async () => {
    if (!classBalanceRows.value.length) return
    const success = await copyHtml(
      generatedHtml.value,
      generatedText.value,
      'Tabela de saldo por classe copiada com formatação!',
    )
    if (success) {
      isCopied.value = true
      setTimeout(() => {
        isCopied.value = false
      }, 2500)
    }
  }

  const handleCopyHtmlSource = async () => {
    if (!classBalanceRows.value.length) return
    const success = await copy(
      generatedHtml.value,
      'Código-fonte HTML copiado para a área de transferência!',
    )
    if (success) {
      isHtmlCopied.value = true
      setTimeout(() => {
        isHtmlCopied.value = false
      }, 2500)
    }
  }
</script>

<template>
  <UiModal
    v-model="isModalOpen"
    max-width="980px"
    scrollable
    title="Tabela de Saldo por Classe de Materiais"
  >
    <div class="pa-4">
      <!-- Mensagem informativa sobre a finalidade e uso -->
      <UiAlert class="mb-4" size="sm" type="info" variant="soft">
        <div class="text-caption">
          Esta tabela apresenta as <strong>classes de materiais presentes nesta demanda</strong>,
          confrontando o <strong>Teto Anual ({{ demandYear }})</strong> com o total
          <strong>Já Empenhado em Outras Demandas</strong> do mesmo exercício e o
          <strong>Valor Estimado Nesta Demanda</strong>. Clique em
          <strong>"Copiar Tabela Formatada"</strong> e utilize <strong>Ctrl + V</strong> no seu
          documento.
        </div>
      </UiAlert>

      <!-- Alerta caso alguma classe extrapole o teto anual -->
      <UiAlert
        v-if="exceededClasses.length > 0"
        class="mb-4"
        size="sm"
        type="warning"
        variant="soft"
      >
        <div class="text-caption">
          <strong>Atenção:</strong> {{ exceededClasses.length }}
          {{ exceededClasses.length === 1 ? 'classe ultrapassa' : 'classes ultrapassam' }} o teto
          anual de <strong>{{ formatCurrency(ceilingInfo.amount) }}</strong> para o exercício de
          <strong>{{ demandYear }}</strong> considerando os valores desta demanda.
        </div>
      </UiAlert>

      <!-- Resumo e Painel de Configurações da Tabela -->
      <UiCard class="mb-4" variant="outline">
        <div class="pa-3">
          <div class="d-flex flex-wrap align-center ga-2 mb-3">
            <UiChip color="primary" size="sm" variant="soft"> Exercício: {{ demandYear }} </UiChip>
            <UiChip color="secondary" size="sm" variant="soft">
              Teto Anual por Classe: {{ formatCurrency(ceilingInfo.amount) }}
            </UiChip>
            <UiChip color="info" size="sm" variant="soft">
              Classes nesta Demanda: {{ classBalanceRows.length }}
            </UiChip>
          </div>

          <UiRow align="center" dense>
            <UiCol cols="12" md="6" sm="6">
              <UiSwitch
                v-model="includeItemsCount"
                color="primary"
                hide-details
                label="Incluir quantidade de itens por classe"
                size="sm"
              />
            </UiCol>
            <UiCol cols="12" md="6" sm="6">
              <UiSwitch
                v-model="includeTotalsFooter"
                color="primary"
                hide-details
                label="Incluir linha de totais no rodapé"
                size="sm"
              />
            </UiCol>
          </UiRow>
        </div>
      </UiCard>

      <!-- Indicador de carregamento -->
      <div v-if="isLoading" class="text-center py-8">
        <UiProgressCircular color="primary" indeterminate size="36" width="3" />
        <div class="text-caption text-grey mt-2">
          Calculando empenhos do exercício {{ demandYear }}...
        </div>
      </div>

      <!-- Pré-visualização da Tabela -->
      <div v-else-if="classBalanceRows.length > 0">
        <div class="d-flex align-center justify-space-between mb-2">
          <span class="text-caption font-weight-bold text-medium-emphasis">
            PRÉ-VISUALIZAÇÃO DA TABELA ({{ classBalanceRows.length }}
            {{ classBalanceRows.length === 1 ? 'classe' : 'classes' }}):
          </span>
          <span class="text-caption text-grey">Largura padrão: 672px</span>
        </div>

        <div
          class="border rounded pa-3 bg-white overflow-x-auto shadow-sm class-balance-preview-container"
          style="max-height: 480px; overflow-y: auto"
        >
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div class="class-balance-html-wrapper" v-html="generatedHtml" />
        </div>
      </div>

      <UiAlert v-else type="warning" variant="soft">
        Nenhum produto cadastrado nesta demanda ainda. Adicione itens antes de gerar a tabela de
        saldo por classe.
      </UiAlert>
    </div>

    <!-- Ações no rodapé do modal -->
    <template #actions>
      <UiButton variant="ghost" @click="isModalOpen = false"> Fechar </UiButton>
      <UiSpacer />
      <UiButton
        color="secondary"
        :disabled="!classBalanceRows.length || isLoading"
        prepend-icon="document"
        variant="outline"
        @click="handleCopyHtmlSource"
      >
        {{ isHtmlCopied ? 'HTML Copiado!' : 'Copiar Código HTML' }}
      </UiButton>
      <UiButton
        color="primary"
        :disabled="!classBalanceRows.length || isLoading"
        :prepend-icon="isCopied ? 'check' : 'copy'"
        variant="solid"
        @click="handleCopyFormatted"
      >
        {{ isCopied ? 'Tabela Copiada!' : 'Copiar Tabela Formatada' }}
      </UiButton>
    </template>
  </UiModal>
</template>

<style scoped>
  .class-balance-preview-container {
    border-color: #e2e8f0;
  }
  .class-balance-html-wrapper :deep(table) {
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  }
</style>
