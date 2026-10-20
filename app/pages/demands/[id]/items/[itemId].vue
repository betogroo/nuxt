<script setup lang="ts">
  import { useZodForm } from '~/composables/useZodForm'
  import { demandItemFormSchema } from '~/schemas/forms/demand-item'
  import { demandBidFormSchema } from '~/schemas/forms/demand-bid'
  import type { SupplierRow } from '~/composables/useSuppliers'
  import type { UnitRow } from '~/composables/useMeasurementUnits'
  import {
    DEMAND_ITEM_EXECUTION_FLOW,
    DEMAND_ITEM_EXECUTION_STATUS_LABELS,
    DEMAND_ITEM_EXECUTION_STATUS_COLORS,
    DEMAND_ITEM_EXECUTION_STATUS_ICONS,
    type DemandItemExecutionStatus,
  } from '~/constants/demand-item-status'
  import DemandItemExecutionStatusModal from '~/components/demands/DemandItemExecutionStatusModal.vue'
  definePageMeta({ middleware: ['uge'] })
  const route = useRoute()
  const router = useRouter()

  const { fetchDemandItemDetails, updateDemandItemWithDependencies, fetchDemandItemStatusHistory } =
    useDemandProducts()
  const { fetchUnits, resolveOrCreateUnit } = useMeasurementUnits()

  const demandId = route.params.id as string
  const itemId = route.params.itemId as string

  // Fetch Demand Product (Item) Details
  const {
    data: item,
    pending,
    error,
    refresh,
  } = useAsyncData(`demand-item-${itemId}`, async () => {
    return await fetchDemandItemDetails(itemId)
  })

  // Basic fallback
  if (error.value) {
    console.error(error.value)
  }

  // Edit logic
  const isEditing = ref(false)
  const isSaving = ref(false)
  const editError = ref('')
  const {
    errors: eiErrors,
    defineField: eiDefine,
    resetForm: eiReset,
    handleSubmit: eiSubmit,
  } = useZodForm(demandItemFormSchema, {
    quantity: 1,
    searchUnitText: '',
    aliasId: null,
    reference_price: null,
    bid_interval: 3,
    bid_interval_type: 'percentage',
  })

  const [eiQuantity, eiQuantityProps] = eiDefine('quantity')
  const [eiSearchUnit, eiSearchUnitProps] = eiDefine('searchUnitText')
  const [eiAliasId, eiAliasIdProps] = eiDefine('aliasId')
  const [eiReferencePrice, eiReferencePriceProps] = eiDefine('reference_price')
  const [eiBidInterval, eiBidIntervalProps] = eiDefine('bid_interval')
  const [eiBidIntervalType, eiBidIntervalTypeProps] = eiDefine('bid_interval_type')
  const availableUnits = ref<
    Array<{ id: string; name: string; displayName?: string; legacy_alias?: string | null }>
  >([])
  const unitsDataWithAliases = ref<UnitRow[]>([])

  const availableAliases = computed(() => {
    if (!eiSearchUnit.value) return []
    const query = eiSearchUnit.value.trim().toLowerCase()
    const unit = unitsDataWithAliases.value.find(
      (u) => u.name.trim().toLowerCase() === query || u.id === eiSearchUnit.value,
    )
    return unit?.measurement_unit_aliases || []
  })

  const openEditModal = async () => {
    if (!item.value) return
    eiReset({
      values: {
        quantity: Number(item.value.quantity),
        searchUnitText: item.value.measurement_units?.name || '',
        aliasId: item.value.alias_id || null,
        reference_price: item.value.reference_price ? Number(item.value.reference_price) : null,
        bid_interval: item.value.bid_interval ? Number(item.value.bid_interval) : 3,
        bid_interval_type: item.value.bid_interval_type === 'monetary' ? 'monetary' : 'percentage',
      },
    })

    // Fetch all units so user can search or suggest new ones
    const unitsData = await fetchUnits()

    if (unitsData) {
      unitsDataWithAliases.value = unitsData
      availableUnits.value = unitsData.map((u) => ({
        ...u,
        displayName: u.legacy_alias ? `${u.name} (Legado: ${u.legacy_alias})` : u.name,
      }))
    }

    editError.value = ''
    isEditing.value = true
  }

  const closeEditModal = () => {
    isEditing.value = false
  }

  const saveItem = eiSubmit(async (values) => {
    isSaving.value = true
    editError.value = ''
    try {
      await updateDemandItemWithDependencies({
        itemId,
        demandId,
        productId: item.value?.product_id || undefined,
        quantity: values.quantity,
        referencePrice: values.reference_price,
        bidInterval: values.bid_interval,
        bidIntervalType: values.bid_interval_type,
        finalUnitId: await resolveOrCreateUnit(values.searchUnitText || ''),
        finalAliasId: values.aliasId || null,
      })

      await refresh()
      closeEditModal()
    } catch (err: unknown) {
      editError.value = err instanceof Error ? err.message : String(err)
    } finally {
      isSaving.value = false
    }
  })
  // --- Bids Logic ---
  const { fetchBidsByProduct, addBid, updateBidStatus, removeBid } = useProductBids()
  const { fetchAllActiveSuppliers, createSupplierFast } = useSuppliers()

  const {
    data: bids,
    refresh: refreshBids,
    pending: bidsPending,
  } = useAsyncData(`item-bids-${itemId}`, async () => {
    return await fetchBidsByProduct(itemId)
  })

  const winningBid = computed(() => getWinningBid(bids.value))

  const getBidPosition = (bidId: string): number | null => {
    if (!bids.value) return null
    const classifiedBids = bids.value.filter((b) => b.status !== 'disqualified')
    const idx = classifiedBids.findIndex((b) => b.id === bidId)
    return idx >= 0 ? idx + 1 : null
  }

  const canManageBidStatus = computed(() => item.value?.demand?.status === 'dispute')

  const canRegisterBids = computed(() => item.value?.demand?.status === 'dispute')

  const canRemoveBid = computed(() => item.value?.demand?.status === 'dispute')

  // --- Execution Status Logic (Post-Homologation) ---
  const isHomologatedOrCompleted = computed(
    () =>
      item.value?.demand?.status === 'homologation' || item.value?.demand?.status === 'completed',
  )

  const hasExecution = computed(() => isHomologatedOrCompleted.value && !!winningBid.value)

  const currentExecutionStatus = computed<DemandItemExecutionStatus>(() => {
    return (item.value?.execution_status || 'homologated') as DemandItemExecutionStatus
  })

  const {
    data: statusHistory,
    refresh: refreshStatusHistory,
    pending: statusHistoryPending,
  } = useAsyncData(`item-status-history-${itemId}`, async () => {
    if (!itemId) return []
    return await fetchDemandItemStatusHistory(itemId)
  })

  const isExecutionStatusModalOpen = ref(false)

  const openExecutionStatusModal = () => {
    isExecutionStatusModalOpen.value = true
  }

  const handleExecutionStatusSaved = async () => {
    await refresh()
    await refreshStatusHistory()
  }

  const getStepStatus = (statusStep: DemandItemExecutionStatus) => {
    if (currentExecutionStatus.value === 'error') {
      return 'error'
    }
    const flow = DEMAND_ITEM_EXECUTION_FLOW
    const currentIndex = flow.indexOf(currentExecutionStatus.value)
    const stepIndex = flow.indexOf(statusStep)
    if (stepIndex < currentIndex) return 'completed'
    if (stepIndex === currentIndex) return 'current'
    return 'pending'
  }

  const suppliers = ref<SupplierRow[]>([])
  const fetchSuppliersList = async () => {
    const list = await fetchAllActiveSuppliers()
    suppliers.value = list
  }

  onMounted(() => {
    fetchSuppliersList()
  })

  const isBidModalOpen = ref(false)
  const isBidSaving = ref(false)
  const bidError = ref('')

  // Disqualification Modal State
  const isDisqualifyModalOpen = ref(false)
  const isStatusUpdating = ref(false)
  const statusUpdateError = ref('')
  const disqualificationReason = ref('')
  const selectedBidForStatus = ref<{
    id: string
    amount: number
    supplierName: string
  } | null>(null)

  const openDisqualifyModal = (bid: {
    id: string
    amount: number
    disqualification_reason?: string | null
    suppliers?: { company_name?: string } | null
  }) => {
    selectedBidForStatus.value = {
      id: bid.id,
      amount: bid.amount,
      supplierName: bid.suppliers?.company_name || 'Fornecedor',
    }
    disqualificationReason.value = bid.disqualification_reason || ''
    statusUpdateError.value = ''
    isDisqualifyModalOpen.value = true
  }

  const closeDisqualifyModal = () => {
    isDisqualifyModalOpen.value = false
    selectedBidForStatus.value = null
    disqualificationReason.value = ''
    statusUpdateError.value = ''
  }

  const confirmDisqualifyBid = async () => {
    if (!selectedBidForStatus.value) return
    isStatusUpdating.value = true
    statusUpdateError.value = ''
    try {
      await updateBidStatus(
        selectedBidForStatus.value.id,
        'disqualified',
        disqualificationReason.value,
      )
      await refreshBids()
      closeDisqualifyModal()
    } catch (err: unknown) {
      statusUpdateError.value = err instanceof Error ? err.message : String(err)
    } finally {
      isStatusUpdating.value = false
    }
  }

  const handleClassifyBid = async (bidId: string) => {
    isStatusUpdating.value = true
    try {
      await updateBidStatus(bidId, 'classified', null)
      await refreshBids()
    } catch (err: unknown) {
      console.error('Erro ao classificar lance', err)
    } finally {
      isStatusUpdating.value = false
    }
  }

  // Bid form state
  const {
    errors: bidErrors,
    defineField: bidDefine,
    resetForm: bidReset,
    handleSubmit: bidSubmit,
  } = useZodForm(demandBidFormSchema, {
    isNewSupplier: false,
    supplierId: null,
    newSupplierCnpj: '',
    newSupplierName: '',
    newSupplierEmail: '',
    amount: '' as unknown as number,
  })

  const [bidIsNew, bidIsNewProps] = bidDefine('isNewSupplier')
  const [bidSupplierId, bidSupplierIdProps] = bidDefine('supplierId')
  const [bidCnpj, bidCnpjProps] = bidDefine('newSupplierCnpj')
  const [bidName, bidNameProps] = bidDefine('newSupplierName')
  const [bidEmail, bidEmailProps] = bidDefine('newSupplierEmail')
  const [bidAmount, bidAmountProps] = bidDefine('amount')

  const openBidModal = () => {
    if (!canRegisterBids.value) {
      bidError.value = 'O registro de lances é permitido apenas durante a fase de Disputa.'
      return
    }
    bidReset({
      values: {
        isNewSupplier: false,
        supplierId: null,
        newSupplierCnpj: '',
        newSupplierName: '',
        newSupplierEmail: '',
        amount: '' as unknown as number,
      },
    })
    bidError.value = ''
    isBidModalOpen.value = true
  }

  const closeBidModal = () => {
    isBidModalOpen.value = false
  }

  const saveBid = bidSubmit(async (values) => {
    if (!canRegisterBids.value) {
      bidError.value = 'O registro de lances é permitido apenas durante a fase de Disputa.'
      return
    }
    isBidSaving.value = true
    bidError.value = ''
    try {
      let finalSupplierId = values.supplierId
      if (values.isNewSupplier) {
        const sup = await createSupplierFast({
          cnpj: values.newSupplierCnpj!,
          name: values.newSupplierName!,
          email: values.newSupplierEmail || undefined,
        })
        finalSupplierId = sup.id
      }

      await addBid(itemId, finalSupplierId!, values.amount)
      await refreshBids()
      closeBidModal()
    } catch (err: unknown) {
      bidError.value = err instanceof Error ? err.message : String(err)
    } finally {
      isBidSaving.value = false
    }
  })

  const toast = useToast()

  const confirmRemoveBid = async (bidId: string) => {
    if (!canRemoveBid.value) {
      toast.warning('Não é possível remover lances após o encerramento da fase de disputa.')
      return
    }
    if (!(await toast.confirm('Deseja realmente remover este lance?'))) return
    try {
      await removeBid(bidId)
      await refreshBids()
      toast.success('Lance removido com sucesso.')
    } catch (err) {
      console.error('Erro ao remover lance', err)
      toast.error('Erro ao remover lance.')
    }
  }
</script>

<template>
  <UiContainer>
    <div class="mb-4 d-flex align-center">
      <UiButton icon="arrowLeft" variant="ghost" @click="router.push(`/demands/${demandId}`)" />
      <h2 class="text-h5 ml-2">Detalhes do Item na Demanda</h2>
    </div>

    <UiRow>
      <UiCol cols="12" md="8">
        <UiCard v-if="!pending && item" transparent-header>
          <template #header>
            <div class="d-flex align-center">
              {{ item.product_name_snapshot || item.product?.name }}
              <UiActionButton
                action="view"
                class="ml-1"
                icon="externalLink"
                :to="`/products/${item.product?.id}`"
                tooltip="Ver Cadastro Original do Produto"
              />
              <UiChip class="ml-2" color="secondary" size="sm" variant="solid">
                {{ item.unit_name_snapshot || item.measurement_units?.name || 'Unidade' }}
              </UiChip>
              <UiChip
                v-if="item.alias_name_snapshot || item.measurement_unit_aliases?.name"
                class="ml-2"
                color="info"
                size="sm"
                variant="soft"
              >
                Alias:
                {{
                  item.alias_code_snapshot || item.measurement_unit_aliases?.code
                    ? `${item.alias_code_snapshot || item.measurement_unit_aliases?.code} - `
                    : ''
                }}{{ item.alias_name_snapshot || item.measurement_unit_aliases?.name }}
              </UiChip>
            </div>
            <UiSpacer />
            <div class="d-flex align-center">
              <UiChip class="mr-2" color="info" variant="outline">Qtd: {{ item.quantity }}</UiChip>
              <UiActionButton
                v-if="item?.demand?.status === 'planning' || item?.demand?.status === 'quotation'"
                action="edit"
                tooltip="Editar item"
                @click="openEditModal"
              />
            </div>
          </template>

          <UiAlert class="mb-4" size="sm" type="info" variant="soft">
            Esta é a tela exclusiva deste produto dentro da demanda. Futuramente, lances e
            documentos enviados pelos fornecedores aparecerão aqui.
          </UiAlert>

          <!-- Card de Acompanhamento da Execução (Pós-Homologação) -->
          <UiCard v-if="hasExecution" class="mb-4" variant="outline">
            <template #header>
              <div class="d-flex justify-space-between align-center w-100 flex-wrap ga-2">
                <div class="d-flex align-center ga-2">
                  <span class="font-weight-bold">Acompanhamento da Execução</span>
                  <UiChip
                    :color="DEMAND_ITEM_EXECUTION_STATUS_COLORS[currentExecutionStatus]"
                    size="sm"
                    variant="flat"
                  >
                    <UiIcon
                      :name="DEMAND_ITEM_EXECUTION_STATUS_ICONS[currentExecutionStatus]"
                      size="14"
                      start
                    />
                    {{ DEMAND_ITEM_EXECUTION_STATUS_LABELS[currentExecutionStatus] }}
                  </UiChip>
                </div>
                <UiButton
                  color="primary"
                  prepend-icon="editOutline"
                  size="sm"
                  @click="openExecutionStatusModal"
                >
                  Atualizar Status
                </UiButton>
              </div>
            </template>

            <!-- Alerta em caso de erro -->
            <UiAlert
              v-if="currentExecutionStatus === 'error'"
              class="mb-4"
              size="sm"
              type="error"
              variant="soft"
            >
              <div class="font-weight-bold mb-1">Pendência / Erro Registrado:</div>
              <div>{{ item?.execution_error_details || 'Nenhum detalhe informado.' }}</div>
            </UiAlert>

            <!-- Fluxo Sequencial de Execução -->
            <div class="mb-4 pa-3 rounded-lg bg-surface-variant">
              <div class="text-caption font-weight-bold mb-2 text-medium-emphasis text-uppercase">
                Fluxo de Execução
              </div>
              <div class="d-flex flex-wrap align-center ga-2">
                <template v-for="(step, idx) in DEMAND_ITEM_EXECUTION_FLOW" :key="step">
                  <div class="d-flex align-center ga-1">
                    <UiChip
                      :color="
                        getStepStatus(step) === 'completed'
                          ? 'success'
                          : getStepStatus(step) === 'current'
                            ? DEMAND_ITEM_EXECUTION_STATUS_COLORS[step]
                            : 'default'
                      "
                      size="xs"
                      :variant="getStepStatus(step) === 'current' ? 'solid' : 'soft'"
                    >
                      <UiIcon
                        v-if="getStepStatus(step) === 'completed'"
                        name="check"
                        size="12"
                        start
                      />
                      <span class="font-weight-medium">
                        {{ idx + 1 }}. {{ DEMAND_ITEM_EXECUTION_STATUS_LABELS[step] }}
                      </span>
                    </UiChip>
                    <UiIcon
                      v-if="idx < DEMAND_ITEM_EXECUTION_FLOW.length - 1"
                      class="text-medium-emphasis"
                      name="next"
                      size="14"
                    />
                  </div>
                </template>
              </div>
            </div>

            <!-- Histórico de Transições -->
            <div class="mt-4">
              <div class="text-subtitle-2 font-weight-bold mb-3">Histórico de Transições</div>

              <div v-if="statusHistoryPending" class="text-center py-4">
                <UiProgressCircular color="primary" indeterminate size="24" />
              </div>

              <div
                v-else-if="!statusHistory || statusHistory.length === 0"
                class="text-body-2 text-medium-emphasis text-center py-3"
              >
                Nenhuma alteração de status registrada no histórico ainda.
              </div>

              <UiTimeline v-else density="compact" side="end">
                <UiTimelineItem
                  v-for="entry in statusHistory"
                  :key="entry.id"
                  :dot-color="DEMAND_ITEM_EXECUTION_STATUS_COLORS[entry.status]"
                  size="x-small"
                >
                  <div class="d-flex flex-column ga-1">
                    <div class="d-flex align-center flex-wrap ga-2">
                      <UiChip
                        :color="DEMAND_ITEM_EXECUTION_STATUS_COLORS[entry.status]"
                        size="xs"
                        variant="flat"
                      >
                        <UiIcon
                          :name="DEMAND_ITEM_EXECUTION_STATUS_ICONS[entry.status]"
                          size="12"
                          start
                        />
                        {{ DEMAND_ITEM_EXECUTION_STATUS_LABELS[entry.status] }}
                      </UiChip>
                      <span class="text-caption text-medium-emphasis">
                        {{ new Date(entry.created_at).toLocaleString('pt-BR') }}
                      </span>
                      <span v-if="entry.profiles?.name" class="text-caption text-medium-emphasis">
                        • por <strong>{{ entry.profiles.name }}</strong>
                      </span>
                    </div>

                    <div
                      v-if="entry.status === 'error' && entry.error_details"
                      class="text-caption text-error font-weight-medium border rounded pa-2 mt-1"
                    >
                      <strong>Erro especificado:</strong> {{ entry.error_details }}
                    </div>

                    <div v-if="entry.observation" class="text-caption text-high-emphasis mt-1">
                      {{ entry.observation }}
                    </div>
                  </div>
                </UiTimelineItem>
              </UiTimeline>
            </div>
          </UiCard>

          <!-- Card de Lances -->
          <UiCard class="mb-4" variant="outline">
            <template #header>
              <div class="d-flex justify-space-between align-center w-100">
                <span>Lances Recebidos</span>
                <UiButton
                  v-if="canRegisterBids"
                  color="primary"
                  prepend-icon="add"
                  size="sm"
                  @click="openBidModal"
                >
                  Registrar Lance
                </UiButton>
                <UiChip
                  v-else-if="item?.demand?.status === 'quotation'"
                  color="warning"
                  size="sm"
                  variant="soft"
                >
                  Lances permitidos apenas na Disputa
                </UiChip>
                <UiChip
                  v-else-if="item?.demand?.status !== 'dispute'"
                  color="info"
                  size="sm"
                  variant="soft"
                >
                  Disputa finalizada (Somente leitura)
                </UiChip>
              </div>
            </template>

            <div v-if="bidsPending" class="text-center py-4">
              <UiProgressCircular color="primary" indeterminate></UiProgressCircular>
            </div>

            <UiTable
              v-else
              :headers="[
                { text: 'Pos.', value: 'pos', align: 'center', sortable: false },
                { text: 'Fornecedor', value: 'supplier' },
                { text: 'Status', value: 'status', align: 'center' },
                { text: 'Valor do Lance', value: 'amount', align: 'right' },
                { text: 'Ações', value: 'actions', align: 'center', sortable: false },
              ]"
              :items="bids || []"
            >
              <template #empty>
                <div class="text-body-2 text-grey text-center py-4">
                  Nenhum lance registrado para este item ainda.
                </div>
              </template>

              <template #item-pos="{ item: bid }">
                <UiChip
                  v-if="getBidPosition(bid.id) !== null"
                  :color="getBidPosition(bid.id) === 1 ? 'success' : 'default'"
                  size="sm"
                >
                  {{ getBidPosition(bid.id) }}º
                </UiChip>
                <span v-else class="text-grey">-</span>
              </template>

              <template #item-supplier="{ item: bid }">
                <div class="font-weight-bold">{{ bid.suppliers?.company_name }}</div>
                <div class="d-flex align-center ga-1 text-caption text-grey">
                  <span>{{ formatCnpj(bid.suppliers?.cnpj) }}</span>
                  <UiCopyButton
                    v-if="bid.suppliers?.cnpj"
                    clean-digits-only
                    color="secondary"
                    size="xs"
                    success-message="CNPJ copiado!"
                    tooltip="Copiar CNPJ (apenas números)"
                    :value="bid.suppliers?.cnpj"
                  />
                </div>
              </template>

              <template #item-status="{ item: bid }">
                <div class="d-flex flex-column align-center">
                  <UiChip :color="getBidStatusColor(bid.status)" size="sm" variant="soft">
                    {{ formatBidStatus(bid.status) }}
                  </UiChip>
                  <div
                    v-if="bid.status === 'disqualified' && bid.disqualification_reason"
                    class="text-caption text-error mt-1"
                  >
                    {{ bid.disqualification_reason }}
                  </div>
                </div>
              </template>

              <template #item-amount="{ item: bid }">
                <div
                  class="font-weight-bold"
                  :class="{
                    'text-success': winningBid && winningBid.id === bid.id,
                    'text-decoration-line-through text-grey': bid.status === 'disqualified',
                  }"
                >
                  {{ formatCurrency(bid.amount) }}
                </div>
              </template>

              <template #item-actions="{ item: bid }">
                <div class="d-flex align-center justify-center ga-1">
                  <UiActionButton
                    v-if="canManageBidStatus && bid.status !== 'disqualified'"
                    action="disqualify"
                    :disabled="isStatusUpdating"
                    tooltip="Desclassificar Lance"
                    @click="openDisqualifyModal(bid)"
                  />
                  <UiActionButton
                    v-if="canManageBidStatus && bid.status === 'disqualified'"
                    action="classify"
                    :disabled="isStatusUpdating"
                    tooltip="Classificar Lance"
                    @click="handleClassifyBid(bid.id)"
                  />
                  <UiActionButton
                    v-if="canRemoveBid"
                    action="delete"
                    tooltip="Remover Lance"
                    @click="confirmRemoveBid(bid.id)"
                  />
                </div>
              </template>
            </UiTable>
          </UiCard>

          <!-- Futuro Card de Documentos -->
          <UiCard title="Documentos e Anexos" variant="outline">
            <div class="text-body-2 text-grey pa-4 text-center">
              Nenhum documento anexado. (Em desenvolvimento)
            </div>
          </UiCard>
        </UiCard>

        <div v-if="pending" class="text-center py-10">
          <UiProgressCircular color="primary" indeterminate></UiProgressCircular>
        </div>
      </UiCol>

      <UiCol cols="12" md="4">
        <!-- Resumo da Demanda / Status -->
        <UiCard title="Informações" variant="outline">
          <UiList class="bg-transparent" size="sm">
            <UiListItem v-if="item?.reference_price">
              <template #prepend>
                <UiIcon color="grey" name="currency" />
              </template>
              <UiListItemTitle>Valor Referencial</UiListItemTitle>
              <UiListItemSubtitle>
                {{ formatCurrency(item.reference_price) }}
              </UiListItemSubtitle>
            </UiListItem>
            <UiListItem>
              <template #prepend>
                <UiIcon color="grey" name="transfer" />
              </template>
              <UiListItemTitle>Intervalo entre Lances</UiListItemTitle>
              <UiListItemSubtitle v-if="item">
                {{
                  item.bid_interval_type === 'percentage'
                    ? `${item.bid_interval}%`
                    : formatCurrency(item.bid_interval || 0)
                }}
              </UiListItemSubtitle>
            </UiListItem>
            <UiDivider class="my-2" />
            <UiListItem>
              <template #prepend>
                <UiIcon color="grey" name="identifier" />
              </template>
              <UiListItemTitle>ID do Item</UiListItemTitle>
              <UiListItemSubtitle>{{ item?.id }}</UiListItemSubtitle>
            </UiListItem>
            <UiListItem>
              <template #prepend>
                <UiIcon color="grey" name="calendar" />
              </template>
              <UiListItemTitle>Adicionado em</UiListItemTitle>
              <UiListItemSubtitle>
                {{ item?.created_at ? new Date(item.created_at).toLocaleString() : '-' }}
              </UiListItemSubtitle>
            </UiListItem>
          </UiList>
        </UiCard>
      </UiCol>
    </UiRow>

    <!-- Modal Editar Item -->
    <UiModal
      v-model="isEditing"
      max-width="500px"
      title="Editar Item da Demanda"
      transparent-header
    >
      <UiAlert v-if="editError" class="mb-4" size="sm" type="error" variant="soft">
        {{ editError }}
      </UiAlert>

      <UiInput
        v-model.number="eiQuantity"
        v-bind="eiQuantityProps"
        :error-messages="eiErrors.quantity"
        label="Quantidade"
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
        v-model="eiSearchUnit"
        v-bind="eiSearchUnitProps"
        class="mb-4"
        :error-messages="eiErrors.searchUnitText"
        :items="availableUnits"
      />

      <UiAutocomplete
        v-if="availableAliases.length > 0"
        v-model="eiAliasId"
        v-bind="eiAliasIdProps"
        class="mb-4"
        clearable
        :error-messages="eiErrors.aliasId"
        :item-title="(item: Record<string, unknown>) => `${item.code} - ${item.name}`"
        item-value="id"
        :items="availableAliases"
        label="Registro Alternativo (Alias)"
        placeholder="Selecione o registro alternativo..."
        size="md"
        variant="outline"
      />

      <template #actions>
        <UiButton :disabled="isSaving" variant="ghost" @click="closeEditModal">Cancelar</UiButton>
        <UiButton color="primary" :loading="isSaving" @click="saveItem"> Salvar </UiButton>
      </template>
    </UiModal>
    <!-- Modal Registrar Lance -->
    <UiModal
      v-model="isBidModalOpen"
      max-width="500px"
      title="Registrar Lance do Fornecedor"
      transparent-header
    >
      <UiAlert v-if="bidError" class="mb-4" size="sm" type="error" variant="soft">
        {{ bidError }}
      </UiAlert>

      <UiSwitch
        v-model="bidIsNew"
        v-bind="bidIsNewProps"
        class="mb-4"
        color="primary"
        :error-messages="bidErrors.isNewSupplier"
        hide-details
        label="Fornecedor não está na lista? Cadastrar Novo."
        size="sm"
      ></UiSwitch>

      <!-- Fornecedor Existente -->
      <UiAutocomplete
        v-if="!bidIsNew"
        v-model="bidSupplierId"
        v-bind="bidSupplierIdProps"
        class="mb-3"
        color="primary"
        :error-messages="bidErrors.supplierId"
        item-title="company_name"
        item-value="id"
        :items="suppliers"
        label="Selecionar Fornecedor*"
        placeholder="Busque pela razão social..."
        size="md"
        variant="outline"
      ></UiAutocomplete>

      <!-- Novo Fornecedor -->
      <template v-else>
        <UiInput
          v-model="bidCnpj"
          v-bind="bidCnpjProps"
          v-maska="'##.###.###/####-##'"
          :error-messages="bidErrors.newSupplierCnpj"
          label="CNPJ do Fornecedor*"
          placeholder="Apenas números"
        />
        <UiInput
          v-model="bidName"
          v-bind="bidNameProps"
          :error-messages="bidErrors.newSupplierName"
          label="Razão Social*"
          placeholder="Nome da empresa"
        />
        <UiInput
          v-model="bidEmail"
          v-bind="bidEmailProps"
          :error-messages="bidErrors.newSupplierEmail"
          label="E-mail de Contato"
          placeholder="email@empresa.com"
          type="email"
        />
      </template>

      <UiInput
        v-model="bidAmount"
        v-bind="bidAmountProps"
        class="mt-4"
        :error-messages="bidErrors.amount"
        inputmode="decimal"
        label="Valor do Lance (R$)*"
        placeholder="0,00"
      />

      <template #actions>
        <UiButton :disabled="isBidSaving" variant="ghost" @click="closeBidModal">Cancelar</UiButton>
        <UiButton color="primary" :loading="isBidSaving" @click="saveBid"> Salvar Lance </UiButton>
      </template>
    </UiModal>

    <!-- Modal Desclassificar Lance -->
    <UiModal
      v-model="isDisqualifyModalOpen"
      max-width="500px"
      title="Desclassificar Lance"
      transparent-header
    >
      <UiAlert v-if="statusUpdateError" class="mb-4" size="sm" type="error" variant="soft">
        {{ statusUpdateError }}
      </UiAlert>

      <div v-if="selectedBidForStatus" class="mb-4">
        <div class="text-caption text-grey">Fornecedor</div>
        <div class="text-body-1 font-weight-bold">{{ selectedBidForStatus.supplierName }}</div>
        <div class="text-caption text-grey mt-2">Valor do Lance</div>
        <div class="text-body-1 font-weight-bold">
          {{ formatCurrency(selectedBidForStatus.amount) }}
        </div>
      </div>

      <UiTextarea
        v-model="disqualificationReason"
        label="Motivo / Justificativa da Desclassificação"
        placeholder="Descreva o motivo da desclassificação do lance (opcional)..."
        rows="3"
      />

      <template #actions>
        <UiButton :disabled="isStatusUpdating" variant="ghost" @click="closeDisqualifyModal">
          Cancelar
        </UiButton>
        <UiButton color="error" :loading="isStatusUpdating" @click="confirmDisqualifyBid">
          Desclassificar
        </UiButton>
      </template>
    </UiModal>

    <!-- Modal de Atualização de Status de Execução -->
    <DemandItemExecutionStatusModal
      v-model="isExecutionStatusModalOpen"
      :item="item"
      @saved="handleExecutionStatusSaved"
    />
  </UiContainer>
</template>
