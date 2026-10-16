<script setup lang="ts">
  import type { ProductUnitDetail, ProductDemandUsage } from '~/composables/useProducts'
  import { ROLES } from '~/constants/roles'
  import { formatDate, formatDateTime } from '~/utils/formatters'
  import { formatDemandStatus, getDemandStatusColor } from '~/utils/demandStatus'

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
    addProductUnit,
    removeProductUnit,
  } = useProducts()
  const { fetchAllActiveUnits } = useMeasurementUnits()

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

  const removeUnit = async (unitId: string) => {
    if (!confirm('Remover esta apresentação do produto?')) return
    try {
      await removeProductUnit(productId, unitId)
      await refresh()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : String(e))
    }
  }

  const unitHeaders = [
    { text: 'Apresentação (Unidade)', value: 'name' },
    { text: 'Status', value: 'status', align: 'center' as const },
    { text: 'Registros Alternativos (Aliases)', value: 'aliases' },
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
                  @click="removeUnit(item.id)"
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
  </UiContainer>
</template>
