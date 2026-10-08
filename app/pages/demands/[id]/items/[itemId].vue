<script setup lang="ts">
  import { useZodForm } from '~/composables/useZodForm'
  import { demandItemFormSchema } from '~/schemas/forms/demand-item'
  import { demandBidFormSchema } from '~/schemas/forms/demand-bid'
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
  const { fetchBidsByProduct, addBid, removeBid } = useProductBids()
  const { fetchAllActiveSuppliers, createSupplierFast } = useSuppliers()

  const {
    data: bids,
    refresh: refreshBids,
    pending: bidsPending,
  } = useAsyncData(`item-bids-${itemId}`, async () => {
    return await fetchBidsByProduct(itemId)
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const suppliers = ref<any[]>([])
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
    amount: undefined as unknown as number,
  })

  const [bidIsNew, bidIsNewProps] = bidDefine('isNewSupplier')
  const [bidSupplierId, bidSupplierIdProps] = bidDefine('supplierId')
  const [bidCnpj, bidCnpjProps] = bidDefine('newSupplierCnpj')
  const [bidName, bidNameProps] = bidDefine('newSupplierName')
  const [bidEmail, bidEmailProps] = bidDefine('newSupplierEmail')
  const [bidAmount, bidAmountProps] = bidDefine('amount')

  const openBidModal = () => {
    bidReset({
      values: {
        isNewSupplier: false,
        supplierId: null,
        newSupplierCnpj: '',
        newSupplierName: '',
        newSupplierEmail: '',
        amount: undefined as unknown as number,
      },
    })
    bidError.value = ''
    isBidModalOpen.value = true
  }

  const closeBidModal = () => {
    isBidModalOpen.value = false
  }

  const saveBid = bidSubmit(async (values) => {
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

      await addBid(itemId, {
        supplier_id: finalSupplierId!,
        amount: values.amount!,
        is_winner: false,
        delivery_time_days: null,
      })
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
              <UiButton
                class="ml-1"
                color="primary"
                icon="externalLink"
                size="sm"
                title="Ver Cadastro Original do Produto"
                :to="`/products/${item.product?.id}`"
                variant="ghost"
              />
              <UiChip class="ml-2" color="secondary" size="sm" variant="solid">
                {{ item.unit_name_snapshot || item.measurement_units?.name || 'Unidade' }}
              </UiChip>
            </div>
            <UiSpacer />
            <div class="d-flex align-center">
              <UiChip class="mr-2" color="info" variant="outline">Qtd: {{ item.quantity }}</UiChip>
              <UiButton
                v-if="item?.demand?.status === 'planning' || item?.demand?.status === 'quotation'"
                color="primary"
                icon="edit"
                size="sm"
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
                  v-if="item?.demand?.status === 'quotation' || item?.demand?.status === 'dispute'"
                  color="primary"
                  prepend-icon="add"
                  size="sm"
                  @click="openBidModal"
                >
                  Registrar Lance
                </UiButton>
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

              <template #item-pos="{ index }">
                <UiChip :color="index === 0 ? 'success' : 'default'" size="sm">
                  {{ index + 1 }}º
                </UiChip>
              </template>

              <template #item-supplier="{ item: bid }">
                <div class="font-weight-bold">{{ bid.suppliers?.company_name }}</div>
                <div class="text-caption text-grey">{{ formatCnpj(bid.suppliers?.cnpj) }}</div>
              </template>

              <template #item-amount="{ item: bid }">
                <div
                  class="font-weight-bold"
                  :class="{ 'text-success': bids && bids[0].id === bid.id }"
                >
                  {{ formatCurrency(bid.amount) }}
                </div>
              </template>

              <template #item-actions="{ item: bid }">
                <UiButton
                  v-if="item?.demand?.status === 'quotation' || item?.demand?.status === 'dispute'"
                  color="error"
                  icon="delete"
                  size="sm"
                  title="Remover Lance"
                  variant="ghost"
                  @click="confirmRemoveBid(bid.id)"
                />
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
          <UiList class="bg-transparent" density="compact">
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
          density="comfortable"
          :error-messages="eiErrors.bid_interval_type"
          hide-details
          :items="[
            { title: 'Percentual (%)', value: 'percentage' },
            { title: 'Monetário (R$)', value: 'monetary' },
          ]"
          label="Tipo de Intervalo"
          variant="outlined"
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
        density="compact"
        :error-messages="bidErrors.isNewSupplier"
        hide-details
        label="Fornecedor não está na lista? Cadastrar Novo."
      ></UiSwitch>

      <!-- Fornecedor Existente -->
      <UiAutocomplete
        v-if="!bidIsNew"
        v-model="bidSupplierId"
        v-bind="bidSupplierIdProps"
        class="mb-3"
        color="primary"
        density="comfortable"
        :error-messages="bidErrors.supplierId"
        item-title="company_name"
        item-value="id"
        :items="suppliers"
        label="Selecionar Fornecedor*"
        placeholder="Busque pela razão social..."
        variant="outlined"
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
          label="E-mail de Contato*"
          placeholder="email@empresa.com"
          type="email"
        />
      </template>

      <UiInput
        v-model.number="bidAmount"
        v-bind="bidAmountProps"
        class="mt-4"
        :error-messages="bidErrors.amount"
        label="Valor do Lance (R$)*"
        placeholder="0,00"
        step="0.01"
        type="number"
      />

      <template #actions>
        <UiButton :disabled="isBidSaving" variant="ghost" @click="closeBidModal">Cancelar</UiButton>
        <UiButton color="primary" :loading="isBidSaving" @click="saveBid"> Salvar Lance </UiButton>
      </template>
    </UiModal>
  </UiContainer>
</template>
