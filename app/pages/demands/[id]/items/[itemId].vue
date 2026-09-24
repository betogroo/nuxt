<script setup lang="ts">
  import type { Database } from '~/types/database.types'

  const route = useRoute()
  const router = useRouter()
  const supabase = useSupabaseClient<Database>()
  const user = useSupabaseUser()
  const { logAction } = useLogger()

  const demandId = route.params.id as string
  const itemId = route.params.itemId as string

  // Fetch Demand Product (Item) Details
  const {
    data: item,
    pending,
    error,
    refresh,
  } = useAsyncData(`demand-item-${itemId}`, async () => {
    const { data, error: err } = await supabase
      .from('demand_products')
      .select('*, product:products(*), measurement_units(*), demand:demands(status)')
      .eq('id', itemId)
      .single()

    if (err) throw err
    return data
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
    const { data: unitsData } = await supabase.from('measurement_units').select('*').order('name')

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

      const rawVal = editForm.value.unitSearch
      const searchStr =
        typeof rawVal === 'string' ? rawVal.trim() : (rawVal as { name?: string })?.name?.trim()

      if (!searchStr) throw new Error('A unidade de medida é obrigatória.')

      let finalUnitId = ''

      const existingUnit = availableUnits.value?.find(
        (u) => u.name.toLowerCase() === searchStr.toLowerCase() || u.id === searchStr,
      )

      if (existingUnit) {
        finalUnitId = existingUnit.id
      } else {
        const { data: newUnit, error: insertError } = await supabase
          .from('measurement_units')
          .insert({ name: searchStr, is_active: false, is_pending: true })
          .select()
          .single()

        if (insertError) throw insertError
        finalUnitId = newUnit.id
      }

      const { data: existingLink } = await supabase
        .from('product_units')
        .select('id')
        .eq('product_id', item.value!.product_id)
        .eq('unit_id', finalUnitId)
        .maybeSingle()

      if (!existingLink && item.value?.product_id) {
        await supabase
          .from('product_units')
          .insert({ product_id: item.value.product_id, unit_id: finalUnitId })
      }

      const { error: updateErr } = await supabase
        .from('demand_products')
        .update({
          quantity: editForm.value.quantity,
          unit_id: finalUnitId,
          reference_price: editForm.value.reference_price,
          bid_interval: editForm.value.bid_interval,
          bid_interval_type: editForm.value.bid_interval_type,
        })
        .eq('id', itemId)

      if (updateErr) {
        if (updateErr.code === '23505')
          throw new Error('Já existe esse produto com essa mesma unidade nesta demanda.')
        throw updateErr
      }

      await logAction(
        'UPDATE_DEMAND_ITEM',
        `Usuário editou o item ${itemId} da demanda ${demandId}`,
        user.value?.id,
      )
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
              <v-chip class="ml-2" color="secondary" size="small" variant="flat">
                {{ item.unit_name_snapshot || item.measurement_units?.name || 'Unidade' }}
              </v-chip>
            </div>
            <v-spacer />
            <div class="d-flex align-center">
              <v-chip class="mr-2" color="info" variant="outlined">Qtd: {{ item.quantity }}</v-chip>
              <UiButton
                v-if="item?.demand?.status === 'planning' || item?.demand?.status === 'quotation'"
                color="primary"
                icon="mdi-pencil"
                size="small"
                @click="openEditModal"
              />
            </div>
          </template>

          <v-alert class="mb-4" density="compact" type="info" variant="tonal">
            Esta é a tela exclusiva deste produto dentro da demanda. Futuramente, lances e
            documentos enviados pelos fornecedores aparecerão aqui.
          </v-alert>

          <!-- Futuro Card de Lances -->
          <UiCard class="mb-4" title="Lances Recebidos" variant="outlined">
            <div class="text-body-2 text-grey pa-4 text-center">
              Nenhum lance registrado para este item ainda. (Em desenvolvimento)
            </div>
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
    <v-dialog v-model="isEditing" max-width="500px">
      <UiCard title="Editar Item da Demanda" transparent-header>
        <v-alert v-if="editError" class="mb-4" density="compact" type="error" variant="tonal">
          {{ editError }}
        </v-alert>

        <UiInput v-model="editForm.quantity" label="Quantidade" type="number" />

        <UiInput
          v-model.number="editForm.reference_price"
          label="Valor Referencial (R$)"
          step="0.0001"
          type="number"
        />

        <div class="d-flex align-center mt-2 mb-4">
          <v-select
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

        <v-combobox
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
      </UiCard>
    </v-dialog>
  </v-container>
</template>
