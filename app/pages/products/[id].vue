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
      <v-progress-circular color="primary" indeterminate size="48" width="3" />
    </div>

    <div v-else-if="product">
      <v-row justify="center">
        <v-col cols="12" lg="6" md="8">
          <UiCard>
            <template #header>
              <UiIcon class="mr-2" color="primary" name="product" />
              <span class="text-subtitle-1 font-weight-bold">{{ product.name }}</span>
              <UiSpacer />
              <UiChip
                :color="product.is_active ? 'success' : 'error'"
                label
                size="small"
                variant="tonal"
              >
                {{ product.is_active ? 'Ativo' : 'Inativo' }}
              </UiChip>
            </template>

            <!-- Informações básicas -->
            <div class="d-flex flex-column gap-5">
              <div>
                <div class="text-caption text-uppercase font-weight-bold text-medium-emphasis mb-2">
                  Identificação
                </div>
                <v-row dense>
                  <v-col cols="12">
                    <div class="text-caption text-medium-emphasis">ID do Produto</div>
                    <div class="text-body-2 font-weight-mono">{{ product.id }}</div>
                  </v-col>
                  <v-col cols="12">
                    <div class="text-caption text-medium-emphasis">Natureza de Despesa</div>
                    <div class="text-body-2">
                      <span v-if="product.expense_natures">
                        <UiChip class="mr-2" color="blue-grey" label size="small" variant="tonal">
                          {{ product.expense_natures.id }}
                        </UiChip>
                        {{ product.expense_natures.name }}
                      </span>
                      <span v-else class="text-medium-emphasis">Não informada</span>
                    </div>
                  </v-col>
                </v-row>
              </div>

              <v-divider />

              <!-- Apresentações (Unidades) -->
              <div>
                <div class="d-flex align-center justify-space-between mb-3">
                  <div class="text-caption text-uppercase font-weight-bold text-medium-emphasis">
                    Apresentações (Unidades de Medida)
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

                <v-slide-y-transition>
                  <div v-if="isAddingUnit" class="mb-4 pa-4 rounded-xl bg-surface-variant">
                    <div class="text-caption text-medium-emphasis mb-3">
                      Busque uma unidade existente ou digite para criar uma nova:
                    </div>
                    <v-combobox
                      v-model="addUnitSearch"
                      density="comfortable"
                      hide-details
                      item-title="displayName"
                      item-value="name"
                      :items="computedMeasurementUnits"
                      label="Nome da Unidade (ex: Bisnaga 90g)"
                      :return-object="false"
                      rounded="lg"
                      variant="outlined"
                    />
                    <UiAlert v-if="addUnitError" class="mt-2" density="compact" type="error">
                      {{ addUnitError }}
                    </UiAlert>
                    <div class="d-flex justify-end mt-3 gap-2">
                      <UiButton variant="text" @click="cancelAddUnit">Cancelar</UiButton>
                      <UiButton color="primary" :loading="adding" variant="flat" @click="addUnit">
                        Adicionar
                      </UiButton>
                    </div>
                  </div>
                </v-slide-y-transition>

                <div class="d-flex flex-wrap gap-2">
                  <UiChip
                    v-for="unit in product.units"
                    :key="unit.id"
                    closable
                    :color="unit.is_pending ? 'warning' : 'primary'"
                    :variant="unit.is_pending ? 'tonal' : 'tonal'"
                    @click:close="removeUnit(unit.id)"
                  >
                    {{ unit.name }}
                    <span v-if="unit.is_pending" class="ml-1 text-caption">(Pendente)</span>
                  </UiChip>
                  <span
                    v-if="!product.units || product.units.length === 0"
                    class="text-medium-emphasis text-body-2"
                  >
                    Nenhuma apresentação vinculada.
                  </span>
                </div>
              </div>

              <v-divider />

              <!-- Metadados -->
              <div>
                <div class="text-caption text-uppercase font-weight-bold text-medium-emphasis mb-2">
                  Informações de Registro
                </div>
                <v-row dense>
                  <v-col cols="12" sm="6">
                    <div class="text-caption text-medium-emphasis">Criado em</div>
                    <div class="text-body-2">
                      {{ new Date(product.created_at).toLocaleString('pt-BR') }}
                    </div>
                  </v-col>
                  <v-col cols="12" sm="6">
                    <div class="text-caption text-medium-emphasis">Última atualização</div>
                    <div class="text-body-2">
                      {{ new Date(product.updated_at).toLocaleString('pt-BR') }}
                    </div>
                  </v-col>
                  <v-col v-if="product.created_by" cols="12">
                    <div class="text-caption text-medium-emphasis">Criado por</div>
                    <div class="text-body-2">
                      {{ product.profiles?.name || product.created_by }}
                    </div>
                  </v-col>
                </v-row>
              </div>
            </div>
          </UiCard>
        </v-col>
      </v-row>
    </div>

    <div v-else>
      <UiAlert type="error" variant="tonal">Produto não encontrado.</UiAlert>
    </div>
  </div>
</template>
