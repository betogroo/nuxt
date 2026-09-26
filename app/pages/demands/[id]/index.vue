<script setup lang="ts">
  const route = useRoute()
  const router = useRouter()
  const { profile, fetchAllProfiles } = useProfile()

  const {
    fetchDemandProducts,
    addDemandItemWithDependencies,
    removeDemandProduct,
    updateDemandItemWithDependencies,
  } = useDemandProducts()

  const {
    fetchDemandById,
    fetchDemandResponsibles,
    addResponsible: addResponsibleDb,
    removeResponsible: removeResponsibleDb,
    updateDemand,
  } = useDemands()

  const { fetchAllActiveProducts, fetchPendingProductSuggestions } = useProducts()
  const { fetchAllActiveCategories } = useCategories()
  const { fetchUnits } = useMeasurementUnits()

  const demandId = route.params.id as string

  // Fetch Demand Details
  const { data: demand, refresh: refreshDemand } = useAsyncData(`demand-${demandId}`, async () => {
    return await fetchDemandById(demandId)
  })

  // Modal de Edição Rápida de Planejamento
  const editPlanningModal = useModal<Partial<DemandRow>>({
    name: '',
    type: 'consumption',
    process_number: '',
    id_pca: '',
    contract_number: '',
  })

  const openEditPlanning = () => {
    if (demand.value) {
      editPlanningModal.open({
        name: demand.value.name,
        type: demand.value.type,
        process_number: demand.value.process_number || '',
        id_pca: demand.value.id_pca || '',
        contract_number: demand.value.contract_number || '',
      })
    }
  }

  const savePlanning = async () => {
    editPlanningModal.startSaving()
    try {
      const payload = {
        name: editPlanningModal.payload.value.name,
        type: editPlanningModal.payload.value.type,
        process_number: editPlanningModal.payload.value.process_number || null,
        id_pca: editPlanningModal.payload.value.id_pca || null,
        contract_number: editPlanningModal.payload.value.contract_number
          ? String(editPlanningModal.payload.value.contract_number)
          : null,
      }
      //
      await updateDemand(demandId, payload)
      await refreshDemand()
      editPlanningModal.close()
    } catch (err: unknown) {
      editPlanningModal.error.value = err instanceof Error ? err.message : String(err)
    } finally {
      editPlanningModal.stopSaving()
    }
  }

  // Verifica se o planejamento está incompleto (faltando campos obrigatórios para avançar)
  const isPlanningIncomplete = computed(() => {
    if (demand.value?.status !== 'planning') return false
    const { process_number, id_pca, contract_number } = demand.value
    return !process_number || !id_pca || !contract_number
  })



  useHead({
    title: computed(() => (demand.value ? `Demanda: ${demand.value.name}` : 'Detalhes da Demanda')),
  })

  // Fetch Demand Responsibles
  const { data: responsibles, refresh: refreshResponsibles } = useAsyncData(
    `demand-responsibles-${demandId}`,
    async () => {
      return await fetchDemandResponsibles(demandId)
    },
  )

  // Fetch Demand Products
  const {
    data: items,
    pending: itemsPending,
    refresh: refreshItems,
  } = useAsyncData(`demand-items-${demandId}`, async () => {
    return await fetchDemandProducts(demandId)
  })

  // Fetch all active products for the autocomplete
  const { data: allProducts, refresh: refreshProducts } = useAsyncData(
    'all-active-products',
    async () => {
      return await fetchAllActiveProducts()
    },
  )

  const { data: categories } = useAsyncData('active-categories', async () => {
    return await fetchAllActiveCategories()
  })

  // Fetch all pending suggestions to show in autocomplete
  const { data: pendingSuggestions } = useAsyncData('pending-suggestions', async () => {
    return await fetchPendingProductSuggestions()
  })

  // Modal State
  const isModalOpen = ref(false)
  const isSaving = ref(false)
  const saveError = ref('')

  const isNewProductMode = ref(false)

  // Form states
  const selectedProductId = ref<string | null>(null)
  const selectedUnitSearch = ref<unknown>('')
  const itemQuantity = ref<number>(1)
  const itemReferencePrice = ref<number | null>(null)
  const searchProductText = ref('')

  // Add Responsible Modal State
  const isResponsibleModalOpen = ref(false)
  const responsibleUserId = ref<string | null>(null)
  const isAddingResponsible = ref(false)
  const responsibleError = ref('')

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
    //
    return selectedProductObj.value?.product_units?.map((pu) => pu.measurement_units) || []
  })

  const computedMeasurementUnits = computed(() => {
    return (availableUnitsForSelectedProduct.value || []).map(
      (u: { name: string; legacy_alias?: string | null } | undefined | null) => ({
        ...u,
        displayName: u?.legacy_alias ? `${u?.name} (Legado: ${u?.legacy_alias})` : u?.name,
      }),
    )
  })

  // Whenever a product is selected, auto-select the first unit if available
  watch(selectedProductId, (newVal) => {
    if (newVal) {
      if (availableUnitsForSelectedProduct.value.length > 0) {
        selectedUnitSearch.value = availableUnitsForSelectedProduct.value[0]?.name || 'Unidade'
      } else {
        selectedUnitSearch.value = 'Unidade'
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
  const newProductCategoryId = ref<string | null>(null)
  const newProductSuggestedCategory = ref('')

  const isNewProductOutrosCategory = computed(() => {
    const cat = categories.value?.find((c) => c.id === newProductCategoryId.value)
    return cat?.name === 'Outros'
  })

  const openAddModal = () => {
    selectedProductId.value = null
    selectedUnitSearch.value = ''
    itemQuantity.value = 1
    itemReferencePrice.value = null
    searchProductText.value = ''
    isNewProductMode.value = false
    newProductName.value = ''
    newProductCategoryId.value = null
    newProductSuggestedCategory.value = ''
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

  const saveToDemand = async () => {
    isSaving.value = true
    saveError.value = ''

    try {
      await addDemandItemWithDependencies({
        demandId: demandId as string,
        isNewProductMode: isNewProductMode.value,
        newProductName: newProductName.value,
        newProductCategoryId: newProductCategoryId.value,
        newProductSuggestedCategory: newProductSuggestedCategory.value,
        isNewProductOutrosCategory: isNewProductOutrosCategory.value,
        selectedProductId: selectedProductId.value,
        selectedUnitSearch: selectedUnitSearch.value as string,
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

  const removeItem = async (itemId: string, productName: string) => {
    if (!confirm(`Deseja realmente remover '${productName}' da demanda?`)) return
    try {
      await removeDemandProduct(itemId, demandId as string)
      await refreshItems()
    } catch (err: unknown) {
      const e = err as Error
      alert(`Erro ao remover item: ${e.message}`)
    }
  }

  const isEditItemModalOpen = ref(false)
  const editItemSaving = ref(false)
  const editItemError = ref('')
  const editItemForm = ref({
    id: '',
    productId: '',
    productName: '',
    quantity: 1,
    reference_price: null as number | null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    unit_id: null as any,
    searchUnitText: '',
  })

  const openEditItemModal = (item: {
    id: string
    quantity: number | string
    reference_price?: number | string | null
    product_id?: string
    product?: { id?: string; name: string }
    unit_id?: string | null
  }) => {
    editItemForm.value = {
      id: item.id,
      productId: item.product_id || item.product?.id || '',
      productName: item.product?.name || 'Produto',
      quantity: Number(item.quantity),
      reference_price: item.reference_price != null ? Number(item.reference_price) : null,
      unit_id: item.unit_id
        ? allMeasurementUnits.value?.find((u) => u.id === item.unit_id) || item.unit_id
        : null,
      searchUnitText: '',
    }
    editItemError.value = ''
    isEditItemModalOpen.value = true
  }

  const saveEditItem = async () => {
    editItemSaving.value = true
    editItemError.value = ''
    try {
      if (editItemForm.value.quantity <= 0) {
        throw new Error('A quantidade deve ser maior que zero.')
      }

      await updateDemandItemWithDependencies({
        itemId: editItemForm.value.id,
        demandId: demandId,
        productId: editItemForm.value.productId,
        quantity: editItemForm.value.quantity,
        referencePrice: editItemForm.value.reference_price,
        unitSearch: editItemForm.value.searchUnitText?.trim() || editItemForm.value.unit_id,
      })

      await refreshAllMeasurementUnits()
      await refreshItems()
      isEditItemModalOpen.value = false
    } catch (err: unknown) {
      editItemError.value = err instanceof Error ? err.message : String(err)
    } finally {
      editItemSaving.value = false
    }
  }
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

  const addResponsible = async () => {
    if (!responsibleUserId.value) {
      alert('Selecione um usuário.')
      return
    }
    isAddingResponsible.value = true
    try {
      await addResponsibleDb(demandId as string, responsibleUserId.value)
      await refreshResponsibles()
      isResponsibleModalOpen.value = false
    } catch (err: unknown) {
      const e = err as Error
      alert(e.message)
    } finally {
      isAddingResponsible.value = false
    }
  }

  const removeResponsible = async (userId: string) => {
    if (!confirm('Deseja realmente remover este responsável?')) return
    try {
      await removeResponsibleDb(demandId as string, userId)
      await refreshResponsibles()
    } catch (err: unknown) {
      const e = err as Error
      alert(`Erro ao remover: ${e.message}`)
    }
  }
</script>

<template>
  <v-container>
    <UiButton class="mb-4" prepend-icon="mdi-arrow-left" variant="text" @click="router.back()">
      Voltar para Demandas
    </UiButton>

    <!-- Cabeçalho da Demanda -->
    <UiCard v-if="demand" class="mb-6" transparent-header>
      <template #header>
        <div class="d-flex align-center w-100">
          <span class="mr-4">{{ demand.name }}</span>
          <UiChip color="primary" size="small" variant="flat">{{
            formatDemandStatus(demand.status)
          }}</UiChip>
          <v-spacer />
          <UiButton
            v-if="profile?.role === 'admin' && getPreviousStatus(demand.status)"
            class="mr-2"
            color="orange-darken-3"
            prepend-icon="mdi-arrow-left-bold"
            @click="openRevertModal"
          >
            Retornar para {{ formatDemandStatus(getPreviousStatus(demand.status) || '') }}
          </UiButton>
          <UiButton
            v-if="profile?.role !== 'admin' && getPreviousStatus(demand.status)"
            class="mr-2"
            :color="demand.is_return_requested ? 'grey' : 'warning'"
            :disabled="demand.is_return_requested || isReturnRequesting"
            :loading="isReturnRequesting"
            prepend-icon="mdi-arrow-left-bold"
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
                  prepend-icon="mdi-arrow-right-bold"
                  @click="openAdvanceModal"
                >
                  Avançar para {{ formatDemandStatus(getNextStatus(demand.status) || '') }}
                </UiButton>
              </span>
            </template>
          </UiTooltip>
        </div>
      </template>

      <!-- Stepper Visual -->
      <v-stepper
        class="elevation-0 bg-transparent mb-6"
        :model-value="statusList.indexOf(demand.status) + 1"
      >
        <v-stepper-header>
          <template v-for="(step, i) in statusList" :key="step">
            <v-stepper-item
              :color="statusList.indexOf(demand.status) >= i ? 'primary' : 'grey'"
              :complete="statusList.indexOf(demand.status) > i"
              :value="i + 1"
            >
              {{ formatDemandStatus(step) }}
            </v-stepper-item>
            <v-divider v-if="i < statusList.length - 1" />
          </template>
        </v-stepper-header>
      </v-stepper>

      <v-row>
        <v-col cols="12" md="8">
          <!-- Dados do Planejamento -->
          <UiCard class="mb-4" variant="outlined">
            <template #header>
              <div class="d-flex align-center w-100">
                <v-icon class="mr-2 text-primary" left>mdi-clipboard-text-outline</v-icon>
                <span class="text-subtitle-1 font-weight-bold">Dados do Planejamento</span>
                <v-spacer />
                <UiButton
                  v-if="demand?.status === 'planning'"
                  color="primary"
                  prepend-icon="mdi-pencil"
                  size="small"
                  variant="text"
                  @click="openEditPlanning"
                >
                  Editar
                </UiButton>
              </div>
            </template>
            <v-row class="px-2 pb-2 mt-2">
              <v-col cols="12" md="4" sm="6">
                <div class="text-caption text-grey">Processo Oficial</div>
                <div class="text-body-1 font-weight-bold text-primary">
                  {{ demand.process_number || 'Aguardando autuação' }}
                </div>
              </v-col>
              <v-col cols="12" md="4" sm="6">
                <div class="text-caption text-grey">Processo Interno</div>
                <div class="text-body-1 font-weight-medium">
                  {{ demand.internal_process_number || '-' }}
                </div>
              </v-col>
              <v-col cols="12" md="4" sm="6">
                <div class="text-caption text-grey">ID PCA</div>
                <div class="text-body-1 font-weight-medium">
                  {{ demand.id_pca || '-' }}
                </div>
              </v-col>
              <v-col cols="12" md="4" sm="6">
                <div class="text-caption text-grey">Tipo</div>
                <div class="text-body-1 font-weight-medium">
                  {{ demand.type === 'consumption' ? 'Consumo' : 'Permanente' }}
                </div>
              </v-col>
              <v-col cols="12" md="4" sm="6">
                <div class="text-caption text-grey">Nº da Contratação</div>
                <div class="text-body-1 font-weight-medium">
                  {{ demand.contract_number || '-' }}
                </div>
              </v-col>
              <v-col cols="12">
                <UiAlert
                  v-if="isPlanningIncomplete"
                  class="mt-2 text-caption"
                  density="compact"
                  type="warning"
                  variant="tonal"
                >
                  Para avançar para a Cotação, preencha os dados do planejamento (Processo Oficial,
                  ID PCA e Nº Contratação).
                  <br />
                  <small>Você pode editar a demanda voltando à tela de listagem.</small>
                </UiAlert>
              </v-col>
            </v-row>
          </UiCard>

          <!-- Dados da Disputa -->
          <UiCard
            v-if="demand?.status !== 'planning' && demand?.status !== 'quotation'"
            title="Dados da Disputa e Contratação"
            variant="outlined"
          >
            <v-row class="px-2 pb-2 mt-2">
              <v-col cols="12" md="4" sm="6">
                <div class="text-caption text-grey">Aviso de Contratação</div>
                <div class="text-body-1 font-weight-medium">
                  {{ demand.bidding_notice_number || '-' }}
                </div>
              </v-col>
              <v-col cols="12" md="4" sm="6">
                <div class="text-caption text-grey">Nº Disputa</div>
                <div class="text-body-1">
                  {{ demand.dispute_number || '-' }}
                </div>
              </v-col>
              <v-col cols="12" md="4" sm="6">
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
              </v-col>
              <v-col cols="12" md="4" sm="6">
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
              </v-col>
            </v-row>
          </UiCard>
        </v-col>

        <!-- Responsáveis -->
        <v-col class="border-s pl-md-4 mt-4 mt-md-0" cols="12" md="4">
          <div class="d-flex align-center mb-2">
            <span class="text-subtitle-2 font-weight-bold">Responsáveis</span>
            <v-spacer />
            <UiButton
              icon="mdi-plus"
              size="x-small"
              variant="text"
              @click="isResponsibleModalOpen = true"
            />
          </div>
          <v-list class="bg-transparent pa-0" density="compact">
            <v-list-item
              v-for="resp in responsibles"
              :key="resp?.user_id || Math.random()"
              class="px-0"
            >
              <template #prepend>
                <v-avatar class="text-caption text-white" color="primary" size="32">
                  {{ (resp?.profiles?.name || 'U').charAt(0).toUpperCase() }}
                </v-avatar>
              </template>
              <v-list-item-title class="text-body-2">{{
                resp?.profiles?.name || 'Usuário Desconhecido'
              }}</v-list-item-title>
              <template #append>
                <UiButton
                  v-if="profile?.role === 'admin'"
                  color="error"
                  icon="mdi-close"
                  size="x-small"
                  variant="text"
                  @click="removeResponsible(resp?.user_id || '')"
                />
              </template>
            </v-list-item>
            <v-list-item v-if="!responsibles?.length" class="px-0">
              <v-list-item-title class="text-caption text-grey"
                >Nenhum responsável definido.</v-list-item-title
              >
            </v-list-item>
          </v-list>
        </v-col>
      </v-row>
    </UiCard>

    <!-- Lista de Produtos da Demanda -->
    <UiCard transparent-header>
      <template #header>
        Produtos na Demanda
        <v-spacer />
        <UiButton
          v-if="demand?.status === 'quotation'"
          color="primary"
          prepend-icon="mdi-plus"
          @click="openAddModal"
        >
          Adicionar Produto
        </UiButton>
      </template>

      <!-- Alerta de bloqueio -->
      <UiAlert
        v-if="demand?.status !== 'quotation'"
        class="mb-4"
        density="compact"
        type="info"
        variant="tonal"
      >
        A inserção ou alteração de itens só é permitida na fase de Cotação.
      </UiAlert>

      <UiTable
        :headers="[
          { text: 'Produto', value: 'product' },
          { text: 'Categoria', value: 'category' },
          { text: 'Quantidade', value: 'quantity', align: 'center' },
          { text: 'Valor Ref.', value: 'reference_price', align: 'right' },
          { text: 'Melhor Lance', value: 'best_bid', align: 'right' },
          { text: 'Ações', value: 'actions', align: 'right' },
        ]"
        :items="items || []"
      >
        <template v-if="!items?.length && !itemsPending" #empty>
          Nenhum produto adicionado a esta demanda ainda.
        </template>
        <template #item-product="{ item }">
          <NuxtLink
            class="text-decoration-none text-primary font-weight-bold"
            :to="`/demands/${demandId}/items/${item.id}`"
          >
            {{ item.product_name_snapshot || item.product?.name || 'Produto desconhecido' }}
            <UiChip
              v-if="item.measurement_units"
              class="ml-2"
              color="secondary"
              size="x-small"
              variant="flat"
            >
              {{ item.unit_name_snapshot || item.measurement_units.name }}
            </UiChip>
          </NuxtLink>
          <UiButton
            class="ml-1"
            color="grey"
            icon="mdi-open-in-new"
            size="x-small"
            title="Cadastro do Produto"
            :to="`/products/${item.product_id}`"
            variant="text"
          />
        </template>
        <template #item-category="{ item }">
          {{
            item.category_name_snapshot ||
            (item.product as { product_categories?: { name: string } })?.product_categories?.name ||
            '-'
          }}
        </template>
        <template #item-quantity="{ item }">
          {{ item.quantity }}
        </template>
        <template #item-reference_price="{ item }">
          {{
            item.reference_price != null
              ? 'R$ ' +
                Number(item.reference_price).toLocaleString('pt-BR', {
                  minimumFractionDigits: 4,
                  maximumFractionDigits: 4,
                })
              : '-'
          }}
        </template>
        <template #item-best_bid="{ item }">
          <template v-if="item.demand_product_bids && item.demand_product_bids.length > 0">
            <span class="text-success font-weight-bold">
              {{
                new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                  Math.min(...item.demand_product_bids.map((b: { amount: number }) => b.amount))
                )
              }}
            </span>
          </template>
          <span v-else class="text-grey">-</span>
        </template>
        <template #item-actions="{ item }">
          <UiButton
            v-if="demand?.status === 'quotation'"
            color="primary"
            size="small"
            title="Editar Item"
            variant="text"
            @click="openEditItemModal(item)"
          >
            <v-icon>mdi-pencil</v-icon>
          </UiButton>
          <UiButton
            v-if="demand?.status === 'quotation'"
            color="error"
            icon="mdi-delete"
            size="small"
            title="Remover"
            variant="text"
            @click="removeItem(item.id, item.product?.name || '')"
          />
        </template>
      </UiTable>
      <div v-if="itemsPending" class="text-center py-4">
        <v-progress-circular color="primary" indeterminate></v-progress-circular>
      </div>
    </UiCard>

    <!-- Modal Editar Item -->
    <UiModal
      v-model="isEditItemModalOpen"
      max-width="500px"
      persistent
      title="Editar Item da Demanda"
      transparent-header
    >
      <UiAlert v-if="editItemError" class="mb-4" density="compact" type="error" variant="tonal">
        {{ editItemError }}
      </UiAlert>

      <p class="text-body-1 font-weight-bold mb-4">{{ editItemForm.productName }}</p>

      <UiInput v-model.number="editItemForm.quantity" label="Quantidade" min="1" type="number" />

      <UiCombobox
        v-model="editItemForm.unit_id"
        v-model:search="editItemForm.searchUnitText"
        class="mt-3"
        clearable
        hint="Selecione ou digite uma nova unidade de medida se não existir."
        item-title="name"
        item-value="id"
        :items="allMeasurementUnits || []"
        label="Unidade de Medida"
        persistent-hint
      />

      <UiInput
        v-model.number="editItemForm.reference_price"
        class="mt-3"
        label="Valor Referencial (R$)"
        step="0.0001"
        type="number"
      />

      <template #actions>
        <UiButton :disabled="editItemSaving" variant="text" @click="isEditItemModalOpen = false"
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
      <UiAlert v-if="saveError" class="mb-4" density="compact" type="error" variant="tonal">
        {{ saveError }}
      </UiAlert>

      <!-- Seção de Busca de Produto Existente -->
      <template v-if="!isNewProductMode">
        <v-autocomplete
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
                size="small"
                variant="tonal"
                @click="activateNewProductMode"
              >
                Cadastrar novo
              </UiButton>
            </div>
          </template>
        </v-autocomplete>

        <UiCombobox
          v-if="selectedProductId"
          v-model="selectedUnitSearch"
          class="mt-3"
          density="comfortable"
          hint="Selecione ou digite uma nova embalagem se não existir."
          item-title="displayName"
          item-value="name"
          :items="computedMeasurementUnits"
          label="Apresentação (Unidade de Medida)"
          persistent-hint
          :return-object="false"
          variant="outlined"
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
        <UiAlert class="mb-4" density="compact" type="info" variant="tonal">
          Você está cadastrando um novo produto. Ele será salvo no sistema e automaticamente
          adicionado à demanda.
        </UiAlert>

        <UiInput v-model="newProductName" label="Nome do Produto" />
        <UiSelect
          v-model="newProductCategoryId"
          item-title="name"
          item-value="id"
          :items="categories || []"
          label="Categoria de Material"
        />

        <UiCombobox
          v-if="isNewProductOutrosCategory"
          v-model="newProductSuggestedCategory"
          class="mb-4"
          density="comfortable"
          hint="Digite uma nova ou escolha uma sugestão pendente de outros usuários."
          :items="pendingSuggestions || []"
          label="Qual categoria você sugere?"
          persistent-hint
          :return-object="false"
          variant="outlined"
        />

        <UiCombobox
          v-model="selectedUnitSearch"
          class="mb-4"
          density="comfortable"
          hint="Deixe em branco para usar 'Unidade', ou digite uma nova embalagem."
          item-title="displayName"
          item-value="name"
          :items="computedMeasurementUnits"
          label="Apresentação (Unidade de Medida)"
          persistent-hint
          :return-object="false"
          variant="outlined"
        />

        <UiInput v-model.number="itemQuantity" label="Quantidade" min="1" type="number" />
        <UiInput
          v-model.number="itemReferencePrice"
          label="Valor Referencial (R$)"
          step="0.0001"
          type="number"
        />

        <div class="text-right">
          <UiButton size="small" variant="text" @click="isNewProductMode = false">
            Voltar à Busca
          </UiButton>
        </div>
      </template>

      <template #actions>
        <UiButton :disabled="isSaving" variant="text" @click="closeModal">Cancelar</UiButton>
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
      <UiAlert v-if="responsibleError" class="mb-4" density="compact" type="error" variant="tonal">
        {{ responsibleError }}
      </UiAlert>
      <UiSelect
        v-model="responsibleUserId"
        item-title="name"
        item-value="id"
        :items="availableProfiles"
        label="Selecione o Usuário"
      />
      <template #actions>
        <UiButton
          :disabled="isAddingResponsible"
          variant="text"
          @click="isResponsibleModalOpen = false"
          >Cancelar</UiButton
        >
        <UiButton color="primary" :loading="isAddingResponsible" @click="addResponsible"
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
        density="compact"
        type="error"
        variant="tonal"
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
          v-model="advanceModal.payload.value.dispute_date"
          label="Data da Disputa"
          required
          type="date"
        />
        <v-row class="mt-2">
          <v-col class="py-0" cols="12" sm="6">
            <UiInput
              v-model="advanceModal.payload.value.offer_opening_date"
              label="Data de Abertura"
              type="date"
            />
          </v-col>
          <v-col class="py-0" cols="12" sm="6">
            <UiInput
              v-model="advanceModal.payload.value.offer_opening_time"
              label="Hora de Abertura"
              type="time"
            />
          </v-col>
        </v-row>
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
          variant="text"
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
        density="compact"
        type="error"
        variant="tonal"
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
        <UiButton :disabled="revertModal.isSaving.value" variant="text" @click="revertModal.close()"
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
        density="compact"
        type="error"
        variant="tonal"
      >
        {{ editPlanningModal.error.value }}
      </UiAlert>

      <UiInput v-model="editPlanningModal.payload.value.name" label="Nome da Demanda*" required />

      <UiSelect
        v-model="editPlanningModal.payload.value.type"
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
        v-model="editPlanningModal.payload.value.process_number"
        hint="Opcional. Padrão: XXX.XXXXXXXX/YYYY-ZZ"
        label="Nº do Processo (Oficial)"
        placeholder="Ex: 058.00100793/2026-21"
      />

      <UiInput
        v-model="editPlanningModal.payload.value.id_pca"
        hint="Opcional."
        label="ID PCA"
        placeholder="Ex: 46377800000127-0-000132/2026"
      />

      <UiInput
        v-model="editPlanningModal.payload.value.contract_number"
        hint="Opcional."
        label="Nº da Contratação"
        placeholder="Apenas números"
        type="number"
      />

      <template #actions>
        <UiButton
          :disabled="editPlanningModal.isSaving.value"
          variant="text"
          @click="editPlanningModal.close()"
          >Cancelar</UiButton
        >
        <UiButton color="primary" :loading="editPlanningModal.isSaving.value" @click="savePlanning"
          >Salvar</UiButton
        >
      </template>
    </UiModal>
  </v-container>
</template>
