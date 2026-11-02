<script setup lang="ts">
  import { ref, computed, watch } from 'vue'
  import { useProducts } from '~/composables/useProducts'
  import { useExpenseNatures } from '~/composables/useExpenseNatures'
  import { useProductClasses } from '~/composables/useProductClasses'
  import {
    parseBatchProductsText,
    type ParsedBatchProductItem,
    type ParseBatchProductsResult,
  } from '~/utils/parseBatchProducts'

  const emit = defineEmits<{
    (e: 'saved', count: number): void
  }>()

  const isOpen = defineModel<boolean>({ default: false })

  const { createProductsBatch } = useProducts()
  const { fetchAllActiveExpenseNatures } = useExpenseNatures()
  const { fetchAllActiveProductClasses } = useProductClasses()

  const isLoadingCatalogs = ref(false)
  const isSaving = ref(false)
  const saveError = ref('')

  // Defaults
  const defaultExpenseNatureId = ref<string | null>(null)
  const defaultProductClassId = ref<string | null>(null)
  const defaultIsActive = ref(true)

  // Catalogs
  const expenseNatureOptions = ref<Array<{ id: string; name: string }>>([])
  const productClassOptions = ref<Array<{ id: string; name: string }>>([])

  // Raw Input
  const rawText = ref('')
  const parsedItems = ref<ParsedBatchProductItem[]>([])
  const ignoredLines = ref<Array<{ lineNumber: number; line: string; reason: string }>>([])
  const hasParsed = ref(false)

  const loadCatalogs = async () => {
    isLoadingCatalogs.value = true
    try {
      const [natures, classes] = await Promise.all([
        fetchAllActiveExpenseNatures(),
        fetchAllActiveProductClasses(),
      ])
      expenseNatureOptions.value = natures || []
      productClassOptions.value = classes || []
    } catch (e: unknown) {
      console.error('Erro ao carregar naturezas e classes:', e)
    } finally {
      isLoadingCatalogs.value = false
    }
  }

  watch(
    () => isOpen.value,
    (open) => {
      if (open) {
        saveError.value = ''
        if (expenseNatureOptions.value.length === 0) {
          loadCatalogs()
        }
      } else {
        // Reset state on close
        rawText.value = ''
        parsedItems.value = []
        ignoredLines.value = []
        hasParsed.value = false
        saveError.value = ''
      }
    },
    { immediate: true },
  )

  const handleParseText = () => {
    saveError.value = ''
    const result: ParseBatchProductsResult = parseBatchProductsText(
      rawText.value,
      defaultExpenseNatureId.value,
      defaultProductClassId.value,
      defaultIsActive.value,
    )
    parsedItems.value = result.items
    ignoredLines.value = result.ignoredLines
    hasParsed.value = true
  }

  const validItemsCount = computed(() => parsedItems.value.filter((i) => i.isValid).length)
  const invalidItemsCount = computed(() => parsedItems.value.length - validItemsCount.value)

  const removeItem = (index: number) => {
    parsedItems.value.splice(index, 1)
    revalidateItems()
  }

  const revalidateItems = () => {
    const catMatOccurrences = new Map<number, number[]>()
    const catBecOccurrences = new Map<number, number[]>()

    parsedItems.value.forEach((item, index) => {
      const errors: string[] = []
      if (!item.name || !item.name.trim()) {
        errors.push('Nome do produto é obrigatório.')
      }
      if (!item.expense_nature_id) {
        errors.push('Natureza de despesa é obrigatória.')
      }

      if (item.cat_mat !== null && item.cat_mat !== undefined) {
        if (!Number.isInteger(Number(item.cat_mat)) || Number(item.cat_mat) <= 0) {
          errors.push('CATMAT deve ser um número inteiro positivo.')
        } else {
          item.cat_mat = Number(item.cat_mat)
          const list = catMatOccurrences.get(item.cat_mat) || []
          list.push(index)
          catMatOccurrences.set(item.cat_mat, list)
        }
      }

      if (item.cat_bec !== null && item.cat_bec !== undefined) {
        if (!Number.isInteger(Number(item.cat_bec)) || Number(item.cat_bec) <= 0) {
          errors.push('CATBEC deve ser um número inteiro positivo.')
        } else {
          item.cat_bec = Number(item.cat_bec)
          const list = catBecOccurrences.get(item.cat_bec) || []
          list.push(index)
          catBecOccurrences.set(item.cat_bec, list)
        }
      }

      item.errors = errors
      item.isValid = errors.length === 0
    })

    // Checagem de duplicidade entre linhas
    catMatOccurrences.forEach((indices, catMat) => {
      if (indices.length > 1) {
        indices.forEach((idx) => {
          parsedItems.value[idx].errors.push(`CATMAT ${catMat} duplicado nas linhas do lote.`)
          parsedItems.value[idx].isValid = false
        })
      }
    })

    catBecOccurrences.forEach((indices, catBec) => {
      if (indices.length > 1) {
        indices.forEach((idx) => {
          parsedItems.value[idx].errors.push(`CATBEC ${catBec} duplicado nas linhas do lote.`)
          parsedItems.value[idx].isValid = false
        })
      }
    })
  }

  const handleSaveBatch = async () => {
    revalidateItems()
    const validItems = parsedItems.value.filter((i) => i.isValid)
    if (validItems.length === 0) {
      saveError.value = 'Nenhum item válido para cadastrar. Corrija os erros na prévia.'
      return
    }

    isSaving.value = true
    saveError.value = ''

    try {
      const payloads = validItems.map((item) => ({
        name: item.name.trim(),
        expense_nature_id: item.expense_nature_id!,
        product_class_id: item.product_class_id || null,
        cat_mat: item.cat_mat ?? null,
        cat_bec: item.cat_bec ?? null,
        is_active: item.is_active,
      }))

      await createProductsBatch(payloads)
      emit('saved', payloads.length)
      isOpen.value = false
    } catch (err: unknown) {
      saveError.value = err instanceof Error ? err.message : String(err)
    } finally {
      isSaving.value = false
    }
  }

  const tableHeaders = [
    { text: '#', value: 'index', width: 40 },
    { text: 'Nome do Produto', value: 'name' },
    { text: 'CATMAT', value: 'cat_mat', width: 130 },
    { text: 'CATBEC', value: 'cat_bec', width: 130 },
    { text: 'Natureza de Despesa', value: 'nature', width: 220 },
    { text: 'Classe', value: 'class', width: 180 },
    { text: 'Status', value: 'status', align: 'center' as const, width: 110 },
    { text: 'Ações', value: 'actions', align: 'center' as const, width: 60 },
  ]
</script>

<template>
  <UiModal v-model="isOpen" max-width="1150px" persistent title="Adicionar Produtos em Lote">
    <template #header>
      <div class="d-flex align-center gap-2">
        <UiIcon color="primary" name="playlistAdd" />
        <span class="text-h6 font-weight-bold">Adicionar Produtos em Lote</span>
      </div>
    </template>

    <div class="pa-4">
      <!-- Alerta de Erro Geral -->
      <UiAlert v-if="saveError" class="mb-4" size="sm" type="error" variant="soft">
        {{ saveError }}
      </UiAlert>

      <!-- Seção 1: Configurações Globais / Defaults -->
      <UiCard class="mb-4" variant="outline">
        <div class="pa-3">
          <div class="text-subtitle-2 font-weight-bold mb-2 text-medium-emphasis">
            Configurações Padrão para o Lote
          </div>
          <UiRow dense>
            <UiCol cols="12" md="5">
              <UiSelect
                v-model="defaultExpenseNatureId"
                clearable
                density="compact"
                hide-details="auto"
                item-title="name"
                item-value="id"
                :items="expenseNatureOptions"
                label="Natureza de Despesa Padrão *"
                placeholder="Selecione para aplicar a todo o lote"
                variant="outline"
              />
            </UiCol>
            <UiCol cols="12" md="4">
              <UiSelect
                v-model="defaultProductClassId"
                clearable
                density="compact"
                hide-details="auto"
                item-title="name"
                item-value="id"
                :items="productClassOptions"
                label="Classe de Produto Padrão"
                placeholder="Opcional"
                variant="outline"
              />
            </UiCol>
            <UiCol class="d-flex align-center" cols="12" md="3">
              <UiSwitch
                v-model="defaultIsActive"
                color="primary"
                hide-details
                label="Ativar produtos imediatamente"
              />
            </UiCol>
          </UiRow>
        </div>
      </UiCard>

      <!-- Seção 2: Textarea para colagem -->
      <UiCard class="mb-4" variant="outline">
        <div class="pa-3">
          <div class="d-flex justify-space-between align-center mb-1">
            <span class="text-subtitle-2 font-weight-bold text-medium-emphasis">
              Colar Dados de Planilha ou Texto
            </span>
            <span class="text-caption text-medium-emphasis">
              Copie do Excel (TAB) ou CSV (; ou ,). Formato: Nome [CATMAT] [CATBEC]
            </span>
          </div>

          <UiTextarea
            v-model="rawText"
            class="font-monospace text-caption"
            hide-details
            placeholder="Exemplo copiado do Excel:&#10;Papel Sulfite A4 75g&#9;123456&#9;654321&#10;Caneta Esferográfica Azul&#9;234567&#9;&#10;Grampeador de Mesa&#9;&#9;789012"
            rows="5"
            variant="outline"
          />

          <div class="d-flex justify-space-between align-center mt-3">
            <div class="text-caption text-medium-emphasis">
              Dica: Se colar apenas nomes (um por linha), todos herdarão a Natureza Padrão
              selecionada acima.
            </div>
            <UiButton
              color="primary"
              :disabled="!rawText.trim()"
              size="sm"
              variant="solid"
              @click="handleParseText"
            >
              <UiIcon class="mr-1" name="playlistAdd" size="sm" />
              Processar e Visualizar Prévia
            </UiButton>
          </div>
        </div>
      </UiCard>

      <!-- Seção 3: Prévia Interativa -->
      <div v-if="hasParsed">
        <div class="d-flex justify-space-between align-center mb-2">
          <div class="d-flex align-center gap-2">
            <span class="text-subtitle-1 font-weight-bold">Prévia dos Produtos</span>
            <UiChip color="primary" label size="xs" variant="soft">
              Total: {{ parsedItems.length }}
            </UiChip>
            <UiChip v-if="validItemsCount > 0" color="success" label size="xs" variant="soft">
              Válidos: {{ validItemsCount }}
            </UiChip>
            <UiChip v-if="invalidItemsCount > 0" color="error" label size="xs" variant="soft">
              Com Inconsistências: {{ invalidItemsCount }}
            </UiChip>
          </div>

          <div v-if="ignoredLines.length > 0" class="text-caption text-warning font-weight-medium">
            {{ ignoredLines.length }} linha(s) em branco ignorada(s)
          </div>
        </div>

        <UiCard variant="outline">
          <div v-if="parsedItems.length === 0" class="pa-6 text-center text-medium-emphasis">
            Nenhum produto identificado no texto colado.
          </div>

          <div v-else style="max-height: 380px; overflow-y: auto">
            <UiTable :headers="tableHeaders" :items="parsedItems">
              <template #item-index="{ index }">
                <span class="text-caption text-medium-emphasis">{{ (index ?? 0) + 1 }}</span>
              </template>

              <template #item-name="{ item }">
                <UiInput
                  v-model="item.name"
                  density="compact"
                  hide-details
                  placeholder="Nome do produto *"
                  variant="outline"
                  @update:model-value="revalidateItems"
                />
              </template>

              <template #item-cat_mat="{ item }">
                <UiInput
                  v-model="item.cat_mat"
                  density="compact"
                  hide-details
                  placeholder="Ex: 123456"
                  type="number"
                  variant="outline"
                  @update:model-value="revalidateItems"
                />
              </template>

              <template #item-cat_bec="{ item }">
                <UiInput
                  v-model="item.cat_bec"
                  density="compact"
                  hide-details
                  placeholder="Ex: 654321"
                  type="number"
                  variant="outline"
                  @update:model-value="revalidateItems"
                />
              </template>

              <template #item-nature="{ item }">
                <UiSelect
                  v-model="item.expense_nature_id"
                  density="compact"
                  hide-details
                  item-title="name"
                  item-value="id"
                  :items="expenseNatureOptions"
                  placeholder="Selecione *"
                  variant="outline"
                  @update:model-value="revalidateItems"
                />
              </template>

              <template #item-class="{ item }">
                <UiSelect
                  v-model="item.product_class_id"
                  clearable
                  density="compact"
                  hide-details
                  item-title="name"
                  item-value="id"
                  :items="productClassOptions"
                  placeholder="Opcional"
                  variant="outline"
                  @update:model-value="revalidateItems"
                />
              </template>

              <template #item-status="{ item }">
                <UiTooltip v-if="!item.isValid" :text="item.errors.join(' | ')">
                  <template #activator="{ props: tooltipProps }">
                    <UiChip
                      v-bind="tooltipProps"
                      color="error"
                      label
                      size="xs"
                      style="cursor: help"
                      variant="soft"
                    >
                      <UiIcon class="mr-1" name="alertCircle" size="xs" />
                      Incompleto
                    </UiChip>
                  </template>
                </UiTooltip>
                <UiChip v-else color="success" label size="xs" variant="soft">
                  <UiIcon class="mr-1" name="checkCircle" size="xs" />
                  Pronto
                </UiChip>
              </template>

              <template #item-actions="{ index }">
                <UiButton
                  color="error"
                  density="compact"
                  icon="deleteOutline"
                  size="xs"
                  variant="ghost"
                  @click="removeItem(index ?? 0)"
                />
              </template>
            </UiTable>
          </div>
        </UiCard>
      </div>
    </div>

    <template #actions>
      <UiButton :disabled="isSaving" variant="ghost" @click="isOpen = false"> Cancelar </UiButton>
      <UiButton
        color="primary"
        :disabled="!hasParsed || validItemsCount === 0 || isSaving"
        :loading="isSaving"
        variant="solid"
        @click="handleSaveBatch"
      >
        <UiIcon class="mr-1" name="checkCircle" size="sm" />
        Cadastrar {{ validItemsCount }} Produto{{ validItemsCount === 1 ? '' : 's' }} Válido{{
          validItemsCount === 1 ? '' : 's'
        }}
      </UiButton>
    </template>
  </UiModal>
</template>
