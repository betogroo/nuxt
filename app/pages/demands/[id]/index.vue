<script setup lang="ts">
  import type { Database } from '~/types/database.types'

  const route = useRoute()
  const router = useRouter()
  const supabase = useSupabaseClient<Database>()
  const user = useSupabaseUser()
  const { profile } = useProfile()
  const { logAction } = useLogger()

  const demandId = route.params.id as string

  // Fetch Demand Details
  const { data: demand } = useAsyncData(`demand-${demandId}`, async () => {
    const { data, error } = await supabase.from('demands').select('*').eq('id', demandId).single()

    if (error) {
      console.error('Demand error:', error)
      return null
    }
    return data
  })

  useHead({
    title: computed(() => (demand.value ? `Demanda: ${demand.value.name}` : 'Detalhes da Demanda')),
  })

  // Fetch Demand Responsibles
  const { data: responsibles, refresh: refreshResponsibles } = useAsyncData(
    `demand-responsibles-${demandId}`,
    async () => {
      const { data, error } = await supabase
        .from('demand_responsibles')
        .select('*, profiles(name)')
        .eq('demand_id', demandId)

      if (error) {
        console.error('Responsibles error:', error)
        return []
      }
      return data
    },
  )

  // Fetch Demand Products

  const {
    data: items,
    pending: itemsPending,
    refresh: refreshItems,
  } = useAsyncData(`demand-items-${demandId}`, async () => {
    const { data, error } = await supabase
      .from('demand_products')
      .select('*, product:products(*, product_categories(id, name)), measurement_units(*)')
      .eq('demand_id', demandId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Demand items error:', error)
      return []
    }
    return data
  })

  // Fetch all active products for the autocomplete
  const { data: allProducts, refresh: refreshProducts } = useAsyncData(
    'all-active-products',
    async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, product_categories(id, name), product_units(unit_id, measurement_units(*))')
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (error) {
        console.error('Products error:', error)
        return []
      }
      return data
    },
  )

  const { data: categories } = useAsyncData('active-categories', async () => {
    const { data, error } = await supabase
      .from('product_categories')
      .select('id, name')
      .eq('is_active', true)
      .order('name')
    if (error) return []
    return data
  })

  // Fetch all pending suggestions to show in autocomplete
  const { data: pendingSuggestions, refresh: refreshPendingSuggestions } = useAsyncData(
    'pending-suggestions',
    async () => {
      const { data, error } = await supabase
        .from('products')
        .select('suggested_category')
        .not('suggested_category', 'is', null)

      if (error) return []

      const unique = [...new Set(data.map((p) => p.suggested_category as string))]
      return unique.sort()
    },
  )

  // Modal State
  const isModalOpen = ref(false)
  const isSaving = ref(false)
  const saveError = ref('')

  const isNewProductMode = ref(false)

  // Form states
  const selectedProductId = ref<string | null>(null)
  const selectedUnitSearch = ref<string>('')
  const itemQuantity = ref<number>(1)
  const itemReferencePrice = ref<number | null>(null)
  const searchProductText = ref('')

  // Advance Status Modal State
  const isStatusModalOpen = ref(false)
  const isAdvancing = ref(false)
  const advanceError = ref('')
  const targetStatus = ref<Database['public']['Enums']['demand_status'] | ''>('')

  // Dynamic fields for advance
  const advancePayload = ref({
    bidding_notice_number: '',
    dispute_number: '',
    dispute_date: '',
    offer_opening_date: '',
    offer_opening_time: '',
    contract_number: '',
  })

  // Add Responsible Modal State
  const isResponsibleModalOpen = ref(false)
  const responsibleUserId = ref<string | null>(null)
  const isAddingResponsible = ref(false)
  const responsibleError = ref('')

  const { data: allProfiles } = useAsyncData('all-profiles', async () => {
    const { data } = await supabase.from('profiles').select('id, name').order('name')
    return data || []
  })

  const selectedProductObj = computed(() => {
    return allProducts.value?.find((p) => p.id === selectedProductId.value)
  })

  const availableUnitsForSelectedProduct = computed(() => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
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
  const { data: allMeasurementUnits } = useAsyncData('all-measurement-units', async () => {
    const { data } = await supabase.from('measurement_units').select('*')
    return data || []
  })

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
      let finalProductId = selectedProductId.value
      let finalUnitId = ''

      // Parse unit search string
      const rawVal = selectedUnitSearch.value
      const searchStr =
        typeof rawVal === 'string' ? rawVal.trim() : (rawVal as { name?: string })?.name?.trim()

      // Create new product if in new product mode
      if (isNewProductMode.value) {
        if (!newProductName.value || !newProductCategoryId.value) {
          throw new Error('Nome e Categoria são obrigatórios para novo produto.')
        }

        const { data: newProd, error: prodError } = await supabase
          .from('products')
          .insert({
            name: newProductName.value,
            category_id: newProductCategoryId.value,
            suggested_category: isNewProductOutrosCategory.value
              ? typeof newProductSuggestedCategory.value === 'string'
                ? newProductSuggestedCategory.value.trim()
                : newProductSuggestedCategory.value
                  ? String(
                      (newProductSuggestedCategory.value as Record<string, unknown>).name ||
                        (newProductSuggestedCategory.value as Record<string, unknown>).title ||
                        newProductSuggestedCategory.value,
                    ).trim()
                  : null
              : null,
            is_active: true,
          })
          .select()
          .single()

        if (prodError) throw prodError

        await logAction(
          'CREATE_PRODUCT',
          `Novo produto criado via demanda: ${newProd.name}`,
          user.value?.id,
        )

        finalProductId = newProd.id

        // Handle Unit for New Product
        if (!searchStr) {
          // Fallback to 'Unidade' if none provided
          finalUnitId =
            allMeasurementUnits.value?.find(
              (u: { name: string; id: string }) => u.name === 'Unidade',
            )?.id || ''
        } else {
          const existingUnit = allMeasurementUnits.value?.find(
            (u) => u.name.toLowerCase() === searchStr.toLowerCase() || u.id === searchStr,
          )
          if (existingUnit) {
            finalUnitId = existingUnit.id
          } else {
            // Create new unit as pending
            const { data: newUnit, error: insertError } = await supabase
              .from('measurement_units')
              .insert({ name: searchStr, is_active: false, is_pending: true })
              .select()
              .single()

            if (insertError) throw insertError
            finalUnitId = newUnit.id

            // Refresh units list
            const { data: refreshedUnits } = await supabase
              .from('measurement_units')
              .select('*')
              .order('name')
            allMeasurementUnits.value = refreshedUnits || []
          }
        }
        await refreshProducts() // reload product list
      } else {
        if (!searchStr) {
          throw new Error('Selecione ou digite uma apresentação/unidade de medida.')
        }

        // Handle Unit (find or create)
        const existingUnit = allMeasurementUnits.value?.find(
          (u) => u.name.toLowerCase() === searchStr.toLowerCase() || u.id === searchStr,
        )

        if (existingUnit) {
          finalUnitId = existingUnit.id
        } else {
          // Create new unit as pending
          const { data: newUnit, error: insertError } = await supabase
            .from('measurement_units')
            .insert({ name: searchStr, is_active: false, is_pending: true })
            .select()
            .single()

          if (insertError) throw insertError
          finalUnitId = newUnit.id

          // Refresh units list
          const { data: refreshedUnits } = await supabase
            .from('measurement_units')
            .select('*')
            .order('name')
          allMeasurementUnits.value = refreshedUnits || []
        }
      }

      if (!finalProductId) {
        throw new Error('Selecione um produto ou cadastre um novo.')
      }

      if (!finalUnitId) {
        throw new Error('Unidade de medida inválida.')
      }

      if (itemQuantity.value <= 0) {
        throw new Error('A quantidade deve ser maior que zero.')
      }

      // Ensure unit is linked to product
      const { data: existingLink } = await supabase
        .from('product_units')
        .select('id')
        .eq('product_id', finalProductId)
        .eq('unit_id', finalUnitId)
        .maybeSingle()

      if (!existingLink) {
        const { error: linkError } = await supabase
          .from('product_units')
          .insert({ product_id: finalProductId, unit_id: finalUnitId })
        if (linkError && linkError.code !== '23505') throw linkError
        await refreshProducts() // reload product list to reflect new unit
      }

      // Check if product already in demand with this specific unit
      const alreadyExists = items.value?.find(
        (i) => i.product_id === finalProductId && i.unit_id === finalUnitId,
      )

      if (alreadyExists) {
        // Update quantity
        const { error } = await supabase
          .from('demand_products')
          .update({ quantity: Number(alreadyExists.quantity) + Number(itemQuantity.value) })
          .eq('id', alreadyExists.id)

        if (error) throw error

        await logAction(
          'UPDATE_DEMAND_PRODUCT',
          `Atualizada a quantidade do produto na demanda ${demandId}`,
          user.value?.id,
        )
      } else {
        // Insert new association
        const { error } = await supabase.from('demand_products').insert({
          demand_id: demandId,
          product_id: finalProductId,
          unit_id: finalUnitId,
          quantity: itemQuantity.value,
          reference_price: itemReferencePrice.value,
        })

        if (error) throw error

        await logAction(
          'ADD_DEMAND_PRODUCT',
          `Produto adicionado à  demanda ${demandId}`,
          user.value?.id,
        )
      }

      await refreshItems()
      await refreshPendingSuggestions()
      closeModal()
    } catch (err: unknown) {
      saveError.value = err instanceof Error ? err.message : String(err)
    } finally {
      isSaving.value = false
    }
  }

  const removeItem = async (itemId: string, productName: string) => {
    if (!confirm(`Deseja realmente remover o produto ${productName} desta demanda?`)) return

    try {
      const { error } = await supabase.from('demand_products').delete().eq('id', itemId)

      if (error) throw error

      await logAction(
        'REMOVE_DEMAND_PRODUCT',
        `Produto ${productName} removido da demanda ${demandId}`,
        user.value?.id,
      )
      await refreshItems()
    } catch (err: unknown) {
      alert(`Erro ao remover: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const isEditItemModalOpen = ref(false)
  const editItemSaving = ref(false)
  const editItemError = ref('')
  const editItemForm = ref({
    id: '',
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
    product?: { name: string }
    unit_id?: string | null
  }) => {
    editItemForm.value = {
      id: item.id,
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

      let finalUnitId = null
      const selectedUnit = editItemForm.value.unit_id
      const searchStr = editItemForm.value.searchUnitText?.trim()

      if (typeof selectedUnit === 'object' && selectedUnit?.id) {
        finalUnitId = selectedUnit.id
      } else if (typeof selectedUnit === 'string' && selectedUnit.trim() !== '') {
        const str = selectedUnit.trim()
        const existing = allMeasurementUnits.value?.find(
          (u) => u.name.toLowerCase() === str.toLowerCase() || u.id === str,
        )
        if (existing) finalUnitId = existing.id
        else if (!searchStr) {
          finalUnitId = str
        } // fallback to pending insert below
      }

      const strToCreate = searchStr || (typeof selectedUnit === 'string' ? selectedUnit.trim() : '')

      if (!finalUnitId && strToCreate) {
        const existingUnit = allMeasurementUnits.value?.find(
          (u) => u.name.toLowerCase() === strToCreate.toLowerCase(),
        )
        if (existingUnit) {
          finalUnitId = existingUnit.id
        } else {
          // Create pending unit
          const { data: newUnit, error: insertError } = await supabase
            .from('measurement_units')
            .insert({ name: strToCreate, is_active: false, is_pending: true })
            .select()
            .single()

          if (insertError) throw insertError
          finalUnitId = newUnit.id

          // Refresh units list globally
          const { data: refreshedUnits } = await supabase
            .from('measurement_units')
            .select('*')
            .order('name')
          allMeasurementUnits.value = refreshedUnits || []
        }
      }

      if (!finalUnitId) {
        throw new Error('Selecione ou digite uma unidade de medida válida.')
      }

      const { error } = await supabase
        .from('demand_products')
        .update({
          quantity: editItemForm.value.quantity,
          reference_price: editItemForm.value.reference_price,
          unit_id: finalUnitId,
        })
        .eq('id', editItemForm.value.id)

      if (error) throw error

      await logAction(
        'UPDATE_DEMAND_PRODUCT',
        `Valores atualizados para ${editItemForm.value.productName} na demanda ${demandId}`,
        user.value?.id,
      )
      await refreshItems()
      isEditItemModalOpen.value = false
    } catch (err: unknown) {
      editItemError.value = err instanceof Error ? err.message : String(err)
    } finally {
      editItemSaving.value = false
    }
  }

  const formatStatus = (status: string) => {
    const map: Record<string, string> = {
      planning: 'Planejamento',
      quotation: 'Cotação',
      bidding_notice: 'Aviso de Contratação',
      dispute: 'Disputa',
      homologation: 'Homologação',
      completed: 'Concluído',
      cancelled: 'Cancelado',
    }
    return map[status] || status
  }

  const statusList: Database['public']['Enums']['demand_status'][] = [
    'planning',
    'quotation',
    'bidding_notice',
    'dispute',
    'homologation',
    'completed',
  ]
  const getNextStatus = (current: string) => {
    const idx = statusList.indexOf(current as Database['public']['Enums']['demand_status'])
    if (idx >= 0 && idx < statusList.length - 1) {
      return statusList[idx + 1]
    }
    return null
  }

  const getPreviousStatus = (current: string) => {
    const idx = statusList.indexOf(current as Database['public']['Enums']['demand_status'])
    if (idx > 0) {
      return statusList[idx - 1]
    }
    return null
  }

  const isRevertModalOpen = ref(false)
  const isReverting = ref(false)
  const revertError = ref('')
  const isReturnRequesting = ref(false)

  const openRevertModal = () => {
    if (!demand.value) return
    const prev = getPreviousStatus(demand.value.status)
    if (!prev) return
    revertError.value = ''
    isRevertModalOpen.value = true
  }

  const confirmRevertStatus = async () => {
    if (!demand.value) return
    const prev = getPreviousStatus(demand.value.status)
    if (!prev) return

    isReverting.value = true
    revertError.value = ''

    try {
      const { error } = await supabase
        .from('demands')
        .update({
          status: prev as Database['public']['Enums']['demand_status'],
          is_return_requested: false, // Reset request if it existed
        })
        .eq('id', demandId)

      if (error) throw error

      await logAction(
        'REVERT_DEMAND_STATUS',
        `Demanda ${demandId} retornou para ${prev}`,
        user.value?.id,
      )
      isRevertModalOpen.value = false

      const { data, error: reloadErr } = await supabase
        .from('demands')
        .select('*')
        .eq('id', demandId)
        .single()
      if (!reloadErr && data) {
        demand.value = data
      }
    } catch (err: unknown) {
      revertError.value = err instanceof Error ? err.message : String(err)
    } finally {
      isReverting.value = false
    }
  }

  const requestReturn = async () => {
    if (!demand.value) return
    isReturnRequesting.value = true

    try {
      const { error } = await supabase
        .from('demands')
        .update({
          is_return_requested: true,
        })
        .eq('id', demandId)

      if (error) throw error

      await logAction(
        'REQUEST_DEMAND_RETURN',
        `SolicitaÃ§Ã£o de retorno para demanda ${demandId}`,
        user.value?.id,
      )

      const { data, error: reloadErr } = await supabase
        .from('demands')
        .select('*')
        .eq('id', demandId)
        .single()
      if (!reloadErr && data) {
        demand.value = data
      }
    } catch (err: unknown) {
      console.error(err)
    } finally {
      isReturnRequesting.value = false
    }
  }

  const openAdvanceModal = () => {
    if (!demand.value) return
    const next = getNextStatus(demand.value.status)
    if (!next) return
    targetStatus.value = next
    advanceError.value = ''
    isStatusModalOpen.value = true
  }

  const confirmAdvanceStatus = async () => {
    isAdvancing.value = true
    advanceError.value = ''

    try {
      const payload: Partial<Database['public']['Tables']['demands']['Update']> = {
        status: targetStatus.value as Database['public']['Enums']['demand_status'],
      }

      if (targetStatus.value === 'quotation') {
        if (!items.value || items.value.length === 0) {
          throw new Error(
            'Você precisa adicionar pelo menos um produto antes de iniciar a cotação.',
          )
        }
      }

      if (targetStatus.value === 'bidding_notice') {
        const invalidItems = items.value?.filter(
          (i) =>
            !i.quantity ||
            !i.unit_id ||
            i.reference_price === null ||
            i.reference_price === undefined,
        )
        if (invalidItems && invalidItems.length > 0) {
          throw new Error(
            'Todos os produtos devem ter quantidade, unidade de medida e valor referencial preenchidos antes de avançar.',
          )
        }
        if (!advancePayload.value.bidding_notice_number)
          throw new Error('O número do aviso é obrigatório.')
        payload.bidding_notice_number = advancePayload.value.bidding_notice_number
      } else if (targetStatus.value === 'dispute') {
        if (!advancePayload.value.dispute_number)
          throw new Error('O número da disputa é obrigatório.')
        if (!advancePayload.value.dispute_date) throw new Error('A data da disputa é obrigatória.')

        let offerOpening = null
        if (advancePayload.value.offer_opening_date || advancePayload.value.offer_opening_time) {
          if (
            !advancePayload.value.offer_opening_date ||
            !advancePayload.value.offer_opening_time
          ) {
            throw new Error('Para a abertura de ofertas, informe tanto a data quanto a hora.')
          }
          offerOpening = new Date(
            `${advancePayload.value.offer_opening_date}T${advancePayload.value.offer_opening_time}`,
          ).toISOString()
        }

        payload.dispute_number = advancePayload.value.dispute_number
        payload.dispute_date = advancePayload.value.dispute_date
        payload.offer_opening_date = offerOpening
      } else if (targetStatus.value === 'homologation') {
        if (!advancePayload.value.contract_number)
          throw new Error('O número da contratação é obrigatório.')
        payload.contract_number = advancePayload.value.contract_number
      }

      const { error } = await supabase.from('demands').update(payload).eq('id', demandId)
      if (error) throw error

      await logAction(
        'ADVANCE_DEMAND_STATUS',
        `Demanda ${demandId} avançou para ${targetStatus.value}`,
        user.value?.id,
      )
      isStatusModalOpen.value = false
      // reload demand data to trigger reactivity
      const { data, error: reloadErr } = await supabase
        .from('demands')
        .select('*')
        .eq('id', demandId)
        .single()
      if (!reloadErr && data) {
        demand.value = data
      }
    } catch (err: unknown) {
      advanceError.value = err instanceof Error ? err.message : String(err)
    } finally {
      isAdvancing.value = false
    }
  }

  const addResponsible = async () => {
    isAddingResponsible.value = true
    responsibleError.value = ''

    try {
      if (!responsibleUserId.value) throw new Error('Selecione um usuário.')

      const { error } = await supabase
        .from('demand_responsibles')
        .insert({ demand_id: demandId, user_id: responsibleUserId.value })

      if (error) throw error

      await logAction(
        'ADD_DEMAND_RESPONSIBLE',
        `Responsável adicionado à  demanda ${demandId}`,
        user.value?.id,
      )
      responsibleUserId.value = null
      isResponsibleModalOpen.value = false
      await refreshResponsibles()
    } catch (err: unknown) {
      responsibleError.value = err instanceof Error ? err.message : String(err)
    } finally {
      isAddingResponsible.value = false
    }
  }

  const removeResponsible = async (userId: string) => {
    if (!confirm('Deseja realmente remover este responsável?')) return
    try {
      const { error } = await supabase
        .from('demand_responsibles')
        .delete()
        .eq('demand_id', demandId)
        .eq('user_id', userId)
      if (error) throw error
      await refreshResponsibles()
    } catch (err: unknown) {
      alert(`Erro: ${err instanceof Error ? err.message : String(err)}`)
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
          <v-chip color="primary" size="small" variant="flat">{{
            formatStatus(demand.status)
          }}</v-chip>
          <v-spacer />
          <UiButton
            v-if="profile?.role === 'admin' && getPreviousStatus(demand.status)"
            class="mr-2"
            color="warning"
            prepend-icon="mdi-arrow-left-bold"
            @click="openRevertModal"
          >
            Retornar para {{ formatStatus(getPreviousStatus(demand.status) || '') }}
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
          <UiButton
            v-if="getNextStatus(demand.status)"
            color="success"
            prepend-icon="mdi-arrow-right-bold"
            @click="openAdvanceModal"
          >
            Avançar para {{ formatStatus(getNextStatus(demand.status) || '') }}
          </UiButton>
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
              {{ formatStatus(step) }}
            </v-stepper-item>
            <v-divider v-if="i < statusList.length - 1" />
          </template>
        </v-stepper-header>
      </v-stepper>

      <v-row>
        <v-col cols="12" md="8">
          <v-row>
            <v-col cols="12" sm="4">
              <div class="text-caption text-grey">Tipo</div>
              <div class="text-body-1 font-weight-medium">
                {{ demand.type === 'consumption' ? 'Consumo' : 'Permanente' }}
              </div>
            </v-col>
            <v-col cols="12" sm="4">
              <div class="text-caption text-grey">Aviso de Contratação</div>
              <div class="text-body-1 font-weight-medium">
                {{ demand.bidding_notice_number || '-' }}
              </div>
            </v-col>
            <v-col cols="12" sm="4">
              <div class="text-caption text-grey">Data da Disputa</div>
              <div class="text-body-1">
                {{
                  demand.dispute_date
                    ? new Date(demand.dispute_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
                    : '-'
                }}
              </div>
            </v-col>
            <v-col cols="12" sm="4">
              <div class="text-caption text-grey">Nº Disputa</div>
              <div class="text-body-1">
                {{ demand.dispute_number || '-' }}
              </div>
            </v-col>
            <v-col cols="12" sm="4">
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
            <v-col cols="12" sm="4">
              <div class="text-caption text-grey">Nº Contratação</div>
              <div class="text-body-1">
                {{ demand.contract_number || '-' }}
              </div>
            </v-col>
          </v-row>
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
        <UiButton color="primary" prepend-icon="mdi-plus" @click="openAddModal">
          Adicionar Produto
        </UiButton>
      </template>

      <UiTable
        :headers="[
          { text: 'Produto', value: 'product' },
          { text: 'Categoria', value: 'category' },
          { text: 'Quantidade', value: 'quantity', align: 'center' },
          { text: 'Valor Ref.', value: 'reference_price', align: 'right' },
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
            <v-chip
              v-if="item.measurement_units"
              class="ml-2"
              color="secondary"
              size="x-small"
              variant="flat"
            >
              {{ item.unit_name_snapshot || item.measurement_units.name }}
            </v-chip>
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
        <template #item-actions="{ item }">
          <UiButton
            v-if="demand?.status === 'planning' || demand?.status === 'quotation'"
            color="primary"
            size="small"
            title="Editar Item"
            variant="text"
            @click="openEditItemModal(item)"
          >
            <v-icon>mdi-pencil</v-icon>
          </UiButton>
          <UiButton
            v-if="demand?.status === 'planning'"
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
    <v-dialog v-model="isEditItemModalOpen" max-width="500px" persistent>
      <UiCard title="Editar Item da Demanda" transparent-header>
        <v-alert v-if="editItemError" class="mb-4" density="compact" type="error" variant="tonal">
          {{ editItemError }}
        </v-alert>

        <p class="text-body-1 font-weight-bold mb-4">{{ editItemForm.productName }}</p>

        <UiInput v-model.number="editItemForm.quantity" label="Quantidade" min="1" type="number" />

        <v-combobox
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
          <UiButton color="primary" :loading="editItemSaving" @click="saveEditItem"
            >Salvar</UiButton
          >
        </template>
      </UiCard>
    </v-dialog>
    <!-- Modal Adicionar Produto -->
    <v-dialog v-model="isModalOpen" max-width="600px" persistent>
      <UiCard title="Inserir Produto na Demanda" transparent-header>
        <v-alert v-if="saveError" class="mb-4" density="compact" type="error" variant="tonal">
          {{ saveError }}
        </v-alert>

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

          <v-combobox
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
          <v-alert class="mb-4" density="compact" type="info" variant="tonal">
            Você está cadastrando um novo produto. Ele será salvo no sistema e automaticamente
            adicionado à demanda.
          </v-alert>

          <UiInput v-model="newProductName" label="Nome do Produto" />
          <UiSelect
            v-model="newProductCategoryId"
            item-title="name"
            item-value="id"
            :items="categories || []"
            label="Categoria de Material"
          />

          <v-combobox
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

          <v-combobox
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
      </UiCard>
    </v-dialog>

    <!-- Modal Adicionar Responsável -->
    <v-dialog v-model="isResponsibleModalOpen" max-width="400px">
      <UiCard title="Adicionar Responsável" transparent-header>
        <v-alert
          v-if="responsibleError"
          class="mb-4"
          density="compact"
          type="error"
          variant="tonal"
        >
          {{ responsibleError }}
        </v-alert>
        <UiSelect
          v-model="responsibleUserId"
          item-title="name"
          item-value="id"
          :items="allProfiles || []"
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
      </UiCard>
    </v-dialog>

    <!-- Modal Avançar Status -->
    <v-dialog v-model="isStatusModalOpen" max-width="500px">
      <UiCard :title="`Avançar para: ${formatStatus(targetStatus)}`" transparent-header>
        <v-alert v-if="advanceError" class="mb-4" density="compact" type="error" variant="tonal">
          {{ advanceError }}
        </v-alert>

        <div v-if="targetStatus === 'bidding_notice'">
          <UiInput
            v-model="advancePayload.bidding_notice_number"
            label="Número do Aviso de Contratação"
            required
          />
        </div>

        <div v-if="targetStatus === 'dispute'">
          <UiInput v-model="advancePayload.dispute_number" label="Número da Disputa" required />
          <UiInput
            v-model="advancePayload.dispute_date"
            label="Data da Disputa"
            required
            type="date"
          />
          <v-row class="mt-2">
            <v-col class="py-0" cols="12" sm="6">
              <UiInput
                v-model="advancePayload.offer_opening_date"
                label="Data de Abertura"
                type="date"
              />
            </v-col>
            <v-col class="py-0" cols="12" sm="6">
              <UiInput
                v-model="advancePayload.offer_opening_time"
                label="Hora de Abertura"
                type="time"
              />
            </v-col>
          </v-row>
        </div>

        <div v-if="targetStatus === 'homologation'">
          <UiInput
            v-model="advancePayload.contract_number"
            label="Número da Contratação (Contrato/Ata)"
            required
          />
        </div>

        <div v-if="targetStatus === 'completed'">
          <p class="text-body-1">Tem certeza que deseja concluir esta demanda?</p>
        </div>

        <template #actions>
          <UiButton :disabled="isAdvancing" variant="text" @click="isStatusModalOpen = false"
            >Cancelar</UiButton
          >
          <UiButton color="success" :loading="isAdvancing" @click="confirmAdvanceStatus"
            >Confirmar Avanço</UiButton
          >
        </template>
      </UiCard>
    </v-dialog>

    <!-- Modal Retornar Status -->
    <v-dialog v-model="isRevertModalOpen" max-width="500px">
      <UiCard title="Confirmar Retorno de Fase" transparent-header>
        <v-alert v-if="revertError" class="mb-4" density="compact" type="error" variant="tonal">
          {{ revertError }}
        </v-alert>

        <p class="text-body-1">
          Tem certeza que deseja retornar esta demanda para a fase
          <strong>{{ formatStatus(getPreviousStatus(demand?.status || '') || '') }}</strong
          >?
        </p>
        <p class="text-body-2 text-warning mt-2">
          Isto reabrirá a possibilidade de edição dos itens (dependendo da fase) e limpará qualquer
          solicitação de retorno pendente.
        </p>

        <template #actions>
          <UiButton :disabled="isReverting" variant="text" @click="isRevertModalOpen = false"
            >Cancelar</UiButton
          >
          <UiButton color="warning" :loading="isReverting" @click="confirmRevertStatus"
            >Confirmar Retorno</UiButton
          >
        </template>
      </UiCard>
    </v-dialog>
  </v-container>
</template>
