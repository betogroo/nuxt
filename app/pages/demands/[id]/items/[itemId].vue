<script setup lang="ts">
  import { useZodForm } from '~/composables/useZodForm'
  import { demandItemFormSchema } from '~/schemas/forms/demand-item'
  import { demandBidFormSchema } from '~/schemas/forms/demand-bid'
  import type { SupplierRow } from '~/composables/useSuppliers'
  definePageMeta({ middleware: ['uge'] })
  const route = useRoute()
  const router = useRouter()

  const { fetchDemandItemDetails, updateDemandItemWithDependencies } = useDemandProducts()
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
    reference_price: null,
    bid_interval: 3,
    bid_interval_type: 'percentage',
  })

  const [eiQuantity, eiQuantityProps] = eiDefine('quantity')
  const [eiSearchUnit, eiSearchUnitProps] = eiDefine('searchUnitText')
  const [eiReferencePrice, eiReferencePriceProps] = eiDefine('reference_price')
  const [eiBidInterval, eiBidIntervalProps] = eiDefine('bid_interval')
  const [eiBidIntervalType, eiBidIntervalTypeProps] = eiDefine('bid_interval_type')
  const availableUnits = ref<
    Array<{ id: string; name: string; displayName?: string; legacy_alias?: string | null }>
  >([])

  const openEditModal = async () => {
    if (!item.value) return
    eiReset({
      values: {
        quantity: Number(item.value.quantity),
        searchUnitText: item.value.measurement_units?.name || '',
        reference_price: item.value.reference_price ? Number(item.value.reference_price) : null,
        bid_interval: item.value.bid_interval ? Number(item.value.bid_interval) : 3,
        bid_interval_type: item.value.bid_interval_type === 'monetary' ? 'monetary' : 'percentage',
      },
    })

    // Fetch all units so user can search or suggest new ones
    const unitsData = await fetchUnits()

    if (unitsData) {
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

  const canManageBidStatus = computed(() =>
    ['quotation', 'dispute', 'homologation'].includes(item.value?.demand?.status || ''),
  )

  const canRegisterBids = computed(() => item.value?.demand?.status === 'dispute')

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

  const confirmRemoveBid = async (bidId: string) => {
    if (!confirm('Deseja realmente remover este lance?')) return
    try {
      await removeBid(bidId)
      await refreshBids()
    } catch (err) {
      console.error('Erro ao remover lance', err)
      alert('Erro ao remover lance.')
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
                    v-if="
                      item?.demand?.status === 'quotation' || item?.demand?.status === 'dispute'
                    "
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
  </UiContainer>
</template>
