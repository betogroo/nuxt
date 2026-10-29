<script setup lang="ts">
  import { ref, computed, watch } from 'vue'
  import { useRouter } from 'vue-router'
  import { useProducts } from '~/composables/useProducts'
  import { useProductCharacteristics } from '~/composables/useProductCharacteristics'
  import { useExpenseNatures } from '~/composables/useExpenseNatures'
  import { useProductClasses } from '~/composables/useProductClasses'
  import { useToast } from '~/composables/useToast'

  interface EditableUnit {
    id: string
    name: string
    selected: boolean
  }

  interface EditableCharacteristic {
    key: string
    value: string
  }

  const props = defineProps<{
    productId?: string | null
  }>()

  const emit = defineEmits<{
    (e: 'saved', newProductId: string): void
  }>()

  const isOpen = defineModel<boolean>({ default: false })

  const router = useRouter()
  const toast = useToast()
  const { fetchProductById, duplicateProduct } = useProducts()
  const { fetchAllSelectableKeys } = useProductCharacteristics()
  const { fetchAllActiveExpenseNatures } = useExpenseNatures()
  const { fetchAllActiveProductClasses } = useProductClasses()

  const isLoading = ref(false)
  const isSaving = ref(false)
  const errorMessage = ref('')
  const sourceProductName = ref('')

  // Form Fields
  const name = ref('')
  const expenseNatureId = ref<string | null>(null)
  const productClassId = ref<string | null>(null)
  const catMat = ref<number | string | null>(null)
  const catBec = ref<number | string | null>(null)
  const isActive = ref(true)

  const units = ref<EditableUnit[]>([])
  const characteristics = ref<EditableCharacteristic[]>([])

  // Options for selectors
  const expenseNatureOptions = ref<Array<{ id: string; name: string }>>([])
  const productClassOptions = ref<Array<{ id: string; name: string }>>([])
  const availableCharacteristicKeys = ref<Array<{ id: string; name: string }>>([])

  const keySuggestions = computed(() =>
    availableCharacteristicKeys.value.map((k) => k.name).filter(Boolean),
  )

  const loadCatalogs = async () => {
    try {
      const [natures, classes, keys] = await Promise.all([
        fetchAllActiveExpenseNatures(),
        fetchAllActiveProductClasses(),
        fetchAllSelectableKeys(),
      ])
      expenseNatureOptions.value = natures || []
      productClassOptions.value = classes || []
      availableCharacteristicKeys.value = keys || []
    } catch (e: unknown) {
      console.error('Erro ao carregar opções para duplicação:', e)
    }
  }

  const loadSourceProduct = async (id: string) => {
    isLoading.value = true
    errorMessage.value = ''
    try {
      await loadCatalogs()
      const source = await fetchProductById(id)
      if (!source) {
        throw new Error('Produto de origem não encontrado.')
      }

      sourceProductName.value = source.name
      name.value = source.name
      expenseNatureId.value = source.expense_nature_id || source.expense_natures?.id || null
      productClassId.value = source.product_class_id || source.product_classes?.id || null
      catMat.value = null
      catBec.value = null
      isActive.value = true

      units.value = (source.units || []).map((u) => ({
        id: u.id,
        name: u.name,
        selected: true,
      }))

      characteristics.value = (source.characteristics || []).map((c) => ({
        key: c.key_name,
        value: c.value,
      }))
    } catch (err: unknown) {
      errorMessage.value = err instanceof Error ? err.message : String(err)
    } finally {
      isLoading.value = false
    }
  }

  watch(
    () => [isOpen.value, props.productId] as const,
    ([open, prodId]) => {
      if (open && prodId) {
        loadSourceProduct(prodId)
      } else if (!open) {
        errorMessage.value = ''
        sourceProductName.value = ''
        name.value = ''
        units.value = []
        characteristics.value = []
      }
    },
    { immediate: true },
  )

  const addCharacteristic = () => {
    characteristics.value.push({ key: '', value: '' })
  }

  const removeCharacteristic = (index: number) => {
    characteristics.value.splice(index, 1)
  }

  const handleDuplicate = async () => {
    const trimmedName = name.value?.trim()
    if (!trimmedName) {
      errorMessage.value = 'O Nome do Produto é obrigatório.'
      return
    }

    const trimmedNature = expenseNatureId.value?.trim()
    if (!trimmedNature) {
      errorMessage.value = 'A Natureza de Despesa é obrigatória.'
      return
    }

    let parsedCatMat: number | null = null
    if (catMat.value !== null && catMat.value !== '' && catMat.value !== undefined) {
      parsedCatMat = Number(catMat.value)
      if (isNaN(parsedCatMat) || parsedCatMat <= 0 || !Number.isInteger(parsedCatMat)) {
        errorMessage.value = 'O CATMAT deve ser um número inteiro positivo.'
        return
      }
    }

    let parsedCatBec: number | null = null
    if (catBec.value !== null && catBec.value !== '' && catBec.value !== undefined) {
      parsedCatBec = Number(catBec.value)
      if (isNaN(parsedCatBec) || parsedCatBec <= 0 || !Number.isInteger(parsedCatBec)) {
        errorMessage.value = 'O CATBEC deve ser um número inteiro positivo.'
        return
      }
    }

    isSaving.value = true
    errorMessage.value = ''

    try {
      const selectedUnitIds = units.value.filter((u) => u.selected).map((u) => u.id)

      const charsToSave = characteristics.value
        .map((c) => ({
          key: typeof c.key === 'string' ? c.key.trim() : '',
          value: typeof c.value === 'string' ? c.value.trim() : '',
        }))
        .filter((c) => c.key && c.value)

      const newProduct = await duplicateProduct({
        sourceProductId: props.productId || '',
        name: trimmedName,
        expense_nature_id: trimmedNature,
        product_class_id: productClassId.value,
        cat_mat: parsedCatMat,
        cat_bec: parsedCatBec,
        is_active: isActive.value,
        unitIds: selectedUnitIds,
        characteristics: charsToSave,
      })

      toast.success(`Produto "${newProduct.name}" duplicado com sucesso!`)
      isOpen.value = false
      emit('saved', newProduct.id)
      await router.push(`/products/${newProduct.id}`)
    } catch (err: unknown) {
      errorMessage.value = err instanceof Error ? err.message : String(err)
    } finally {
      isSaving.value = false
    }
  }

  const closeModal = () => {
    isOpen.value = false
  }
</script>

<template>
  <UiModal v-model="isOpen" max-width="720px" title="Duplicar Produto">
    <div v-if="isLoading" class="d-flex flex-column align-center justify-center py-8">
      <UiProgressCircular color="primary" indeterminate size="48" />
      <span class="text-caption text-medium-emphasis mt-3">
        Carregando dados do produto de origem...
      </span>
    </div>

    <div v-else class="d-flex flex-column gap-4">
      <UiAlert v-if="errorMessage" size="sm" type="error" variant="soft">
        {{ errorMessage }}
      </UiAlert>

      <UiAlert v-if="sourceProductName" size="sm" type="info" variant="soft">
        <template #prepend>
          <UiIcon name="copy" />
        </template>
        <span>
          Duplicando a partir de: <strong>{{ sourceProductName }}</strong>
        </span>
      </UiAlert>

      <!-- Dados Principais -->
      <div>
        <h4 class="text-subtitle-2 font-weight-bold mb-2 text-primary d-flex align-center gap-1">
          <UiIcon name="product" size="sm" />
          Dados do Novo Produto
        </h4>

        <UiInput
          v-model="name"
          class="mb-3"
          hint="Informe o novo nome do produto"
          label="Nome do Produto *"
          persistent-hint
        />

        <div class="d-flex flex-wrap gap-3 mb-3">
          <div class="flex-grow-1" style="min-width: 250px">
            <UiSelect
              v-model="expenseNatureId"
              clearable
              item-title="name"
              item-value="id"
              :items="expenseNatureOptions"
              label="Natureza de Despesa"
            />
          </div>

          <div class="flex-grow-1" style="min-width: 250px">
            <UiSelect
              v-model="productClassId"
              clearable
              item-title="name"
              item-value="id"
              :items="productClassOptions"
              label="Classe de Produto"
            />
          </div>
        </div>

        <div class="d-flex flex-wrap gap-3 mb-2">
          <div class="flex-grow-1" style="min-width: 200px">
            <UiInput
              v-model="catMat"
              hint="Código único (opcional)"
              label="CATMAT"
              persistent-hint
              type="number"
            />
          </div>

          <div class="flex-grow-1" style="min-width: 200px">
            <UiInput
              v-model="catBec"
              hint="Código único (opcional)"
              label="CATBEC"
              persistent-hint
              type="number"
            />
          </div>
        </div>
      </div>

      <UiDivider />

      <!-- Características -->
      <div>
        <div class="d-flex align-center justify-space-between mb-2">
          <h4 class="text-subtitle-2 font-weight-bold text-primary d-flex align-center gap-1">
            <UiIcon name="identifier" size="sm" />
            Características do Produto
            <UiChip v-if="characteristics.length > 0" class="ml-1" label size="xs" variant="soft">
              {{ characteristics.length }}
            </UiChip>
          </h4>

          <UiButton prepend-icon="add" size="xs" variant="soft" @click="addCharacteristic">
            Adicionar Característica
          </UiButton>
        </div>

        <p class="text-caption text-medium-emphasis mb-3">
          Edite os valores das características herdadas ou adicione novas para diferenciar o novo
          produto.
        </p>

        <div v-if="characteristics.length === 0" class="text-caption text-medium-emphasis py-2">
          Nenhuma característica configurada para este produto.
        </div>

        <div v-else class="d-flex flex-column gap-2">
          <div
            v-for="(char, idx) in characteristics"
            :key="idx"
            class="d-flex align-center gap-2 pa-2 rounded border bg-surface"
          >
            <div style="flex: 1 1 40%">
              <UiCombobox
                v-model="char.key"
                density="compact"
                hide-details
                :items="keySuggestions"
                label="Chave (ex: Tamanho)"
                placeholder="Nome da Característica"
              />
            </div>

            <div style="flex: 1 1 50%">
              <UiInput
                v-model="char.value"
                density="compact"
                hide-details
                label="Valor (ex: 9)"
                placeholder="Valor da Característica"
              />
            </div>

            <UiButton
              color="error"
              density="comfortable"
              icon="deleteOutline"
              size="sm"
              title="Remover característica"
              variant="ghost"
              @click="removeCharacteristic(idx)"
            />
          </div>
        </div>
      </div>

      <UiDivider />

      <!-- Apresentações (Unidades) -->
      <div>
        <h4 class="text-subtitle-2 font-weight-bold mb-1 text-primary d-flex align-center gap-1">
          <UiIcon name="inventory" size="sm" />
          Apresentações / Unidades de Medida
        </h4>

        <p class="text-caption text-medium-emphasis mb-2">
          Selecione quais apresentações do produto original devem ser replicadas:
        </p>

        <div v-if="units.length === 0" class="text-caption text-medium-emphasis py-1">
          Nenhuma apresentação vinculada ao produto de origem.
        </div>

        <div v-else class="d-flex flex-wrap gap-4">
          <UiCheckbox
            v-for="unit in units"
            :key="unit.id"
            v-model="unit.selected"
            density="compact"
            hide-details
            :label="unit.name"
          />
        </div>
      </div>
    </div>

    <template #actions>
      <UiButton :disabled="isSaving" variant="ghost" @click="closeModal"> Cancelar </UiButton>

      <UiButton
        color="primary"
        :disabled="isLoading || !name.trim()"
        :loading="isSaving"
        prepend-icon="copy"
        @click="handleDuplicate"
      >
        Duplicar Produto
      </UiButton>
    </template>
  </UiModal>
</template>
