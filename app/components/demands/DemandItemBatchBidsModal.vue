<script setup lang="ts">
  import { ref, computed, watch } from 'vue'
  import { useSuppliers } from '~/composables/useSuppliers'
  import { useProductBids } from '~/composables/useProductBids'
  import {
    parseBatchBidsText,
    convertRawBidsTextToStandardFormat,
    type ParsedBatchBidItem,
    type ParseBatchBidsResult,
  } from '~/utils/parseBatchBids'
  import { formatCnpj, formatUnitPrice } from '~/utils/formatters'

  interface PreviewBatchBidItem extends ParsedBatchBidItem {
    supplierName: string
    supplierId?: string | null
    isNewSupplier: boolean
  }

  const props = withDefaults(
    defineProps<{
      demandProductId: string
      referencePrice?: number | string | null
      canRegisterBids?: boolean
    }>(),
    {
      referencePrice: null,
      canRegisterBids: true,
    },
  )

  const emit = defineEmits<{
    (e: 'saved', count: number): void
  }>()

  const isOpen = defineModel<boolean>({ default: false })

  const { checkExistingSuppliersByCnpjs, createSuppliersBatch } = useSuppliers()
  const { addBidsBatch } = useProductBids()
  const toast = useToast()

  // State
  const rawText = ref('')
  const isProcessing = ref(false)
  const isSaving = ref(false)
  const saveError = ref('')
  const hasParsed = ref(false)

  const parsedItems = ref<PreviewBatchBidItem[]>([])
  const ignoredLines = ref<Array<{ lineNumber: number; line: string; reason: string }>>([])
  const activeTab = ref<'ready' | 'invalid'>('ready')

  const readyItems = computed(() =>
    parsedItems.value.filter((item) => item.isValid && item.status === 'ready'),
  )

  const invalidItems = computed(() =>
    parsedItems.value.filter((item) => !item.isValid || item.status !== 'ready'),
  )

  const newSuppliersCount = computed(
    () => readyItems.value.filter((item) => item.isNewSupplier).length,
  )

  const isBidAboveReference = (amount: number | null): boolean => {
    if (amount === null || props.referencePrice == null) return false
    const numRef = Number(props.referencePrice)
    if (Number.isNaN(numRef) || numRef <= 0) return false
    return Math.round(amount * 10000) > Math.round(numRef * 10000)
  }

  const resetState = () => {
    rawText.value = ''
    isProcessing.value = false
    isSaving.value = false
    saveError.value = ''
    hasParsed.value = false
    parsedItems.value = []
    ignoredLines.value = []
    activeTab.value = 'ready'
  }

  watch(
    () => isOpen.value,
    (open) => {
      if (!open) {
        resetState()
      }
    },
  )

  const handleFormatText = () => {
    if (!rawText.value.trim()) return
    const converted = convertRawBidsTextToStandardFormat(rawText.value)
    if (converted) {
      rawText.value = converted
      toast.success('Texto convertido para o padrão CNPJ; Razão Social; Valor!')
    }
  }

  const handleProcessText = async () => {
    saveError.value = ''
    if (!rawText.value.trim()) {
      saveError.value = 'Por favor, cole ou digite os dados antes de processar.'
      return
    }

    isProcessing.value = true

    try {
      const result: ParseBatchBidsResult = parseBatchBidsText(rawText.value)
      ignoredLines.value = result.ignoredLines

      // Normaliza o texto no formato padrão caso o usuário volte para editar
      const standardText = convertRawBidsTextToStandardFormat(rawText.value)
      if (standardText && result.readyCount > 0) {
        rawText.value = standardText
      }

      const candidateCleanCnpjs = result.items
        .filter((item) => item.isValid && item.cleanCnpj.length === 14)
        .map((item) => item.cleanCnpj)

      // Verifica fornecedores existentes na base
      const existingMap = await checkExistingSuppliersByCnpjs(candidateCleanCnpjs)

      const enhancedItems: PreviewBatchBidItem[] = result.items.map((item) => {
        if (item.isValid && item.cleanCnpj) {
          const existing = existingMap.get(item.cleanCnpj)
          if (existing) {
            return {
              ...item,
              supplierName: existing.company_name,
              supplierId: existing.id,
              isNewSupplier: false,
            }
          } else {
            const defaultName =
              item.supplierName?.trim() || `Fornecedor ${formatCnpj(item.cleanCnpj)}`
            return {
              ...item,
              supplierName: defaultName,
              supplierId: null,
              isNewSupplier: true,
            }
          }
        }
        return {
          ...item,
          supplierName: '',
          supplierId: null,
          isNewSupplier: false,
        }
      })

      parsedItems.value = enhancedItems
      hasParsed.value = true

      if (readyItems.value.length > 0) {
        activeTab.value = 'ready'
      } else {
        activeTab.value = 'invalid'
      }
    } catch (err: unknown) {
      console.error('Erro ao processar texto do lote de lances:', err)
      saveError.value =
        err instanceof Error ? err.message : 'Erro inesperado ao processar os lances informados.'
    } finally {
      isProcessing.value = false
    }
  }

  const handleBackToEdit = () => {
    hasParsed.value = false
    saveError.value = ''
  }

  const handleSaveBatch = async () => {
    if (!props.canRegisterBids) {
      saveError.value = 'O registro de lances é permitido apenas durante a fase de Disputa.'
      return
    }

    if (readyItems.value.length === 0) {
      saveError.value = 'Nenhum lance válido para registrar.'
      return
    }

    isSaving.value = true
    saveError.value = ''

    try {
      // 1. Cadastrar novos fornecedores em lote caso necessário
      const newSuppliersMap = new Map<string, string>()
      const uniqueNewSuppliers = new Map<string, string>()

      for (const item of readyItems.value) {
        if (item.isNewSupplier && !uniqueNewSuppliers.has(item.cleanCnpj)) {
          uniqueNewSuppliers.set(
            item.cleanCnpj,
            item.supplierName.trim() || `Fornecedor ${item.formattedCnpj}`,
          )
        }
      }

      if (uniqueNewSuppliers.size > 0) {
        const suppliersToCreate = Array.from(uniqueNewSuppliers.entries()).map(([cnpj, name]) => ({
          cnpj,
          company_name: name,
        }))

        const createdSuppliers = await createSuppliersBatch(suppliersToCreate)
        for (const created of createdSuppliers) {
          const clean = (created.cnpj || '').replace(/\D/g, '')
          newSuppliersMap.set(clean, created.id)
        }
      }

      // 2. Montar lista de lances com os respectivos IDs de fornecedor
      const bidsToInsert = readyItems.value.map((item) => {
        let finalSupplierId = item.supplierId
        if (item.isNewSupplier && !finalSupplierId) {
          finalSupplierId = newSuppliersMap.get(item.cleanCnpj) || null
        }
        if (!finalSupplierId) {
          throw new Error(
            `Não foi possível associar o fornecedor para o CNPJ ${item.formattedCnpj}`,
          )
        }
        return {
          supplier_id: finalSupplierId,
          amount: item.amount!,
        }
      })

      // 3. Salvar lances em lote
      const insertedCount = await addBidsBatch(props.demandProductId, bidsToInsert, {
        referencePrice: props.referencePrice,
      })

      toast.success(`${insertedCount} lance(s) registrado(s) com sucesso!`)
      emit('saved', insertedCount)
      isOpen.value = false
    } catch (err: unknown) {
      console.error('Erro ao salvar lances em lote:', err)
      saveError.value =
        err instanceof Error ? err.message : 'Erro inesperado ao salvar os lances em lote.'
    } finally {
      isSaving.value = false
    }
  }
</script>

<template>
  <UiModal v-model="isOpen" max-width="960px" persistent title="Inserir Lances em Lote">
    <template #header>
      <div class="d-flex align-center ga-2">
        <UiIcon color="primary" name="playlistAdd" />
        <span class="text-h6 font-weight-bold">Inserir Lances em Lote</span>
      </div>
    </template>

    <div class="pa-4">
      <!-- Alerta Geral de Erro -->
      <UiAlert v-if="saveError" class="mb-4" size="sm" type="error" variant="soft">
        {{ saveError }}
      </UiAlert>

      <!-- ========================================== -->
      <!-- ETAPA 1: ENTRADA / COLAGEM DO TEXTO        -->
      <!-- ========================================== -->
      <div v-if="!hasParsed">
        <UiAlert class="mb-4" size="sm" type="info" variant="soft">
          <div class="font-weight-medium mb-1">Como colar os lances:</div>
          <div class="text-caption">
            Cole a lista de lances copiada de planilhas ou diretamente da ata/tela de disputa do
            <strong>Compras.gov / BEC</strong>. O sistema reconhece tanto o padrão em blocos
            multilinhas (com CNPJ, Razão Social e Valor) quanto linhas simples com delimitador
            (espaço, tabulação ou ponto e vírgula). Valores com <strong>R$</strong> são tratados
            automaticamente.
          </div>
        </UiAlert>

        <UiCard class="mb-3" variant="outline">
          <div class="pa-3">
            <div class="text-caption font-weight-bold text-medium-emphasis mb-2">
              Formatos aceitos (selecione e copie direto):
            </div>
            <pre
              class="text-caption text-grey-darken-1 bg-grey-lighten-4 pa-2 rounded mb-2"
              style="overflow-x: auto; font-family: monospace"
            >
Padrão Compras.gov (multilinha):
64.883.946/0001-26
ME/EPP
64.883.946 GUILHERME DANILO GODOY
SP
Valor ofertado (unitário)
Valor negociado (unitário)
R$ 20,0000
-</pre>
            <pre
              class="text-caption text-grey-darken-1 bg-grey-lighten-4 pa-2 rounded"
              style="overflow-x: auto; font-family: monospace"
            >
Padrão em linha única:
64.883.946/0001-26; GUILHERME DANILO GODOY; 20,0000
37.862.590/0001-71 R$ 18,0000</pre>
          </div>
        </UiCard>

        <UiTextarea
          v-model="rawText"
          class="mb-3"
          hide-details="auto"
          label="Cole a lista de lances aqui"
          placeholder="Cole aqui o texto copiado do Compras.gov, planilha ou CNPJ e Valor..."
          rows="8"
          variant="outlined"
        />

        <div class="d-flex justify-space-between align-center mt-2">
          <UiButton variant="ghost" @click="isOpen = false"> Cancelar </UiButton>
          <div class="d-flex align-center ga-2">
            <UiButton
              :disabled="!rawText.trim() || isProcessing"
              prepend-icon="formatListBulleted"
              variant="outlined"
              @click="handleFormatText"
            >
              Converter para Padrão
            </UiButton>
            <UiButton
              color="primary"
              :disabled="!rawText.trim()"
              :loading="isProcessing"
              prepend-icon="arrowForward"
              @click="handleProcessText"
            >
              Processar Lote
            </UiButton>
          </div>
        </div>
      </div>

      <!-- ========================================== -->
      <!-- ETAPA 2: PRÉ-VISUALIZAÇÃO & CONFERÊNCIA    -->
      <!-- ========================================== -->
      <div v-else>
        <!-- Métricas do Lote -->
        <div class="d-flex align-center flex-wrap ga-2 mb-4">
          <UiChip color="primary" size="sm" variant="tonal">
            Total de Itens: {{ parsedItems.length }}
          </UiChip>
          <UiChip color="success" size="sm" variant="tonal">
            Lances Prontos: {{ readyItems.length }}
          </UiChip>
          <UiChip v-if="newSuppliersCount > 0" color="info" size="sm" variant="tonal">
            Novos Fornecedores: {{ newSuppliersCount }}
          </UiChip>
          <UiChip v-if="invalidItems.length > 0" color="error" size="sm" variant="tonal">
            Linhas com Erro: {{ invalidItems.length }}
          </UiChip>
          <UiChip v-if="ignoredLines.length > 0" color="warning" size="sm" variant="tonal">
            Cabeçalhos Ignorados: {{ ignoredLines.length }}
          </UiChip>
        </div>

        <UiTabs v-model="activeTab" class="mb-3">
          <UiTab value="ready"> Lances Válidos ({{ readyItems.length }}) </UiTab>
          <UiTab v-if="invalidItems.length > 0 || ignoredLines.length > 0" value="invalid">
            Linhas Inválidas / Ignoradas ({{ invalidItems.length + ignoredLines.length }})
          </UiTab>
        </UiTabs>

        <!-- ABA 1: LANCES VÁLIDOS -->
        <div v-if="activeTab === 'ready'">
          <UiAlert v-if="newSuppliersCount > 0" class="mb-3" size="sm" type="info" variant="soft">
            Fornecedores não localizados no sistema serão cadastrados automaticamente com o nome
            informado na tabela abaixo (editável).
          </UiAlert>

          <UiTable
            :headers="[
              { text: '#', value: 'index', width: '50px' },
              { text: 'CNPJ', value: 'cnpj', width: '170px' },
              { text: 'Fornecedor (Razão Social)', value: 'supplier' },
              { text: 'Valor do Lance', value: 'amount', align: 'right', width: '150px' },
              { text: 'Status', value: 'status', align: 'center', width: '180px' },
            ]"
            :items="readyItems"
          >
            <template #item-index="{ index }">
              <span class="text-caption text-medium-emphasis">{{ index + 1 }}</span>
            </template>

            <template #item-cnpj="{ item }">
              <span class="font-weight-medium font-monospace">{{ item.formattedCnpj }}</span>
            </template>

            <template #item-supplier="{ item }">
              <div v-if="item.isNewSupplier" class="d-flex align-center ga-2">
                <UiTextField
                  v-model="item.supplierName"
                  density="compact"
                  hide-details
                  placeholder="Razão Social do Fornecedor"
                  variant="outlined"
                />
                <UiChip color="info" size="x-small" variant="flat">Novo</UiChip>
              </div>
              <div v-else class="d-flex align-center ga-2">
                <span class="font-weight-medium">{{ item.supplierName }}</span>
                <UiChip color="success" size="x-small" variant="soft">Cadastrado</UiChip>
              </div>
            </template>

            <template #item-amount="{ item }">
              <span class="font-weight-bold">
                {{ formatUnitPrice(item.amount) }}
              </span>
            </template>

            <template #item-status="{ item }">
              <UiChip
                v-if="isBidAboveReference(item.amount)"
                color="error"
                size="sm"
                variant="soft"
              >
                Acima do Ref. (Desclassificado)
              </UiChip>
              <UiChip v-else color="success" size="sm" variant="soft"> Classificado </UiChip>
            </template>

            <template #empty> Nenhum lance pronto para ser registrado. </template>
          </UiTable>
        </div>

        <!-- ABA 2: LINHAS INVÁLIDAS / IGNORADAS -->
        <div v-else-if="activeTab === 'invalid'">
          <UiTable
            :headers="[
              { text: 'Linha', value: 'lineNumber', width: '80px' },
              { text: 'Conteúdo Original', value: 'line' },
              { text: 'Motivo', value: 'reason' },
            ]"
            :items="[
              ...invalidItems.map((i) => ({
                lineNumber: i.lineNumber,
                line: i.originalLine,
                reason: i.errorReason || 'Erro na linha',
              })),
              ...ignoredLines.map((i) => ({
                lineNumber: i.lineNumber,
                line: i.line,
                reason: i.reason,
              })),
            ]"
          >
            <template #item-lineNumber="{ item }">
              <span class="text-caption font-weight-bold">#{{ item.lineNumber }}</span>
            </template>

            <template #item-line="{ item }">
              <code class="text-caption">{{ item.line }}</code>
            </template>

            <template #item-reason="{ item }">
              <span class="text-caption text-error font-weight-medium">{{ item.reason }}</span>
            </template>
          </UiTable>
        </div>

        <div class="d-flex justify-space-between align-center mt-4">
          <UiButton
            :disabled="isSaving"
            prepend-icon="arrowBack"
            variant="ghost"
            @click="handleBackToEdit"
          >
            Voltar e Editar
          </UiButton>

          <div class="d-flex align-center ga-2">
            <UiButton :disabled="isSaving" variant="outlined" @click="isOpen = false">
              Cancelar
            </UiButton>
            <UiButton
              color="primary"
              :disabled="readyItems.length === 0"
              :loading="isSaving"
              prepend-icon="check"
              @click="handleSaveBatch"
            >
              Confirmar e Registrar Lances ({{ readyItems.length }})
            </UiButton>
          </div>
        </div>
      </div>
    </div>
  </UiModal>
</template>
