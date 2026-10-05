<script setup lang="ts">
  definePageMeta({ middleware: ['uge'] })
  const route = useRoute()
  const router = useRouter()

  const { fetchProductById, addProductUnit, removeProductUnit } = useProducts()
  const { fetchAllActiveUnits } = useMeasurementUnits()

  const productId = route.params.id as string

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

  const { data: allMeasurementUnits, refresh: refreshUnitsList } = useAsyncData(
    'measurement-units',
    async () => {
      return await fetchAllActiveUnits()
    },
  )

  const computedMeasurementUnits = computed(() => {
    return (allMeasurementUnits.value || []).map((u) => ({
      ...u,
      displayName: u.legacy_alias ? `${u.name} (Legado: ${u.legacy_alias})` : u.name,
    }))
  })

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

  useHead({
    title: computed(() =>
      product.value?.name ? `Produto: ${product.value.name}` : 'Detalhes do Produto',
    ),
  })
</script>

<template>
  <div>
    <div class="mb-6">
      <UiButton color="default" prepend-icon="arrowLeft" variant="text" @click="router.back()">
        Voltar para Produtos
      </UiButton>
    </div>

    <!-- Loading state -->
    <div v-if="pending" class="d-flex justify-center my-16">
      <UiProgressCircular color="primary" indeterminate size="48" width="3" />
    </div>

    <div v-else-if="product">
      <UiRow justify="center">
        <!-- Expandido de lg=6 para lg=10 / xl=8 -->
        <UiCol cols="12" lg="10" xl="8">
          <!-- Cabeçalho Principal -->
          <div class="d-flex align-center mb-6">
            <UiIcon class="mr-3" color="primary" name="product" size="32" />
            <div>
              <div class="text-h5 font-weight-bold">{{ product.name }}</div>
              <div class="text-subtitle-2 text-medium-emphasis">
                Detalhes e configurações do produto
              </div>
            </div>
            <UiSpacer />
            <UiChip
              :color="product.is_active ? 'success' : 'error'"
              label
              size="default"
              variant="tonal"
            >
              {{ product.is_active ? 'Ativo' : 'Inativo' }}
            </UiChip>
          </div>

          <UiRow>
            <!-- Lado Esquerdo: Identificação e Metadados -->
            <UiCol cols="12" md="5">
              <UiCard class="h-100">
                <div class="pa-5">
                  <div class="d-flex align-center mb-4">
                    <UiIcon class="mr-2" color="primary" name="info" />
                    <div class="text-subtitle-1 font-weight-bold">Informações Básicas</div>
                  </div>

                  <div class="d-flex flex-column gap-4">
                    <div>
                      <div class="text-caption text-medium-emphasis">ID do Produto</div>
                      <div class="text-body-1 font-weight-mono">{{ product.id }}</div>
                    </div>

                    <UiDivider />

                    <div>
                      <div class="text-caption text-medium-emphasis">Natureza de Despesa</div>
                      <div class="mt-1">
                        <div v-if="product.expense_natures" class="d-flex align-center">
                          <UiChip class="mr-2" color="blue-grey" label size="small" variant="tonal">
                            {{ product.expense_natures.id }}
                          </UiChip>
                          <span class="text-body-1">{{ product.expense_natures.name }}</span>
                        </div>
                        <span v-else class="text-medium-emphasis">Não informada</span>
                      </div>
                    </div>

                    <UiDivider />

                    <div>
                      <div class="text-caption text-medium-emphasis mb-2">
                        Histórico de Registro
                      </div>
                      <UiRow dense>
                        <UiCol cols="12">
                          <div class="text-caption text-medium-emphasis">Criado em</div>
                          <div class="text-body-2">
                            {{ new Date(product.created_at).toLocaleString('pt-BR') }}
                          </div>
                        </UiCol>
                        <UiCol cols="12">
                          <div class="text-caption text-medium-emphasis">Última atualização</div>
                          <div class="text-body-2">
                            {{ new Date(product.updated_at).toLocaleString('pt-BR') }}
                          </div>
                        </UiCol>
                        <UiCol v-if="product.created_by" cols="12">
                          <div class="text-caption text-medium-emphasis">Criado por</div>
                          <div class="text-body-2">
                            {{ product.profiles?.name || product.created_by }}
                          </div>
                        </UiCol>
                      </UiRow>
                    </div>
                  </div>
                </div>
              </UiCard>
            </UiCol>

            <!-- Lado Direito: Apresentações (Unidades de Medida) -->
            <UiCol cols="12" md="7">
              <UiCard class="h-100">
                <div class="pa-5">
                  <div class="d-flex align-center justify-space-between mb-4">
                    <div class="d-flex align-center">
                      <UiIcon class="mr-2" color="primary" name="categories" />
                      <div class="text-subtitle-1 font-weight-bold">Apresentações (Unidades)</div>
                    </div>
                    <UiButton
                      v-if="!isAddingUnit"
                      color="primary"
                      prepend-icon="add"
                      size="small"
                      variant="tonal"
                      @click="isAddingUnit = true"
                    >
                      Vincular Nova
                    </UiButton>
                  </div>

                  <div class="text-body-2 text-medium-emphasis mb-4">
                    Gerencie as unidades de medida (apresentações) disponíveis para este produto nas
                    demandas.
                  </div>

                  <!-- Formulário de Adição de Unidade -->
                  <UiSlideYTransition>
                    <div v-if="isAddingUnit" class="mb-5 pa-4 rounded-lg bg-surface-variant">
                      <div class="text-subtitle-2 font-weight-bold mb-1">Vincular Nova Unidade</div>
                      <div class="text-caption text-medium-emphasis mb-4">
                        Selecione uma unidade existente na lista ou digite um novo nome para
                        cadastrar.
                      </div>

                      <!-- bg-color="surface" para garantir fundo claro sobre o fundo cinza -->
                      <UiCombobox
                        v-model="addUnitSearch"
                        bg-color="surface"
                        density="comfortable"
                        hide-details
                        item-title="displayName"
                        item-value="name"
                        :items="computedMeasurementUnits"
                        label="Buscar ou criar unidade (ex: Bisnaga 90g)"
                        :return-object="false"
                        rounded="lg"
                        variant="outlined"
                      />
                      <UiAlert v-if="addUnitError" class="mt-3" density="compact" type="error">
                        {{ addUnitError }}
                      </UiAlert>
                      <div class="d-flex justify-end mt-4 gap-2">
                        <UiButton variant="text" @click="cancelAddUnit">Cancelar</UiButton>
                        <UiButton color="primary" :loading="adding" variant="flat" @click="addUnit">
                          Adicionar Unidade
                        </UiButton>
                      </div>
                    </div>
                  </UiSlideYTransition>

                  <UiDivider class="mb-4" />

                  <!-- Lista de Unidades Vinculadas -->
                  <div
                    v-if="product.units && product.units.length > 0"
                    class="d-flex flex-wrap gap-2"
                  >
                    <UiChip
                      v-for="unit in product.units"
                      :key="unit.id"
                      closable
                      :color="unit.is_pending ? 'warning' : 'primary'"
                      size="large"
                      :variant="unit.is_pending ? 'tonal' : 'tonal'"
                      @click:close="removeUnit(unit.id)"
                    >
                      {{ unit.name }}
                      <span v-if="unit.is_pending" class="ml-1 text-caption">(Pendente)</span>
                    </UiChip>
                  </div>

                  <div v-else class="text-center pa-6 rounded-lg bg-surface-variant border-dashed">
                    <UiIcon class="mb-2" color="grey" name="alert" size="32" />
                    <div class="text-body-1 font-weight-medium text-medium-emphasis">
                      Nenhuma apresentação vinculada
                    </div>
                    <div class="text-caption text-medium-emphasis">
                      Vincule apresentações para utilizar este produto em demandas.
                    </div>
                  </div>
                </div>
              </UiCard>
            </UiCol>
          </UiRow>
        </UiCol>
      </UiRow>
    </div>

    <div v-else>
      <UiAlert type="error" variant="tonal">Produto não encontrado.</UiAlert>
    </div>
  </div>
</template>
