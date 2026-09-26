<script setup lang="ts">
  const route = useRoute()
  const router = useRouter()

  const { fetchDemandItemDetails, updateDemandItemWithDependencies } = useDemandProducts()
  const { fetchUnits } = useMeasurementUnits()

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
  const editForm = ref({
    quantity: 1,
    unitSearch: '',
    reference_price: 0 as number | null,
    bid_interval: 3 as number,
    bid_interval_type: 'percentage' as 'percentage' | 'monetary',
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const availableUnits = ref<any[]>([])

  const openEditModal = async () => {
    if (!item.value) return
    editForm.value = {
      quantity: Number(item.value.quantity),
      unitSearch: item.value.measurement_units?.name || '',
      reference_price: item.value.reference_price ? Number(item.value.reference_price) : null,
      bid_interval: item.value.bid_interval ? Number(item.value.bid_interval) : 3,
      bid_interval_type: item.value.bid_interval_type === 'monetary' ? 'monetary' : 'percentage',
    }

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

  const saveItem = async () => {
    isSaving.value = true
    editError.value = ''
    try {
      if (editForm.value.quantity <= 0) throw new Error('A quantidade deve ser maior que 0.')

      await updateDemandItemWithDependencies({
        itemId,
        demandId,
        productId: item.value?.product_id || undefined,
        quantity: editForm.value.quantity,
        referencePrice: editForm.value.reference_price,
        bidInterval: editForm.value.bid_interval,
        bidIntervalType: editForm.value.bid_interval_type,
        unitSearch: editForm.value.unitSearch,
      })

      await refresh()
      closeEditModal()
    } catch (err: unknown) {
      if (err instanceof Error) {
        editError.value = err.message
      } else if (typeof err === 'object' && err !== null && 'message' in err) {
        editError.value = String((err as Record<string, unknown>).message)
      } else {
        editError.value = 'Ocorreu um erro ao salvar.'
      }
    } finally {
      isSaving.value = false
    }
  }
  // --- Bids Logic ---
  const { fetchBidsByProduct, addBid, removeBid } = useProductBids()
  const { fetchAllActiveSuppliers, createSupplierFast } = useSuppliers()

  const { data: bids, refresh: refreshBids, pending: bidsPending } = useAsyncData(`item-bids-${itemId}`, async () => {
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
  const bidForm = ref({
    isNewSupplier: false,
    supplierId: null as string | null,
    newSupplierCnpj: '',
    newSupplierName: '',
    newSupplierEmail: '',
    amount: null as number | null,
  })

  const openBidModal = () => {
    bidForm.value = {
      isNewSupplier: false,
      supplierId: null,
      newSupplierCnpj: '',
      newSupplierName: '',
      newSupplierEmail: '',
      amount: null,
    }
    bidError.value = ''
    isBidModalOpen.value = true
  }

  const closeBidModal = () => {
    isBidModalOpen.value = false
  }

  const saveBid = async () => {
    isBidSaving.value = true
    bidError.value = ''
    try {
      if (!bidForm.value.amount || bidForm.value.amount <= 0) {
        throw new Error('O valor do lance deve ser maior que zero.')
      }

      let selectedSupplierId = bidForm.value.supplierId

      if (bidForm.value.isNewSupplier) {
        if (!bidForm.value.newSupplierCnpj || !bidForm.value.newSupplierName || !bidForm.value.newSupplierEmail) {
          throw new Error('Preencha os dados do fornecedor: CNPJ, Razão Social e E-mail.')
        }
        
        // Remove non-numeric chars from CNPJ
        const cleanCnpj = bidForm.value.newSupplierCnpj.replace(/\D/g, '')

        const newSupp = await createSupplierFast(cleanCnpj, bidForm.value.newSupplierName, bidForm.value.newSupplierEmail)
        selectedSupplierId = newSupp.id
        await fetchSuppliersList() // refresh the list just in case
      }

      if (!selectedSupplierId) {
        throw new Error('Selecione um fornecedor ou cadastre um novo.')
      }

      // Check if this supplier already has a bid for this product
      if (bids.value?.find(b => b.supplier_id === selectedSupplierId)) {
         throw new Error('Este fornecedor já possui um lance para este produto.')
      }

      await addBid(itemId, selectedSupplierId, bidForm.value.amount)

      await refreshBids()
      closeBidModal()
    } catch (err: unknown) {
      if (err instanceof Error) {
        bidError.value = err.message
      } else if (typeof err === 'object' && err !== null && 'message' in err) {
        bidError.value = String((err as Record<string, unknown>).message)
      } else {
        bidError.value = 'Ocorreu um erro ao salvar o lance.'
      }
    } finally {
      isBidSaving.value = false
    }
  }

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
  <v-container>
    <div class="mb-4 d-flex align-center">
      <UiButton icon="mdi-arrow-left" variant="text" @click="router.push(`/demands/${demandId}`)" />
      <h2 class="text-h5 ml-2">Detalhes do Item na Demanda</h2>
    </div>

    <v-row>
      <v-col cols="12" md="8">
        <UiCard v-if="!pending && item" transparent-header>
          <template #header>
            <div class="d-flex align-center">
              {{ item.product_name_snapshot || item.product?.name }}
              <UiButton
                class="ml-1"
                color="primary"
                icon="mdi-open-in-new"
                size="small"
                title="Ver Cadastro Original do Produto"
                :to="`/products/${item.product?.id}`"
                variant="text"
              />
              <UiChip class="ml-2" color="secondary" size="small" variant="flat">
                {{ item.unit_name_snapshot || item.measurement_units?.name || 'Unidade' }}
              </UiChip>
            </div>
            <v-spacer />
            <div class="d-flex align-center">
              <UiChip class="mr-2" color="info" variant="outlined">Qtd: {{ item.quantity }}</UiChip>
              <UiButton
                v-if="item?.demand?.status === 'planning' || item?.demand?.status === 'quotation'"
                color="primary"
                icon="mdi-pencil"
                size="small"
                @click="openEditModal"
              />
            </div>
          </template>

          <UiAlert class="mb-4" density="compact" type="info" variant="tonal">
            Esta é a tela exclusiva deste produto dentro da demanda. Futuramente, lances e
            documentos enviados pelos fornecedores aparecerão aqui.
          </UiAlert>

          <!-- Card de Lances -->
          <UiCard class="mb-4" variant="outlined">
            <template #header>
              <div class="d-flex justify-space-between align-center w-100">
                <span>Lances Recebidos</span>
                <UiButton
                  v-if="item?.demand?.status === 'quotation' || item?.demand?.status === 'dispute'"
                  color="primary"
                  prepend-icon="mdi-plus"
                  size="small"
                  @click="openBidModal"
                >
                  Registrar Lance
                </UiButton>
              </div>
            </template>
            
            <div v-if="bidsPending" class="text-center py-4">
              <v-progress-circular color="primary" indeterminate></v-progress-circular>
            </div>
            
            <UiTable
              v-else
              :headers="[
                { text: 'Pos.', value: 'pos', align: 'center', sortable: false },
                { text: 'Fornecedor', value: 'supplier' },
                { text: 'Valor do Lance', value: 'amount', align: 'right' },
                { text: 'Ações', value: 'actions', align: 'center', sortable: false }
              ]"
              :items="bids || []"
            >
              <template #empty>
                <div class="text-body-2 text-grey text-center py-4">
                  Nenhum lance registrado para este item ainda.
                </div>
              </template>
              
              <template #item-pos="{ index }">
                <UiChip :color="index === 0 ? 'success' : 'default'" size="small">
                  {{ index + 1 }}º
                </UiChip>
              </template>

              <template #item-supplier="{ item: bid }">
                <div class="font-weight-bold">{{ bid.suppliers?.company_name }}</div>
                <div class="text-caption text-grey">{{ bid.suppliers?.cnpj }}</div>
              </template>

              <template #item-amount="{ item: bid }">
                <div class="font-weight-bold" :class="{'text-success': bids && bids[0].id === bid.id}">
                  {{ new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(bid.amount) }}
                </div>
              </template>
              
              <template #item-actions="{ item: bid }">
                <UiButton
                  v-if="item?.demand?.status === 'quotation' || item?.demand?.status === 'dispute'"
                  color="error"
                  icon="mdi-delete"
                  size="small"
                  title="Remover Lance"
                  variant="text"
                  @click="confirmRemoveBid(bid.id)"
                />
              </template>
            </UiTable>
          </UiCard>

          <!-- Futuro Card de Documentos -->
          <UiCard title="Documentos e Anexos" variant="outlined">
            <div class="text-body-2 text-grey pa-4 text-center">
              Nenhum documento anexado. (Em desenvolvimento)
            </div>
          </UiCard>
        </UiCard>

        <div v-if="pending" class="text-center py-10">
          <v-progress-circular color="primary" indeterminate></v-progress-circular>
        </div>
      </v-col>

      <v-col cols="12" md="4">
        <!-- Resumo da Demanda / Status -->
        <UiCard title="Informações" variant="outlined">
          <v-list class="bg-transparent" density="compact">
            <v-list-item v-if="item?.reference_price">
              <template #prepend>
                <v-icon color="grey">mdi-currency-brl</v-icon>
              </template>
              <v-list-item-title>Valor Referencial</v-list-item-title>
              <v-list-item-subtitle>
                {{
                  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                    item.reference_price,
                  )
                }}
              </v-list-item-subtitle>
            </v-list-item>
            <v-list-item>
              <template #prepend>
                <v-icon color="grey">mdi-arrow-split-horizontal</v-icon>
              </template>
              <v-list-item-title>Intervalo entre Lances</v-list-item-title>
              <v-list-item-subtitle v-if="item">
                {{
                  item.bid_interval_type === 'percentage'
                    ? `${item.bid_interval}%`
                    : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                        item.bid_interval || 0,
                      )
                }}
              </v-list-item-subtitle>
            </v-list-item>
            <v-divider class="my-2" />
            <v-list-item>
              <template #prepend>
                <v-icon color="grey">mdi-identifier</v-icon>
              </template>
              <v-list-item-title>ID do Item</v-list-item-title>
              <v-list-item-subtitle>{{ item?.id }}</v-list-item-subtitle>
            </v-list-item>
            <v-list-item>
              <template #prepend>
                <v-icon color="grey">mdi-calendar</v-icon>
              </template>
              <v-list-item-title>Adicionado em</v-list-item-title>
              <v-list-item-subtitle>
                {{ item?.created_at ? new Date(item.created_at).toLocaleString() : '-' }}
              </v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </UiCard>
      </v-col>
    </v-row>

    <!-- Modal Editar Item -->
    <UiModal
      v-model="isEditing"
      max-width="500px"
      title="Editar Item da Demanda"
      transparent-header
    >
      <UiAlert v-if="editError" class="mb-4" density="compact" type="error" variant="tonal">
        {{ editError }}
      </UiAlert>

      <UiInput v-model="editForm.quantity" label="Quantidade" type="number" />

      <UiInput
        v-model.number="editForm.reference_price"
        label="Valor Referencial (R$)"
        step="0.0001"
        type="number"
      />

      <div class="d-flex align-center mt-2 mb-4">
        <UiSelect
          v-model="editForm.bid_interval_type"
          class="mr-2 flex-grow-1"
          density="comfortable"
          hide-details
          :items="[
            { title: 'Percentual (%)', value: 'percentage' },
            { title: 'Monetário (R$)', value: 'monetary' },
          ]"
          label="Tipo de Intervalo"
          variant="outlined"
        />
        <UiInput
          v-model.number="editForm.bid_interval"
          class="flex-grow-1"
          hide-details
          label="Valor do Intervalo"
          step="0.01"
          type="number"
        />
      </div>

      <UiCombobox
        v-model="editForm.unitSearch"
        density="comfortable"
        hint="Selecione ou digite uma nova embalagem se não existir."
        item-title="displayName"
        item-value="name"
        :items="availableUnits"
        label="Apresentação (Unidade de Medida)"
        persistent-hint
        :return-object="false"
        variant="outlined"
      />

      <template #actions>
        <UiButton :disabled="isSaving" variant="text" @click="closeEditModal">Cancelar</UiButton>
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
      <UiAlert v-if="bidError" class="mb-4" density="compact" type="error" variant="tonal">
        {{ bidError }}
      </UiAlert>

      <v-switch
        v-model="bidForm.isNewSupplier"
        color="primary"
        label="Fornecedor não está na lista? Cadastrar Novo."
        density="compact"
        hide-details
        class="mb-4"
      ></v-switch>

      <!-- Fornecedor Existente -->
      <v-autocomplete
        v-if="!bidForm.isNewSupplier"
        v-model="bidForm.supplierId"
        :items="suppliers"
        item-title="company_name"
        item-value="id"
        label="Selecionar Fornecedor*"
        placeholder="Busque pela razão social..."
        variant="outlined"
        density="comfortable"
        class="mb-3"
        color="primary"
      ></v-autocomplete>

      <!-- Novo Fornecedor -->
      <template v-else>
        <UiInput
          v-model="bidForm.newSupplierCnpj"
          label="CNPJ do Fornecedor*"
          placeholder="Apenas números"
          v-maska="'##.###.###/####-##'"
        />
        <UiInput
          v-model="bidForm.newSupplierName"
          label="Razão Social*"
          placeholder="Nome da empresa"
        />
        <UiInput
          v-model="bidForm.newSupplierEmail"
          label="E-mail de Contato*"
          placeholder="email@empresa.com"
          type="email"
        />
      </template>

      <UiInput
        v-model.number="bidForm.amount"
        label="Valor do Lance (R$)*"
        placeholder="0,00"
        type="number"
        step="0.01"
        class="mt-4"
      />

      <template #actions>
        <UiButton :disabled="isBidSaving" variant="text" @click="closeBidModal">Cancelar</UiButton>
        <UiButton color="primary" :loading="isBidSaving" @click="saveBid"> Salvar Lance </UiButton>
      </template>
    </UiModal>
  </v-container>
</template>
