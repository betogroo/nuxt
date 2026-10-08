<script setup lang="ts">
  import { ROLES } from '~/constants/roles'
  import { useZodForm } from '~/composables/useZodForm'
  import { demandFormSchema, demandResponsibleSchema } from '~/schemas/forms/demand'
  import { demandItemFormSchema } from '~/schemas/forms/demand-item'
  definePageMeta({ middleware: ['uge'] })
  const route = useRoute()
  const router = useRouter()
  const { profile, fetchAllProfiles } = useProfile()

  const { addDemandItemWithDependencies, updateDemandItemWithDependencies } = useDemandProducts()

  const { fetchAllActiveProducts } = useProducts()
  const { fetchAllActiveExpenseNatures } = useExpenseNatures()
  const { resolveOrCreateUnit } = useMeasurementUnits()

  const demandId = route.params.id as string

  const {
    demand,
    refreshDemand,
    updateDemand,
    isPlanningIncomplete,
    responsibles,
    refreshResponsibles: _refreshResponsibles,
    isAddingResponsible,
    addResponsible,
    removeResponsible,
    items,
    itemsPending,
    refreshItems,
    isReordering,
    moveItemUp,
    moveItemDown,
    removeItem,
    winningSuppliersSummary,
  } = useDemandDetail(demandId)

  // Modal de Edição Rápida de Planejamento
  const {
    errors: epErrors,
    defineField: epDefine,
    resetForm: epReset,
    handleSubmit: epSubmit,
  } = useZodForm(demandFormSchema, {
    name: '',
    type: 'consumption',
    process_number: '',
    id_pca: '',
    contract_number: '',
  })

  const [epName, epNameProps] = epDefine('name')
  const [epType, epTypeProps] = epDefine('type')
  const [epProcess, epProcessProps] = epDefine('process_number')
  const [epIdPca, epIdPcaProps] = epDefine('id_pca')
  const [epContract, epContractProps] = epDefine('contract_number')

  const editPlanningModal = useModal({})

  const openEditPlanning = () => {
    if (demand.value) {
      epReset({
        values: {
          id: demand.value.id,
          name: demand.value.name,
          type: demand.value.type as 'consumption' | 'permanent',
          process_number: demand.value.process_number || '',
          id_pca: demand.value.id_pca || '',
          contract_number: demand.value.contract_number ? String(demand.value.contract_number) : '',
        },
      })
      editPlanningModal.open()
    }
  }

  const savePlanning = epSubmit(async (values) => {
    editPlanningModal.startSaving()
    try {
      const payload = {
        name: values.name,
        type: values.type,
        process_number: values.process_number || null,
        id_pca: values.id_pca || null,
        contract_number: values.contract_number || null,
      }
      await updateDemand(demandId, payload)
      await refreshDemand()
      editPlanningModal.close()
    } catch (err: unknown) {
      editPlanningModal.error.value = err instanceof Error ? err.message : String(err)
    } finally {
      editPlanningModal.stopSaving()
    }
  })

  useHead({
    title: computed(() => (demand.value ? `Demanda: ${demand.value.name}` : 'Detalhes da Demanda')),
  })

  // Fetch all active products for the autocomplete
  const { data: allProducts, refresh: refreshProducts } = useAsyncData(
    'all-active-products',
    async () => {
      return await fetchAllActiveProducts()
    },
  )

  const { data: expenseNatures } = useAsyncData('active-expense-natures', async () => {
    return await fetchAllActiveExpenseNatures()
  })

  // Modal State
  const isModalOpen = ref(false)
  const isSaving = ref(false)
  const saveError = ref('')

  const isNewProductMode = ref(false)

  // Form states
  const selectedProductId = ref<string | null>(null)
  const selectedUnitSearch = ref('')
  const itemQuantity = ref<number>(1)
  const itemReferencePrice = ref<number | null>(null)
  const searchProductText = ref('')

  // Add Responsible Modal State
  const isResponsibleModalOpen = ref(false)
  const responsibleError = ref('')

  const {
    errors: respErrors,
    defineField: respDefine,
    resetForm: respReset,
    handleSubmit: respSubmit,
  } = useZodForm(demandResponsibleSchema, {
    user_id: '',
  })
  const [responsibleUserId, respUserIdProps] = respDefine('user_id')

  const handleAddResponsible = respSubmit(async (values) => {
    responsibleError.value = ''
    const success = await addResponsible(values.user_id)
    if (success) {
      isResponsibleModalOpen.value = false
    } else {
      responsibleError.value = 'Falha ao adicionar responsável.'
    }
  })

  const openResponsibleModal = () => {
    respReset()
    responsibleError.value = ''
    isResponsibleModalOpen.value = true
  }

  const { data: allProfiles } = useAsyncData('all-profiles', async () => {
    return await fetchAllProfiles()
  })

  const availableProfiles = computed(() => {
    if (!allProfiles.value) return []
    const responsibleIds = responsibles.value?.map((r) => r.user_id) || []
    return allProfiles.value.filter((p) => !responsibleIds.includes(p.id))
  })

  const selectedProductObj = computed(() => {
    return allProducts.value?.find((p) => p.id === selectedProductId.value)
  })

  const availableUnitsForSelectedProduct = computed(() => {
    return (
      selectedProductObj.value?.product_units
        ?.map((pu) => pu.measurement_units)
        .filter((u): u is NonNullable<typeof u> => Boolean(u)) || []
    )
  })

  // Whenever a product is selected, auto-select the first unit if available
  watch(selectedProductId, (newVal) => {
    if (newVal) {
      if (availableUnitsForSelectedProduct.value.length > 0) {
        selectedUnitSearch.value = availableUnitsForSelectedProduct.value[0]?.name || ''
      } else {
        selectedUnitSearch.value = ''
      }
    } else {
      selectedUnitSearch.value = ''
    }
  })

  // We need all measurement units just in case we need the default one for new products
  const { data: allMeasurementUnits, refresh: refreshAllMeasurementUnits } = useAsyncData(
    'all-measurement-units',
    async () => {
      return await fetchUnits()
    },
  )

  // New Product Form state
  const newProductName = ref('')
  const newProductExpenseNatureId = ref<string | null>(null)
  const isSuggestingNature = ref(false)
  const suggestedNatureId = ref('')
  const suggestedNatureName = ref('')

  const openAddModal = () => {
    selectedProductId.value = null
    selectedUnitSearch.value = ''
    itemQuantity.value = 1
    itemReferencePrice.value = null
    searchProductText.value = ''
    isNewProductMode.value = false
    newProductName.value = ''
    newProductExpenseNatureId.value = null
    isSuggestingNature.value = false
    suggestedNatureId.value = ''
    suggestedNatureName.value = ''
    saveError.value = ''
    isModalOpen.value = true
  }

  const closeModal = () => {
    isModalOpen.value = false
  }

  const activateNewProductMode = () => {
    newProductName.value = searchProductText.value
    isNewProductMode.value = true
  }

  const resolveFinalUnitId = async () => {
    const rawVal = selectedUnitSearch.value
    const searchStr =
      typeof rawVal === 'string'
        ? rawVal.trim()
        : ((rawVal as Record<string, unknown>)?.name as string | undefined)
    return await resolveOrCreateUnit(searchStr || '')
  }

  const saveToDemand = async () => {
    isSaving.value = true
    saveError.value = ''

    try {
      await addDemandItemWithDependencies({
        demandId: demandId as string,
        isNewProductMode: isNewProductMode.value,
        newProductName: newProductName.value,
        newProductExpenseNatureId: newProductExpenseNatureId.value,
        isSuggestingNature: isSuggestingNature.value,
        suggestedNatureId: suggestedNatureId.value,
        suggestedNatureName: suggestedNatureName.value,

        selectedProductId: selectedProductId.value,
        finalUnitId: await resolveFinalUnitId(),
        itemQuantity: Number(itemQuantity.value),
        itemReferencePrice: Number(itemReferencePrice.value),
      })

      await refreshProducts()
      await refreshItems()
      closeModal()
    } catch (err: unknown) {
      const e = err as Error
      saveError.value = e.message
    } finally {
      isSaving.value = false
    }
  }

  const isEditItemModalOpen = ref(false)
  const editItemSaving = ref(false)
  const editItemError = ref('')

  const {
    errors: eiErrors,
    defineField: eiDefine,
    resetForm: eiReset,
    handleSubmit: eiSubmit,
  } = useZodForm(demandItemFormSchema, {
    productId: '',
    quantity: 1,
    reference_price: null,
    searchUnitText: '',
  })

  const [eiProductId] = eiDefine('productId')
  const [eiQuantity, eiQuantityProps] = eiDefine('quantity')
  const [eiReferencePrice, eiReferencePriceProps] = eiDefine('reference_price')
  const [eiSearchUnitText, eiSearchUnitTextProps] = eiDefine('searchUnitText')

  const editItemFormMeta = ref({
    id: '',
    productName: '',
  })

  const editItemAvailableUnits = computed(() => {
    const prod = allProducts.value?.find((p) => p.id === eiProductId.value)
    return (
      prod?.product_units
        ?.map((pu) => pu.measurement_units)
        .filter((u): u is NonNullable<typeof u> => Boolean(u)) || []
    )
  })

  const openEditItemModal = (item: {
    id: string
    quantity: number | string
    reference_price?: number | string | null
    product_id?: string
    product?: { id?: string; name: string }
    unit_id?: string | null
  }) => {
    eiReset({
      values: {
        productId: item.product_id || item.product?.id || '',
        quantity: Number(item.quantity),
        reference_price: item.reference_price != null ? Number(item.reference_price) : null,
        searchUnitText: item.unit_id
          ? allMeasurementUnits.value?.find((u) => u.id === item.unit_id)?.name || ''
          : '',
      },
    })
    editItemFormMeta.value = {
      id: item.id,
      productName: item.product?.name || 'Produto',
    }
    editItemError.value = ''
    isEditItemModalOpen.value = true
  }

  const saveEditItem = eiSubmit(async (values) => {
    editItemSaving.value = true
    editItemError.value = ''
    try {
      await updateDemandItemWithDependencies({
        itemId: editItemFormMeta.value.id,
        demandId: demandId,
        productId: values.productId,
        quantity: values.quantity,
        referencePrice: values.reference_price,
        finalUnitId: await resolveOrCreateUnit(values.searchUnitText),
      })

      await refreshAllMeasurementUnits()
      await refreshItems()
      isEditItemModalOpen.value = false
    } catch (err: unknown) {
      editItemError.value = err instanceof Error ? err.message : String(err)
    } finally {
      editItemSaving.value = false
    }
  })
  const {
    statusList,
    getNextStatus,
    getPreviousStatus,
    revertModal,
    openRevertModal,
    confirmRevertStatus,
    isReturnRequesting,
    requestReturn,
    advanceModal,
    targetStatus,
    openAdvanceModal,
    confirmAdvanceStatus,
  } = useDemandWorkflow(demandId, demand, items)
</script>

<template>
  <UiContainer>
    <UiButton class="mb-4" prepend-icon="arrowLeft" variant="ghost" @click="router.back()">
      Voltar para Demandas
    </UiButton>

    <!-- Cabeçalho da Demanda -->
    <UiCard v-if="demand" class="mb-6" transparent-header>
      <template #header>
        <div class="d-flex flex-wrap align-center ga-2 w-100">
          <span class="text-wrap">{{ demand.name }}</span>
          <UiChip class="flex-shrink-0" color="primary" size="sm" variant="solid">{{
            formatDemandStatus(demand.status)
          }}</UiChip>

          <div class="d-flex flex-wrap ga-2 ml-auto">
            <UiButton
              v-if="profile?.role === ROLES.ADMIN && getPreviousStatus(demand.status)"
              color="orange-darken-3"
              prepend-icon="arrowLeftBold"
              @click="openRevertModal"
            >
              Retornar para {{ formatDemandStatus(getPreviousStatus(demand.status) || '') }}
            </UiButton>
            <UiButton
              v-if="profile?.role !== ROLES.ADMIN && getPreviousStatus(demand.status)"
              :color="demand.is_return_requested ? 'grey' : 'warning'"
              :disabled="demand.is_return_requested || isReturnRequesting"
              :loading="isReturnRequesting"
              prepend-icon="arrowLeftBold"
              @click="requestReturn"
            >
              {{ demand.is_return_requested ? 'Retorno Solicitado' : 'Solicitar Retorno' }}
            </UiButton>
            <UiTooltip
              v-if="getNextStatus(demand.status)"
              :disabled="!isPlanningIncomplete"
              text="Preencha todos os Dados do Planejamento para avançar"
            >
              <template #activator="{ props }">
                <span v-bind="props" class="d-inline-block">
                  <UiButton
                    color="success"
                    :disabled="isPlanningIncomplete"
                    prepend-icon="arrowRightBold"
                    @click="openAdvanceModal"
                  >
                    Avançar para {{ formatDemandStatus(getNextStatus(demand.status) || '') }}
                  </UiButton>
                </span>
              </template>
            </UiTooltip>
          </div>
        </div>
      </template>

      <!-- Stepper Visual -->
      <UiStepper
        class="elevation-0 bg-transparent mb-6"
        :model-value="statusList.indexOf(demand.status) + 1"
      >
        <UiStepperHeader>
          <template v-for="(step, i) in statusList" :key="step">
            <UiStepperItem
              :color="statusList.indexOf(demand.status) >= i ? 'primary' : 'grey'"
              :complete="statusList.indexOf(demand.status) > i"
              :value="i + 1"
            >
              {{ formatDemandStatus(step) }}
            </UiStepperItem>
            <UiDivider v-if="i < statusList.length - 1" />
          </template>
        </UiStepperHeader>
      </UiStepper>

      <UiRow>
        <UiCol cols="12" md="8">
          <!-- Dados do Planejamento -->
          <UiCard class="mb-4" variant="outline">
            <template #header>
              <div class="d-flex align-center w-100">
                <UiIcon class="mr-2 text-primary" left name="document" />
                <span>Dados do Planejamento</span>
                <UiSpacer />
                <UiButton
                  v-if="demand?.status === 'planning'"
                  color="primary"
                  prepend-icon="edit"
                  size="sm"
                  variant="ghost"
                  @click="openEditPlanning"
                >
                  Editar
                </UiButton>
              </div>
            </template>
            <UiRow class="px-2 pb-2 mt-2">
              <UiCol cols="12" md="4" sm="6">
                <div class="text-caption text-grey">Processo Oficial</div>
                <div class="text-body-1 font-weight-bold text-primary">
                  {{ demand.process_number || 'Aguardando autuação' }}
                </div>
              </UiCol>
              <UiCol cols="12" md="4" sm="6">
                <div class="text-caption text-grey">Processo Interno</div>
                <div class="text-body-1 font-weight-medium">
                  {{ demand.internal_process_number || '-' }}
                </div>
              </UiCol>
              <UiCol cols="12" md="4" sm="6">
                <div class="text-caption text-grey">ID PCA</div>
                <div class="text-body-1 font-weight-medium">
                  {{ demand.id_pca || '-' }}
                </div>
              </UiCol>
              <UiCol cols="12" md="4" sm="6">
                <div class="text-caption text-grey">Tipo</div>
                <div class="text-body-1 font-weight-medium">
                  {{ demand.type === 'consumption' ? 'Consumo' : 'Permanente' }}
                </div>
              </UiCol>
              <UiCol cols="12" md="4" sm="6">
                <div class="text-caption text-grey">Nº da Contratação</div>
                <div class="text-body-1 font-weight-medium">
                  {{ demand.contract_number || '-' }}
                </div>
              </UiCol>
              <UiCol cols="12">
                <UiAlert
                  v-if="isPlanningIncomplete"
                  class="mt-2 text-caption"
                  size="sm"
                  type="warning"
                  variant="soft"
                >
                  Para avançar para a Cotação, preencha os dados do planejamento (Processo Oficial,
                  ID PCA e Nº Contratação).
                  <br />
                  <small>Você pode editar a demanda voltando à tela de listagem.</small>
                </UiAlert>
              </UiCol>
            </UiRow>
          </UiCard>

          <!-- Dados da Disputa -->
          <UiCard
            v-if="demand?.status !== 'planning' && demand?.status !== 'quotation'"
            title="Dados da Disputa e Contratação"
            variant="outline"
          >
            <UiRow class="px-2 pb-2 mt-2">
              <UiCol cols="12" md="4" sm="6">
                <div class="text-caption text-grey">Aviso de Contratação</div>
                <div class="text-body-1 font-weight-medium">
                  {{ demand.bidding_notice_number || '-' }}
                </div>
              </UiCol>
              <UiCol cols="12" md="4" sm="6">
                <div class="text-caption text-grey">Nº Disputa</div>
                <div class="text-body-1">
                  {{ demand.dispute_number || '-' }}
                </div>
              </UiCol>
              <UiCol cols="12" md="4" sm="6">
                <div class="text-caption text-grey">Data da Disputa</div>
                <div class="text-body-1">
                  {{
                    demand.dispute_date
                      ? new Date(demand.dispute_date).toLocaleDateString('pt-BR', {
                          timeZone: 'UTC',
                        })
                      : '-'
                  }}
                </div>
              </UiCol>
              <UiCol cols="12" md="4" sm="6">
                <div class="text-caption text-grey">Abertura de Ofertas</div>
                <div class="text-body-1">
                  {{
                    demand.offer_opening_date
                      ? new Date(demand.offer_opening_date).toLocaleString([], {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })
                      : '-'
                  }}
                </div>
              </UiCol>
            </UiRow>
          </UiCard>
        </UiCol>

        <!-- Responsáveis -->
        <UiCol class="border-s pl-md-4 mt-4 mt-md-0" cols="12" md="4">
          <div class="d-flex align-center mb-2">
            <span class="text-primary font-weight-semibold">Responsáveis</span>
            <UiSpacer />
            <UiButton icon="add" size="xs" variant="ghost" @click="openResponsibleModal" />
          </div>
          <UiList class="bg-transparent pa-0" density="compact">
            <UiListItem
              v-for="resp in responsibles"
              :key="resp?.user_id || Math.random()"
              class="px-0"
            >
              <template #prepend>
                <UiAvatar class="text-caption text-white" color="primary" size="32">
                  {{ (resp?.profiles?.name || 'U').charAt(0).toUpperCase() }}
                </UiAvatar>
              </template>
              <UiListItemTitle class="text-body-2">{{
                resp?.profiles?.name || 'Usuário Desconhecido'
              }}</UiListItemTitle>
              <template #append>
                <UiButton
                  v-if="profile?.role === ROLES.ADMIN"
                  color="error"
                  icon="close"
                  size="xs"
                  variant="ghost"
                  @click="removeResponsible(resp?.user_id || '')"
                />
              </template>
            </UiListItem>
            <UiListItem v-if="!responsibles?.length" class="px-0">
              <UiListItemTitle class="text-caption text-grey"
                >Nenhum responsável definido.</UiListItemTitle
              >
            </UiListItem>
          </UiList>
        </UiCol>
      </UiRow>
    </UiCard>

    <!-- Lista de Produtos da Demanda -->
    <UiCard class="mb-4" variant="outline">
      <template #header>
        <div class="d-flex flex-wrap align-center w-100 ga-2">
          <span>Produtos na Demanda</span>
          <div class="ml-auto">
            <UiButton
              v-if="demand?.status === 'quotation'"
              color="primary"
              prepend-icon="add"
              @click="openAddModal"
            >
              Adicionar Produto
            </UiButton>
          </div>
        </div>
      </template>

      <!-- Alerta de bloqueio -->
      <UiAlert
        v-if="demand?.status !== 'quotation'"
        class="mb-4"
        size="sm"
        type="info"
        variant="soft"
      >
        A inserção ou alteração de itens só é permitida na fase de Cotação.
      </UiAlert>

      <div class="overflow-x-auto">
        <UiTable
          :headers="[
            { text: 'Ordem', value: 'order', align: 'center', sortable: false, nowrap: true },
            { text: 'Produto', value: 'product' },
            { text: 'Natureza', value: 'expense_nature', nowrap: true },
            { text: 'Qtd.', value: 'quantity', align: 'center' },
            { text: 'Valor Ref.', value: 'reference_price', align: 'right', nowrap: true },
            { text: 'Total Ref.', value: 'total_reference', align: 'right', nowrap: true },
            { text: 'Melhor Lance', value: 'best_bid', align: 'right', nowrap: true },
            { text: 'Total Final', value: 'total_final', align: 'right', nowrap: true },
            { text: 'Ações', value: 'actions', align: 'right', nowrap: true },
          ]"
          :items="items || []"
        >
          <template #empty> Nenhum produto adicionado a esta demanda ainda. </template>
          <template #item-order="{ index }">
            <div class="d-flex flex-column align-center justify-center">
              <UiButton
                density="compact"
                :disabled="index === 0 || isReordering"
                icon="chevronUp"
                size="xs"
                variant="ghost"
                @click.stop="moveItemUp(index)"
              />
              <UiButton
                density="compact"
                :disabled="index === (items?.length || 0) - 1 || isReordering"
                icon="chevronDown"
                size="xs"
                variant="ghost"
                @click.stop="moveItemDown(index)"
              />
            </div>
          </template>
          <template #item-product="{ item }">
            <div class="d-flex align-center flex-nowrap ga-1" style="min-width: 250px">
              <NuxtLink
                class="text-decoration-none text-primary font-weight-bold text-truncate"
                :to="`/demands/${demandId}/items/${item.id}`"
              >
                {{ item.product_name_snapshot || item.product?.name || 'Produto desconhecido' }}
              </NuxtLink>
              <UiChip
                v-if="item.measurement_units"
                class="flex-shrink-0"
                color="secondary"
                size="xs"
                variant="solid"
              >
                {{ item.unit_name_snapshot || item.measurement_units.name }}
              </UiChip>
              <UiButton
                color="grey"
                icon="externalLink"
                size="xs"
                title="Cadastro do Produto"
                :to="`/products/${item.product_id}`"
                variant="ghost"
              />
            </div>
          </template>
          <template #item-expense_nature="{ item }">
            <span
              :title="
                item.expense_nature_name_snapshot ||
                (item.product as { expense_natures?: { name: string } })?.expense_natures?.name ||
                ''
              "
            >
              {{
                (item.product as { expense_natures?: { id: string } })?.expense_natures?.id ||
                item.expense_nature_name_snapshot ||
                (item.product as { expense_natures?: { name: string } })?.expense_natures?.name ||
                '-'
              }}
            </span>
          </template>
          <template #item-quantity="{ item }">
            {{ item.quantity }}
          </template>
          <template #item-reference_price="{ item }">
            {{ formatReferencePrice(item.reference_price) }}
          </template>
          <template #item-total_reference="{ item }">
            <span class="text-grey font-weight-bold">
              {{
                formatCurrency(
                  item.reference_price != null && item.quantity != null
                    ? Number(item.reference_price) * Number(item.quantity)
                    : null,
                )
              }}
            </span>
          </template>
          <template #item-best_bid="{ item }">
            <template v-if="item.demand_product_bids && item.demand_product_bids.length > 0">
              <span class="text-success font-weight-bold">
                {{
                  formatCurrency(
                    Math.min(...item.demand_product_bids.map((b: { amount: number }) => b.amount)),
                  )
                }}
              </span>
            </template>
            <span v-else class="text-grey">-</span>
          </template>
          <template #item-total_final="{ item }">
            <template
              v-if="
                item.demand_product_bids &&
                item.demand_product_bids.length > 0 &&
                item.quantity != null
              "
            >
              <span class="text-success font-weight-bold">
                {{
                  formatCurrency(
                    Math.min(...item.demand_product_bids.map((b: { amount: number }) => b.amount)) *
                      Number(item.quantity),
                  )
                }}
              </span>
            </template>
            <span v-else class="text-grey">-</span>
          </template>
          <template #item-actions="{ item }">
            <div class="d-flex flex-nowrap align-center justify-end">
              <UiButton
                v-if="demand?.status === 'quotation'"
                color="primary"
                icon="edit"
                size="sm"
                title="Editar Item"
                variant="ghost"
                @click="openEditItemModal(item)"
              />
              <UiButton
                v-if="demand?.status === 'quotation'"
                color="error"
                icon="delete"
                size="sm"
                title="Remover"
                variant="ghost"
                @click="removeItem(item.id, item.product?.name || '')"
              />
            </div>
          </template>
        </UiTable>
      </div>
      <div v-if="itemsPending" class="text-center py-4">
        <UiProgressCircular color="primary" indeterminate></UiProgressCircular>
      </div>
    </UiCard>

    <!-- Resumo de Fornecedores da Demanda -->
    <UiCard class="mb-4" title="Fornecedores Vencedores na Demanda" variant="outline">
      <div v-if="itemsPending" class="text-center py-4">
        <UiProgressCircular color="primary" indeterminate></UiProgressCircular>
      </div>
      <UiTable
        v-else
        :headers="[
          { text: 'Fornecedor', value: 'supplier' },
          { text: 'Participou (Itens)', value: 'participated', align: 'center' },
          { text: 'Venceu (Itens)', value: 'won', align: 'center' },
          { text: 'Total Arrematado', value: 'total_amount', align: 'right' },
        ]"
        :items="winningSuppliersSummary"
      >
        <template #empty>
          <div class="text-body-2 text-grey text-center py-4">
            Nenhum fornecedor vencedor calculado ainda.
          </div>
        </template>

        <template #item-supplier="{ item: supplier }">
          <NuxtLink
            class="text-decoration-none text-primary font-weight-bold"
            :to="`/demands/${demandId}/suppliers/${supplier.id}`"
          >
            {{ supplier.company_name }}
          </NuxtLink>
          <div class="text-caption text-grey">{{ supplier.cnpj }}</div>
        </template>

        <template #item-participated="{ item: supplier }">
          <UiChip color="default" size="sm">{{ supplier.participatedCount }}</UiChip>
        </template>

        <template #item-won="{ item: supplier }">
          <UiChip color="success" size="sm">{{ supplier.wonCount }}</UiChip>
        </template>

        <template #item-total_amount="{ item: supplier }">
          <span class="text-success font-weight-bold">
            {{ formatCurrency(supplier.totalAmountWon) }}
          </span>
        </template>
      </UiTable>
    </UiCard>

    <!-- Modal Editar Item -->
    <UiModal
      v-model="isEditItemModalOpen"
      max-width="500px"
      persistent
      title="Editar Item da Demanda"
      transparent-header
    >
      <UiAlert v-if="editItemError" class="mb-4" size="sm" type="error" variant="soft">
        {{ editItemError }}
      </UiAlert>

      <p class="text-body-1 font-weight-bold mb-4">{{ editItemFormMeta.productName }}</p>

      <UiInput
        v-model.number="eiQuantity"
        v-bind="eiQuantityProps"
        :error-messages="eiErrors.quantity"
        label="Quantidade"
        min="1"
        type="number"
      />

      <MeasurementUnitSelect
        v-model="eiSearchUnitText"
        v-bind="eiSearchUnitTextProps"
        class="mt-3"
        :error-messages="eiErrors.searchUnitText"
        :items="editItemAvailableUnits"
      />

      <UiInput
        v-model.number="eiReferencePrice"
        v-bind="eiReferencePriceProps"
        class="mt-3"
        :error-messages="eiErrors.reference_price"
        label="Valor Referencial (R$)"
        step="0.0001"
        type="number"
      />

      <template #actions>
        <UiButton :disabled="editItemSaving" variant="ghost" @click="isEditItemModalOpen = false"
          >Cancelar</UiButton
        >
        <UiButton color="primary" :loading="editItemSaving" @click="saveEditItem">Salvar</UiButton>
      </template>
    </UiModal>
    <!-- Modal Adicionar Produto -->
    <UiModal
      v-model="isModalOpen"
      max-width="600px"
      persistent
      title="Inserir Produto na Demanda"
      transparent-header
    >
      <UiAlert v-if="saveError" class="mb-4" size="sm" type="error" variant="soft">
        {{ saveError }}
      </UiAlert>

      <!-- Seção de Busca de Produto Existente -->
      <template v-if="!isNewProductMode">
        <UiAutocomplete
          v-model="selectedProductId"
          v-model:search="searchProductText"
          clearable
          density="comfortable"
          item-title="name"
          item-value="id"
          :items="allProducts || []"
          label="Buscar Produto"
          placeholder="Digite o nome do produto..."
          variant="outlined"
        >
          <!-- Personalizando a pesquisa no front-end para simplificar -->
          <template #no-data>
            <div class="pa-3 text-center">
              <span class="text-grey mr-2">Produto não encontrado.</span>
              <UiButton
                color="primary"
                size="sm"
                variant="soft"
                @click="activateNewProductMode"
              >
                Cadastrar novo
              </UiButton>
            </div>
          </template>
        </UiAutocomplete>
        <div class="d-flex justify-end mt-1 mb-2">
          <UiButton
            color="primary"
            prepend-icon="add"
            size="sm"
            variant="ghost"
            @click="activateNewProductMode"
          >
            Não encontrou? Cadastrar novo produto
          </UiButton>
        </div>

        <MeasurementUnitSelect
          v-if="selectedProductId"
          v-model="selectedUnitSearch"
          class="mt-3"
          :items="availableUnitsForSelectedProduct"
        />

        <UiInput
          v-if="selectedProductId"
          v-model.number="itemQuantity"
          class="mt-3"
          label="Quantidade"
          min="1"
          type="number"
        />
        <UiInput
          v-if="selectedProductId"
          v-model.number="itemReferencePrice"
          class="mt-3"
          label="Valor Referencial (R$)"
          step="0.0001"
          type="number"
        />
      </template>

      <!-- Seção de Cadastro Rápido de Novo Produto -->
      <template v-else>
        <UiAlert class="mb-4" size="sm" type="info" variant="soft">
          Você está cadastrando um novo produto. Ele será salvo no sistema e automaticamente
          adicionado à demanda.
        </UiAlert>

        <UiInput v-model="newProductName" label="Nome do Produto" />

        <UiSwitch
          v-model="isSuggestingNature"
          class="mb-2"
          color="primary"
          label="Não encontrou a natureza? Sugerir nova"
        />

        <UiAutocomplete
          v-if="!isSuggestingNature"
          v-model="newProductExpenseNatureId"
          class="mb-4"
          density="comfortable"
          :item-title="
            (item: Record<string, unknown>) =>
              typeof item === 'object' && item !== null ? `${item.id} - ${item.name}` : ''
          "
          item-value="id"
          :items="expenseNatures || []"
          label="Natureza de Despesa"
          variant="outlined"
        />

        <div v-else class="d-flex gap-4 mb-4">
          <UiInput v-model="suggestedNatureId" label="Código (Ex: 33903000)" />
          <UiInput v-model="suggestedNatureName" label="Nome da Natureza" />
        </div>

        <MeasurementUnitSelect v-model="selectedUnitSearch" class="mb-4" />

        <UiInput v-model.number="itemQuantity" label="Quantidade" min="1" type="number" />
        <UiInput
          v-model.number="itemReferencePrice"
          label="Valor Referencial (R$)"
          step="0.0001"
          type="number"
        />

        <div class="text-right">
          <UiButton size="sm" variant="ghost" @click="isNewProductMode = false">
            Voltar à Busca
          </UiButton>
        </div>
      </template>

      <template #actions>
        <UiButton :disabled="isSaving" variant="ghost" @click="closeModal">Cancelar</UiButton>
        <UiButton color="primary" :loading="isSaving" @click="saveToDemand">
          Adicionar à Demanda
        </UiButton>
      </template>
    </UiModal>

    <!-- Modal Adicionar Responsável -->
    <UiModal
      v-model="isResponsibleModalOpen"
      max-width="400px"
      title="Adicionar Responsável"
      transparent-header
    >
      <UiAlert v-if="responsibleError" class="mb-4" size="sm" type="error" variant="soft">
        {{ responsibleError }}
      </UiAlert>
      <UiSelect
        v-model="responsibleUserId"
        v-bind="respUserIdProps"
        :error-messages="respErrors.user_id"
        item-title="name"
        item-value="id"
        :items="availableProfiles"
        label="Selecione o Usuário"
      />
      <template #actions>
        <UiButton
          :disabled="isAddingResponsible"
          variant="ghost"
          @click="isResponsibleModalOpen = false"
          >Cancelar</UiButton
        >
        <UiButton color="primary" :loading="isAddingResponsible" @click="handleAddResponsible"
          >Adicionar</UiButton
        >
      </template>
    </UiModal>

    <!-- Modal Avançar Status -->
    <UiModal
      v-model="advanceModal.isOpen.value"
      max-width="500px"
      :title="`Avançar para: ${formatDemandStatus(targetStatus)}`"
      transparent-header
    >
      <UiAlert
        v-if="advanceModal.error.value"
        class="mb-4"
        size="sm"
        type="error"
        variant="soft"
      >
        {{ advanceModal.error.value }}
      </UiAlert>

      <div v-if="targetStatus === 'bidding_notice'">
        <UiInput
          v-model="advanceModal.payload.value.bidding_notice_number"
          label="Número do Aviso de Contratação"
          required
        />
      </div>

      <div v-if="targetStatus === 'dispute'">
        <UiInput
          v-model="advanceModal.payload.value.dispute_number"
          label="Número da Disputa"
          required
        />
        <UiInput
          v-model="advDisputeDate"
          v-bind="advDisputeDateProps"
          :error-messages="advErrors.dispute_date"
          label="Data da Disputa"
          required
          type="date"
        />
        <UiRow class="mt-2">
          <UiCol class="py-0" cols="12" sm="6">
            <UiInput
              v-model="advOfferOpeningDate"
              v-bind="advOfferOpeningDateProps"
              :error-messages="advErrors.offer_opening_date"
              label="Data de Abertura"
              type="date"
            />
          </UiCol>
          <UiCol class="py-0" cols="12" sm="6">
            <UiInput
              v-model="advOfferOpeningTime"
              v-bind="advOfferOpeningTimeProps"
              :error-messages="advErrors.offer_opening_time"
              label="Hora de Abertura"
              type="time"
            />
          </UiCol>
        </UiRow>
      </div>

      <div v-if="targetStatus === 'homologation'">
        <UiInput
          v-model="advanceModal.payload.value.contract_number"
          label="Número da Contratação (Contrato/Ata)"
          required
        />
      </div>

      <div v-if="targetStatus === 'completed'">
        <p class="text-body-1">Tem certeza que deseja concluir esta demanda?</p>
      </div>

      <template #actions>
        <UiButton
          :disabled="advanceModal.isSaving.value"
          variant="ghost"
          @click="advanceModal.close()"
          >Cancelar</UiButton
        >
        <UiButton
          color="success"
          :loading="advanceModal.isSaving.value"
          @click="confirmAdvanceStatus"
          >Confirmar Avanço</UiButton
        >
      </template>
    </UiModal>

    <!-- Modal Retornar Status -->
    <UiModal
      v-model="revertModal.isOpen.value"
      max-width="500px"
      title="Confirmar Retorno de Fase"
      transparent-header
    >
      <UiAlert
        v-if="revertModal.error.value"
        class="mb-4"
        size="sm"
        type="error"
        variant="soft"
      >
        {{ revertModal.error.value }}
      </UiAlert>

      <p class="text-body-1">
        Tem certeza que deseja retornar esta demanda para a fase
        <strong>{{ formatDemandStatus(getPreviousStatus(demand?.status || '') || '') }}</strong
        >?
      </p>
      <p class="text-body-2 text-warning mt-2">
        Isto reabrirá a possibilidade de edição dos itens (dependendo da fase) e limpará qualquer
        solicitação de retorno pendente.
      </p>

      <template #actions>
        <UiButton :disabled="revertModal.isSaving.value" variant="ghost" @click="revertModal.close()"
          >Cancelar</UiButton
        >
        <UiButton
          color="orange-darken-3"
          :loading="revertModal.isSaving.value"
          @click="confirmRevertStatus"
          >Confirmar Retorno</UiButton
        >
      </template>
    </UiModal>

    <!-- Modal Editar Planejamento -->
    <UiModal
      v-model="editPlanningModal.isOpen.value"
      max-width="500px"
      title="Editar Planejamento"
      transparent-header
    >
      <UiAlert
        v-if="editPlanningModal.error.value"
        class="mb-4"
        size="sm"
        type="error"
        variant="soft"
      >
        {{ editPlanningModal.error.value }}
      </UiAlert>

      <UiInput
        v-model="epName"
        v-bind="epNameProps"
        :error-messages="epErrors.name"
        label="Nome da Demanda*"
        required
      />

      <UiSelect
        v-model="epType"
        v-bind="epTypeProps"
        :error-messages="epErrors.type"
        item-title="title"
        item-value="value"
        :items="[
          { title: 'Consumo', value: 'consumption' },
          { title: 'Permanente', value: 'permanent' },
        ]"
        label="Tipo*"
        required
      />

      <UiInput
        v-model="epProcess"
        v-bind="epProcessProps"
        :error-messages="epErrors.process_number"
        hint="Opcional. Padrão: XXX.XXXXXXXX/YYYY-ZZ"
        label="Nº do Processo (Oficial)"
        placeholder="Ex: 058.00100793/2026-21"
      />

      <UiInput
        v-model="epIdPca"
        v-bind="epIdPcaProps"
        :error-messages="epErrors.id_pca"
        hint="Opcional."
        label="ID PCA"
        placeholder="Ex: 46377800000127-0-000132/2026"
      />

      <UiInput
        v-model="epContract"
        v-bind="epContractProps"
        :error-messages="epErrors.contract_number"
        hint="Opcional."
        label="Nº da Contratação"
        placeholder="Apenas números"
        type="number"
      />

      <template #actions>
        <UiButton
          :disabled="editPlanningModal.isSaving.value"
          variant="ghost"
          @click="editPlanningModal.close()"
          >Cancelar</UiButton
        >
        <UiButton color="primary" :loading="editPlanningModal.isSaving.value" @click="savePlanning"
          >Salvar</UiButton
        >
      </template>
    </UiModal>
  </UiContainer>
</template>
