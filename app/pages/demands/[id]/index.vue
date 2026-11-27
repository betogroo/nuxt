<script setup lang="ts">
  import { ROLES } from '~/constants/roles'
  import { useZodForm } from '~/composables/useZodForm'
  import { demandFormSchema, demandResponsibleSchema } from '~/schemas/forms/demand'
  import { demandItemFormSchema } from '~/schemas/forms/demand-item'
  import {
    formatCnpj,
    formatCurrency,
    formatDemandModality,
    formatUnitPrice,
    splitDateTime,
    combineDateTime,
    validateOfferOpeningRules,
  } from '~/utils/formatters'
  import {
    buildDemandModalityOptions,
    checkDemandClassExceedsAnnualCeiling,
  } from '~/utils/demandModality'
  import {
    getCnpjEstablishmentInfo,
    findSameRootSuppliers,
    formatCnpjRoot,
    getCnpjRoot,
  } from '~/utils/cnpj'
  import {
    DEMAND_ITEM_EXECUTION_STATUS_LABELS,
    DEMAND_ITEM_EXECUTION_STATUS_COLORS,
    DEMAND_ITEM_EXECUTION_STATUS_ICONS,
  } from '~/constants/demand-item-status'
  import type { DemandProductRow } from '~/composables/useDemandProducts'
  import DemandItemExecutionStatusModal from '~/components/demands/DemandItemExecutionStatusModal.vue'
  import DemandItemsBatchExecutionStatusModal from '~/components/demands/DemandItemsBatchExecutionStatusModal.vue'
  import DemandDisputeReportModal from '~/components/demands/DemandDisputeReportModal.vue'
  import DemandCommitmentsReportModal from '~/components/demands/DemandCommitmentsReportModal.vue'
  import DemandCommitmentExtractsModal from '~/components/demands/DemandCommitmentExtractsModal.vue'
  import DemandTechnicalCapacityModal from '~/components/demands/DemandTechnicalCapacityModal.vue'
  import SupplierCommitmentsBatchModal from '~/components/demands/SupplierCommitmentsBatchModal.vue'
  import DemandConvocationEmailModal from '~/components/demands/DemandConvocationEmailModal.vue'
  import DemandTermsOfReferenceTableModal from '~/components/demands/DemandTermsOfReferenceTableModal.vue'
  import DemandBidIntervalsTableModal from '~/components/demands/DemandBidIntervalsTableModal.vue'
  import DemandClassBalanceTableModal from '~/components/demands/DemandClassBalanceTableModal.vue'
  import DemandTablesHubModal from '~/components/demands/DemandTablesHubModal.vue'
  import DemandProductClassBalanceCard from '~/components/demands/DemandProductClassBalanceCard.vue'
  import {
    areAllBidIntervalsConfigured,
    getPendingBidIntervalItems,
  } from '~/utils/demandBidIntervalsTable'
  import { calculateSingleClassBalance } from '~/utils/demandClassBalanceTable'
  import { downloadDemandFolderBatch } from '~/utils/demandFolderBatch'
  import { downloadDemandCatalogCsv } from '~/utils/demandCatalogCsv'
  import { downloadDemandFinancialDocsCsv } from '~/utils/demandFinancialDocsCsv'
  import { resolveDemandBudgetCodes, DEMAND_BUDGET_DEFAULTS } from '~/constants/demand-budget'
  import { useRowSelection } from '~/composables/useRowSelection'
  import {
    type DemandTab,
    getDemandDefaultTab,
    isValidDemandTab,
    resolveInitialDemandTab,
  } from '~/utils/demandTabs'
  import { useDemandReports, type DemandWithClassProductsRow } from '~/composables/useDemandReports'
  import type { CommitmentRow } from '~/composables/useCommitments'
  import type { WinningSupplierSummaryItem } from '~/composables/useDemandDetail'
  definePageMeta({ middleware: ['uge'] })
  const route = useRoute()
  const router = useRouter()
  const toast = useToast()
  const { logAction } = useLogger()
  const { profile, fetchAllProfiles } = useProfile()
  const { canEditDemand } = usePermissions()
  const { fetchCommitmentsByDemand } = useCommitments()

  const { addDemandItemWithDependencies, updateDemandItemWithDependencies } = useDemandProducts()

  const { fetchAllActiveProducts } = useProducts()
  const { fetchAllActiveProductClasses } = useProductClasses()
  const { fetchAllActiveExpenseNatures } = useExpenseNatures()
  const { fetchUnits, resolveOrCreateUnit } = useMeasurementUnits()
  const { fetchAllActiveSuppliers, replaceSupplierInDemandBids } = useSuppliers()
  const { getBecProductUrl, fetchProductClassAnnualCeilings, getCeilingForYear } =
    useSystemSettings()
  const { fetchDemandsForClassSpending, resolveDemandYear } = useDemandReports()

  const demandId = route.params.id as string

  const {
    demand,
    demandPending,
    refreshDemand,
    updateDemand,
    isPlanningIncomplete,
    isReadyForCompletion,
    responsibles,
    refreshResponsibles: _refreshResponsibles,
    isAddingResponsible,
    addResponsible,
    removeResponsible,
    items,
    itemsPending,
    itemsError,
    refreshItems,
    isReordering,
    moveItemUp,
    moveItemDown,
    removeItem,
    winningSuppliersSummary,
  } = useDemandDetail(demandId)

  const canWorkOnDemand = computed(() => canEditDemand(demand.value, responsibles.value))

  // Modal de Edição Rápida de Planejamento
  const {
    errors: epErrors,
    defineField: epDefine,
    resetForm: epReset,
    handleSubmit: epSubmit,
  } = useZodForm(demandFormSchema, {
    name: '',
    type: 'consumption',
    modality: 'dispensation',
    internal_process_number: '',
    process_number: '',
    id_pca: '',
    contract_number: '',
    siafem_number: '',
    work_program: '',
    ptres: '',
  })

  const [epName, epNameProps] = epDefine('name')
  const [epType, epTypeProps] = epDefine('type')
  const [epModality, epModalityProps] = epDefine('modality')
  const [epInternalProcess, epInternalProcessProps] = epDefine('internal_process_number')
  const [epProcess, epProcessProps] = epDefine('process_number')
  const [epIdPca, epIdPcaProps] = epDefine('id_pca')
  const [epContract, epContractProps] = epDefine('contract_number')
  const [epSiafem, epSiafemProps] = epDefine('siafem_number')
  const [epWorkProgram, epWorkProgramProps] = epDefine('work_program')
  const [epPtres, epPtresProps] = epDefine('ptres')

  const resolvedBudgetCodes = computed(() => resolveDemandBudgetCodes(demand.value))

  const editPlanningModal = useModal({})

  const openEditPlanning = async () => {
    await ensureSpendingData()
    if (demand.value) {
      const resolvedModality = demandClassCeilingCheck.value.isExceeded
        ? 'bidding'
        : (demand.value.modality as 'dispensation' | 'bidding') || 'dispensation'

      epReset({
        values: {
          id: demand.value.id,
          name: demand.value.name,
          type: demand.value.type as 'consumption' | 'permanent',
          modality: resolvedModality,
          internal_process_number: demand.value.internal_process_number || '',
          process_number: demand.value.process_number || '',
          id_pca: demand.value.id_pca || '',
          contract_number: demand.value.contract_number ? String(demand.value.contract_number) : '',
          siafem_number: demand.value.siafem_number || '',
          work_program: demand.value.work_program || '',
          ptres: demand.value.ptres || '',
        },
      })
      editPlanningModal.open()
    }
  }

  const savePlanning = epSubmit(
    async (values) => {
      editPlanningModal.startSaving()
      try {
        const payload: {
          name: string
          type: 'consumption' | 'permanent'
          modality: 'dispensation' | 'bidding'
          internal_process_number?: string
          process_number: string | null
          id_pca: string | null
          contract_number: string | null
          siafem_number: string | null
          work_program: string | null
          ptres: string | null
        } = {
          name: values.name,
          type: values.type,
          modality: demandClassCeilingCheck.value.isExceeded ? 'bidding' : values.modality,
          process_number: values.process_number || null,
          id_pca: values.id_pca || null,
          contract_number: values.contract_number || null,
          siafem_number: values.siafem_number || null,
          work_program: values.work_program ? values.work_program.trim() : null,
          ptres: values.ptres ? values.ptres.trim() : null,
        }
        if (profile.value?.role === ROLES.ADMIN && values.internal_process_number) {
          payload.internal_process_number = values.internal_process_number.trim()
        }
        await updateDemand(payload)
        await refreshDemand()
        toast.success('Dados do planejamento atualizados com sucesso!')
        editPlanningModal.close()
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        editPlanningModal.error.value = msg
        toast.error(msg)
      } finally {
        editPlanningModal.stopSaving()
      }
    },
    ({ errors }) => {
      const firstError = Object.values(errors).find(Boolean)
      if (firstError) {
        editPlanningModal.error.value = firstError
        toast.error(firstError)
      }
    },
  )

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
        const dateError = validateOfferOpeningRules(
          offerDate,
          offerTime,
          p.dispute_date,
          undefined,
          Boolean(demand.value?.is_historical),
        )
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

  const { data: allActiveSuppliers } = useAsyncData('all-active-suppliers-demand', async () => {
    return await fetchAllActiveSuppliers()
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

  // --- CONTROLE DE SALDO POR CLASSE NO CADASTRO DE PRODUTO ---
  const ceilingsMap = ref<Record<string, number>>({})
  const allDemandsForSpending = ref<DemandWithClassProductsRow[]>([])
  const isSpendingDataLoading = ref(false)
  const isSpendingDataLoaded = ref(false)

  const ensureSpendingData = async () => {
    if (isSpendingDataLoaded.value || isSpendingDataLoading.value) return
    isSpendingDataLoading.value = true
    try {
      const [ceilings, demandsList] = await Promise.all([
        fetchProductClassAnnualCeilings(),
        fetchDemandsForClassSpending(),
      ])
      if (ceilings) ceilingsMap.value = ceilings
      if (demandsList) allDemandsForSpending.value = demandsList
      isSpendingDataLoaded.value = true
    } catch (err) {
      console.error('Erro ao carregar dados de gastos por classe:', err)
    } finally {
      isSpendingDataLoading.value = false
    }
  }

  const demandYear = computed<number>(() => {
    if (!demand.value) return new Date().getFullYear()
    return resolveDemandYear(demand.value)
  })

  const demandClassCeilingCheck = computed(() => {
    const ceilingInfo = getCeilingForYear(ceilingsMap.value, demandYear.value)
    return checkDemandClassExceedsAnnualCeiling(items.value || [], ceilingInfo.amount)
  })

  const epModalityOptions = computed(() => {
    return buildDemandModalityOptions(demandClassCeilingCheck.value.isExceeded)
  })

  watch(
    () => demandClassCeilingCheck.value.isExceeded,
    (exceeded) => {
      if (exceeded && editPlanningModal.isOpen.value && epModality.value === 'dispensation') {
        epModality.value = 'bidding'
      }
    },
  )

  const syncDemandModalityWithClassCeiling = async () => {
    await ensureSpendingData()
    const check = demandClassCeilingCheck.value
    if (check.isExceeded && demand.value && demand.value.modality !== 'bidding') {
      await updateDemand({ modality: 'bidding' })
      await refreshDemand()
      const classSummary = check.exceedingClasses
        .map((c) => `${c.label} (${formatCurrency(c.totalAmount)})`)
        .join(', ')
      toast.warning(
        `A soma dos itens da classe ${classSummary} ultrapassou o teto anual (${formatCurrency(check.ceilingAmount)}). A modalidade da demanda foi alterada automaticamente para Pregão.`,
      )
    }
  }

  const addingClassInfo = computed(() => {
    if (!isNewProductMode.value) {
      if (!selectedProductId.value) return null
      const prod = allProducts.value?.find((p) => p.id === selectedProductId.value)
      if (!prod) return null
      const classId = prod.product_class_id || prod.product_classes?.id || null
      const className = prod.product_classes?.name || ''
      return { classId, className }
    } else {
      if (isSuggestingClass.value) {
        const classId = suggestedClassId.value?.trim() || null
        const className = suggestedClassName.value?.trim() || ''
        return { classId, className }
      } else {
        if (!newProductClassId.value) return null
        const cls = productClasses.value?.find((c) => c.id === newProductClassId.value)
        return {
          classId: newProductClassId.value,
          className: cls?.name || '',
        }
      }
    }
  })

  const addingItemClassBalance = computed(() => {
    if (!addingClassInfo.value) return null
    const ceilingInfo = getCeilingForYear(ceilingsMap.value, demandYear.value)

    return calculateSingleClassBalance({
      classId: addingClassInfo.value.classId,
      className: addingClassInfo.value.className,
      year: demandYear.value,
      ceilingAmount: ceilingInfo.amount,
      isCeilingConfigured: ceilingInfo.isConfigured,
      currentDemandId: demandId,
      currentItems: items.value || [],
      allDemands: allDemandsForSpending.value,
      addition: {
        quantity: itemQuantity.value,
        unitPrice: itemReferencePrice.value,
      },
    })
  })

  watch(
    () => isModalOpen.value,
    (open) => {
      if (open) {
        ensureSpendingData()
      }
    },
  )

  const openAddModal = () => {
    ensureSpendingData()
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
      await syncDemandModalityWithClassCeiling()
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
    bid_interval: undefined,
    bid_interval_type: undefined,
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
        bid_interval: item.bid_interval != null ? Number(item.bid_interval) : undefined,
        bid_interval_type: item.bid_interval_type ?? undefined,
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
        bidInterval: values.bid_interval ?? null,
        bidIntervalType: values.bid_interval_type ?? null,
        finalUnitId: await resolveOrCreateUnit(values.searchUnitText),
        finalAliasId: values.aliasId || null,
      })

      await refreshAllMeasurementUnits()
      await refreshItems()
      await syncDemandModalityWithClassCeiling()
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
  } = useDemandWorkflow(demandId, demand, items, refreshItems)

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
  const isExecutionPhase = computed(() => {
    return demand.value?.status === 'homologation' || demand.value?.status === 'completed'
  })

  const demandProductHeaders = computed(() => {
    const isQuotation = demand.value?.status === 'quotation'
    const isPreDispute = demand.value?.status === 'planning' || demand.value?.status === 'quotation'

    const baseHeaders = []

    if (isExecutionPhase.value && canWorkOnDemand.value) {
      baseHeaders.push({
        text: '',
        value: 'select',
        align: 'center' as const,
        width: 48,
        sortable: false,
      })
    }

    baseHeaders.push(
      {
        text: '#',
        value: 'order',
        align: 'center' as const,
        sortable: false,
        width: isQuotation && canWorkOnDemand.value ? 88 : 50,
      },
      { text: 'Produto', value: 'product' },
      { text: 'BEC', value: 'cat_bec', align: 'center' as const, width: 110 },
      { text: 'Unidade / Apresentação', value: 'units', width: 220 },
      { text: 'Qtd.', value: 'quantity', align: 'center' as const, width: 70 },
      {
        text: 'Referência',
        value: 'reference_values',
        align: 'right' as const,
        width: 140,
      },
    )

    if (!isPreDispute) {
      baseHeaders.push({
        text: 'Disputa / Vencedor',
        value: 'dispute_result',
        align: 'right' as const,
        width: 220,
      })
    }

    if (isExecutionPhase.value) {
      baseHeaders.push({
        text: 'Execução',
        value: 'execution_status',
        align: 'center' as const,
        width: 170,
      })
    }

    if (isQuotation && canWorkOnDemand.value) {
      baseHeaders.push({
        text: 'Ações',
        value: 'actions',
        align: 'right' as const,
        width: 80,
      })
    }

    return baseHeaders
  })

  // --- FILTRO POR FORNECEDOR VENCEDOR (ABA DE ITENS) ---
  const selectedWinningSupplierId = ref<string | null>(null)

  const winningSupplierFilterOptions = computed(() => {
    return [
      { title: 'Todos os vencedores', value: null },
      ...winningSuppliersSummary.value.map((s) => ({
        title: `${s.company_name} (${s.wonCount} ${s.wonCount === 1 ? 'item' : 'itens'})`,
        value: s.id,
      })),
    ]
  })

  const filteredDemandItems = computed(() => {
    if (!items.value) return []
    if (!selectedWinningSupplierId.value) return items.value

    return items.value.filter((item) => {
      const res = getItemDisputeResult(item)
      return (
        res.outcome === 'winner' && res.winningBid?.supplier_id === selectedWinningSupplierId.value
      )
    })
  })

  const getItemOriginalIndex = (itemId: string): number => {
    if (!items.value) return 0
    const idx = items.value.findIndex((it) => it.id === itemId)
    return idx >= 0 ? idx + 1 : 0
  }

  // --- SELEÇÃO EM LOTE DE ITENS PARA EXECUÇÃO ---
  const eligibleExecutionItems = computed(() => {
    return (filteredDemandItems.value || []).filter(
      (it) => getItemDisputeResult(it).outcome === 'winner',
    )
  })

  const {
    selectedIds: selectedItemIds,
    selectedIdSet: selectedItemIdSet,
    isAllPageSelected,
    isSomePageSelected,
    isRowSelected,
    toggleSelectRow,
    toggleSelectAllPage,
    clearSelection,
  } = useRowSelection<DemandProductRow>(eligibleExecutionItems, (item) => item.id)

  const selectedItemsForBatch = computed(() => {
    if (!items.value || selectedItemIds.value.length === 0) return []
    return items.value.filter((i) => selectedItemIdSet.value.has(i.id))
  })

  const isBatchExecutionModalOpen = ref(false)
  const openBatchExecutionModal = () => {
    if (selectedItemIds.value.length === 0) return
    isBatchExecutionModalOpen.value = true
  }

  const handleBatchExecutionSaved = async () => {
    clearSelection()
    await refreshItems()
  }

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

  // --- MODAL DE GERENCIAMENTO EM LOTE DE EMPENHOS POR FORNECEDOR & NATUREZA ---
  const isCommitmentsBatchModalOpen = ref(false)
  const selectedSupplierForCommitments = ref<WinningSupplierSummaryItem | null>(null)

  const openCommitmentsBatchModal = (supplier: WinningSupplierSummaryItem) => {
    selectedSupplierForCommitments.value = supplier
    isCommitmentsBatchModalOpen.value = true
  }

  const handleCommitmentsBatchSaved = async () => {
    await refreshItems()
  }

  // --- MODAL DE E-MAIL DE CONVOCAÇÃO DO FORNECEDOR ---
  const isConvocationEmailModalOpen = ref(false)
  const selectedSupplierForConvocationEmail = ref<WinningSupplierSummaryItem | null>(null)

  const openConvocationEmailModal = (supplier: WinningSupplierSummaryItem) => {
    selectedSupplierForConvocationEmail.value = supplier
    isConvocationEmailModalOpen.value = true
  }

  // --- DETECÇÃO E SUBSTITUIÇÃO DE ESTABELECIMENTO (MATRIZ / FILIAL - MESMA FAIXA DE CNPJ) ---
  const getRelatedEstablishments = (supplier: { id: string; cnpj: string }) => {
    if (!allActiveSuppliers.value || !supplier.cnpj) return []
    return findSameRootSuppliers(supplier.cnpj, allActiveSuppliers.value, supplier.id)
  }

  const demandSameRootDivergences = computed(() => {
    const groups = new Map<string, WinningSupplierSummaryItem[]>()
    for (const s of winningSuppliersSummary.value) {
      const root = getCnpjRoot(s.cnpj)
      if (!root) continue
      const existing = groups.get(root) || []
      existing.push(s)
      groups.set(root, existing)
    }
    return Array.from(groups.entries())
      .filter(([, list]) => list.length > 1)
      .map(([root, suppliers]) => ({
        root,
        formattedRoot: formatCnpjRoot(root),
        suppliers,
      }))
  })

  const replaceEstablishmentModal = useFormModal<WinningSupplierSummaryItem>()
  const targetReplacementSupplierId = ref<string | null>(null)

  const availableReplacementOptions = computed(() => {
    const current = replaceEstablishmentModal.targetItem.value
    if (!current) return []
    return getRelatedEstablishments(current).map((s) => {
      const info = getCnpjEstablishmentInfo(s.cnpj)
      return {
        title: `${s.company_name} — ${formatCnpj(s.cnpj)} (${info?.badgeLabel || 'Mesma Faixa'})`,
        value: s.id,
        supplier: s,
      }
    })
  })

  const openReplaceEstablishmentModal = (supplier: WinningSupplierSummaryItem) => {
    const related = getRelatedEstablishments(supplier)
    targetReplacementSupplierId.value = related[0]?.id || null
    replaceEstablishmentModal.openForTarget(supplier)
  }

  const handleConfirmReplaceEstablishment = async () => {
    const fromSupplier = replaceEstablishmentModal.targetItem.value
    if (!fromSupplier || !targetReplacementSupplierId.value) return
    const toOption = availableReplacementOptions.value.find(
      (opt) => opt.value === targetReplacementSupplierId.value,
    )
    if (!toOption) return

    await replaceEstablishmentModal.executeSave(async () => {
      const result = await replaceSupplierInDemandBids({
        demandId,
        fromSupplierId: fromSupplier.id,
        toSupplierId: toOption.supplier.id,
        fromSupplierLabel: `${fromSupplier.company_name} (${formatCnpj(fromSupplier.cnpj)})`,
        toSupplierLabel: `${toOption.supplier.company_name} (${formatCnpj(toOption.supplier.cnpj)})`,
      })
      await refreshItems()
      if (result.skippedCommittedCount > 0) {
        toast.warning(
          `${result.updatedCount} lance(s) migrado(s) para ${formatCnpj(toOption.supplier.cnpj)}. ${result.skippedCommittedCount} item(ns) já empenhado(s) foram mantidos.`,
        )
      } else {
        toast.success(
          `Estabelecimento atualizado com sucesso! ${result.updatedCount} lance(s) migrado(s) para ${formatCnpj(toOption.supplier.cnpj)}.`,
        )
      }
    })
  }

  const handleGenerateReport = () => {
    isReportModalOpen.value = true
  }

  const handleGenerateInfoTable = () => {
    toast.info('Geração de tabela para informação em desenvolvimento.')
  }

  const isTablesHubModalOpen = ref(false)
  const handleOpenTablesHub = () => {
    isTablesHubModalOpen.value = true
    logAction(
      'OPEN_TABLES_HUB',
      `Abriu a Central de Tabelas e Modelos na demanda "${demand.value?.name || demandId}"`,
    )
  }

  const isTermsTableModalOpen = ref(false)
  const handleGenerateTermsTable = () => {
    isTermsTableModalOpen.value = true
  }

  const isBidIntervalsTableModalOpen = ref(false)
  const canGenerateBidIntervalsTable = computed(() => {
    return areAllBidIntervalsConfigured(items.value || [])
  })
  const pendingBidIntervalsCount = computed(() => {
    return getPendingBidIntervalItems(items.value || []).length
  })
  const handleGenerateBidIntervalsTable = () => {
    if (!canGenerateBidIntervalsTable.value) {
      if (!items.value || items.value.length === 0) {
        toast.warning('A demanda não possui itens cadastrados.')
        return
      }
      toast.warning(
        `Informe o intervalo de lances de todos os itens antes de gerar a tabela. Há ${pendingBidIntervalsCount.value} item(ns) pendente(s).`,
      )
      return
    }
    isBidIntervalsTableModalOpen.value = true
    logAction(
      'GENERATE_BID_INTERVALS_TABLE',
      `Abriu a tabela de intervalos entre lances na demanda "${demand.value?.name || demandId}"`,
    )
  }

  const isClassBalanceTableModalOpen = ref(false)
  const handleGenerateClassBalanceTable = () => {
    isClassBalanceTableModalOpen.value = true
    logAction(
      'GENERATE_CLASS_BALANCE_TABLE',
      `Abriu a tabela de saldo por classe de materiais na demanda "${demand.value?.name || demandId}"`,
    )
  }

  const isGeneratingFolderBatch = ref(false)
  const handleDownloadFolderBatch = async () => {
    if (!demand.value) return
    isGeneratingFolderBatch.value = true
    try {
      const { fetchDemandBatchSubfolders } = useSystemSettings()
      const subfolders = await fetchDemandBatchSubfolders()
      downloadDemandFolderBatch({
        demand: demand.value,
        subfolders,
      })
      await logAction(
        'GENERATE_FOLDER_BATCH_SCRIPT',
        `Script batch de criação de pastas gerado para a demanda "${demand.value.name}" (${demand.value.internal_process_number || 'Sem processo interno'})`,
        profile.value?.id,
      )
      toast.success('Arquivo batch (.bat) gerado com sucesso!')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao gerar arquivo batch de pastas.')
    } finally {
      isGeneratingFolderBatch.value = false
    }
  }

  const handleExportCatalogCsv = async () => {
    const list = items.value || []
    if (list.length === 0) {
      toast.warning('A demanda não possui itens para exportação.')
      return
    }

    try {
      downloadDemandCatalogCsv({
        demand: demand.value || {},
        items: list,
      })
      await logAction(
        'EXPORT_DEMAND_CATALOG_CSV',
        `Exportou catálogo CSV (${list.length} itens) da demanda "${demand.value?.name || demandId}"`,
        profile.value?.id,
      )
      toast.success('Catálogo CSV exportado com sucesso!')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao exportar catálogo CSV.')
    }
  }

  const isExportingFinancialDocs = ref(false)

  const handleExportFinancialDocsCsv = async () => {
    if (isExportingFinancialDocs.value) return
    isExportingFinancialDocs.value = true

    try {
      const demandCommitments = await fetchCommitmentsByDemand(demandId)
      const baseDemand = demand.value || {}
      const downloaded = downloadDemandFinancialDocsCsv({
        demand: baseDemand,
        commitments: demandCommitments,
      })

      if (!downloaded) {
        toast.info(
          'Nenhum documento financeiro (NE, NL, PD, OB) encontrado nesta demanda para exportação.',
        )
        return
      }

      const processNumber =
        baseDemand.internal_process_number ||
        baseDemand.process_number ||
        baseDemand.name ||
        demandId
      await logAction(
        'EXPORT_DEMAND_FINANCIAL_DOCS_CSV',
        `Exportou lista CSV de documentos SIAFEM (NE, NL, PD, OB) da demanda "${baseDemand.name || demandId}" (${processNumber})`,
        profile.value?.id,
      )
      toast.success('Lista de documentos SIAFEM baixada com sucesso!')
    } catch (err: unknown) {
      console.error('Erro ao exportar documentos SIAFEM:', err)
      toast.error(
        err instanceof Error ? err.message : 'Erro ao exportar documentos financeiros da demanda.',
      )
    } finally {
      isExportingFinancialDocs.value = false
    }
  }

  // --- RELATÓRIO DE EXECUÇÃO DOS EMPENHOS ---
  const isCommitmentsReportModalOpen = ref(false)
  const demandCommitmentsList = ref<CommitmentRow[]>([])
  const isLoadingCommitmentsReport = ref(false)

  const handleOpenCommitmentsReportModal = async () => {
    if (isLoadingCommitmentsReport.value) return
    isLoadingCommitmentsReport.value = true
    try {
      demandCommitmentsList.value = await fetchCommitmentsByDemand(demandId)
      isCommitmentsReportModalOpen.value = true
    } catch (err: unknown) {
      console.error('Erro ao carregar empenhos da demanda:', err)
      toast.error('Erro ao carregar dados dos empenhos para o relatório.')
    } finally {
      isLoadingCommitmentsReport.value = false
    }
  }

  // --- RELATÓRIO DE EXTRATOS DO EMPENHO (ATIVOS) ---
  const isCommitmentExtractsModalOpen = ref(false)
  const isLoadingCommitmentExtracts = ref(false)

  const handleOpenCommitmentExtractsModal = async () => {
    if (isLoadingCommitmentExtracts.value) return
    isLoadingCommitmentExtracts.value = true
    try {
      if (demandCommitmentsList.value.length === 0) {
        demandCommitmentsList.value = await fetchCommitmentsByDemand(demandId)
      }
      isCommitmentExtractsModalOpen.value = true
      logAction(
        'GENERATE_DEMAND_COMMITMENT_EXTRACTS_REPORT',
        `Aberto relatório de extratos de empenho da demanda "${demand.value?.name || demandId}"`,
      )
    } catch (err: unknown) {
      console.error('Erro ao carregar empenhos para extratos:', err)
      toast.error('Erro ao carregar dados dos empenhos para os extratos.')
    } finally {
      isLoadingCommitmentExtracts.value = false
    }
  }

  // --- ATESTADO DE CAPACIDADE TÉCNICA POR FORNECEDOR ---
  const isTechnicalCapacityModalOpen = ref(false)
  const selectedSupplierForTechnicalCapacity = ref<WinningSupplierSummaryItem | null>(null)

  const handleOpenTechnicalCapacityModal = (supplier?: WinningSupplierSummaryItem | null) => {
    selectedSupplierForTechnicalCapacity.value = supplier || null
    isTechnicalCapacityModalOpen.value = true
    logAction(
      'GENERATE_TECHNICAL_CAPACITY_CERTIFICATE',
      `Aberto atestado de capacidade técnica para o fornecedor "${supplier?.company_name || 'Geral'}" na demanda "${demand.value?.name || demandId}"`,
    )
  }

  // --- NAVEGAÇÃO POR ABAS E RESUMO FINANCEIRO ---
  const initialQueryTab = route.query.tab
  const userSelectedTab = ref(isValidDemandTab(initialQueryTab))
  const activeTab = ref<DemandTab>(resolveInitialDemandTab(initialQueryTab, demand.value?.status))

  watch(
    () => demand.value?.status,
    (status) => {
      if (!userSelectedTab.value && !isValidDemandTab(route.query.tab)) {
        activeTab.value = getDemandDefaultTab(status)
      }
    },
    { immediate: true },
  )

  watch(activeTab, (newTab) => {
    userSelectedTab.value = true
    if (route.query.tab !== newTab) {
      router.replace({
        query: {
          ...route.query,
          tab: newTab,
        },
      })
    }
  })

  watch(
    () => route.query.tab,
    (queryTab) => {
      if (isValidDemandTab(queryTab) && queryTab !== activeTab.value) {
        userSelectedTab.value = true
        activeTab.value = queryTab
      }
    },
  )

  const totalEstimatedAmount = computed(() => {
    if (!items.value) return 0
    return items.value.reduce((acc, item) => {
      const price = Number(item.reference_price) || 0
      const qty = Number(item.quantity) || 0
      return acc + price * qty
    }, 0)
  })

  const totalHomologatedAmount = computed(() => {
    return winningSuppliersSummary.value.reduce((acc, s) => acc + s.totalAmountWon, 0)
  })

  const totalHomologatedEstimatedAmount = computed(() => {
    if (!items.value) return 0
    return items.value.reduce((acc, item) => {
      const dispute = getItemDisputeResult(item)
      if (dispute.outcome !== 'winner') return acc
      const price = Number(item.reference_price) || 0
      const qty = Number(item.quantity) || 0
      return acc + price * qty
    }, 0)
  })

  const totalSavings = computed(() => {
    if (totalHomologatedEstimatedAmount.value <= 0 || totalHomologatedAmount.value <= 0) return null
    const diff = totalHomologatedEstimatedAmount.value - totalHomologatedAmount.value
    if (diff <= 0) return null
    const percent = (diff / totalHomologatedEstimatedAmount.value) * 100
    return {
      amount: diff,
      percentage: percent,
    }
  })
</script>

<template>
  <UiContainer>
    <UiButton
      class="mb-4"
      prepend-icon="arrowLeft"
      size="sm"
      to="/demands"
      variant="ghost"
      @click="router.push('/demands')"
    >
      Voltar para Demandas
    </UiButton>

    <!-- Indicador de Carregamento da Demanda -->
    <div v-if="demandPending" class="text-center py-10">
      <UiProgressCircular color="primary" indeterminate size="48" width="3" />
    </div>

    <template v-else-if="demand">
      <!-- Cabeçalho Compacto da Demanda -->
      <UiCard class="mb-4" transparent-header>
        <template #header>
          <div class="d-flex flex-wrap align-center justify-space-between ga-3 w-100">
            <div class="d-flex flex-wrap align-center ga-2 flex-grow-1" style="min-width: 240px">
              <span class="text-subtitle-1 text-wrap font-weight-bold">{{ demand.name }}</span>
              <UiChip class="flex-shrink-0" color="primary" size="sm" variant="solid">{{
                formatDemandStatus(demand.status)
              }}</UiChip>
              <UiChip
                v-if="demand.is_historical"
                class="flex-shrink-0"
                color="blue-grey"
                label
                size="sm"
                variant="soft"
              >
                Histórica
              </UiChip>
            </div>

            <div
              class="d-flex flex-wrap align-center justify-end ga-2 ml-auto"
              style="line-height: normal; font-size: 0.875rem"
            >
              <!-- Botão Dedicado: Central de Tabelas e Modelos (Compras.gov.br) -->
              <UiButton
                class="text-none font-weight-medium"
                color="teal"
                data-testid="btn-open-tables-hub"
                prepend-icon="table"
                size="sm"
                variant="outline"
                @click="handleOpenTablesHub"
              >
                Tabelas & Modelos
              </UiButton>

              <!-- Dropdown Unificado: Relatórios & Exportações -->
              <UiMenu>
                <template #activator="{ props: menuProps }">
                  <UiButton
                    v-bind="menuProps"
                    append-icon="chevronDown"
                    class="text-none font-weight-medium"
                    color="primary"
                    data-testid="btn-demand-reports-menu"
                    prepend-icon="document"
                    size="sm"
                    variant="outline"
                  >
                    Relatórios & Exportações
                  </UiButton>
                </template>
                <UiCard elevation="4" min-width="270" rounded="lg">
                  <UiList nav size="sm">
                    <UiListItem
                      v-if="['homologation', 'completed', 'dispute'].includes(demand.status)"
                      prepend-icon="document"
                      subtitle="Ata e homologação de vencedores"
                      title="Relatório da Disputa"
                      @click="handleGenerateReport"
                    />
                    <UiListItem
                      v-if="
                        demand.status === 'completed' ||
                        winningSuppliersSummary.some((s) => s.commitments?.length > 0)
                      "
                      data-testid="menu-item-commitments-report"
                      :loading="isLoadingCommitmentsReport"
                      prepend-icon="finances"
                      subtitle="Detalhamento de empenhos e documentos SIAFEM"
                      title="Relatório de Empenhos"
                      @click="handleOpenCommitmentsReportModal"
                    />
                    <UiListItem
                      v-if="
                        demand.status === 'completed' ||
                        winningSuppliersSummary.some((s) => s.commitments?.length > 0)
                      "
                      data-testid="menu-item-commitment-extracts"
                      :loading="isLoadingCommitmentExtracts"
                      prepend-icon="receipt"
                      subtitle="Extratos de empenhos ativos para publicação"
                      title="Extratos de Empenhos"
                      @click="handleOpenCommitmentExtractsModal"
                    />
                    <UiListItem
                      v-if="demand.status === 'completed' || winningSuppliersSummary.length > 0"
                      data-testid="menu-item-technical-capacity-certificate"
                      prepend-icon="certificate"
                      subtitle="Atestado formal de capacidade técnica por fornecedor"
                      title="Atestado de Capacidade Técnica"
                      @click="handleOpenTechnicalCapacityModal(winningSuppliersSummary[0])"
                    />
                    <UiListItem
                      data-testid="menu-item-tables-hub"
                      prepend-icon="table"
                      subtitle="TR, Intervalos de lances, Saldo por classe"
                      title="Tabelas & Modelos (Central)"
                      @click="handleOpenTablesHub"
                    />
                    <UiDivider class="my-1" />
                    <UiListItem
                      data-testid="menu-item-export-catalog-csv"
                      prepend-icon="download"
                      subtitle="Planilha com itens da demanda"
                      title="Exportar Catálogo (CSV)"
                      @click="handleExportCatalogCsv"
                    />
                    <UiListItem
                      data-testid="menu-item-export-financial-docs-csv"
                      :loading="isExportingFinancialDocs"
                      prepend-icon="download"
                      subtitle="Lista de NE, NL, PD e OB para o SIAFEM.net"
                      title="Documentos SIAFEM (CSV)"
                      @click="handleExportFinancialDocsCsv"
                    />
                    <UiListItem
                      :loading="isGeneratingFolderBatch"
                      prepend-icon="folder"
                      subtitle="Script de pastas da contratação"
                      title="Criar Pastas (.bat)"
                      @click="handleDownloadFolderBatch"
                    />
                  </UiList>
                </UiCard>
              </UiMenu>

              <UiButton
                v-if="profile?.role === ROLES.ADMIN && getPreviousStatus(demand.status)"
                class="text-none font-weight-medium"
                color="orange-darken-3"
                prepend-icon="arrowLeftBold"
                size="sm"
                variant="soft"
                @click="openRevertModal"
              >
                Retornar para {{ formatDemandStatus(getPreviousStatus(demand.status) || '') }}
              </UiButton>
              <UiButton
                v-if="
                  profile?.role !== ROLES.ADMIN &&
                  canWorkOnDemand &&
                  getPreviousStatus(demand.status)
                "
                class="text-none font-weight-medium"
                :color="demand.is_return_requested ? 'grey' : 'warning'"
                :disabled="demand.is_return_requested || isReturnRequesting"
                :loading="isReturnRequesting"
                prepend-icon="arrowLeftBold"
                size="sm"
                variant="soft"
                @click="requestReturn"
              >
                {{ demand.is_return_requested ? 'Retorno Solicitado' : 'Solicitar Retorno' }}
              </UiButton>
              <UiTooltip
                v-if="getNextStatus(demand.status)"
                :disabled="canWorkOnDemand && !isPlanningIncomplete"
                :text="
                  !canWorkOnDemand
                    ? 'Apenas os responsáveis pela demanda podem avançar etapas'
                    : 'Preencha todos os Dados do Planejamento para avançar'
                "
              >
                <template #activator="{ props }">
                  <span v-bind="props" class="d-inline-flex align-center">
                    <UiButton
                      v-if="demand.status === 'dispute'"
                      class="text-none font-weight-medium"
                      color="success"
                      :disabled="!canWorkOnDemand"
                      prepend-icon="checkCircle"
                      size="sm"
                      variant="solid"
                      @click="openAdvanceModal"
                    >
                      Finalizar Disputa
                    </UiButton>
                    <UiButton
                      v-else
                      class="text-none font-weight-medium"
                      color="success"
                      :disabled="!canWorkOnDemand || isPlanningIncomplete"
                      prepend-icon="arrowRightBold"
                      size="sm"
                      variant="solid"
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

        <!-- Stepper Visual Compacto -->
        <UiStepper
          class="elevation-0 bg-transparent mb-3"
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

        <!-- Barra de Indicadores Rápidos (Quick Facts) -->
        <div class="d-flex flex-wrap align-center justify-space-between ga-3 pt-3 border-top">
          <div class="d-flex flex-wrap align-center ga-3 text-caption">
            <div
              v-if="demand.process_number"
              class="d-flex align-center ga-1"
              style="cursor: pointer"
              title="Ver dados do processo"
              @click="activeTab = 'planning'"
            >
              <span class="text-grey font-weight-medium">Processo:</span>
              <span class="font-weight-bold text-primary">{{ demand.process_number }}</span>
            </div>
            <div
              v-if="demand.contract_number"
              class="d-flex align-center ga-1"
              style="cursor: pointer"
              title="Ver dados da contratação"
              @click="activeTab = 'planning'"
            >
              <span class="text-grey font-weight-medium">Contratação:</span>
              <span class="font-weight-bold">{{ demand.contract_number }}</span>
            </div>
            <div v-if="demand.type" class="d-flex align-center ga-1">
              <span class="text-grey font-weight-medium">Tipo:</span>
              <UiChip color="default" size="xs" variant="flat">
                {{ demand.type === 'consumption' ? 'Consumo' : 'Permanente' }}
              </UiChip>
            </div>
            <div v-if="demand" class="d-flex align-center ga-1">
              <span class="text-grey font-weight-medium">Modalidade:</span>
              <UiChip
                :color="demand.modality === 'bidding' ? 'secondary' : 'teal'"
                size="xs"
                variant="soft"
              >
                {{ formatDemandModality(demand.modality) }}
              </UiChip>
            </div>
            <div v-if="demand" class="d-flex align-center ga-1" title="PTRES SIAFEM">
              <span class="text-grey font-weight-medium">PTRES:</span>
              <span class="font-weight-bold">{{ resolvedBudgetCodes.ptres }}</span>
            </div>
            <div
              class="d-flex align-center ga-1"
              style="cursor: pointer"
              title="Ver itens da demanda"
              @click="activeTab = 'items'"
            >
              <span class="text-grey font-weight-medium">Itens:</span>
              <span class="font-weight-bold text-primary">{{ items?.length || 0 }}</span>
            </div>
            <div v-if="totalEstimatedAmount > 0" class="d-flex align-center ga-1">
              <span class="text-grey font-weight-medium">Total Estimado:</span>
              <span class="font-weight-bold">{{ formatCurrency(totalEstimatedAmount) }}</span>
            </div>
            <div
              v-if="totalHomologatedAmount > 0"
              class="d-flex align-center ga-1"
              style="cursor: pointer"
              title="Ver fornecedores e empenhos"
              @click="activeTab = 'suppliers'"
            >
              <span class="text-grey font-weight-medium">Total Homologado:</span>
              <span class="font-weight-bold text-success">{{
                formatCurrency(totalHomologatedAmount)
              }}</span>
            </div>
          </div>

          <!-- Avatares compactos dos responsáveis -->
          <div class="d-flex align-center ga-1 ml-auto">
            <span class="text-caption text-grey mr-1">Responsáveis:</span>
            <div class="d-flex align-center">
              <UiTooltip
                v-for="resp in (responsibles || []).slice(0, 3)"
                :key="resp?.user_id"
                :text="resp?.profiles?.name || 'Responsável'"
              >
                <template #activator="{ props: tooltipProps }">
                  <UiAvatar
                    v-bind="tooltipProps"
                    class="text-caption text-white"
                    color="primary"
                    size="24"
                    style="margin-left: -4px; border: 2px solid white; cursor: pointer"
                    @click="activeTab = 'planning'"
                  >
                    <UiImg
                      v-if="resp?.profiles?.avatar_url"
                      :alt="resp?.profiles?.name || 'Responsável'"
                      class="rounded-circle"
                      cover
                      :src="resp.profiles.avatar_url"
                    />
                    <span v-else>{{ (resp?.profiles?.name || 'U').charAt(0).toUpperCase() }}</span>
                  </UiAvatar>
                </template>
              </UiTooltip>
              <UiChip
                v-if="(responsibles?.length || 0) > 3"
                class="ml-1"
                color="default"
                size="xs"
                style="cursor: pointer"
                variant="flat"
                @click="activeTab = 'planning'"
              >
                +{{ (responsibles?.length || 0) - 3 }}
              </UiChip>
              <UiButton
                v-if="!responsibles?.length"
                color="secondary"
                size="xs"
                variant="ghost"
                @click="activeTab = 'planning'"
              >
                Definir
              </UiButton>
            </div>
          </div>
        </div>
      </UiCard>

      <!-- Alerta de Conclusão da Demanda quando todos os empenhos estão finalizados -->
      <UiAlert
        v-if="isReadyForCompletion"
        border="start"
        class="mb-4"
        data-testid="alert-ready-for-completion"
        icon="checkCircle"
        type="success"
        variant="soft"
      >
        <div class="d-flex flex-wrap align-center justify-space-between ga-3 w-100">
          <div>
            <div class="font-weight-bold text-subtitle-2">
              Todas as notas de empenho foram finalizadas!
            </div>
            <div class="text-body-2 text-grey-darken-1">
              Todos os empenhos desta demanda constam como concluídos ou cancelados. A demanda já
              pode ser concluída.
            </div>
          </div>
          <UiButton
            v-if="canWorkOnDemand"
            color="success"
            data-testid="btn-advance-to-completed"
            prepend-icon="checkCircle"
            size="sm"
            @click="openAdvanceModal"
          >
            Avançar para Concluída
          </UiButton>
        </div>
      </UiAlert>

      <!-- Navegação por Abas -->
      <UiTabs v-model="activeTab" class="mb-4" color="primary">
        <UiTab value="planning">
          <UiIcon class="mr-2" name="searchDocument" size="18" />
          Processo & Planejamento
          <UiChip v-if="isPlanningIncomplete" class="ml-2" color="warning" size="xs" variant="flat">
            Pendente
          </UiChip>
        </UiTab>
        <UiTab value="items">
          <UiIcon class="mr-2" name="recordsList" size="18" />
          Itens da Demanda
          <UiChip class="ml-2" color="default" size="xs">
            {{ items?.length || 0 }}
          </UiChip>
        </UiTab>
        <UiTab value="suppliers">
          <UiIcon class="mr-2" name="company" size="18" />
          Fornecedores & Empenhos
          <UiChip
            v-if="winningSuppliersSummary.length > 0"
            class="ml-2"
            color="success"
            size="xs"
            variant="soft"
          >
            {{ winningSuppliersSummary.length }}
          </UiChip>
        </UiTab>
      </UiTabs>

      <!-- ABA 1: PROCESSO & PLANEJAMENTO -->
      <div v-show="activeTab === 'planning'">
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
                    v-if="
                      demand &&
                      canWorkOnDemand &&
                      demand.status !== 'completed' &&
                      demand.status !== 'cancelled'
                    "
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
                    {{ demand?.process_number || 'Aguardando autuação' }}
                  </div>
                </UiCol>
                <UiCol cols="12" md="4" sm="6">
                  <div class="text-caption text-grey">Processo Interno</div>
                  <div class="text-body-1 font-weight-medium">
                    {{ demand?.internal_process_number || '-' }}
                  </div>
                </UiCol>
                <UiCol cols="12" md="4" sm="6">
                  <div class="text-caption text-grey">ID PCA</div>
                  <div class="text-body-1 font-weight-medium">
                    {{ demand?.id_pca || '-' }}
                  </div>
                </UiCol>
                <UiCol cols="12" md="4" sm="6">
                  <div class="text-caption text-grey">Tipo</div>
                  <div class="text-body-1 font-weight-medium">
                    {{ demand?.type === 'consumption' ? 'Consumo' : 'Permanente' }}
                  </div>
                </UiCol>
                <UiCol cols="12" md="4" sm="6">
                  <div class="text-caption text-grey">Modalidade</div>
                  <div class="text-body-1 font-weight-medium d-flex align-center ga-1">
                    <span>{{ formatDemandModality(demand?.modality) }}</span>
                    <UiChip
                      v-if="demandClassCeilingCheck.isExceeded"
                      color="warning"
                      size="xs"
                      title="Teto anual por classe excedido: Dispensa indisponível"
                      variant="soft"
                    >
                      Acima do teto
                    </UiChip>
                  </div>
                </UiCol>
                <UiCol cols="12" md="4" sm="6">
                  <div class="text-caption text-grey">Nº da Contratação</div>
                  <div class="text-body-1 font-weight-medium">
                    {{ demand?.contract_number || '-' }}
                  </div>
                </UiCol>
                <UiCol cols="12" md="4" sm="6">
                  <div class="text-caption text-grey">Nº SIAFEM</div>
                  <div class="text-body-1 font-weight-medium">
                    {{ demand?.siafem_number || '-' }}
                  </div>
                </UiCol>
                <UiCol cols="12" md="4" sm="6">
                  <div class="text-caption text-grey">Programa de Trabalho</div>
                  <div class="text-body-1 font-weight-medium d-flex align-center ga-1">
                    <span>{{ resolvedBudgetCodes.workProgram }}</span>
                    <UiChip
                      v-if="demand?.work_program"
                      color="warning"
                      size="xs"
                      title="Código personalizado (exceção)"
                      variant="soft"
                    >
                      Exceção
                    </UiChip>
                  </div>
                </UiCol>
                <UiCol cols="12" md="4" sm="6">
                  <div class="text-caption text-grey">PTRES</div>
                  <div class="text-body-1 font-weight-medium d-flex align-center ga-1">
                    <span>{{ resolvedBudgetCodes.ptres }}</span>
                    <UiChip
                      v-if="demand?.ptres"
                      color="warning"
                      size="xs"
                      title="Código personalizado (exceção)"
                      variant="soft"
                    >
                      Exceção
                    </UiChip>
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
                    Para avançar para a Cotação, preencha os dados do planejamento (Processo
                    Oficial, ID PCA, Nº Contratação e Nº SIAFEM).
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
                    v-if="
                      canWorkOnDemand &&
                      (demand?.status === 'bidding_notice' || demand?.status === 'dispute')
                    "
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
                    {{ demand?.bidding_notice_number || '-' }}
                  </div>
                </UiCol>
                <UiCol cols="12" md="4" sm="6">
                  <div class="text-caption text-grey">Nº Disputa</div>
                  <div class="text-body-1">
                    {{ demand?.dispute_number || '-' }}
                  </div>
                </UiCol>
                <UiCol cols="12" md="4" sm="6">
                  <div class="text-caption text-grey">Data da Disputa</div>
                  <div class="text-body-1">
                    {{
                      demand?.dispute_date
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
                      demand?.offer_opening_date
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
          <UiCol class="mt-4 mt-md-0" cols="12" md="4">
            <UiCard class="mb-4" variant="outline">
              <template #header>
                <div class="d-flex align-center w-100">
                  <UiIcon class="mr-2 text-primary" left name="userOutline" />
                  <span class="font-weight-semibold">Responsáveis</span>
                  <UiSpacer />
                  <UiButton
                    v-if="canWorkOnDemand"
                    icon="add"
                    size="xs"
                    variant="ghost"
                    @click="openResponsibleModal"
                  />
                </div>
              </template>
              <UiList class="bg-transparent pa-2" size="sm">
                <UiListItem
                  v-for="resp in responsibles"
                  :key="resp?.user_id || Math.random()"
                  class="px-0"
                >
                  <template #prepend>
                    <UiAvatar class="text-caption text-white" color="primary" size="32">
                      <UiImg
                        v-if="resp?.profiles?.avatar_url"
                        :alt="resp?.profiles?.name || 'Responsável'"
                        class="rounded-circle"
                        cover
                        :src="resp.profiles.avatar_url"
                      />
                      <span v-else>{{
                        (resp?.profiles?.name || 'U').charAt(0).toUpperCase()
                      }}</span>
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
            </UiCard>
          </UiCol>
        </UiRow>
      </div>

      <!-- ABA 2: ITENS DA DEMANDA -->
      <div v-show="activeTab === 'items'">
        <!-- Lista de Produtos da Demanda -->
        <UiCard class="mb-4" variant="outline">
          <template #header>
            <div class="d-flex flex-wrap align-center w-100 ga-2">
              <span>Produtos na Demanda</span>
              <div
                v-if="demand?.status !== 'planning' && demand?.status !== 'quotation'"
                class="d-flex ga-1 align-center flex-wrap"
              >
                <UiChip
                  v-if="disputeSummary.winnersCount > 0"
                  color="success"
                  size="xs"
                  variant="soft"
                >
                  {{ disputeSummary.winnersCount }} com vencedor
                </UiChip>
                <UiChip
                  v-if="disputeSummary.failedCount > 0"
                  color="error"
                  size="xs"
                  variant="soft"
                >
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
              <div class="ml-auto d-flex align-center flex-wrap ga-2">
                <UiButton
                  v-if="isExecutionPhase && canWorkOnDemand"
                  color="primary"
                  :disabled="selectedItemIds.length === 0"
                  prepend-icon="edit"
                  size="sm"
                  variant="soft"
                  @click="openBatchExecutionModal"
                >
                  Alterar Status em Lote
                  <span v-if="selectedItemIds.length > 0" class="ml-1 font-weight-bold">
                    ({{ selectedItemIds.length }})
                  </span>
                </UiButton>
                <UiButton
                  color="teal"
                  data-testid="btn-open-tables-hub-items"
                  prepend-icon="table"
                  size="sm"
                  variant="soft"
                  @click="handleOpenTablesHub"
                >
                  Tabelas & Modelos
                </UiButton>
                <UiButton
                  v-if="demand?.status === 'quotation' && canWorkOnDemand"
                  color="primary"
                  prepend-icon="add"
                  size="sm"
                  @click="openAddModal"
                >
                  Adicionar Produto
                </UiButton>
              </div>
            </div>
          </template>

          <!-- Alerta de erro de carregamento -->
          <UiAlert v-if="itemsError" class="mb-4" size="sm" type="error" variant="soft">
            <div class="d-flex align-center justify-space-between w-100 flex-wrap ga-2">
              <span
                >Erro ao carregar itens da demanda: {{ itemsError?.message || itemsError }}</span
              >
              <UiButton color="error" size="xs" variant="outline" @click="refreshItems">
                Tentar novamente
              </UiButton>
            </div>
          </UiAlert>

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

          <!-- Barra de Ações em Lote de Execução -->
          <UiAlert v-if="selectedItemIds.length > 0" class="mb-4" color="primary" variant="soft">
            <div class="d-flex align-center justify-space-between flex-wrap ga-2 w-100">
              <div class="d-flex align-center ga-2">
                <UiIcon name="checkCircle" size="sm" />
                <span class="font-weight-medium">
                  {{ selectedItemIds.length }} item(ns) selecionado(s) para execução
                </span>
              </div>
              <div class="d-flex align-center ga-2">
                <UiButton color="secondary" size="xs" variant="ghost" @click="clearSelection">
                  Limpar Seleção
                </UiButton>
                <UiButton
                  color="primary"
                  prepend-icon="edit"
                  size="xs"
                  @click="openBatchExecutionModal"
                >
                  Alterar Status em Lote ({{ selectedItemIds.length }})
                </UiButton>
              </div>
            </div>
          </UiAlert>

          <!-- Filtro por Fornecedor Vencedor -->
          <div
            v-if="winningSuppliersSummary.length > 0"
            class="px-4 pt-1 pb-3 d-flex flex-wrap align-center justify-space-between ga-3"
          >
            <div style="min-width: 280px; max-width: 440px; width: 100%">
              <UiSelect
                v-model="selectedWinningSupplierId"
                clearable
                hide-details
                item-title="title"
                item-value="value"
                :items="winningSupplierFilterOptions"
                label="Filtrar por Fornecedor Vencedor"
                placeholder="Todos os vencedores"
                prepend-inner-icon="filter"
                size="sm"
                variant="outline"
              />
            </div>
            <div v-if="selectedWinningSupplierId" class="d-flex align-center ga-2">
              <UiChip color="primary" size="sm" variant="soft">
                Exibindo {{ filteredDemandItems.length }} de {{ items?.length || 0 }} itens
              </UiChip>
              <UiButton
                color="secondary"
                size="xs"
                variant="ghost"
                @click="selectedWinningSupplierId = null"
              >
                Limpar filtro
              </UiButton>
            </div>
          </div>

          <div class="overflow-x-auto">
            <UiTable :headers="demandProductHeaders" :items="filteredDemandItems">
              <template #empty>
                <div v-if="selectedWinningSupplierId" class="text-center py-6 text-grey">
                  Nenhum item encontrado para o fornecedor vencedor selecionado.
                </div>
                <div v-else>Nenhum produto adicionado a esta demanda ainda.</div>
              </template>

              <!-- Checkbox de Seleção em Lote -->
              <template #header-select>
                <div class="d-flex justify-center">
                  <UiCheckbox
                    :disabled="eligibleExecutionItems.length === 0"
                    hide-details
                    :indeterminate="isSomePageSelected"
                    :model-value="isAllPageSelected"
                    size="sm"
                    @update:model-value="toggleSelectAllPage"
                  />
                </div>
              </template>

              <template #item-select="{ item }">
                <div class="d-flex justify-center" @click.stop>
                  <UiCheckbox
                    v-if="getItemDisputeResult(item).outcome === 'winner'"
                    hide-details
                    :model-value="isRowSelected(item.id)"
                    size="sm"
                    @update:model-value="toggleSelectRow(item.id)"
                  />
                  <span v-else class="text-caption text-grey">-</span>
                </div>
              </template>

              <!-- Ordem -->
              <template #item-order="{ item, index }">
                <div class="d-flex align-center justify-center ga-1">
                  <span class="text-caption font-weight-bold text-medium-emphasis">
                    {{ getItemOriginalIndex(item.id) || index + 1 }}
                  </span>
                  <div
                    v-if="demand?.status === 'quotation' && canWorkOnDemand"
                    class="d-flex align-center ga-1 ml-1"
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
                </div>
              </template>

              <!-- Produto: Nome e link para cadastro -->
              <template #item-product="{ item }">
                <div class="d-flex align-center ga-2 py-1">
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
                    v-if="
                      (demand?.status === 'planning' || demand?.status === 'quotation') &&
                      (item.bid_interval == null || !item.bid_interval_type)
                    "
                    class="flex-shrink-0"
                    color="warning"
                    size="xs"
                    variant="soft"
                  >
                    Intervalo pendente
                  </UiChip>
                </div>
              </template>

              <!-- BEC -->
              <template #item-cat_bec="{ item }">
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
                  {{ item.product.cat_bec }}
                </UiChip>
                <span v-else class="text-caption text-medium-emphasis">-</span>
              </template>

              <!-- Unidade e Apresentação (Alias) em linha -->
              <template #item-units="{ item }">
                <div class="d-flex align-center flex-nowrap ga-1">
                  <UiChip
                    v-if="item.unit_name_snapshot || item.measurement_units?.name"
                    class="flex-shrink-0"
                    color="secondary"
                    size="xs"
                    variant="solid"
                  >
                    {{ item.unit_name_snapshot || item.measurement_units?.name }}
                  </UiChip>
                  <UiChip
                    v-if="item.alias_name_snapshot || item.measurement_unit_aliases?.name"
                    class="flex-shrink-0"
                    color="info"
                    size="xs"
                    variant="soft"
                  >
                    {{
                      item.alias_code_snapshot || item.measurement_unit_aliases?.code
                        ? `${item.alias_code_snapshot || item.measurement_unit_aliases?.code} - `
                        : ''
                    }}{{ item.alias_name_snapshot || item.measurement_unit_aliases?.name }}
                  </UiChip>
                  <span
                    v-if="
                      !item.unit_name_snapshot &&
                      !item.measurement_units?.name &&
                      !item.alias_name_snapshot &&
                      !item.measurement_unit_aliases?.name
                    "
                    class="text-caption text-medium-emphasis"
                  >
                    -
                  </span>
                </div>
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
                      Lance: {{ formatUnitPrice(getItemDisputeResult(item).winningAmount) }}
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
                <template
                  v-if="
                    getItemDisputeResult(item).outcome === 'winner' ||
                    item.execution_status === 'cancelled'
                  "
                >
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
                      {{
                        DEMAND_ITEM_EXECUTION_STATUS_LABELS[item.execution_status || 'homologated']
                      }}
                    </UiChip>
                    <NuxtLink
                      v-if="item.commitment_number"
                      class="text-decoration-none"
                      :to="APP_ROUTES.commitments.detail(item.commitment_number)"
                    >
                      <UiChip
                        class="font-weight-medium font-monospace cursor-pointer"
                        color="purple"
                        size="xs"
                        title="Abrir página da Nota de Empenho"
                        variant="outlined"
                      >
                        <UiIcon name="document" size="10" start />
                        {{ item.commitment_number }}
                      </UiChip>
                    </NuxtLink>
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
      </div>

      <!-- ABA 3: FORNECEDORES & EMPENHOS -->
      <div v-show="activeTab === 'suppliers'">
        <!-- Métricas rápidas quando houver vencedores -->
        <UiRow v-if="winningSuppliersSummary.length > 0" class="mb-4">
          <UiCol cols="12" sm="4">
            <UiCard class="pa-3 text-center" variant="outline">
              <div class="text-caption text-grey font-weight-medium">Fornecedores Vencedores</div>
              <div class="text-h6 font-weight-bold text-primary mt-1">
                {{ winningSuppliersSummary.length }}
              </div>
            </UiCard>
          </UiCol>
          <UiCol cols="12" sm="4">
            <UiCard class="pa-3 text-center" variant="outline">
              <div class="text-caption text-grey font-weight-medium">Total Homologado</div>
              <div class="text-h6 font-weight-bold text-success mt-1">
                {{ formatCurrency(totalHomologatedAmount) }}
              </div>
            </UiCard>
          </UiCol>
          <UiCol cols="12" sm="4">
            <UiCard class="pa-3 text-center" variant="outline">
              <div class="text-caption text-grey font-weight-medium">Economia Gerada</div>
              <div
                class="text-h6 font-weight-bold mt-1"
                :class="totalSavings ? 'text-success' : 'text-grey'"
              >
                {{
                  totalSavings
                    ? `${formatCurrency(totalSavings.amount)} (${totalSavings.percentage.toFixed(1)}%)`
                    : '-'
                }}
              </div>
            </UiCard>
          </UiCol>
        </UiRow>

        <!-- Alerta de Divergência de Estabelecimento (Matriz e Filial na mesma Demanda) -->
        <UiAlert
          v-for="div in demandSameRootDivergences"
          :key="div.root"
          class="mb-4"
          icon="alert"
          title="Atenção: Matriz e Filial da mesma empresa nesta demanda"
          type="warning"
          variant="soft"
        >
          <div class="text-body-2">
            Foram identificados múltiplos estabelecimentos com a mesma raiz de CNPJ (<strong>{{
              div.formattedRoot
            }}</strong
            >) vencendo itens nesta demanda:
            <ul class="mt-1 mb-0 pl-4">
              <li v-for="s in div.suppliers" :key="s.id">
                <strong>{{ s.company_name }}</strong> — {{ formatCnpj(s.cnpj) }}
                <UiChip
                  v-if="getCnpjEstablishmentInfo(s.cnpj)"
                  class="ml-1"
                  :color="getCnpjEstablishmentInfo(s.cnpj)?.isHeadquarters ? 'info' : 'warning'"
                  size="xs"
                  variant="soft"
                >
                  {{ getCnpjEstablishmentInfo(s.cnpj)?.badgeLabel }}
                </UiChip>
                ({{ s.wonCount }} {{ s.wonCount === 1 ? 'item vencido' : 'itens vencidos' }})
              </li>
            </ul>
          </div>
        </UiAlert>

        <!-- Resumo de Fornecedores da Demanda -->
        <UiCard class="mb-4" variant="outline">
          <template #header>
            <div class="d-flex align-center justify-space-between w-100 flex-wrap ga-2">
              <span class="text-subtitle-1 font-weight-bold"
                >Fornecedores Vencedores na Demanda</span
              >
              <div class="d-flex align-center ga-2 flex-wrap">
                <UiButton
                  v-if="
                    demand.status === 'completed' ||
                    winningSuppliersSummary.some((s) => s.commitments?.length > 0)
                  "
                  color="indigo"
                  data-testid="btn-open-commitments-report"
                  :loading="isLoadingCommitmentsReport"
                  prepend-icon="printer"
                  size="sm"
                  variant="soft"
                  @click="handleOpenCommitmentsReportModal"
                >
                  Relatório de Empenhos
                </UiButton>
                <UiButton
                  v-if="
                    demand.status === 'completed' ||
                    winningSuppliersSummary.some((s) => s.commitments?.length > 0)
                  "
                  color="teal"
                  data-testid="btn-open-commitment-extracts"
                  :loading="isLoadingCommitmentExtracts"
                  prepend-icon="receipt"
                  size="sm"
                  variant="soft"
                  @click="handleOpenCommitmentExtractsModal"
                >
                  Extratos de Empenhos
                </UiButton>
                <UiButton
                  color="primary"
                  data-testid="btn-export-financial-docs-csv"
                  :loading="isExportingFinancialDocs"
                  prepend-icon="download"
                  size="sm"
                  variant="soft"
                  @click="handleExportFinancialDocsCsv"
                >
                  Documentos SIAFEM (CSV)
                </UiButton>
              </div>
            </div>
          </template>
          <div v-if="itemsPending" class="text-center py-4">
            <UiProgressCircular color="primary" indeterminate></UiProgressCircular>
          </div>
          <UiTable
            v-else
            :headers="[
              { text: 'Fornecedor', value: 'supplier' },
              {
                text: 'Participou',
                value: 'participated',
                align: 'center',
                width: '90px',
                nowrap: true,
              },
              { text: 'Venceu', value: 'won', align: 'center', width: '80px', nowrap: true },
              { text: 'Notas de Empenho', value: 'commitments' },
              {
                text: 'Total Arrematado',
                value: 'total_amount',
                align: 'right',
                width: '140px',
                nowrap: true,
              },
              { text: '', value: 'actions', align: 'right', width: '160px' },
            ]"
            :items="winningSuppliersSummary"
          >
            <template #empty>
              <div class="text-body-2 text-grey text-center py-4">
                Nenhum fornecedor vencedor calculado ainda.
              </div>
            </template>

            <template #item-supplier="{ item: supplier }">
              <div class="d-flex align-center ga-2">
                <NuxtLink
                  class="text-decoration-none text-primary font-weight-bold"
                  :to="`/demands/${demandId}/suppliers/${supplier.id}`"
                >
                  {{ supplier.company_name }}
                </NuxtLink>
                <UiActionButton
                  color="grey"
                  icon="externalLink"
                  size="xs"
                  :to="`/suppliers/${supplier.id}`"
                  tooltip="Cadastro do Fornecedor"
                />
              </div>
              <div class="d-flex align-center flex-wrap ga-1 text-caption text-grey">
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
                <UiChip v-if="supplier.is_simples_optant" color="info" size="xs" variant="soft">
                  Simples Nacional
                </UiChip>
                <UiChip v-else color="default" size="xs" variant="soft"> Não Optante </UiChip>
                <UiChip
                  v-if="getCnpjEstablishmentInfo(supplier.cnpj)"
                  :color="
                    getCnpjEstablishmentInfo(supplier.cnpj)?.isHeadquarters ? 'info' : 'warning'
                  "
                  size="xs"
                  variant="soft"
                >
                  {{ getCnpjEstablishmentInfo(supplier.cnpj)?.badgeLabel }}
                </UiChip>
                <UiChip
                  v-if="getRelatedEstablishments(supplier).length > 0"
                  color="warning"
                  prepend-icon="building"
                  size="xs"
                  title="Esta empresa possui outro estabelecimento (Matriz/Filial) cadastrado"
                  variant="outline"
                >
                  Possui Matriz/Filial
                </UiChip>
              </div>
            </template>

            <template #item-participated="{ item: supplier }">
              <UiChip color="default" size="xs">{{ supplier.participatedCount }}</UiChip>
            </template>

            <template #item-won="{ item: supplier }">
              <UiChip color="success" size="xs">{{ supplier.wonCount }}</UiChip>
            </template>

            <template #item-commitments="{ item: supplier }">
              <!-- Alerta quando nenhum item do vencedor possui nota de empenho emitida -->
              <UiAlert
                v-if="supplier.allPendingCommitments"
                class="py-1 px-2 my-1"
                density="compact"
                size="xs"
                type="warning"
                variant="soft"
              >
                Nenhum empenho cadastrado
              </UiAlert>

              <!-- Lista de notas de empenho e valores somados -->
              <div v-else class="d-flex flex-column ga-1 py-1">
                <div
                  v-for="c in supplier.commitments"
                  :key="c.commitmentNumber"
                  class="d-flex align-center justify-space-between ga-2"
                >
                  <div class="d-flex align-center flex-nowrap ga-1">
                    <NuxtLink
                      class="text-decoration-none"
                      :to="APP_ROUTES.commitments.detail(c.commitmentNumber)"
                    >
                      <UiChip
                        class="cursor-pointer"
                        color="purple"
                        prepend-icon="document"
                        size="xs"
                        title="Abrir página da Nota de Empenho"
                        variant="solid"
                      >
                        {{ c.commitmentNumber }}
                      </UiChip>
                    </NuxtLink>
                    <template v-if="c.statuses && c.statuses.length > 1">
                      <UiChip
                        v-for="st in c.statuses"
                        :key="st"
                        :color="DEMAND_ITEM_EXECUTION_STATUS_COLORS[st]"
                        :prepend-icon="DEMAND_ITEM_EXECUTION_STATUS_ICONS[st]"
                        size="xs"
                        :title="`Status da Execução: ${DEMAND_ITEM_EXECUTION_STATUS_LABELS[st]}`"
                        variant="soft"
                      >
                        {{ DEMAND_ITEM_EXECUTION_STATUS_LABELS[st] }}
                      </UiChip>
                    </template>
                    <UiChip
                      v-else-if="c.status"
                      :color="DEMAND_ITEM_EXECUTION_STATUS_COLORS[c.status]"
                      :prepend-icon="DEMAND_ITEM_EXECUTION_STATUS_ICONS[c.status]"
                      size="xs"
                      :title="`Status da Execução: ${DEMAND_ITEM_EXECUTION_STATUS_LABELS[c.status]}`"
                      variant="soft"
                    >
                      {{ DEMAND_ITEM_EXECUTION_STATUS_LABELS[c.status] }}
                    </UiChip>
                    <span
                      v-if="c.itemsCount > 1"
                      class="text-caption text-grey font-weight-medium text-no-wrap"
                    >
                      ({{ c.itemsCount }} itens)
                    </span>
                  </div>
                  <span class="text-caption font-weight-bold">
                    {{ formatCurrency(c.totalAmount) }}
                  </span>
                </div>

                <!-- Caso parcial: fornecedor tem empenhos mas alguns itens ainda não tem -->
                <div
                  v-if="supplier.hasPendingCommitments"
                  class="d-flex align-center justify-space-between ga-2 text-warning mt-1"
                >
                  <div class="d-flex align-center ga-1 text-caption">
                    <UiIcon name="alert" size="xs" />
                    <span>{{ supplier.pendingCommitmentsCount }} item(ns) sem empenho</span>
                  </div>
                  <span class="text-caption font-weight-bold">
                    {{ formatCurrency(supplier.pendingCommitmentsAmount) }}
                  </span>
                </div>
              </div>
            </template>

            <template #item-total_amount="{ item: supplier }">
              <span class="text-success font-weight-bold">
                {{ formatCurrency(supplier.totalAmountWon) }}
              </span>
            </template>

            <template #item-actions="{ item: supplier }">
              <div class="d-flex align-center ga-1">
                <UiButton
                  v-if="
                    canWorkOnDemand &&
                    getRelatedEstablishments(supplier).length > 0 &&
                    (supplier.allPendingCommitments || supplier.hasPendingCommitments)
                  "
                  color="warning"
                  prepend-icon="swapHorizontal"
                  size="xs"
                  tooltip="Trocar estabelecimento (Matriz ↔ Filial) nos lances não empenhados"
                  variant="soft"
                  @click="openReplaceEstablishmentModal(supplier)"
                >
                  Trocar Matriz/Filial
                </UiButton>
                <UiButton
                  color="primary"
                  prepend-icon="document"
                  size="xs"
                  tooltip="Gerenciar Empenhos por Natureza"
                  variant="soft"
                  @click="openCommitmentsBatchModal(supplier)"
                >
                  Empenhos
                </UiButton>
                <UiButton
                  v-if="supplier.commitments && supplier.commitments.length > 0"
                  color="info"
                  prepend-icon="email"
                  size="xs"
                  tooltip="Gerar E-mail de Convocação"
                  variant="soft"
                  @click="openConvocationEmailModal(supplier)"
                >
                  Convocação
                </UiButton>
                <UiButton
                  color="secondary"
                  data-testid="btn-supplier-technical-capacity"
                  prepend-icon="certificate"
                  size="xs"
                  tooltip="Gerar Atestado de Capacidade Técnica"
                  variant="soft"
                  @click="handleOpenTechnicalCapacityModal(supplier)"
                >
                  Atestado
                </UiButton>
              </div>
            </template>
          </UiTable>
        </UiCard>
      </div>
    </template>

    <div v-else class="py-8">
      <UiAlert type="error" variant="soft">Demanda não encontrada.</UiAlert>
    </div>

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
        v-model="eiReferencePrice"
        v-bind="eiReferencePriceProps"
        :error-messages="eiErrors.reference_price"
        inputmode="decimal"
        label="Valor Referencial (R$)"
        placeholder="0,00"
      />

      <div class="d-flex align-center mt-2 mb-4">
        <UiSelect
          v-model="eiBidIntervalType"
          v-bind="eiBidIntervalTypeProps"
          class="mr-2 flex-grow-1"
          :error-messages="eiErrors.bid_interval_type"
          :items="[
            { title: 'Percentual (%)', value: 'percentage' },
            { title: 'Monetário (R$)', value: 'monetary' },
          ]"
          label="Tipo de Intervalo"
          size="md"
          variant="outline"
        />
        <UiInput
          v-model="eiBidInterval"
          v-bind="eiBidIntervalProps"
          class="flex-grow-1"
          :error-messages="eiErrors.bid_interval"
          inputmode="decimal"
          label="Valor do Intervalo"
          placeholder="Ex: 0,05 ou 3"
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

        <!-- Card de Saldo por Classe do Produto -->
        <DemandProductClassBalanceCard
          v-if="selectedProductId"
          :balance="addingItemClassBalance"
          class="mt-4"
          :loading="isSpendingDataLoading"
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

        <!-- Card de Saldo por Classe do Produto no Cadastro Novo -->
        <DemandProductClassBalanceCard
          v-if="newProductClassId || (isSuggestingClass && suggestedClassId)"
          :balance="addingItemClassBalance"
          class="mt-4"
          :loading="isSpendingDataLoading"
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

      <div v-if="targetStatus === 'quotation'">
        <UiAlert class="mb-4" size="sm" type="info" variant="soft">
          A demanda avançará da etapa de <strong>Planejamento</strong> para
          <strong>Cotação</strong>. Nesta próxima etapa você poderá inserir os produtos, unidades de
          medida e valores referenciais.
        </UiAlert>
        <p class="text-body-2">Confirma o avanço desta demanda para a fase de Cotação?</p>
      </div>

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

      <UiInput
        v-if="profile?.role === ROLES.ADMIN"
        v-model="epInternalProcess"
        v-bind="epInternalProcessProps"
        :error-messages="epErrors.internal_process_number"
        hint="Exclusivo Administrador. Formato: AAAA-XXXX (ex: 2026-0001)"
        label="Nº do Processo Interno"
        placeholder="Ex: 2026-0001"
      />

      <UiRow dense>
        <UiCol cols="12" sm="6">
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
            label="Natureza do Material*"
            required
          />
        </UiCol>
        <UiCol cols="12" sm="6">
          <UiSelect
            v-model="epModality"
            v-bind="epModalityProps"
            data-testid="select-planning-modality"
            :error-messages="epErrors.modality"
            item-title="title"
            item-value="value"
            :items="epModalityOptions"
            label="Modalidade*"
            required
          />
        </UiCol>
      </UiRow>

      <UiAlert
        v-if="demandClassCeilingCheck.isExceeded"
        class="mb-3"
        data-testid="alert-planning-modality-ceiling-exceeded"
        size="xs"
        type="warning"
        variant="soft"
      >
        A opção <strong>Dispensa</strong> está desabilitada porque a soma dos itens da(s) classe(s)
        <strong v-for="(cls, idx) in demandClassCeilingCheck.exceedingClasses" :key="cls.classId">
          {{ idx > 0 ? ', ' : '' }}{{ cls.label }} ({{ formatCurrency(cls.totalAmount) }})
        </strong>
        ultrapassa o teto anual por classe ({{
          formatCurrency(demandClassCeilingCheck.ceilingAmount)
        }}).
      </UiAlert>

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
      />

      <UiInput
        v-model="epSiafem"
        v-bind="epSiafemProps"
        :error-messages="epErrors.siafem_number"
        hint="Opcional."
        label="Nº SIAFEM"
        placeholder="Ex: 2026NE000123 ou número SIAFEM"
      />

      <UiRow dense>
        <UiCol cols="12" sm="8">
          <UiInput
            v-model="epWorkProgram"
            v-bind="epWorkProgramProps"
            :error-messages="epErrors.work_program"
            :hint="`Opcional. Padrão (${epType === 'permanent' ? 'Permanente' : 'Consumo'}): ${epType === 'permanent' ? DEMAND_BUDGET_DEFAULTS.permanent.workProgram : DEMAND_BUDGET_DEFAULTS.consumption.workProgram}`"
            label="Programa de Trabalho"
            :placeholder="
              epType === 'permanent'
                ? DEMAND_BUDGET_DEFAULTS.permanent.workProgram
                : DEMAND_BUDGET_DEFAULTS.consumption.workProgram
            "
          />
        </UiCol>
        <UiCol cols="12" sm="4">
          <UiInput
            v-model="epPtres"
            v-bind="epPtresProps"
            :error-messages="epErrors.ptres"
            :hint="`Opcional. Padrão: ${epType === 'permanent' ? DEMAND_BUDGET_DEFAULTS.permanent.ptres : DEMAND_BUDGET_DEFAULTS.consumption.ptres}`"
            label="PTRES"
            :placeholder="
              epType === 'permanent'
                ? DEMAND_BUDGET_DEFAULTS.permanent.ptres
                : DEMAND_BUDGET_DEFAULTS.consumption.ptres
            "
          />
        </UiCol>
      </UiRow>

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

    <!-- Modal do Relatório de Execução dos Empenhos -->
    <DemandCommitmentsReportModal
      v-model="isCommitmentsReportModalOpen"
      :commitments="demandCommitmentsList"
      :demand="demand"
      :items="items"
    />

    <!-- Modal do Relatório de Extratos do Empenho (Ativos) -->
    <DemandCommitmentExtractsModal
      v-model="isCommitmentExtractsModalOpen"
      :commitments="demandCommitmentsList"
      :demand="demand"
      :items="items"
    />

    <!-- Modal do Atestado de Capacidade Técnica -->
    <DemandTechnicalCapacityModal
      v-model="isTechnicalCapacityModalOpen"
      :available-suppliers="winningSuppliersSummary"
      :demand="demand"
      :initial-supplier="selectedSupplierForTechnicalCapacity"
    />

    <!-- Modal de Atualização de Status de Execução do Item -->
    <DemandItemExecutionStatusModal
      v-model="isExecutionStatusModalOpen"
      :item="selectedItemForExecutionStatus"
      @saved="handleExecutionStatusSaved"
    />

    <!-- Modal de Atualização de Status de Execução em Lote de Itens -->
    <DemandItemsBatchExecutionStatusModal
      v-model="isBatchExecutionModalOpen"
      :items="selectedItemsForBatch"
      @saved="handleBatchExecutionSaved"
    />

    <!-- Modal de Gerenciamento de Empenhos em Lote por Fornecedor & Natureza -->
    <SupplierCommitmentsBatchModal
      v-model="isCommitmentsBatchModalOpen"
      :demand-id="demandId"
      :items="items || []"
      :supplier="selectedSupplierForCommitments"
      @saved="handleCommitmentsBatchSaved"
    />

    <!-- Modal de E-mail de Convocação do Fornecedor Vencedor -->
    <DemandConvocationEmailModal
      v-model="isConvocationEmailModalOpen"
      :demand="demand"
      :supplier="selectedSupplierForConvocationEmail"
    />

    <!-- Modal Central de Tabelas e Modelos (Compras.gov.br) -->
    <DemandTablesHubModal
      v-model="isTablesHubModalOpen"
      :demand="demand"
      :items="items || []"
      @open-bid-intervals-table="handleGenerateBidIntervalsTable"
      @open-class-balance-table="handleGenerateClassBalanceTable"
      @open-info-table="handleGenerateInfoTable"
      @open-terms-table="handleGenerateTermsTable"
    />

    <!-- Modal de Tabela para Termo de Referência (Compras.gov.br) -->
    <DemandTermsOfReferenceTableModal
      v-model="isTermsTableModalOpen"
      :demand-title="demand?.name"
      :items="items || []"
    />

    <!-- Modal de Tabela de Intervalos entre Lances (Compras.gov.br) -->
    <DemandBidIntervalsTableModal
      v-model="isBidIntervalsTableModalOpen"
      :demand-title="demand?.name"
      :items="items || []"
    />

    <!-- Modal de Tabela de Saldo por Classe de Materiais -->
    <DemandClassBalanceTableModal
      v-model="isClassBalanceTableModalOpen"
      :demand="demand"
      :items="items || []"
    />

    <!-- Modal de Substituição de Estabelecimento (Matriz ↔ Filial) na Demanda -->
    <UiModal
      v-model="replaceEstablishmentModal.isOpen.value"
      max-width="560px"
      persistent
      title="Trocar Estabelecimento (Matriz ↔ Filial)"
    >
      <UiAlert
        v-if="replaceEstablishmentModal.saveError.value"
        class="mb-4"
        size="sm"
        type="error"
        variant="soft"
      >
        {{ replaceEstablishmentModal.saveError.value }}
      </UiAlert>

      <div v-if="replaceEstablishmentModal.targetItem.value" class="d-flex flex-column ga-3">
        <UiAlert icon="building" size="sm" type="info" variant="soft">
          Esta ação atualizará os lances (não empenhados) desta demanda que foram lançados com o
          cadastro incorreto entre Matriz e Filial da mesma empresa (Raiz CNPJ:
          <strong>{{ formatCnpjRoot(replaceEstablishmentModal.targetItem.value.cnpj) }}</strong
          >).
        </UiAlert>

        <div class="pa-3 rounded border">
          <div class="text-caption text-grey font-weight-medium">Cadastro Atual na Demanda</div>
          <div class="text-body-2 font-weight-bold mt-1">
            {{ replaceEstablishmentModal.targetItem.value.company_name }}
          </div>
          <div class="d-flex align-center ga-2 mt-1">
            <span class="text-caption font-mono">{{
              formatCnpj(replaceEstablishmentModal.targetItem.value.cnpj)
            }}</span>
            <UiChip
              v-if="getCnpjEstablishmentInfo(replaceEstablishmentModal.targetItem.value.cnpj)"
              :color="
                getCnpjEstablishmentInfo(replaceEstablishmentModal.targetItem.value.cnpj)
                  ?.isHeadquarters
                  ? 'info'
                  : 'warning'
              "
              size="xs"
              variant="soft"
            >
              {{
                getCnpjEstablishmentInfo(replaceEstablishmentModal.targetItem.value.cnpj)
                  ?.badgeLabel
              }}
            </UiChip>
          </div>
        </div>

        <UiSelect
          v-model="targetReplacementSupplierId"
          item-title="title"
          item-value="value"
          :items="availableReplacementOptions"
          label="Substituir pelo estabelecimento*"
        />
      </div>

      <template #actions>
        <UiButton
          :disabled="replaceEstablishmentModal.isSaving.value"
          variant="ghost"
          @click="replaceEstablishmentModal.close()"
        >
          Cancelar
        </UiButton>
        <UiButton
          color="warning"
          :disabled="!targetReplacementSupplierId"
          :loading="replaceEstablishmentModal.isSaving.value"
          prepend-icon="swapHorizontal"
          @click="handleConfirmReplaceEstablishment"
        >
          Confirmar Troca de CNPJ
        </UiButton>
      </template>
    </UiModal>
  </UiContainer>
</template>
