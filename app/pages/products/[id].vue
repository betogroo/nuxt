<script setup lang="ts">
  import type { Database } from '~/types/database.types'

  const route = useRoute()
  const router = useRouter()
  const supabase = useSupabaseClient<Database>()
  const productId = route.params.id as string

  const {
    data: product,
    pending,
    refresh,
  } = useAsyncData(`product-${productId}`, async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*, product_categories(id, name)')
      .eq('id', productId)
      .single()

    if (error) {
      console.error(error)
      return null
    }

    // Fetch units
    const { data: unitsData } = await supabase
      .from('product_units')
      .select('id, measurement_units(*)')
      .eq('product_id', productId)

    return {
      ...data,
      units: unitsData?.map((u) => u.measurement_units) || [],
    }
  })

  const { data: allMeasurementUnits } = useAsyncData('measurement-units', async () => {
    const { data } = await supabase
      .from('measurement_units')
      .select('*')
      .eq('is_active', true)
      .order('name')
    return data || []
  })

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
      let unitId = ''

      // Check if it's already an existing unit in the list (selected from autocomplete)
      const existing = allMeasurementUnits.value?.find(
        (u) => u.name.toLowerCase() === searchStr.toLowerCase() || u.id === searchStr,
      )

      if (existing) {
        unitId = existing.id
      } else {
        // Create new (suggested)
        const { data: newUnit, error: insertError } = await supabase
          .from('measurement_units')
          .insert({ name: searchStr, is_active: false, is_pending: true })
          .select()
          .single()

        if (insertError) throw insertError
        unitId = newUnit.id
      }

      // Link to product
      const { error: linkError } = await supabase
        .from('product_units')
        .insert({ product_id: productId, unit_id: unitId })

      if (linkError) {
        if (linkError.code === '23505')
          throw new Error('Esta unidade já está vinculada ao produto.')
        throw linkError
      }

      refresh() // reload product with units
      // Refresh the units list as well so the newly created one appears in the dropdown
      const { data: refreshedUnits } = await supabase
        .from('measurement_units')
        .select('*')
        .eq('is_active', true)
        .order('name')
      allMeasurementUnits.value = refreshedUnits || []

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
    const { error } = await supabase
      .from('product_units')
      .delete()
      .eq('product_id', productId)
      .eq('unit_id', unitId)

    if (!error) {
      refresh()
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
              <v-chip :color="product.is_active ? 'success' : 'error'" variant="elevated">
                {{ product.is_active ? 'ATIVO' : 'INATIVO' }}
              </v-chip>
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
                  <v-alert
                    v-if="addUnitError"
                    class="mt-2 text-caption"
                    density="compact"
                    type="error"
                  >
                    {{ addUnitError }}
                  </v-alert>
                  <div class="d-flex justify-end mt-2">
                    <UiButton variant="text" @click="cancelAddUnit">Cancelar</UiButton>
                    <UiButton class="ml-2" color="primary" :loading="adding" @click="addUnit"
                      >Adicionar</UiButton
                    >
                  </div>
                </div>
              </v-slide-y-transition>

              <div class="d-flex flex-wrap gap-2">
                <v-chip
                  v-for="unit in product.units"
                  :key="unit.id"
                  closable
                  :color="unit.is_pending ? 'warning' : 'primary'"
                  :variant="unit.is_pending ? 'flat' : 'tonal'"
                  @click:close="removeUnit(unit.id)"
                >
                  {{ unit.name }} {{ unit.is_pending ? '(Pendente)' : '' }}
                </v-chip>
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
        <v-alert type="error" variant="tonal"> Produto não encontrado. </v-alert>
      </v-col>
    </v-row>
  </v-container>
</template>
