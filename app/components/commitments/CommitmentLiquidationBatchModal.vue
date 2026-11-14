<script setup lang="ts">
  import { ref, computed, watch, onMounted } from 'vue'
  import { useCommitments, type BatchLiquidationItemInput } from '~/composables/useCommitments'
  import { useSystemSettings } from '~/composables/useSystemSettings'
  import {
    calculateSuggestedIrRetention,
    generateSequenceTokens,
    parseLiquidationInput,
  } from '~/utils/liquidationNoteParser'
  import { formatCurrency, getTodayDateString } from '~/utils/formatters'
  import { parseRetentionAmount } from '~/schemas/forms/commitment'

  interface Props {
    commitmentId: string
    commitmentNumber: string
    totalAmount: number
    isSimplesOptant?: boolean
    existingLiquidations?: Array<{ id?: string; liquidation_number: string }>
  }

  const props = withDefaults(defineProps<Props>(), {
    isSimplesOptant: false,
    existingLiquidations: () => [],
  })

  const emit = defineEmits<{
    (e: 'saved', count: number): void
  }>()

  const isOpen = defineModel<boolean>({ default: false })

  const { addMultipleLiquidationNotes } = useCommitments()
  const { fetchIrRetentionRate } = useSystemSettings()
  const toast = useToast()

  // Form State
  const yearInput = ref('2026')
  const issueDateInput = ref(getTodayDateString())
  const rawTextInput = ref('')
  const observationInput = ref('')
  const isSaving = ref(false)
  const saveError = ref('')

  // Sequence Assistant state
  const isAssistantExpanded = ref(false)
  const seq1Start = ref('45')
  const seq1Count = ref(2)
  const seq2Start = ref('78')
  const seq2Count = ref(props.isSimplesOptant ? 2 : 3)

  // IR retention rate
  const irRetentionRate = ref(1.2)
  const manualIrNlSelection = ref<string | null>(null)
  const retentionAmountsMap = ref<Record<string, string | number>>({})

  const suggestedRetentionAmount = computed(() =>
    calculateSuggestedIrRetention(props.totalAmount, irRetentionRate.value),
  )

  const existingNlSet = computed(() => {
    return new Set(
      props.existingLiquidations.map((nl) => nl.liquidation_number.trim().toUpperCase()),
    )
  })

  const initDefaults = async () => {
    const commitmentYear = props.commitmentNumber.slice(0, 4) || '2026'
    yearInput.value = commitmentYear
    issueDateInput.value = getTodayDateString()
    rawTextInput.value = ''
    observationInput.value = ''
    saveError.value = ''
    manualIrNlSelection.value = null
    retentionAmountsMap.value = {}
    seq2Count.value = props.isSimplesOptant ? 2 : 3

    try {
      const rate = await fetchIrRetentionRate()
      irRetentionRate.value = rate
    } catch {
      irRetentionRate.value = 1.2
    }
  }

  onMounted(() => {
    initDefaults()
  })

  watch(
    () => isOpen.value,
    (open) => {
      if (open) {
        initDefaults()
      }
    },
  )

  watch(
    () => props.isSimplesOptant,
    (simples) => {
      seq2Count.value = simples ? 2 : 3
    },
  )

  // Interpreta os números das NLs a partir do texto
  const parsedNlNumbers = computed(() => {
    return parseLiquidationInput(rawTextInput.value, yearInput.value)
  })

  interface ParsedBatchNlItem {
    liquidationNumber: string
    isExisting: boolean
    isIrRetention: boolean
    irRetentionAmount: string | number
  }

  const parsedItems = computed<ParsedBatchNlItem[]>(() => {
    const list = parsedNlNumbers.value
    if (list.length === 0) return []

    // Determina qual item deve ser a retenção de IR (se aplicável)
    let autoIrNlNumber: string | null = null
    if (!props.isSimplesOptant && list.length > 0) {
      if (manualIrNlSelection.value && list.includes(manualIrNlSelection.value)) {
        autoIrNlNumber = manualIrNlSelection.value
      } else if (list.length === 5) {
        // Padrão de 5 NLs: a 5ª (última) é a de retenção
        autoIrNlNumber = list[4]
      } else {
        // Se houver mais de 1 item e não estiver marcado manualmente, sugere a última
        autoIrNlNumber = list[list.length - 1]
      }
    }

    return list.map((nlNumber) => {
      const isExisting = existingNlSet.value.has(nlNumber.toUpperCase())
      const isIrRetention = !props.isSimplesOptant && autoIrNlNumber === nlNumber
      const currentAmount =
        retentionAmountsMap.value[nlNumber] ??
        (isIrRetention ? String(suggestedRetentionAmount.value) : '')

      return {
        liquidationNumber: nlNumber,
        isExisting,
        isIrRetention,
        irRetentionAmount: currentAmount,
      }
    })
  })

  const ordinaryCount = computed(() => parsedItems.value.filter((it) => !it.isIrRetention).length)
  const irCount = computed(() => parsedItems.value.filter((it) => it.isIrRetention).length)

  const hasExistingConflicts = computed(() => parsedItems.value.some((it) => it.isExisting))

  const isIrRetentionMissingAmount = computed(() => {
    if (props.isSimplesOptant) return false
    return parsedItems.value.some((it) => {
      if (!it.isIrRetention) return false
      const parsed = parseRetentionAmount(it.irRetentionAmount)
      return parsed === null || parsed <= 0
    })
  })

  const canSave = computed(() => {
    return (
      parsedItems.value.length > 0 &&
      !hasExistingConflicts.value &&
      !isIrRetentionMissingAmount.value &&
      !isSaving.value
    )
  })

  // Handlers do Assistente de Sequências
  const handleApplySequences = () => {
    const s1Start = parseInt(seq1Start.value, 10)
    const s1Cnt = Number(seq1Count.value) || 2
    const s2Start = parseInt(seq2Start.value, 10)
    const s2Cnt = Number(seq2Count.value) || (props.isSimplesOptant ? 2 : 3)

    if (isNaN(s1Start) || isNaN(s2Start)) {
      toast.error('Informe os números iniciais para as duas sequências.')
      return
    }

    const seq1Tokens = generateSequenceTokens(s1Start, s1Cnt, yearInput.value)
    const seq2Tokens = generateSequenceTokens(s2Start, s2Cnt, yearInput.value)

    const allTokens = [...seq1Tokens, ...seq2Tokens]
    rawTextInput.value = allTokens.join(', ')
    toast.info(`${allTokens.length} NLs geradas pelo assistente de sequências.`)
  }

  const handleToggleIrRetention = (nlNumber: string) => {
    if (props.isSimplesOptant) return
    if (manualIrNlSelection.value === nlNumber) {
      manualIrNlSelection.value = 'none'
    } else {
      manualIrNlSelection.value = nlNumber
      if (retentionAmountsMap.value[nlNumber] === undefined) {
        retentionAmountsMap.value[nlNumber] = String(suggestedRetentionAmount.value)
      }
    }
  }

  const handleApplySuggestedAmount = (nlNumber: string) => {
    retentionAmountsMap.value[nlNumber] = String(suggestedRetentionAmount.value)
  }

  const handleRemoveNlFromList = (nlNumber: string) => {
    const remaining = parsedNlNumbers.value.filter((n) => n !== nlNumber)
    rawTextInput.value = remaining.join(', ')
  }

  const handleSaveBatch = async () => {
    saveError.value = ''
    if (!canSave.value) return

    isSaving.value = true
    try {
      const itemsPayload: BatchLiquidationItemInput[] = parsedItems.value.map((item) => ({
        liquidationNumber: item.liquidationNumber,
        isIrRetention: item.isIrRetention,
        irRetentionAmount: item.isIrRetention ? item.irRetentionAmount : null,
      }))

      await addMultipleLiquidationNotes({
        commitmentId: props.commitmentId,
        commitmentNumber: props.commitmentNumber,
        issueDate: issueDateInput.value,
        observation: observationInput.value || null,
        items: itemsPayload,
      })

      toast.success(`${itemsPayload.length} Notas de Liquidação cadastradas com sucesso!`)
      emit('saved', itemsPayload.length)
      isOpen.value = false
    } catch (err: unknown) {
      saveError.value = err instanceof Error ? err.message : 'Erro ao cadastrar NLs em lote.'
    } finally {
      isSaving.value = false
    }
  }
</script>

<template>
  <UiModal
    v-model="isOpen"
    max-width="720px"
    title="Cadastrar Notas de Liquidação (NL)"
    transparent-header
  >
    <!-- Header status badge -->
    <div class="d-flex align-center justify-space-between flex-wrap ga-2 mb-3">
      <div class="text-caption text-grey">
        Nota de Empenho: <strong class="text-primary">{{ commitmentNumber }}</strong>
      </div>
      <UiChip v-if="isSimplesOptant" color="success" size="sm" variant="soft">
        Optante pelo Simples Nacional (Padrão: 4 NLs)
      </UiChip>
      <UiChip v-else color="warning" size="sm" variant="soft">
        Não Optante (Padrão: 4 NLs + 1 NL Retenção IR)
      </UiChip>
    </div>

    <UiAlert v-if="saveError" class="mb-3" type="error" variant="soft">
      {{ saveError }}
    </UiAlert>

    <!-- Parâmetros Globais da Emissão -->
    <UiRow dense>
      <UiCol cols="12" sm="4">
        <UiInput
          v-model="yearInput"
          hint="Ano padrão para o prefixo (YYYYNL)"
          label="Ano Base *"
          max="2100"
          min="1990"
          placeholder="2026"
          type="number"
        />
      </UiCol>
      <UiCol cols="12" sm="8">
        <UiInput
          v-model="issueDateInput"
          hint="Data de emissão aplicada a todas as NLs"
          label="Data de Emissão *"
          type="date"
        />
      </UiCol>
    </UiRow>

    <!-- Assistente de Duas Sequências Expansível -->
    <div class="my-3 border rounded-lg pa-3 bg-surface-variant">
      <div
        class="d-flex align-center justify-space-between cursor-pointer"
        @click="isAssistantExpanded = !isAssistantExpanded"
      >
        <div class="d-flex align-center ga-2 text-subtitle-2 font-weight-medium">
          <UiIcon color="primary" name="playlistAdd" size="sm" />
          <span>Assistente de Sequências Duplas</span>
          <UiChip color="primary" size="xs" variant="soft">Atalho Rápido</UiChip>
        </div>
        <UiButton
          color="primary"
          :icon="isAssistantExpanded ? 'chevronUp' : 'chevronDown'"
          size="xs"
          variant="ghost"
        />
      </div>

      <div v-if="isAssistantExpanded" class="mt-3">
        <div class="text-caption text-grey mb-3">
          Gere automaticamente os dois blocos sequenciais habituais (ex: 2 na primeira sequência e 2
          ou 3 na segunda).
        </div>
        <UiRow dense>
          <UiCol cols="12" sm="6">
            <div class="pa-2 border rounded bg-surface">
              <div class="text-caption font-weight-bold mb-1 text-primary">Sequência 1</div>
              <div class="d-flex ga-2">
                <UiInput
                  v-model="seq1Start"
                  density="compact"
                  hint="Início (ex: 45)"
                  label="Início"
                  placeholder="45"
                />
                <UiInput
                  v-model.number="seq1Count"
                  density="compact"
                  hint="Qtd (ex: 2)"
                  label="Qtd"
                  max="10"
                  min="1"
                  type="number"
                />
              </div>
            </div>
          </UiCol>

          <UiCol cols="12" sm="6">
            <div class="pa-2 border rounded bg-surface">
              <div class="text-caption font-weight-bold mb-1 text-primary">Sequência 2</div>
              <div class="d-flex ga-2">
                <UiInput
                  v-model="seq2Start"
                  density="compact"
                  hint="Início (ex: 78)"
                  label="Início"
                  placeholder="78"
                />
                <UiInput
                  v-model.number="seq2Count"
                  density="compact"
                  :hint="`Qtd (${isSimplesOptant ? '2 Simples' : '3 c/ IR'})`"
                  label="Qtd"
                  max="10"
                  min="1"
                  type="number"
                />
              </div>
            </div>
          </UiCol>
        </UiRow>

        <div class="d-flex justify-end mt-2">
          <UiButton
            color="primary"
            prepend-icon="playlistAdd"
            size="sm"
            variant="soft"
            @click="handleApplySequences"
          >
            Preencher com as Sequências
          </UiButton>
        </div>
      </div>
    </div>

    <!-- Entrada Livre de Números -->
    <div class="mb-3">
      <UiTextarea
        v-model="rawTextInput"
        hint="Exemplo: 45, 46, 78, 79, 80 ou faixas 45-46, 78-80. O sistema completa os zeros e adiciona o prefixo SIAFEM."
        label="Números das NLs (Separados por vírgula, espaço ou linha) *"
        persistent-hint
        placeholder="00045, 00046, 00078, 00079, 00080"
        rows="2"
      />
    </div>

    <!-- Tabela de Pré-visualização ao Vivo -->
    <div v-if="parsedItems.length > 0" class="mb-3">
      <div class="d-flex align-center justify-space-between mb-2">
        <div class="text-caption font-weight-bold text-uppercase text-medium-emphasis">
          Pré-visualização das Notas de Liquidação ({{ parsedItems.length }})
        </div>
        <div class="d-flex align-center ga-1">
          <UiChip color="primary" size="xs" variant="soft">
            {{ ordinaryCount }} Ordinária{{ ordinaryCount > 1 ? 's' : '' }}
          </UiChip>
          <UiChip v-if="irCount > 0" color="warning" size="xs" variant="soft">
            +{{ irCount }} Retenção IR
          </UiChip>
        </div>
      </div>

      <div class="border rounded-lg overflow-hidden">
        <div
          v-for="(item, idx) in parsedItems"
          :key="item.liquidationNumber"
          class="d-flex align-center justify-space-between pa-2 border-b last-border-none flex-wrap ga-2"
          :class="{ 'bg-red-lighten-5': item.isExisting }"
        >
          <div class="d-flex align-center ga-2">
            <span class="text-caption text-grey" style="min-width: 20px">{{ idx + 1 }}.</span>
            <span class="font-weight-bold text-primary">{{ item.liquidationNumber }}</span>

            <UiChip v-if="item.isExisting" color="error" size="xs" variant="solid">
              Já cadastrada no empenho
            </UiChip>

            <UiChip
              v-else-if="!isSimplesOptant && item.isIrRetention"
              class="cursor-pointer"
              color="warning"
              size="xs"
              variant="solid"
              @click="handleToggleIrRetention(item.liquidationNumber)"
            >
              Retenção de IR (Clique p/ alterar)
            </UiChip>

            <UiChip
              v-else-if="!isSimplesOptant"
              class="cursor-pointer"
              color="primary"
              size="xs"
              variant="soft"
              @click="handleToggleIrRetention(item.liquidationNumber)"
            >
              Ordinária
            </UiChip>

            <UiChip v-else color="primary" size="xs" variant="soft"> Ordinária </UiChip>
          </div>

          <!-- Campo de Valor de IR se a NL for de retenção -->
          <div v-if="item.isIrRetention" class="d-flex align-center ga-2" style="max-width: 280px">
            <UiInput
              v-model="retentionAmountsMap[item.liquidationNumber]"
              density="compact"
              hint="Valor retido (R$)"
              label="Valor IR *"
              min="0.01"
              placeholder="Ex: 64.80"
              step="0.01"
              type="number"
            />
            <UiButton
              color="warning"
              icon="refresh"
              size="xs"
              :tooltip="`Sugerir cálculo de ${String(irRetentionRate).replace('.', ',')}% (${formatCurrency(suggestedRetentionAmount)})`"
              variant="ghost"
              @click="handleApplySuggestedAmount(item.liquidationNumber)"
            />
          </div>

          <!-- Ação: Excluir da lista -->
          <div class="d-flex align-center">
            <UiButton
              color="error"
              icon="delete"
              size="xs"
              tooltip="Remover esta NL da lista"
              variant="ghost"
              @click="handleRemoveNlFromList(item.liquidationNumber)"
            />
          </div>
        </div>
      </div>

      <!-- Banner explicativo de cálculo de IR sugerido -->
      <div
        v-if="!isSimplesOptant && irCount > 0"
        class="mt-2 text-caption text-grey d-flex align-center ga-1"
      >
        <UiIcon color="warning" name="info" size="xs" />
        <span>
          Cálculo sugerido: <strong>{{ String(irRetentionRate).replace('.', ',') }}%</strong> do
          valor do empenho ({{ formatCurrency(totalAmount) }}) =
          <strong>{{ formatCurrency(suggestedRetentionAmount) }}</strong
          >.
        </span>
      </div>
    </div>

    <!-- Observação opcional -->
    <UiTextarea v-model="observationInput" label="Observação Geral (Opcional)" rows="1" />

    <template #actions>
      <UiButton variant="ghost" @click="isOpen = false">Cancelar</UiButton>
      <UiButton
        color="primary"
        :disabled="!canSave"
        :loading="isSaving"
        prepend-icon="check"
        variant="solid"
        @click="handleSaveBatch"
      >
        Cadastrar {{ parsedItems.length }} Nota{{ parsedItems.length > 1 ? 's' : '' }} de Liquidação
      </UiButton>
    </template>
  </UiModal>
</template>

<style scoped>
  .last-border-none:last-child {
    border-bottom: none !important;
  }
  .cursor-pointer {
    cursor: pointer;
  }
</style>
