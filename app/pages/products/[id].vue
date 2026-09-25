<script setup lang="ts">
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
  <v-container>
    <UiButton class="mb-4" prepend-icon="mdi-arrow-left" variant="text" @click="router.back()">
      Voltar
    </UiButton>

    <v-row v-if="pending">
      <v-col class="text-center" cols="12">
        <v-progress-circular color="primary" indeterminate></v-progress-circular>
      </v-col>
    </v-row>

    <v-row v-else-if="product">
      <v-col cols="12" md="8" offset-md="2">
        <UiCard transparent-header>
          <template #header>
            <div class="d-flex align-center w-100 bg-primary text-white pa-4" style="margin: -16px">
              <v-icon class="mr-3" size="large">mdi-package-variant</v-icon>
              {{ product.name }}
              <v-spacer />
              <UiChip :color="product.is_active ? 'success' : 'error'" variant="elevated">
                {{ product.is_active ? 'ATIVO' : 'INATIVO' }}
              </UiChip>
            </div>
          </template>

          <v-row class="mt-4">
            <v-col cols="12" sm="6">
              <div class="text-caption text-grey mb-1">ID do Produto</div>
              <div class="text-body-1 font-weight-mono">{{ product.id }}</div>
            </v-col>
            <v-col cols="12" sm="6">
              <div class="text-caption text-grey mb-1">Categoria de Material</div>
              <div class="text-body-1">{{ product.product_categories?.name || '-' }}</div>
            </v-col>

            <!-- Apresentações do Produto -->
            <v-col cols="12">
              <v-divider class="mb-4" />
              <div class="d-flex align-center justify-space-between mb-2">
                <div class="text-subtitle-1 font-weight-bold">
                  Apresentações (Unidades de Medida)
                </div>
                <UiButton
                  v-if="!isAddingUnit"
                  color="primary"
                  prepend-icon="mdi-plus"
                  size="small"
                  variant="text"
                  @click="isAddingUnit = true"
                >
                  Vincular Nova
                </UiButton>
              </div>

              <v-slide-y-transition>
                <div v-if="isAddingUnit" class="mb-4 bg-grey-lighten-4 pa-4 rounded">
                  <div class="text-caption mb-2">
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
                    variant="outlined"
                  />
                  <UiAlert
                    v-if="addUnitError"
                    class="mt-2 text-caption"
                    density="compact"
                    type="error"
                  >
                    {{ addUnitError }}
                  </UiAlert>
                  <div class="d-flex justify-end mt-2">
                    <UiButton variant="text" @click="cancelAddUnit">Cancelar</UiButton>
                    <UiButton class="ml-2" color="primary" :loading="adding" @click="addUnit"
                      >Adicionar</UiButton
                    >
                  </div>
                </div>
              </v-slide-y-transition>

              <div class="d-flex flex-wrap gap-2">
                <UiChip
                  v-for="unit in product.units"
                  :key="unit.id"
                  closable
                  :color="unit.is_pending ? 'warning' : 'primary'"
                  :variant="unit.is_pending ? 'flat' : 'tonal'"
                  @click:close="removeUnit(unit.id)"
                >
                  {{ unit.name }} {{ unit.is_pending ? '(Pendente)' : '' }}
                </UiChip>
                <span
                  v-if="!product.units || product.units.length === 0"
                  class="text-grey text-caption"
                  >Nenhuma apresentação vinculada.</span
                >
              </div>
            </v-col>

            <v-col cols="12"><v-divider class="mt-2 mb-2" /></v-col>

            <v-col cols="12" sm="6">
              <div class="text-caption text-grey mb-1">Criado em</div>
              <div class="text-body-1">{{ new Date(product.created_at).toLocaleString() }}</div>
            </v-col>
            <v-col cols="12" sm="6">
              <div class="text-caption text-grey mb-1">Última atualização</div>
              <div class="text-body-1">{{ new Date(product.updated_at).toLocaleString() }}</div>
            </v-col>

            <v-col v-if="product.created_by" cols="12">
              <div class="text-caption text-grey mb-1">Criado por (ID)</div>
              <div class="text-body-1">
                {{ product.created_by }}
              </div>
            </v-col>
          </v-row>
        </UiCard>
      </v-col>
    </v-row>

    <v-row v-else>
      <v-col cols="12">
        <UiAlert type="error" variant="tonal"> Produto não encontrado. </UiAlert>
      </v-col>
    </v-row>
  </v-container>
</template>
