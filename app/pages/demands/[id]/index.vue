<script setup lang="ts">
  import { ROLES } from '~/constants/roles'
  import { useZodForm } from '~/composables/useZodForm'
  import { demandFormSchema, demandResponsibleSchema } from '~/schemas/forms/demand'
  import { demandItemFormSchema } from '~/schemas/forms/demand-item'
  import {
    formatCnpj,
    splitDateTime,
    combineDateTime,
    validateOfferOpeningRules,
  } from '~/utils/formatters'
  import {
    DEMAND_ITEM_EXECUTION_STATUS_LABELS,
    DEMAND_ITEM_EXECUTION_STATUS_COLORS,
    DEMAND_ITEM_EXECUTION_STATUS_ICONS,
  } from '~/constants/demand-item-status'
  import type { DemandProductRow } from '~/composables/useDemandProducts'
  import DemandItemExecutionStatusModal from '~/components/demands/DemandItemExecutionStatusModal.vue'
  import DemandDisputeReportModal from '~/components/demands/DemandDisputeReportModal.vue'
  definePageMeta({ middleware: ['uge'] })
  const route = useRoute()
  const router = useRouter()
  const { profile, fetchAllProfiles } = useProfile()

  const { addDemandItemWithDependencies, updateDemandItemWithDependencies } = useDemandProducts()

  const { fetchAllActiveProducts } = useProducts()
  const { fetchAllActiveProductClasses } = useProductClasses()
  const { fetchAllActiveExpenseNatures } = useExpenseNatures()
  const { fetchUnits, resolveOrCreateUnit } = useMeasurementUnits()
  const { getBecProductUrl } = useSystemSettings()

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
    siafem_number: '',
  })

  const [epName, epNameProps] = epDefine('name')
  const [epType, epTypeProps] = epDefine('type')
  const [epProcess, epProcessProps] = epDefine('process_number')
  const [epIdPca, epIdPcaProps] = epDefine('id_pca')
  const [epContract, epContractProps] = epDefine('contract_number')
  const [epSiafem, epSiafemProps] = epDefine('siafem_number')

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
          siafem_number: demand.value.siafem_number || '',
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
        siafem_number: values.siafem_number || null,
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

  // Modal de Edição dos Dados do Aviso de Contratação e Disputa
  const editBiddingNoticeModal = useModal({
    bidding_notice_number: '',
    dispute_number: '',
    dispute_date: '',
    offer_opening_date: '',
    offer_opening_time: '',
  })

  const openEditBiddingNoticeModal = () => {
    if (!demand.value) return
    const { date, time } = splitDateTime(demand.value.offer_opening_date)
    editBiddingNoticeModal.open({
      bidding_notice_number: demand.value.bidding_notice_number || '',
      dispute_number: demand.value.dispute_number || '',
      dispute_date: demand.value.dispute_date
        ? String(demand.value.dispute_date).split('T')[0]
        : '',
      offer_opening_date: date,
      offer_opening_time: time,
    })
  }

  const saveBiddingNoticeData = async () => {
    editBiddingNoticeModal.startSaving()
    editBiddingNoticeModal.error.value = ''
    try {
      const p = editBiddingNoticeModal.payload.value
      let offerOpening: string | null = null

      if (p.offer_opening_date || p.offer_opening_time) {
        const offerDate = p.offer_opening_date?.trim()
        const offerTime = p.offer_opening_time?.trim()
        if (!offerDate || !offerTime) {
          throw new Error('Informe tanto a data quanto a hora de abertura de ofertas.')
        }
        const dateError = validateOfferOpeningRules(offerDate, offerTime, p.dispute_date)
        if (dateError) {
          throw new Error(dateError)
        }
        offerOpening = combineDateTime(offerDate, offerTime)
      }

      if (demand.value?.status === 'dispute') {
        if (!p.bidding_notice_number?.trim()) {
          throw new Error('O número do aviso de contratação é obrigatório na fase de disputa.')
        }
        if (!p.dispute_number?.trim()) {
          throw new Error('O número da disputa é obrigatório na fase de disputa.')
        }
        if (!p.dispute_date) {
          throw new Error('A data da disputa é obrigatória na fase de disputa.')
        }
        if (!offerOpening) {
          throw new Error(
            'A data e hora de abertura de ofertas são obrigatórias na fase de disputa.',
          )
        }
      }

      await updateDemand({
        bidding_notice_number: p.bidding_notice_number?.trim() || null,
        dispute_number: p.dispute_number?.trim() || null,
        dispute_date: p.dispute_date || null,
        offer_opening_date: offerOpening,
      })
      await refreshDemand()
      editBiddingNoticeModal.close()
    } catch (err: unknown) {
      editBiddingNoticeModal.error.value = err instanceof Error ? err.message : String(err)
    } finally {
      editBiddingNoticeModal.stopSaving()
    }
  }

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

  const { data: productClasses } = useAsyncData('active-product-classes', async () => {
    return await fetchAllActiveProductClasses()
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
  const newProductClassId = ref<string | null>(null)
  const isSuggestingClass = ref(false)
  const suggestedClassId = ref('')
  const suggestedClassName = ref('')
  const newProductCatMat = ref<number | null>(null)
  const newProductCatBec = ref<number | null>(null)

  // Alias state for adding items
  const selectedAliasId = ref<string | null>(null)
  const isSuggestingAlias = ref(false)
  const suggestedAliasCode = ref<number | null>(null)
  const suggestedAliasName = ref('')

  const currentSelectedUnit = computed(() => {
    if (!selectedUnitSearch.value) return null
    const query =
      typeof selectedUnitSearch.value === 'string'
        ? selectedUnitSearch.value.trim().toLowerCase()
        : (((selectedUnitSearch.value as Record<string, unknown>)?.name as string) || '')
            .trim()
            .toLowerCase()

    return (
      allMeasurementUnits.value?.find(
        (u) => u.name.trim().toLowerCase() === query || u.id === selectedUnitSearch.value,
      ) || null
    )
  })

  const availableAliasesForCurrentUnit = computed(() => {
    return currentSelectedUnit.value?.measurement_unit_aliases || []
  })

  watch(
    () => selectedUnitSearch.value,
    () => {
      const aliases = availableAliasesForCurrentUnit.value
      if (aliases.length > 0) {
        if (!aliases.some((a) => a.id === selectedAliasId.value)) {
          selectedAliasId.value = aliases[0]?.id || null
        }
      } else {
        selectedAliasId.value = null
      }
    },
  )

  watch(
    () => allMeasurementUnits.value,
    () => {
      if (selectedUnitSearch.value && !selectedAliasId.value && !isSuggestingAlias.value) {
        const aliases = availableAliasesForCurrentUnit.value
        if (aliases.length > 0) {
          selectedAliasId.value = aliases[0]?.id || null
        }
      }
    },
  )

  const openAddModal = () => {
    selectedProductId.value = null
    selectedUnitSearch.value = ''
    selectedAliasId.value = null
    isSuggestingAlias.value = false
    suggestedAliasCode.value = null
    suggestedAliasName.value = ''
    itemQuantity.value = 1
    itemReferencePrice.value = null
    searchProductText.value = ''
    isNewProductMode.value = false
    newProductName.value = ''
    newProductExpenseNatureId.value = null
    isSuggestingNature.value = false
    suggestedNatureId.value = ''
    suggestedNatureName.value = ''
    newProductClassId.value = null
    isSuggestingClass.value = false
    suggestedClassId.value = ''
    suggestedClassName.value = ''
    newProductCatMat.value = null
    newProductCatBec.value = null
    saveError.value = ''
    isModalOpen.value = true
  }

  const closeModal = () => {
    isModalOpen.value = false
  }

  const activateNewProductMode = () => {
    newProductName.value = searchProductText.value
    newProductCatMat.value = null
    newProductCatBec.value = null
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

    if (isSuggestingAlias.value) {
      if (!suggestedAliasCode.value || !suggestedAliasName.value?.trim()) {
        saveError.value = 'Código e Nome do registro alternativo (alias) são obrigatórios.'
        isSaving.value = false
        return
      }
    } else if (!selectedAliasId.value) {
      saveError.value = 'Selecione ou sugira um registro alternativo (alias) para o item.'
      isSaving.value = false
      return
    }

    try {
      await addDemandItemWithDependencies({
        demandId: demandId as string,
        isNewProductMode: isNewProductMode.value,
        newProductName: newProductName.value,
        newProductExpenseNatureId: newProductExpenseNatureId.value,
        isSuggestingNature: isSuggestingNature.value,
        suggestedNatureId: suggestedNatureId.value,
        suggestedNatureName: suggestedNatureName.value,
        newProductClassId: newProductClassId.value,
        isSuggestingClass: isSuggestingClass.value,
        suggestedClassId: suggestedClassId.value,
        suggestedClassName: suggestedClassName.value,
        newProductCatMat: newProductCatMat.value ? Number(newProductCatMat.value) : null,
        newProductCatBec: newProductCatBec.value ? Number(newProductCatBec.value) : null,

        selectedProductId: selectedProductId.value,
        finalUnitId: await resolveFinalUnitId(),
        selectedAliasId: selectedAliasId.value,
        isSuggestingAlias: isSuggestingAlias.value,
        suggestedAliasCode: suggestedAliasCode.value ? Number(suggestedAliasCode.value) : null,
        suggestedAliasName: suggestedAliasName.value,
        itemQuantity: Number(itemQuantity.value),
        itemReferencePrice: Number(itemReferencePrice.value),
      })

      await refreshAllMeasurementUnits()
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
    bid_interval: 3,
    bid_interval_type: 'percentage',
    searchUnitText: '',
    aliasId: null,
  })

  const [_eiProductId] = eiDefine('productId')
  const [eiQuantity, eiQuantityProps] = eiDefine('quantity')
  const [eiReferencePrice, eiReferencePriceProps] = eiDefine('reference_price')
  const [eiBidInterval, eiBidIntervalProps] = eiDefine('bid_interval')
  const [eiBidIntervalType, eiBidIntervalTypeProps] = eiDefine('bid_interval_type')
  const [eiSearchUnitText, eiSearchUnitTextProps] = eiDefine('searchUnitText')
  const [eiAliasId, eiAliasIdProps] = eiDefine('aliasId')

  const editItemFormMeta = ref({
    id: '',
    productName: '',
  })

  const editItemAvailableUnits = computed(() => {
    return (
      allMeasurementUnits.value?.map((u) => ({
        ...u,
        displayName: u.legacy_alias ? `${u.name} (Legado: ${u.legacy_alias})` : u.name,
      })) || []
    )
  })

  const editItemAvailableAliases = computed(() => {
    if (!eiSearchUnitText.value) return []
    const query = eiSearchUnitText.value.trim().toLowerCase()
    const unit = allMeasurementUnits.value?.find(
      (u) => u.name.trim().toLowerCase() === query || u.id === eiSearchUnitText.value,
    )
    return unit?.measurement_unit_aliases || []
  })

  const openEditItemModal = (item: {
    id: string
    quantity: number | string
    reference_price?: number | string | null
    bid_interval?: number | string | null
    bid_interval_type?: 'percentage' | 'monetary' | null
    product_id?: string
    product?: { id?: string; name: string }
    unit_id?: string | null
    alias_id?: string | null
    measurement_units?: { id?: string; name?: string } | null
    measurement_unit_aliases?: { id?: string; code?: number; name?: string } | null
  }) => {
    eiReset({
      values: {
        productId: item.product_id || item.product?.id || '',
        quantity: Number(item.quantity),
        reference_price: item.reference_price != null ? Number(item.reference_price) : null,
        bid_interval: item.bid_interval ? Number(item.bid_interval) : 3,
        bid_interval_type: item.bid_interval_type === 'monetary' ? 'monetary' : 'percentage',
        searchUnitText:
          item.measurement_units?.name ||
          (item.unit_id
            ? allMeasurementUnits.value?.find((u) => u.id === item.unit_id)?.name || ''
            : ''),
        aliasId: item.alias_id || null,
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
        bidInterval: values.bid_interval,
        bidIntervalType: values.bid_interval_type,
        finalUnitId: await resolveOrCreateUnit(values.searchUnitText),
        finalAliasId: values.aliasId || null,
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

  const disputeSummary = computed(() => {
    if (!items.value) return { winnersCount: 0, failedCount: 0, desertedCount: 0, total: 0 }
    let winnersCount = 0
    let failedCount = 0
    let desertedCount = 0

    for (const item of items.value) {
      const res = getItemDisputeResult(item)
      if (res.outcome === 'winner') winnersCount++
      else if (res.outcome === 'failed') failedCount++
      else if (res.outcome === 'deserted') desertedCount++
    }

    return {
      winnersCount,
      failedCount,
      desertedCount,
      total: items.value.length,
    }
  })

  // --- RELATÓRIO DE HOMOLOGAÇÃO DA DISPUTA ---
  const isReportModalOpen = ref(false)

  // --- COLUNAS DA TABELA DE PRODUTOS ---
  const demandProductHeaders = computed(() => {
    const isQuotation = demand.value?.status === 'quotation'
    const isPreDispute = demand.value?.status === 'planning' || demand.value?.status === 'quotation'

    const baseHeaders = [
      {
        text: '#',
        value: 'order',
        align: 'center' as const,
        sortable: false,
        width: isQuotation ? 64 : 44,
      },
      { text: 'Produto', value: 'product' },
      { text: 'Natureza', value: 'expense_nature', width: 110 },
      { text: 'Qtd.', value: 'quantity', align: 'center' as const, width: 70 },
      {
        text: 'Referência',
        value: 'reference_values',
        align: 'right' as const,
        width: 140,
      },
    ]

    if (!isPreDispute) {
      baseHeaders.push({
        text: 'Disputa / Vencedor',
        value: 'dispute_result',
        align: 'right' as const,
        width: 220,
      })
    }

    if (demand.value?.status === 'homologation' || demand.value?.status === 'completed') {
      baseHeaders.push({
        text: 'Execução',
        value: 'execution_status',
        align: 'center' as const,
        width: 170,
      })
    }

    if (isQuotation) {
      baseHeaders.push({
        text: 'Ações',
        value: 'actions',
        align: 'right' as const,
        width: 80,
      })
    }

    return baseHeaders
  })

  // --- MODAL DE STATUS DE EXECUÇÃO DO ITEM ---
  const isExecutionStatusModalOpen = ref(false)
  const selectedItemForExecutionStatus = ref<DemandProductRow | null>(null)

  const openExecutionStatusModal = (item: DemandProductRow) => {
    selectedItemForExecutionStatus.value = item
    isExecutionStatusModalOpen.value = true
  }

  const handleExecutionStatusSaved = async () => {
    await refreshItems()
  }

  const handleGenerateReport = () => {
    isReportModalOpen.value = true
  }
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

          <div class="d-flex flex-wrap gap-3 ml-auto">
            <UiButton
              v-if="['homologation', 'completed'].includes(demand.status)"
              color="primary"
              prepend-icon="document"
              variant="outlined"
              @click="handleGenerateReport"
            >
              Gerar Relatório da Disputa
            </UiButton>
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
                    v-if="demand.status === 'dispute'"
                    color="success"
                    prepend-icon="checkCircle"
                    @click="openAdvanceModal"
                  >
                    Finalizar Disputa
                  </UiButton>
                  <UiButton
                    v-else
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
              <UiCol cols="12" md="4" sm="6">
                <div class="text-caption text-grey">Nº SIAFEM</div>
                <div class="text-body-1 font-weight-medium">
                  {{ demand.siafem_number || '-' }}
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
                  ID PCA, Nº Contratação e Nº SIAFEM).
                  <br />
                  <small>Você pode editar a demanda voltando à tela de listagem.</small>
                </UiAlert>
              </UiCol>
            </UiRow>
          </UiCard>

          <!-- Dados da Disputa -->
          <UiCard
            v-if="demand?.status !== 'planning' && demand?.status !== 'quotation'"
            class="mb-4"
            variant="outline"
          >
            <template #header>
              <div class="d-flex align-center w-100">
                <UiIcon class="mr-2 text-primary" left name="fileText" />
                <span>Dados do Aviso de Contratação e Disputa</span>
                <UiSpacer />
                <UiButton
                  v-if="demand?.status === 'bidding_notice' || demand?.status === 'dispute'"
                  color="primary"
                  prepend-icon="edit"
                  size="sm"
                  variant="ghost"
                  @click="openEditBiddingNoticeModal"
                >
                  Editar
                </UiButton>
              </div>
            </template>
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
          <UiList class="bg-transparent pa-0" size="sm">
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
          <div
            v-if="demand?.status !== 'planning' && demand?.status !== 'quotation'"
            class="d-flex ga-1 align-center flex-wrap"
          >
            <UiChip v-if="disputeSummary.winnersCount > 0" color="success" size="xs" variant="soft">
              {{ disputeSummary.winnersCount }} com vencedor
            </UiChip>
            <UiChip v-if="disputeSummary.failedCount > 0" color="error" size="xs" variant="soft">
              {{ disputeSummary.failedCount }} fracassado(s)
            </UiChip>
            <UiChip
              v-if="disputeSummary.desertedCount > 0"
              color="warning"
              size="xs"
              variant="soft"
            >
              {{ disputeSummary.desertedCount }} deserto(s)
            </UiChip>
          </div>
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
        <UiTable :headers="demandProductHeaders" :items="items || []">
          <template #empty> Nenhum produto adicionado a esta demanda ainda. </template>

          <!-- Ordem -->
          <template #item-order="{ index }">
            <div
              v-if="demand?.status === 'quotation'"
              class="d-flex align-center justify-center ga-1"
            >
              <UiActionButton
                action="moveUp"
                :disabled="index === 0 || isReordering"
                size="xs"
                tooltip="Mover para cima"
                @click="moveItemUp(index)"
              />
              <UiActionButton
                action="moveDown"
                :disabled="index === (items?.length || 0) - 1 || isReordering"
                size="xs"
                tooltip="Mover para baixo"
                @click="moveItemDown(index)"
              />
            </div>
            <span v-else class="text-caption font-weight-bold text-medium-emphasis">
              {{ index + 1 }}
            </span>
          </template>

          <!-- Produto: Nome e chips na mesma linha fluida -->
          <template #item-product="{ item }">
            <div class="d-flex align-center flex-wrap ga-2 py-1">
              <NuxtLink
                class="text-decoration-none text-primary font-weight-bold"
                :to="`/demands/${demandId}/items/${item.id}`"
              >
                {{ item.product_name_snapshot || item.product?.name || 'Produto desconhecido' }}
              </NuxtLink>
              <UiActionButton
                color="grey"
                icon="externalLink"
                size="xs"
                :to="`/products/${item.product_id}`"
                tooltip="Cadastro do Produto"
              />
              <UiChip
                v-if="item.measurement_units"
                class="flex-shrink-0"
                color="secondary"
                size="xs"
                variant="solid"
              >
                {{ item.unit_name_snapshot || item.measurement_units.name }}
              </UiChip>
              <UiChip
                v-if="item.alias_name_snapshot || item.measurement_unit_aliases?.name"
                class="flex-shrink-0"
                color="info"
                size="xs"
                variant="soft"
              >
                Alias:
                {{
                  item.alias_code_snapshot || item.measurement_unit_aliases?.code
                    ? `${item.alias_code_snapshot || item.measurement_unit_aliases?.code} - `
                    : ''
                }}{{ item.alias_name_snapshot || item.measurement_unit_aliases?.name }}
              </UiChip>
              <UiChip
                v-if="item.product?.cat_bec"
                append-icon="externalLink"
                class="flex-shrink-0"
                color="secondary"
                :href="getBecProductUrl(item.product.cat_bec)"
                rel="noopener noreferrer"
                size="xs"
                target="_blank"
                title="Abrir no catálogo BEC"
                variant="soft"
              >
                BEC: {{ item.product.cat_bec }}
              </UiChip>
            </div>
          </template>

          <!-- Natureza -->
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

          <!-- Quantidade -->
          <template #item-quantity="{ item }">
            <span class="font-weight-medium">{{ item.quantity }}</span>
          </template>

          <!-- Referência: Total em destaque + Unitário abaixo -->
          <template #item-reference_values="{ item }">
            <div class="d-flex flex-column text-right" style="line-height: 1.25">
              <span class="font-weight-bold text-high-emphasis">
                {{
                  formatCurrency(
                    item.reference_price != null && item.quantity != null
                      ? Number(item.reference_price) * Number(item.quantity)
                      : null,
                  )
                }}
              </span>
              <span class="text-caption text-medium-emphasis">
                {{ formatReferencePrice(item.reference_price) }} / un
              </span>
            </div>
          </template>

          <!-- Disputa / Vencedor: Fornecedor, Situação e Valores condensados -->
          <template #item-dispute_result="{ item }">
            <div class="d-flex flex-column text-right" style="line-height: 1.25">
              <template v-if="getItemDisputeResult(item).outcome === 'winner'">
                <div class="d-flex align-center justify-end ga-1 mb-1">
                  <NuxtLink
                    v-if="getItemDisputeResult(item).winningBid?.suppliers"
                    class="text-decoration-none text-primary font-weight-bold text-truncate"
                    style="max-width: 140px"
                    :title="getItemDisputeResult(item).winnerSupplierName"
                    :to="`/demands/${demandId}/suppliers/${getItemDisputeResult(item).winningBid.supplier_id}`"
                  >
                    {{ getItemDisputeResult(item).winnerSupplierName }}
                  </NuxtLink>
                  <span
                    v-else
                    class="text-truncate font-weight-medium text-high-emphasis"
                    style="max-width: 140px"
                    :title="getItemDisputeResult(item).winnerSupplierName"
                  >
                    {{ getItemDisputeResult(item).winnerSupplierName }}
                  </span>
                  <UiChip color="success" label size="xs" variant="soft">Venceu</UiChip>
                </div>
                <div class="text-success font-weight-bold">
                  {{ formatCurrency(getItemDisputeResult(item).totalFinal) }}
                </div>
                <div class="text-caption text-medium-emphasis">
                  Lance: {{ formatCurrency(getItemDisputeResult(item).winningAmount) }}
                </div>
              </template>

              <template v-else-if="getItemDisputeResult(item).outcome === 'failed'">
                <div>
                  <UiChip color="error" label size="xs" variant="flat">
                    <UiIcon name="close" size="12" start />
                    Fracassado
                  </UiChip>
                </div>
                <span class="text-caption text-medium-emphasis mt-1">Sem vencedor</span>
              </template>

              <template v-else-if="getItemDisputeResult(item).outcome === 'deserted'">
                <div>
                  <UiChip color="warning" label size="xs" variant="flat">
                    <UiIcon name="alert" size="12" start />
                    Deserto
                  </UiChip>
                </div>
                <span class="text-caption text-medium-emphasis mt-1">Sem lances</span>
              </template>
            </div>
          </template>

          <!-- Execução do Item (Pós-Homologação) -->
          <template #item-execution_status="{ item }">
            <template v-if="getItemDisputeResult(item).outcome === 'winner'">
              <div class="d-flex flex-column align-center ga-1">
                <UiChip
                  :color="
                    DEMAND_ITEM_EXECUTION_STATUS_COLORS[item.execution_status || 'homologated']
                  "
                  size="xs"
                  style="cursor: pointer"
                  variant="flat"
                  @click="openExecutionStatusModal(item)"
                >
                  <UiIcon
                    :name="
                      DEMAND_ITEM_EXECUTION_STATUS_ICONS[item.execution_status || 'homologated']
                    "
                    size="12"
                    start
                  />
                  {{ DEMAND_ITEM_EXECUTION_STATUS_LABELS[item.execution_status || 'homologated'] }}
                </UiChip>
                <UiChip
                  v-if="item.commitment_number"
                  class="font-weight-medium font-monospace"
                  color="purple"
                  size="xs"
                  title="Número do Empenho"
                  variant="outlined"
                >
                  <UiIcon name="document" size="10" start />
                  {{ item.commitment_number }}
                </UiChip>
                <div
                  v-if="item.execution_status === 'error' && item.execution_error_details"
                  class="text-caption text-error text-truncate"
                  style="max-width: 150px"
                  :title="item.execution_error_details"
                >
                  {{ item.execution_error_details }}
                </div>
              </div>
            </template>
            <span v-else class="text-caption text-medium-emphasis">-</span>
          </template>

          <!-- Ações -->
          <template #item-actions="{ item }">
            <div class="d-flex flex-nowrap align-center justify-end gap-1">
              <UiActionButton
                action="edit"
                tooltip="Editar Item"
                @click="openEditItemModal(item)"
              />
              <UiActionButton
                action="delete"
                tooltip="Remover item"
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
          <div class="d-flex align-center ga-1 text-caption text-grey">
            <span>{{ formatCnpj(supplier.cnpj) }}</span>
            <UiCopyButton
              v-if="supplier.cnpj"
              clean-digits-only
              color="secondary"
              size="xs"
              success-message="CNPJ copiado!"
              tooltip="Copiar CNPJ (apenas números)"
              :value="supplier.cnpj"
            />
          </div>
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

      <UiInput
        v-model.number="eiReferencePrice"
        v-bind="eiReferencePriceProps"
        :error-messages="eiErrors.reference_price"
        label="Valor Referencial (R$)"
        step="0.0001"
        type="number"
      />

      <div class="d-flex align-center mt-2 mb-4">
        <UiSelect
          v-model="eiBidIntervalType"
          v-bind="eiBidIntervalTypeProps"
          class="mr-2 flex-grow-1"
          :error-messages="eiErrors.bid_interval_type"
          hide-details
          :items="[
            { title: 'Percentual (%)', value: 'percentage' },
            { title: 'Monetário (R$)', value: 'monetary' },
          ]"
          label="Tipo de Intervalo"
          size="md"
          variant="outline"
        />
        <UiInput
          v-model.number="eiBidInterval"
          v-bind="eiBidIntervalProps"
          class="flex-grow-1"
          :error-messages="eiErrors.bid_interval"
          hide-details
          label="Valor do Intervalo"
          step="0.01"
          type="number"
        />
      </div>

      <MeasurementUnitSelect
        v-model="eiSearchUnitText"
        v-bind="eiSearchUnitTextProps"
        class="mb-4"
        :error-messages="eiErrors.searchUnitText"
        :items="editItemAvailableUnits"
      />

      <UiAutocomplete
        v-if="editItemAvailableAliases.length > 0"
        v-model="eiAliasId"
        v-bind="eiAliasIdProps"
        class="mb-4"
        clearable
        :error-messages="eiErrors.aliasId"
        :item-title="(item: Record<string, unknown>) => `${item.code} - ${item.name}`"
        item-value="id"
        :items="editItemAvailableAliases"
        label="Registro Alternativo (Alias)"
        placeholder="Selecione o registro alternativo..."
        size="md"
        variant="outline"
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
          item-title="name"
          item-value="id"
          :items="allProducts || []"
          label="Buscar Produto"
          placeholder="Digite o nome do produto..."
          size="md"
          variant="outline"
        >
          <!-- Personalizando a pesquisa no front-end para simplificar -->
          <template #no-data>
            <div class="pa-3 text-center">
              <span class="text-grey mr-2">Produto não encontrado.</span>
              <UiButton color="primary" size="sm" variant="soft" @click="activateNewProductMode">
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

        <div v-if="selectedProductId" class="mt-2 mb-2">
          <UiSwitch
            v-model="isSuggestingAlias"
            class="mb-2"
            color="primary"
            label="Não encontrou o registro alternativo? Sugerir novo"
          />

          <UiAutocomplete
            v-if="!isSuggestingAlias"
            v-model="selectedAliasId"
            class="mb-2"
            clearable
            :item-title="(item: Record<string, unknown>) => `${item.code} - ${item.name}`"
            item-value="id"
            :items="availableAliasesForCurrentUnit"
            label="Registro Alternativo (Alias) *"
            placeholder="Selecione o registro alternativo..."
            size="md"
            variant="outline"
          >
            <template #no-data>
              <div class="pa-3 text-center">
                <span class="text-grey mr-2">Nenhum alias vinculado a esta unidade.</span>
                <UiButton
                  color="primary"
                  size="sm"
                  variant="soft"
                  @click="isSuggestingAlias = true"
                >
                  Sugerir novo
                </UiButton>
              </div>
            </template>
          </UiAutocomplete>

          <div v-else class="d-flex ga-3 mb-2">
            <UiInput
              v-model.number="suggestedAliasCode"
              class="flex-grow-0"
              label="Código do Alias *"
              placeholder="Ex: 36"
              style="max-width: 150px"
              type="number"
            />
            <UiInput
              v-model="suggestedAliasName"
              class="flex-grow-1"
              label="Nome do Registro Alternativo *"
              placeholder="Ex: Cento"
            />
          </div>
        </div>

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

        <div class="d-flex ga-3 mb-4 mt-2">
          <UiInput
            v-model.number="newProductCatMat"
            label="CATMAT (opcional)"
            placeholder="Ex: 123456"
            type="number"
          />
          <UiInput
            v-model.number="newProductCatBec"
            label="CATBEC (opcional)"
            placeholder="Ex: 78910"
            type="number"
          />
        </div>

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
          :item-title="
            (item: Record<string, unknown>) =>
              typeof item === 'object' && item !== null ? `${item.id} - ${item.name}` : ''
          "
          item-value="id"
          :items="expenseNatures || []"
          label="Natureza de Despesa"
          size="md"
          variant="outline"
        />

        <div v-else class="d-flex gap-4 mb-4">
          <UiInput v-model="suggestedNatureId" label="Código (Ex: 33903000)" />
          <UiInput v-model="suggestedNatureName" label="Nome da Natureza" />
        </div>

        <UiSwitch
          v-model="isSuggestingClass"
          class="mb-2"
          color="primary"
          label="Não encontrou a classe? Sugerir nova"
        />

        <UiAutocomplete
          v-if="!isSuggestingClass"
          v-model="newProductClassId"
          class="mb-4"
          clearable
          :item-title="
            (item: Record<string, unknown>) =>
              typeof item === 'object' && item !== null ? `${item.id} - ${item.name}` : ''
          "
          item-value="id"
          :items="productClasses || []"
          label="Classe de Produto"
          size="md"
          variant="outline"
        />

        <div v-else class="d-flex gap-4 mb-4">
          <UiInput v-model="suggestedClassId" label="Código (Ex: 5915)" />
          <UiInput v-model="suggestedClassName" label="Nome da Classe" />
        </div>

        <MeasurementUnitSelect v-model="selectedUnitSearch" class="mb-3" />

        <div class="mb-4">
          <UiSwitch
            v-model="isSuggestingAlias"
            class="mb-2"
            color="primary"
            label="Não encontrou o registro alternativo? Sugerir novo"
          />

          <UiAutocomplete
            v-if="!isSuggestingAlias"
            v-model="selectedAliasId"
            class="mb-2"
            clearable
            :item-title="(item: Record<string, unknown>) => `${item.code} - ${item.name}`"
            item-value="id"
            :items="availableAliasesForCurrentUnit"
            label="Registro Alternativo (Alias) *"
            placeholder="Selecione o registro alternativo..."
            size="md"
            variant="outline"
          >
            <template #no-data>
              <div class="pa-3 text-center">
                <span class="text-grey mr-2">Nenhum alias vinculado a esta unidade.</span>
                <UiButton
                  color="primary"
                  size="sm"
                  variant="soft"
                  @click="isSuggestingAlias = true"
                >
                  Sugerir novo
                </UiButton>
              </div>
            </template>
          </UiAutocomplete>

          <div v-else class="d-flex ga-3 mb-2">
            <UiInput
              v-model.number="suggestedAliasCode"
              class="flex-grow-0"
              label="Código do Alias *"
              placeholder="Ex: 36"
              style="max-width: 150px"
              type="number"
            />
            <UiInput
              v-model="suggestedAliasName"
              class="flex-grow-1"
              label="Nome do Registro Alternativo *"
              placeholder="Ex: Cento"
            />
          </div>
        </div>

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
      :title="
        targetStatus === 'homologation'
          ? 'Finalizar Fase de Disputa'
          : `Avançar para: ${formatDemandStatus(targetStatus)}`
      "
      transparent-header
    >
      <UiAlert v-if="advanceModal.error.value" class="mb-4" size="sm" type="error" variant="soft">
        {{ advanceModal.error.value }}
      </UiAlert>

      <div v-if="targetStatus === 'bidding_notice'">
        <UiAlert class="mb-4" size="sm" type="info" variant="soft">
          Os dados abaixo são opcionais nesta etapa e podem ser informados agora ou posteriormente
          nos detalhes da demanda.
        </UiAlert>

        <UiInput
          v-model="advanceModal.payload.value.bidding_notice_number"
          label="Aviso de Contratação"
        />
        <UiInput
          v-model="advanceModal.payload.value.dispute_number"
          class="mt-3"
          label="Nº Disputa"
        />
        <UiInput
          v-model="advanceModal.payload.value.dispute_date"
          class="mt-3"
          label="Data da Disputa"
          type="date"
        />
        <UiRow class="mt-2">
          <UiCol class="py-0" cols="12" sm="6">
            <UiInput
              v-model="advanceModal.payload.value.offer_opening_date"
              label="Data de Abertura"
              type="date"
            />
          </UiCol>
          <UiCol class="py-0" cols="12" sm="6">
            <UiInput
              v-model="advanceModal.payload.value.offer_opening_time"
              label="Hora de Abertura"
              type="time"
            />
          </UiCol>
        </UiRow>
      </div>

      <div v-if="targetStatus === 'dispute'">
        <UiAlert class="mb-4" size="sm" type="warning" variant="soft">
          Todos os dados abaixo são obrigatórios para avançar para a fase de Disputa.
        </UiAlert>

        <UiInput
          v-model="advanceModal.payload.value.bidding_notice_number"
          label="Aviso de Contratação *"
          required
        />
        <UiInput
          v-model="advanceModal.payload.value.dispute_number"
          class="mt-3"
          label="Nº Disputa *"
          required
        />
        <UiInput
          v-model="advanceModal.payload.value.dispute_date"
          class="mt-3"
          label="Data da Disputa *"
          required
          type="date"
        />
        <UiRow class="mt-2">
          <UiCol class="py-0" cols="12" sm="6">
            <UiInput
              v-model="advanceModal.payload.value.offer_opening_date"
              label="Data de Abertura *"
              required
              type="date"
            />
          </UiCol>
          <UiCol class="py-0" cols="12" sm="6">
            <UiInput
              v-model="advanceModal.payload.value.offer_opening_time"
              label="Hora de Abertura *"
              required
              type="time"
            />
          </UiCol>
        </UiRow>
      </div>

      <div v-if="targetStatus === 'homologation'">
        <UiAlert class="mb-4" color="info" size="sm" variant="soft">
          Ao finalizar a disputa, os lances e desclassificações serão congelados e o processo
          entrará na fase de Homologação.
        </UiAlert>

        <p class="text-body-2 mb-3">
          Confira o resumo da apuração dos itens da demanda antes de confirmar:
        </p>

        <UiCard class="pa-3 mb-3 bg-surface-variant" variant="soft">
          <div class="d-flex flex-column ga-2">
            <div class="d-flex align-center justify-space-between text-body-2">
              <span>Total de Itens:</span>
              <strong>{{ disputeSummary.total }}</strong>
            </div>
            <div class="d-flex align-center justify-space-between text-body-2 text-success">
              <span>Itens com Vencedor:</span>
              <strong>{{ disputeSummary.winnersCount }}</strong>
            </div>
            <div class="d-flex align-center justify-space-between text-body-2 text-error">
              <span>Itens Fracassados:</span>
              <strong>{{ disputeSummary.failedCount }}</strong>
            </div>
            <div class="d-flex align-center justify-space-between text-body-2 text-warning">
              <span>Itens Desertos:</span>
              <strong>{{ disputeSummary.desertedCount }}</strong>
            </div>
          </div>
        </UiCard>

        <UiInput
          v-model="advanceModal.payload.value.contract_number"
          hint="Opcional. Se já possuir número de Contrato/Ata."
          label="Número da Contratação (Contrato/Ata)"
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
        >
          {{ targetStatus === 'homologation' ? 'Sim, Finalizar Disputa' : 'Confirmar Avanço' }}
        </UiButton>
      </template>
    </UiModal>

    <!-- Modal Editar Dados do Aviso de Contratação e Disputa -->
    <UiModal
      v-model="editBiddingNoticeModal.isOpen.value"
      max-width="500px"
      title="Editar Dados do Aviso de Contratação e Disputa"
      transparent-header
    >
      <UiAlert
        v-if="editBiddingNoticeModal.error.value"
        class="mb-4"
        size="sm"
        type="error"
        variant="soft"
      >
        {{ editBiddingNoticeModal.error.value }}
      </UiAlert>

      <UiInput
        v-model="editBiddingNoticeModal.payload.value.bidding_notice_number"
        label="Aviso de Contratação"
      />
      <UiInput
        v-model="editBiddingNoticeModal.payload.value.dispute_number"
        class="mt-3"
        label="Nº Disputa"
      />
      <UiInput
        v-model="editBiddingNoticeModal.payload.value.dispute_date"
        class="mt-3"
        label="Data da Disputa"
        type="date"
      />
      <UiRow class="mt-2">
        <UiCol class="py-0" cols="12" sm="6">
          <UiInput
            v-model="editBiddingNoticeModal.payload.value.offer_opening_date"
            label="Data de Abertura"
            type="date"
          />
        </UiCol>
        <UiCol class="py-0" cols="12" sm="6">
          <UiInput
            v-model="editBiddingNoticeModal.payload.value.offer_opening_time"
            label="Hora de Abertura"
            type="time"
          />
        </UiCol>
      </UiRow>

      <template #actions>
        <UiButton
          :disabled="editBiddingNoticeModal.isSaving.value"
          variant="ghost"
          @click="editBiddingNoticeModal.close()"
        >
          Cancelar
        </UiButton>
        <UiButton
          color="primary"
          :loading="editBiddingNoticeModal.isSaving.value"
          @click="saveBiddingNoticeData"
        >
          Salvar
        </UiButton>
      </template>
    </UiModal>

    <!-- Modal Retornar Status -->
    <UiModal
      v-model="revertModal.isOpen.value"
      max-width="500px"
      title="Confirmar Retorno de Fase"
      transparent-header
    >
      <UiAlert v-if="revertModal.error.value" class="mb-4" size="sm" type="error" variant="soft">
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
        <UiButton
          :disabled="revertModal.isSaving.value"
          variant="ghost"
          @click="revertModal.close()"
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

      <UiInput
        v-model="epSiafem"
        v-bind="epSiafemProps"
        :error-messages="epErrors.siafem_number"
        hint="Opcional."
        label="Nº SIAFEM"
        placeholder="Ex: 2026NE000123 ou número SIAFEM"
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

    <!-- Modal do Relatório de Homologação da Disputa -->
    <DemandDisputeReportModal v-model="isReportModalOpen" :demand="demand" :items="items" />

    <!-- Modal de Atualização de Status de Execução do Item -->
    <DemandItemExecutionStatusModal
      v-model="isExecutionStatusModalOpen"
      :item="selectedItemForExecutionStatus"
      @saved="handleExecutionStatusSaved"
    />
  </UiContainer>
</template>
