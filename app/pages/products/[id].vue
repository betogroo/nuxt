<script setup lang="ts">
  import type {
    ProductUnitDetail,
    ProductCharacteristicDetail,
    ProductDemandUsage,
  } from '~/composables/useProducts'
  import { ROLES } from '~/constants/roles'
  import { formatDate, formatDateTime } from '~/utils/formatters'
  import { formatDemandStatus, getDemandStatusColor } from '~/utils/demandStatus'

  import { productFormSchema } from '~/schemas/forms/product'
  import { useZodForm } from '~/composables/useZodForm'
  import { parseCharacteristicsText } from '~/utils/parseCharacteristics'

  definePageMeta({ middleware: ['uge'] })
  const route = useRoute()
  const router = useRouter()
  const toast = useToast()
  const { copy } = useCopyToClipboard()
  const { profile } = useProfile()

  const {
    fetchProductById,
    fetchProductDemands,
    toggleProductStatus,
    updateProduct,
    addProductUnit,
    removeProductUnit,
    upsertProductCharacteristic,
    batchUpsertProductCharacteristics,
    removeProductCharacteristic,
  } = useProducts()
  const { fetchAllActiveUnits } = useMeasurementUnits()
  const { fetchAllSelectableKeys, fetchDistinctValuesForKey } = useProductCharacteristics()
  const { getBecProductUrl } = useSystemSettings()
  const { fetchAllActiveExpenseNatures, registerPendingExpenseNature } = useExpenseNatures()
  const { fetchAllActiveProductClasses, registerPendingProductClass } = useProductClasses()

  const productId = route.params.id as string

  const isAdmin = computed(() => profile.value?.role === ROLES.ADMIN)

  const {
    data: product,
    pending,
    refresh,
  } = useAsyncData(`product-${productId}`, async () => {
    try {
      return await fetchProductById(productId)
    } catch (e) {
      console.error(e)
      return null
    }
  })

  const { data: productDemands, pending: demandsPending } = useAsyncData(
    `product-demands-${productId}`,
    async (): Promise<ProductDemandUsage[]> => {
      try {
        return await fetchProductDemands(productId)
      } catch (e) {
        console.error(e)
        return []
      }
    },
  )

  const { data: allMeasurementUnits, refresh: refreshUnitsList } = useAsyncData(
    'measurement-units',
    async () => {
      return await fetchAllActiveUnits()
    },
  )

  const { data: expenseNatures } = useAsyncData(
    'expense-natures-select',
    fetchAllActiveExpenseNatures,
  )
  const { data: productClasses } = useAsyncData(
    'product-classes-select',
    fetchAllActiveProductClasses,
  )
  const { data: allCharacteristicKeys, refresh: refreshCharacteristicKeys } = useAsyncData(
    'characteristic-keys-select',
    fetchAllSelectableKeys,
  )

  // Edit product modal (admin)
  const editModal = useModal()
  const {
    errors: editErrors,
    defineField: editDefineField,
    resetForm: editResetForm,
    handleSubmit: editHandleSubmit,
  } = useZodForm(productFormSchema, {
    name: '',
    expense_nature_id: null,
    is_suggesting_nature: false,
    suggested_nature_id: '',
    suggested_nature_name: '',
    product_class_id: null,
    is_suggesting_class: false,
    suggested_class_id: '',
    suggested_class_name: '',
    cat_mat: null,
    cat_bec: null,
    is_active: true,
  })

  const [editName, editNameProps] = editDefineField('name')
  const [editExpenseNatureId, editExpenseNatureIdProps] = editDefineField('expense_nature_id')
  const [editProductClassId, editProductClassIdProps] = editDefineField('product_class_id')
  const [editIsSuggestingNature, editIsSuggestingNatureProps] =
    editDefineField('is_suggesting_nature')
  const [editSuggestedNatureId, editSuggestedNatureIdProps] = editDefineField('suggested_nature_id')
  const [editSuggestedNatureName, editSuggestedNatureNameProps] =
    editDefineField('suggested_nature_name')
  const [editIsSuggestingClass, editIsSuggestingClassProps] = editDefineField('is_suggesting_class')
  const [editSuggestedClassId, editSuggestedClassIdProps] = editDefineField('suggested_class_id')
  const [editSuggestedClassName, editSuggestedClassNameProps] =
    editDefineField('suggested_class_name')
  const [editCatMat, editCatMatProps] = editDefineField('cat_mat')
  const [editCatBec, editCatBecProps] = editDefineField('cat_bec')
  const [editIsActive, editIsActiveProps] = editDefineField('is_active')

  const openEditModal = () => {
    if (!product.value) return
    editResetForm({
      values: {
        id: product.value.id,
        name: product.value.name,
        expense_nature_id:
          product.value.expense_nature_id || product.value.expense_natures?.id || null,
        is_suggesting_nature: false,
        suggested_nature_id: '',
        suggested_nature_name: '',
        product_class_id:
          product.value.product_class_id || product.value.product_classes?.id || null,
        is_suggesting_class: false,
        suggested_class_id: '',
        suggested_class_name: '',
        cat_mat: product.value.cat_mat ?? null,
        cat_bec: product.value.cat_bec ?? null,
        is_active: product.value.is_active,
      },
    })
    editModal.open()
  }

  const saveProductEdit = editHandleSubmit(async (values) => {
    editModal.startSaving()
    editModal.error.value = ''
    try {
      let finalExpenseNatureId = values.expense_nature_id
      let finalProductClassId = values.product_class_id

      if (
        values.is_suggesting_nature &&
        values.suggested_nature_id &&
        values.suggested_nature_name
      ) {
        const expenseNature = await registerPendingExpenseNature({
          id: values.suggested_nature_id,
          name: values.suggested_nature_name,
        })
        finalExpenseNatureId = expenseNature.id
      }

      if (values.is_suggesting_class && values.suggested_class_id && values.suggested_class_name) {
        const pClass = await registerPendingProductClass({
          id: values.suggested_class_id,
          name: values.suggested_class_name,
        })
        finalProductClassId = pClass.id
      }

      const payload = {
        name: values.name,
        expense_nature_id: finalExpenseNatureId,
        product_class_id: finalProductClassId,
        cat_mat: values.cat_mat ?? null,
        cat_bec: values.cat_bec ?? null,
        is_active: values.is_active,
      }

      await updateProduct(productId, payload)
      toast.success('Produto atualizado com sucesso!')
      await refresh()
      editModal.close()
    } catch (err: unknown) {
      editModal.error.value = err instanceof Error ? err.message : String(err)
    } finally {
      editModal.stopSaving()
    }
  })

  // Toggle status (admin)
  const isTogglingStatus = ref(false)

  const handleToggleStatus = async () => {
    if (!product.value) return
    isTogglingStatus.value = true
    try {
      const willActivate = !product.value.is_active
      await toggleProductStatus(product.value)
      toast.success(`Produto ${willActivate ? 'ativado' : 'inativado'} com sucesso!`)
      await refresh()
    } catch (e) {
      console.error(e)
      toast.error('Erro ao alterar status do produto.')
    } finally {
      isTogglingStatus.value = false
    }
  }

  // Add unit logic
  const isAddingUnit = ref(false)
  const addUnitSearch = ref('')
  const addUnitError = ref('')
  const adding = ref(false)

  const addUnit = async () => {
    const rawVal = addUnitSearch.value
    const searchStr =
      typeof rawVal === 'string' ? rawVal.trim() : (rawVal as { name?: string })?.name?.trim()

    if (!searchStr) return
    adding.value = true
    addUnitError.value = ''

    try {
      await addProductUnit(productId, searchStr)

      await refresh() // reload product with units
      await refreshUnitsList()

      isAddingUnit.value = false
      addUnitSearch.value = ''
    } catch (e: unknown) {
      addUnitError.value = e instanceof Error ? e.message : String(e)
    } finally {
      adding.value = false
    }
  }

  const cancelAddUnit = () => {
    isAddingUnit.value = false
    addUnitError.value = ''
    addUnitSearch.value = ''
  }

  // Delete unit confirmation modal
  const isDeleteUnitModalOpen = ref(false)
  const unitToDelete = ref<ProductUnitDetail | null>(null)
  const isDeletingUnit = ref(false)

  const openDeleteUnitModal = (unit: ProductUnitDetail) => {
    unitToDelete.value = unit
    isDeleteUnitModalOpen.value = true
  }

  const closeDeleteUnitModal = () => {
    isDeleteUnitModalOpen.value = false
    unitToDelete.value = null
  }

  const confirmDeleteUnit = async () => {
    if (!unitToDelete.value) return
    isDeletingUnit.value = true
    try {
      await removeProductUnit(productId, unitToDelete.value.id)
      toast.success(`Apresentação "${unitToDelete.value.name}" removida com sucesso.`)
      closeDeleteUnitModal()
      await refresh()
      await refreshUnitsList()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao remover apresentação.')
    } finally {
      isDeletingUnit.value = false
    }
  }

  const unitHeaders = [
    { text: 'Apresentação (Unidade)', value: 'name' },
    { text: 'Status', value: 'status', align: 'center' as const },
    { text: 'Registros Alternativos (Aliases)', value: 'aliases' },
    { text: 'Ações', value: 'actions', align: 'right' as const },
  ]

  // Product characteristics (Key : Value) logic
  const isCharacteristicModalOpen = ref(false)
  const isEditingCharacteristic = ref(false)
  const characteristicKeyInput = ref<string | { name?: string }>('')
  const characteristicValueInput = ref<string | { name?: string }>('')
  const characteristicValueSuggestions = ref<string[]>([])
  const characteristicError = ref('')
  const savingCharacteristic = ref(false)
  const savingAndContinuingCharacteristic = ref(false)

  // Delete characteristic confirmation modal
  const isDeleteCharacteristicModalOpen = ref(false)
  const characteristicToDelete = ref<ProductCharacteristicDetail | null>(null)
  const isDeletingCharacteristic = ref(false)

  const extractComboString = (val: unknown): string => {
    if (typeof val === 'string') return val.trim()
    if (val && typeof val === 'object' && 'name' in val) {
      const nameVal = (val as { name?: unknown }).name
      return typeof nameVal === 'string' ? nameVal.trim() : ''
    }
    return ''
  }

  watch(characteristicKeyInput, async (newKeyVal) => {
    const keyStr = extractComboString(newKeyVal)
    if (!keyStr) {
      characteristicValueSuggestions.value = []
      return
    }
    try {
      characteristicValueSuggestions.value = await fetchDistinctValuesForKey(keyStr)
    } catch {
      characteristicValueSuggestions.value = []
    }
  })

  const openAddCharacteristic = () => {
    isEditingCharacteristic.value = false
    characteristicKeyInput.value = ''
    characteristicValueInput.value = ''
    characteristicError.value = ''
    isCharacteristicModalOpen.value = true
  }

  const openEditCharacteristic = (char: ProductCharacteristicDetail) => {
    isEditingCharacteristic.value = true
    characteristicKeyInput.value = char.key_name
    characteristicValueInput.value = char.value
    characteristicError.value = ''
    isCharacteristicModalOpen.value = true
  }

  const closeCharacteristicModal = () => {
    isCharacteristicModalOpen.value = false
    isEditingCharacteristic.value = false
    characteristicKeyInput.value = ''
    characteristicValueInput.value = ''
    characteristicError.value = ''
  }

  const saveCharacteristic = async (keepOpen = false) => {
    const keyStr = extractComboString(characteristicKeyInput.value)
    const valStr = extractComboString(characteristicValueInput.value)

    if (!keyStr || !valStr) {
      characteristicError.value = 'Informe tanto a Chave quanto o Valor da característica.'
      return
    }

    if (keepOpen) {
      savingAndContinuingCharacteristic.value = true
    } else {
      savingCharacteristic.value = true
    }
    characteristicError.value = ''

    try {
      await upsertProductCharacteristic(productId, keyStr, valStr)
      toast.success(
        isEditingCharacteristic.value
          ? 'Característica atualizada com sucesso!'
          : 'Característica vinculada ao produto!',
      )
      await refresh()
      await refreshCharacteristicKeys()

      if (keepOpen) {
        characteristicKeyInput.value = ''
        characteristicValueInput.value = ''
        characteristicError.value = ''
      } else {
        closeCharacteristicModal()
      }
    } catch (e: unknown) {
      characteristicError.value = e instanceof Error ? e.message : String(e)
    } finally {
      savingCharacteristic.value = false
      savingAndContinuingCharacteristic.value = false
    }
  }

  const openDeleteCharacteristicModal = (char: ProductCharacteristicDetail) => {
    characteristicToDelete.value = char
    isDeleteCharacteristicModalOpen.value = true
  }

  const closeDeleteCharacteristicModal = () => {
    isDeleteCharacteristicModalOpen.value = false
    characteristicToDelete.value = null
  }

  const confirmDeleteCharacteristic = async () => {
    if (!characteristicToDelete.value) return
    isDeletingCharacteristic.value = true
    try {
      await removeProductCharacteristic(
        characteristicToDelete.value.id,
        `${characteristicToDelete.value.key_name}: ${characteristicToDelete.value.value}`,
      )
      toast.success('Característica removida do produto.')
      closeDeleteCharacteristicModal()
      await refresh()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : String(e))
    } finally {
      isDeletingCharacteristic.value = false
    }
  }

  // Batch product characteristics logic
  const isBatchCharacteristicModalOpen = ref(false)
  const batchCharacteristicsText = ref('')
  const isSavingBatchCharacteristics = ref(false)
  const batchCharacteristicError = ref('')

  const parsedBatch = computed(() => parseCharacteristicsText(batchCharacteristicsText.value))

  const openBatchCharacteristicModal = () => {
    batchCharacteristicsText.value = ''
    batchCharacteristicError.value = ''
    isBatchCharacteristicModalOpen.value = true
  }

  const closeBatchCharacteristicModal = () => {
    isBatchCharacteristicModalOpen.value = false
    batchCharacteristicsText.value = ''
    batchCharacteristicError.value = ''
  }

  const isKeyAlreadyRegistered = (keyName: string): boolean => {
    const clean = keyName.trim().toLowerCase()
    return (allCharacteristicKeys.value || []).some((k) => k.name.trim().toLowerCase() === clean)
  }

  const isKeyAlreadyOnProduct = (keyName: string): boolean => {
    const clean = keyName.trim().toLowerCase()
    const chars = (product.value?.characteristics as ProductCharacteristicDetail[]) || []
    return chars.some((c) => c.key_name.trim().toLowerCase() === clean)
  }

  const saveBatchCharacteristics = async () => {
    const items = parsedBatch.value.items
    if (!items || items.length === 0) {
      batchCharacteristicError.value = 'Nenhuma característica válida encontrada no texto.'
      return
    }

    isSavingBatchCharacteristics.value = true
    batchCharacteristicError.value = ''

    try {
      const { count } = await batchUpsertProductCharacteristics(
        productId,
        items.map((i) => ({ key: i.key, value: i.value })),
      )
      toast.success(
        `${count} característica${count > 1 ? 's' : ''} inserida${count > 1 ? 's' : ''}/atualizada${count > 1 ? 's' : ''} com sucesso!`,
      )
      await refresh()
      await refreshCharacteristicKeys()
      closeBatchCharacteristicModal()
    } catch (e: unknown) {
      batchCharacteristicError.value = e instanceof Error ? e.message : String(e)
    } finally {
      isSavingBatchCharacteristics.value = false
    }
  }

  const characteristicHeaders = [
    { text: 'Chave (Característica)', value: 'key_name' },
    { text: 'Valor', value: 'value' },
    { text: 'Status da Chave', value: 'status', align: 'center' as const },
    { text: 'Ações', value: 'actions', align: 'right' as const },
  ]

  const demandHeaders = [
    { text: 'Demanda', value: 'name' },
    { text: 'Nº Processo', value: 'process_number' },
    { text: 'Status', value: 'status', align: 'center' as const },
    { text: 'Data Disputa', value: 'dispute_date', align: 'center' as const },
    { text: 'Quantidade', value: 'quantity', align: 'right' as const },
  ]

  useHead({
    title: computed(() =>
      product.value?.name ? `Produto: ${product.value.name}` : 'Detalhes do Produto',
    ),
  })
</script>

<template>
  <UiContainer>
    <!-- Barra superior: navegação, título e ações -->
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-2">
      <div class="d-flex align-center ga-2">
        <UiButton
          color="default"
          icon="arrowLeft"
          size="sm"
          variant="ghost"
          @click="router.back()"
        />
        <div>
          <div class="d-flex align-center ga-2 flex-wrap">
            <h1 class="text-h5 font-weight-bold">{{ product?.name || 'Produto' }}</h1>
            <UiChip
              v-if="product"
              :color="product.is_active ? 'success' : 'error'"
              size="sm"
              variant="solid"
            >
              {{ product.is_active ? 'ATIVO' : 'INATIVO' }}
            </UiChip>
          </div>
          <div class="text-caption text-medium-emphasis">Detalhes e configurações do produto</div>
        </div>
      </div>

      <div v-if="isAdmin && product" class="d-flex align-center ga-2">
        <UiButton
          color="primary"
          prepend-icon="edit"
          size="sm"
          variant="soft"
          @click="openEditModal"
        >
          Editar Produto
        </UiButton>
        <UiButton
          :color="product.is_active ? 'warning' : 'success'"
          :loading="isTogglingStatus"
          size="sm"
          variant="soft"
          @click="handleToggleStatus"
        >
          {{ product.is_active ? 'Inativar Produto' : 'Ativar Produto' }}
        </UiButton>
      </div>
    </div>

    <!-- Carregando -->
    <div v-if="pending" class="text-center py-10">
      <UiProgressCircular color="primary" indeterminate size="48" width="3" />
    </div>

    <template v-else-if="product">
      <!-- Dados do Produto -->
      <UiRow class="mb-4">
        <UiCol cols="12">
          <UiCard title="Dados do Produto" variant="outline">
            <div class="pa-4">
              <UiRow>
                <UiCol cols="12" md="4" sm="6">
                  <div class="text-caption text-medium-emphasis font-weight-bold text-uppercase">
                    Natureza de Despesa
                  </div>
                  <div v-if="product.expense_natures" class="d-flex align-center ga-2 mt-1">
                    <UiChip color="blue-grey" label size="sm" variant="soft">
                      {{ product.expense_natures.id }}
                    </UiChip>
                    <span class="text-body-1">{{ product.expense_natures.name }}</span>
                  </div>
                  <div v-else class="text-body-1 text-medium-emphasis">Não informada</div>
                </UiCol>

                <UiCol cols="12" md="4" sm="6">
                  <div class="text-caption text-medium-emphasis font-weight-bold text-uppercase">
                    Classe do Produto
                  </div>
                  <div v-if="product.product_classes" class="d-flex align-center ga-2 mt-1">
                    <UiChip color="deep-purple" label size="sm" variant="soft">
                      {{ product.product_classes.id }}
                    </UiChip>
                    <span class="text-body-1">{{ product.product_classes.name }}</span>
                  </div>
                  <div v-else class="text-body-1 text-medium-emphasis">Não informada</div>
                </UiCol>

                <UiCol cols="12" md="4" sm="6">
                  <div class="text-caption text-medium-emphasis font-weight-bold text-uppercase">
                    CATMAT
                  </div>
                  <div class="mt-1">
                    <UiChip v-if="product.cat_mat" color="primary" label size="sm" variant="soft">
                      {{ product.cat_mat }}
                    </UiChip>
                    <span v-else class="text-body-1 text-medium-emphasis">Não informado</span>
                  </div>
                </UiCol>

                <UiCol cols="12" md="4" sm="6">
                  <div class="text-caption text-medium-emphasis font-weight-bold text-uppercase">
                    CATBEC
                  </div>
                  <div class="mt-1">
                    <UiChip
                      v-if="product.cat_bec"
                      append-icon="externalLink"
                      color="secondary"
                      :href="getBecProductUrl(product.cat_bec)"
                      label
                      rel="noopener noreferrer"
                      size="sm"
                      target="_blank"
                      title="Abrir página do item no catálogo BEC"
                      variant="soft"
                    >
                      {{ product.cat_bec }}
                    </UiChip>
                    <span v-else class="text-body-1 text-medium-emphasis">Não informado</span>
                  </div>
                </UiCol>

                <UiCol cols="12" md="4" sm="6">
                  <div class="text-caption text-medium-emphasis font-weight-bold text-uppercase">
                    Criado por
                  </div>
                  <div class="text-body-1">
                    {{ product.profiles?.name || product.created_by || '-' }}
                  </div>
                </UiCol>

                <UiCol cols="12" md="4" sm="6">
                  <div class="text-caption text-medium-emphasis font-weight-bold text-uppercase">
                    Criado em
                  </div>
                  <div class="text-body-1">{{ formatDateTime(product.created_at) }}</div>
                </UiCol>

                <UiCol cols="12" md="4" sm="6">
                  <div class="text-caption text-medium-emphasis font-weight-bold text-uppercase">
                    Última atualização
                  </div>
                  <div class="text-body-1">{{ formatDateTime(product.updated_at) }}</div>
                </UiCol>

                <UiCol cols="12" md="4" sm="6">
                  <div class="text-caption text-medium-emphasis font-weight-bold text-uppercase">
                    ID do Produto
                  </div>
                  <div class="d-flex align-center ga-1">
                    <span class="text-caption text-medium-emphasis font-weight-mono">
                      {{ product.id }}
                    </span>
                    <UiTooltip text="Copiar ID">
                      <template #activator="{ props }">
                        <UiButton
                          v-bind="props"
                          color="default"
                          icon="copy"
                          size="sm"
                          variant="ghost"
                          @click="copy(product.id, 'ID copiado!')"
                        />
                      </template>
                    </UiTooltip>
                  </div>
                </UiCol>
              </UiRow>
            </div>
          </UiCard>
        </UiCol>
      </UiRow>

      <!-- Apresentações -->
      <UiRow class="mb-4">
        <UiCol cols="12">
          <UiCard variant="outline">
            <template #header>
              <UiIcon class="mr-2" color="primary" name="categories" />
              Apresentações (Unidades de Medida)
              <UiSpacer />
              <UiButton
                v-if="!isAddingUnit"
                color="primary"
                prepend-icon="add"
                size="sm"
                variant="soft"
                @click="isAddingUnit = true"
              >
                Vincular Nova
              </UiButton>
            </template>

            <div class="pa-4">
              <div class="text-body-2 text-medium-emphasis mb-4">
                Unidades de medida disponíveis para este produto nas demandas. Os registros
                alternativos (aliases) de cada unidade são usados no pagamento da nota de empenho.
              </div>

              <UiSlideYTransition>
                <div v-if="isAddingUnit" class="mb-5 pa-4 rounded-lg bg-surface-variant">
                  <div class="text-subtitle-2 font-weight-bold mb-1">Vincular Nova Unidade</div>
                  <div class="text-caption text-medium-emphasis mb-4">
                    Selecione uma unidade existente na lista ou digite um novo nome para cadastrar.
                  </div>

                  <UiCombobox
                    v-model="addUnitSearch"
                    bg-color="surface"
                    hide-details
                    item-title="name"
                    item-value="name"
                    :items="allMeasurementUnits || []"
                    label="Buscar ou criar unidade (ex: Bisnaga 90g)"
                    :return-object="false"
                    rounded="lg"
                    size="md"
                    variant="outline"
                  />
                  <UiAlert v-if="addUnitError" class="mt-3" size="sm" type="error">
                    {{ addUnitError }}
                  </UiAlert>
                  <div class="d-flex justify-end mt-4 ga-2">
                    <UiButton variant="ghost" @click="cancelAddUnit">Cancelar</UiButton>
                    <UiButton color="primary" :loading="adding" variant="solid" @click="addUnit">
                      Adicionar Unidade
                    </UiButton>
                  </div>
                </div>
              </UiSlideYTransition>
            </div>

            <UiTable :headers="unitHeaders" :items="(product.units as ProductUnitDetail[]) || []">
              <template #item-name="{ item }">
                <span class="text-body-1 font-weight-medium">{{ item.name }}</span>
              </template>

              <template #item-status="{ item }">
                <UiChip :color="item.is_pending ? 'warning' : 'success'" size="sm" variant="soft">
                  {{ item.is_pending ? 'Pendente' : 'Ativa' }}
                </UiChip>
              </template>

              <template #item-aliases="{ item }">
                <div v-if="item.aliases?.length > 0" class="d-flex flex-wrap ga-1">
                  <UiChip
                    v-for="alias in item.aliases"
                    :key="alias.id"
                    color="info"
                    size="sm"
                    variant="soft"
                  >
                    {{ alias.code }} - {{ alias.name }}
                  </UiChip>
                </div>
                <span v-else class="text-medium-emphasis">Sem registros alternativos</span>
              </template>

              <template #item-actions="{ item }">
                <UiActionButton
                  action="delete"
                  tooltip="Remover apresentação"
                  @click="openDeleteUnitModal(item as ProductUnitDetail)"
                />
              </template>

              <template #empty>
                <div class="text-center py-4">
                  <div class="text-body-1 font-weight-medium">Nenhuma apresentação vinculada</div>
                  <div class="text-caption text-medium-emphasis">
                    Vincule apresentações para utilizar este produto em demandas.
                  </div>
                </div>
              </template>
            </UiTable>
          </UiCard>
        </UiCol>
      </UiRow>

      <!-- Características do Produto (Chave : Valor) -->
      <UiRow class="mb-4">
        <UiCol cols="12">
          <UiCard variant="outline">
            <template #header>
              <UiIcon class="mr-2" color="teal" name="categories" />
              Características do Produto (Chave : Valor)
              <UiSpacer />
              <div class="d-flex ga-2">
                <UiButton
                  color="primary"
                  prepend-icon="playlistAdd"
                  size="sm"
                  variant="tonal"
                  @click="openBatchCharacteristicModal"
                >
                  Inserir em Lote
                </UiButton>
                <UiButton
                  color="primary"
                  prepend-icon="add"
                  size="sm"
                  variant="soft"
                  @click="openAddCharacteristic"
                >
                  Adicionar Característica
                </UiButton>
              </div>
            </template>

            <div class="pa-4">
              <div class="text-body-2 text-medium-emphasis mb-1">
                Especifique atributos técnicos ou físicos no formato
                <strong>Chave : Valor</strong> (ex: <em>Cor : Branca</em>, <em>Ponta : 1.0mm</em>).
                Caso a chave ainda não exista na lista, basta digitá-la para cadastrá-la
                automaticamente.
              </div>
            </div>

            <UiTable
              :headers="characteristicHeaders"
              :items="(product.characteristics as ProductCharacteristicDetail[]) || []"
            >
              <template #item-key_name="{ item }">
                <span class="text-body-1 font-weight-bold">{{ item.key_name }}</span>
              </template>

              <template #item-value="{ item }">
                <UiChip color="teal" label size="sm" variant="soft">
                  {{ item.value }}
                </UiChip>
              </template>

              <template #item-status="{ item }">
                <UiChip :color="item.is_pending ? 'warning' : 'success'" size="sm" variant="soft">
                  {{ item.is_pending ? 'Chave Pendente' : 'Padronizada' }}
                </UiChip>
              </template>

              <template #item-actions="{ item }">
                <div class="d-flex justify-end ga-1">
                  <UiActionButton
                    action="edit"
                    tooltip="Editar valor"
                    @click="openEditCharacteristic(item)"
                  />
                  <UiActionButton
                    action="delete"
                    tooltip="Remover característica"
                    @click="openDeleteCharacteristicModal(item)"
                  />
                </div>
              </template>

              <template #empty>
                <div class="text-center py-4">
                  <div class="text-body-1 font-weight-medium">
                    Nenhuma característica cadastrada
                  </div>
                  <div class="text-caption text-medium-emphasis">
                    Adicione pares de Chave : Valor para detalhar as especificações deste produto.
                  </div>
                </div>
              </template>
            </UiTable>
          </UiCard>
        </UiCol>
      </UiRow>

      <!-- Utilizado em demandas -->
      <UiRow>
        <UiCol cols="12">
          <UiCard title="Utilizado em Demandas" variant="outline">
            <UiTable
              :headers="demandHeaders"
              :items="productDemands || []"
              :loading="demandsPending"
            >
              <template #item-name="{ item }">
                <NuxtLink
                  class="text-primary font-weight-medium text-decoration-none"
                  :to="`/demands/${item.id}`"
                >
                  {{ item.name }}
                </NuxtLink>
              </template>

              <template #item-process_number="{ item }">
                <span class="text-body-2">{{ item.process_number || '-' }}</span>
              </template>

              <template #item-status="{ item }">
                <UiChip :color="getDemandStatusColor(item.status)" size="sm" variant="soft">
                  {{ formatDemandStatus(item.status) }}
                </UiChip>
              </template>

              <template #item-dispute_date="{ item }">
                <span class="text-body-2">{{ formatDate(item.dispute_date) }}</span>
              </template>

              <template #item-quantity="{ item }">
                <span class="font-weight-medium">
                  {{ item.quantity }} {{ item.unit_name || '' }}
                </span>
              </template>

              <template #empty>
                <div class="text-center py-4">
                  <div class="text-body-1 font-weight-medium">
                    Este produto ainda não foi usado em nenhuma demanda
                  </div>
                </div>
              </template>
            </UiTable>
          </UiCard>
        </UiCol>
      </UiRow>
    </template>

    <div v-else>
      <UiAlert type="error" variant="soft">Produto não encontrado.</UiAlert>
    </div>

    <!-- Edit Product Modal (Admin) -->
    <UiModal v-model="editModal.isOpen.value" max-width="500px" title="Editar Produto">
      <UiAlert v-if="editModal.error.value" class="mb-4" size="sm" type="error" variant="soft">
        {{ editModal.error.value }}
      </UiAlert>

      <UiInput
        v-model="editName"
        v-bind="editNameProps"
        class="mb-3"
        :error-messages="editErrors.name"
        label="Nome do Produto *"
      />

      <div class="d-flex ga-3 mb-3">
        <UiInput
          v-model.number="editCatMat"
          v-bind="editCatMatProps"
          :error-messages="editErrors.cat_mat"
          label="CATMAT (opcional)"
          placeholder="Ex: 123456"
          type="number"
        />
        <UiInput
          v-model.number="editCatBec"
          v-bind="editCatBecProps"
          :error-messages="editErrors.cat_bec"
          label="CATBEC (opcional)"
          placeholder="Ex: 78910"
          type="number"
        />
      </div>

      <UiSwitch
        v-model="editIsSuggestingNature"
        v-bind="editIsSuggestingNatureProps"
        class="mb-3"
        color="primary"
        :error-messages="editErrors.is_suggesting_nature"
        label="Não encontrou a natureza? Sugerir nova"
      />

      <UiAutocomplete
        v-if="!editIsSuggestingNature"
        v-model="editExpenseNatureId"
        v-bind="editExpenseNatureIdProps"
        class="mb-3"
        :error-messages="editErrors.expense_nature_id"
        :item-title="
          (item: Record<string, unknown>) =>
            typeof item === 'object' && item !== null ? `${item.id} - ${item.name}` : ''
        "
        item-value="id"
        :items="expenseNatures || []"
        label="Natureza de Despesa *"
        rounded="lg"
        size="md"
        variant="outline"
      />

      <div v-else class="d-flex gap-3 mb-3">
        <UiInput
          v-model="editSuggestedNatureId"
          v-bind="editSuggestedNatureIdProps"
          :error-messages="editErrors.suggested_nature_id"
          label="Código (Ex: 33903000)"
        />
        <UiInput
          v-model="editSuggestedNatureName"
          v-bind="editSuggestedNatureNameProps"
          :error-messages="editErrors.suggested_nature_name"
          label="Nome da Natureza"
        />
      </div>

      <UiSwitch
        v-model="editIsSuggestingClass"
        v-bind="editIsSuggestingClassProps"
        class="mb-3"
        color="primary"
        :error-messages="editErrors.is_suggesting_class"
        label="Não encontrou a classe? Sugerir nova"
      />

      <UiAutocomplete
        v-if="!editIsSuggestingClass"
        v-model="editProductClassId"
        v-bind="editProductClassIdProps"
        class="mb-3"
        clearable
        :error-messages="editErrors.product_class_id"
        :item-title="
          (item: Record<string, unknown>) =>
            typeof item === 'object' && item !== null ? `${item.id} - ${item.name}` : ''
        "
        item-value="id"
        :items="productClasses || []"
        label="Classe de Produto"
        rounded="lg"
        size="md"
        variant="outline"
      />

      <div v-else class="d-flex gap-3 mb-3">
        <UiInput
          v-model="editSuggestedClassId"
          v-bind="editSuggestedClassIdProps"
          :error-messages="editErrors.suggested_class_id"
          label="Código (Ex: 5915)"
        />
        <UiInput
          v-model="editSuggestedClassName"
          v-bind="editSuggestedClassNameProps"
          :error-messages="editErrors.suggested_class_name"
          label="Nome da Classe"
        />
      </div>

      <UiSwitch
        v-model="editIsActive"
        v-bind="editIsActiveProps"
        color="success"
        :error-messages="editErrors.is_active"
        label="Produto ativo no sistema"
      />

      <template #actions>
        <UiButton variant="ghost" @click="editModal.close()">Cancelar</UiButton>
        <UiButton
          color="primary"
          :loading="editModal.isSaving.value"
          variant="solid"
          @click="saveProductEdit"
        >
          Salvar Alterações
        </UiButton>
      </template>
    </UiModal>

    <!-- Modal Confirmação de Exclusão de Apresentação -->
    <UiModal v-model="isDeleteUnitModalOpen" max-width="480px" title="Remover Apresentação">
      <div class="py-2">
        <p class="text-body-1 mb-2">
          Deseja realmente remover a apresentação
          <strong>"{{ unitToDelete?.name }}"</strong> deste produto?
        </p>
        <UiAlert color="info" size="sm" variant="soft">
          As demandas que já utilizam esta unidade de medida não serão impactadas.
        </UiAlert>
      </div>

      <template #actions>
        <UiButton :disabled="isDeletingUnit" variant="ghost" @click="closeDeleteUnitModal">
          Cancelar
        </UiButton>
        <UiButton
          color="error"
          :loading="isDeletingUnit"
          variant="solid"
          @click="confirmDeleteUnit"
        >
          Confirmar Remoção
        </UiButton>
      </template>
    </UiModal>

    <!-- Modal Adicionar / Editar Característica -->
    <UiModal
      v-model="isCharacteristicModalOpen"
      max-width="580px"
      :title="isEditingCharacteristic ? 'Editar Característica' : 'Adicionar Característica'"
    >
      <div class="py-2">
        <p class="text-body-2 text-medium-emphasis mb-4">
          {{
            isEditingCharacteristic
              ? 'Altere o valor desta especificação técnica vinculada ao produto.'
              : 'Especifique atributos técnicos ou físicos no formato Chave : Valor (ex: Cor : Branca, Ponta : 1.0mm).'
          }}
        </p>

        <UiRow class="g-3">
          <UiCol cols="12" md="5">
            <UiCombobox
              v-model="characteristicKeyInput"
              :disabled="isEditingCharacteristic"
              hide-details="auto"
              item-title="name"
              item-value="name"
              :items="allCharacteristicKeys || []"
              label="Chave *"
              placeholder="Ex: Cor, Ponta"
              :return-object="false"
              variant="outline"
            />
          </UiCol>
          <UiCol cols="12" md="7">
            <UiCombobox
              v-model="characteristicValueInput"
              hide-details="auto"
              :items="characteristicValueSuggestions"
              label="Valor *"
              placeholder="Ex: Branca, 1.0mm, Bivolt"
              :return-object="false"
              variant="outline"
              @keyup.enter="saveCharacteristic(false)"
            />
          </UiCol>
        </UiRow>

        <UiAlert v-if="characteristicError" class="mt-4" size="sm" type="error">
          {{ characteristicError }}
        </UiAlert>
      </div>

      <template #actions>
        <UiButton
          :disabled="savingCharacteristic || savingAndContinuingCharacteristic"
          variant="ghost"
          @click="closeCharacteristicModal"
        >
          Cancelar
        </UiButton>
        <UiButton
          v-if="!isEditingCharacteristic"
          color="primary"
          :disabled="savingCharacteristic"
          :loading="savingAndContinuingCharacteristic"
          variant="tonal"
          @click="saveCharacteristic(true)"
        >
          Salvar e Continuar Inserindo
        </UiButton>
        <UiButton
          color="primary"
          :disabled="savingAndContinuingCharacteristic"
          :loading="savingCharacteristic"
          variant="solid"
          @click="saveCharacteristic(false)"
        >
          {{ isEditingCharacteristic ? 'Salvar Alterações' : 'Salvar Característica' }}
        </UiButton>
      </template>
    </UiModal>

    <!-- Modal Inserir Características em Lote -->
    <UiModal
      v-model="isBatchCharacteristicModalOpen"
      max-width="720px"
      title="Inserir Características em Lote"
    >
      <div class="py-2">
        <p class="text-body-2 text-medium-emphasis mb-3">
          Cole uma lista de características no formato <strong>Chave: Valor</strong> (uma por
          linha). Marcadores de lista (como traços ou números) serão removidos automaticamente.
        </p>

        <UiTextarea
          v-model="batchCharacteristicsText"
          auto-grow
          class="mb-3"
          hide-details="auto"
          label="Texto das Características (Chave: Valor) *"
          placeholder="Tipo de escrita: média (esfera entre 1mm e 2mm)&#10;Material Corpo: Poliestireno cristal translúcido/transparente&#10;Formato Corpo: Sextavado&#10;Certificação: INMETRO"
          :rows="6"
          variant="outline"
        />

        <!-- Alerta de Linhas Ignoradas (se houver) -->
        <UiAlert v-if="parsedBatch.ignoredLines.length > 0" class="mb-3" size="sm" type="warning">
          <div class="font-weight-medium mb-1">
            {{ parsedBatch.ignoredLines.length }} linha(s) desconsiderada(s) por não estarem no
            formato "Chave: Valor":
          </div>
          <ul class="ps-4 mb-0 text-caption">
            <li v-for="ignored in parsedBatch.ignoredLines.slice(0, 3)" :key="ignored.lineNumber">
              Linha {{ ignored.lineNumber }}: "{{ ignored.line }}" ({{ ignored.reason }})
            </li>
            <li v-if="parsedBatch.ignoredLines.length > 3">
              ... e mais {{ parsedBatch.ignoredLines.length - 3 }} linha(s)
            </li>
          </ul>
        </UiAlert>

        <!-- Pré-visualização das características detectadas -->
        <div v-if="parsedBatch.items.length > 0" class="mt-2">
          <div class="d-flex align-center justify-space-between mb-2">
            <span class="text-subtitle-2 font-weight-bold">
              Pré-visualização ({{ parsedBatch.items.length }} característica{{
                parsedBatch.items.length > 1 ? 's' : ''
              }}
              detectada{{ parsedBatch.items.length > 1 ? 's' : '' }}):
            </span>
          </div>

          <UiCard class="pa-2 overflow-y-auto" max-height="240px" variant="outline">
            <div
              v-for="item in parsedBatch.items"
              :key="item.key"
              class="d-flex align-center justify-space-between py-1.5 px-2 border-b last:border-b-0"
            >
              <div class="d-flex align-center ga-2 flex-wrap flex-grow-1 mr-2">
                <span class="font-weight-bold text-body-2">{{ item.key }}:</span>
                <span class="text-body-2 text-medium-emphasis">{{ item.value }}</span>
              </div>
              <div class="d-flex align-center ga-1 flex-shrink-0">
                <UiChip
                  v-if="isKeyAlreadyOnProduct(item.key)"
                  color="warning"
                  label
                  size="x-small"
                  variant="soft"
                >
                  Atualizará valor
                </UiChip>
                <UiChip
                  v-if="!isKeyAlreadyRegistered(item.key)"
                  color="info"
                  label
                  size="x-small"
                  variant="soft"
                >
                  Nova Chave (Pendente)
                </UiChip>
                <UiChip v-else color="success" label size="x-small" variant="soft">
                  Chave Existente
                </UiChip>
              </div>
            </div>
          </UiCard>
        </div>

        <UiAlert v-if="batchCharacteristicError" class="mt-4" size="sm" type="error">
          {{ batchCharacteristicError }}
        </UiAlert>
      </div>

      <template #actions>
        <UiButton
          :disabled="isSavingBatchCharacteristics"
          variant="ghost"
          @click="closeBatchCharacteristicModal"
        >
          Cancelar
        </UiButton>
        <UiButton
          color="primary"
          :disabled="parsedBatch.items.length === 0"
          :loading="isSavingBatchCharacteristics"
          prepend-icon="playlistAdd"
          variant="solid"
          @click="saveBatchCharacteristics"
        >
          {{
            parsedBatch.items.length > 0
              ? `Importar ${parsedBatch.items.length} Característica${parsedBatch.items.length > 1 ? 's' : ''}`
              : 'Importar Características'
          }}
        </UiButton>
      </template>
    </UiModal>

    <!-- Modal Confirmação de Exclusão de Característica -->
    <UiModal
      v-model="isDeleteCharacteristicModalOpen"
      max-width="480px"
      title="Remover Característica"
    >
      <div class="py-2">
        <p class="text-body-1 mb-2">
          Deseja realmente remover a característica
          <strong
            >"{{ characteristicToDelete?.key_name }}: {{ characteristicToDelete?.value }}"</strong
          >
          deste produto?
        </p>
      </div>

      <template #actions>
        <UiButton
          :disabled="isDeletingCharacteristic"
          variant="ghost"
          @click="closeDeleteCharacteristicModal"
        >
          Cancelar
        </UiButton>
        <UiButton
          color="error"
          :loading="isDeletingCharacteristic"
          variant="solid"
          @click="confirmDeleteCharacteristic"
        >
          Confirmar Remoção
        </UiButton>
      </template>
    </UiModal>
  </UiContainer>
</template>
