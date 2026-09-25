import type { Database } from '~/types/database.types'

export type DemandProductRow = Database['public']['Tables']['demand_products']['Row'] & {
  products?: { id: string; name: string } | null
}

export const useDemandProducts = () => {
  const supabase = useSupabaseClient<Database>()
  const user = useSupabaseUser()
  const { logAction } = useLogger()

  const fetchDemandProducts = async (demandId: string) => {
    const { data, error } = await supabase
      .from('demand_products')
      .select('*, product:products(*, product_categories(id, name)), measurement_units(*)')
      .eq('demand_id', demandId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error(error)
      throw error
    }

    return data as DemandProductRow[]
  }

  const addDemandProduct = async (
    payload: Database['public']['Tables']['demand_products']['Insert'],
  ) => {
    const { error } = await supabase.from('demand_products').insert(payload)
    if (error) {
      if (error.code === '23505') {
        throw new Error('Este produto já foi adicionado a esta demanda.')
      }
      throw error
    }

    await logAction(
      'ADD_DEMAND_PRODUCT',
      `Produto ${payload.product_id} adicionado à demanda ${payload.demand_id}`,
      user.value?.id,
    )
  }

  // Complex operation that orchestrates Product creation, Unit creation, and linking
  const addDemandItemWithDependencies = async (params: {
    demandId: string
    isNewProductMode: boolean
    newProductName?: string | null
    newProductCategoryId?: string | null
    newProductSuggestedCategory?: string | Record<string, unknown> | null
    isNewProductOutrosCategory?: boolean
    selectedProductId?: string | null
    selectedUnitSearch: string | { name?: string }
    itemQuantity: number
    itemReferencePrice: number
  }) => {
    let finalProductId = params.selectedProductId || ''
    let finalUnitId: string

    // Parse unit search string
    const rawVal = params.selectedUnitSearch
    const searchStr =
      typeof rawVal === 'string' ? rawVal.trim() : (rawVal as { name?: string })?.name?.trim() || ''

    if (params.isNewProductMode) {
      if (!params.newProductName || !params.newProductCategoryId) {
        throw new Error('Nome e Categoria são obrigatórios para novo produto.')
      }

      // 1. Create Product
      const suggestedStr = params.isNewProductOutrosCategory
        ? typeof params.newProductSuggestedCategory === 'string'
          ? params.newProductSuggestedCategory.trim()
          : params.newProductSuggestedCategory
            ? String(
                (params.newProductSuggestedCategory as Record<string, unknown>).name ||
                  (params.newProductSuggestedCategory as Record<string, unknown>).title ||
                  params.newProductSuggestedCategory,
              ).trim()
            : null
        : null

      const { data: newProd, error: prodError } = await supabase
        .from('products')
        .insert({
          name: params.newProductName,
          category_id: params.newProductCategoryId,
          suggested_category: suggestedStr,
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

      // 2. Handle Unit for New Product
      if (!searchStr) {
        const { data: units } = await supabase
          .from('measurement_units')
          .select('id')
          .eq('name', 'Unidade')
          .maybeSingle()
        finalUnitId = units?.id || ''
      } else {
        const { data: existingUnits } = await supabase.from('measurement_units').select('id, name')
        const existingUnit = existingUnits?.find(
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
      }
    } else {
      if (!searchStr) throw new Error('Selecione ou digite uma apresentação/unidade de medida.')

      const { data: existingUnits } = await supabase.from('measurement_units').select('id, name')
      const existingUnit = existingUnits?.find(
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
    }

    // 3. Ensure unit is linked to product
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
    }

    // 4. Check if item already exists in demand
    const { data: existingItems } = await supabase
      .from('demand_products')
      .select('id, quantity')
      .eq('demand_id', params.demandId)
      .eq('product_id', finalProductId)

    const alreadyExists = existingItems?.length ? existingItems[0] : null

    if (alreadyExists) {
      const { error } = await supabase
        .from('demand_products')
        .update({ quantity: Number(alreadyExists.quantity) + Number(params.itemQuantity) })
        .eq('id', alreadyExists.id)
      if (error) throw error
    } else {
      const { error } = await supabase.from('demand_products').insert({
        demand_id: params.demandId,
        product_id: finalProductId,
        unit_id: finalUnitId,
        quantity: params.itemQuantity,
        reference_price: params.itemReferencePrice,
      })
      if (error) throw error
      await logAction(
        'ADD_DEMAND_PRODUCT',
        `Produto adicionado à demanda ${params.demandId}`,
        user.value?.id,
      )
    }
  }

  const fetchDemandItemDetails = async (itemId: string) => {
    const { data, error } = await supabase
      .from('demand_products')
      .select('*, product:products(*), measurement_units(*), demand:demands(status)')
      .eq('id', itemId)
      .single()

    if (error) throw error
    return data
  }

  const updateDemandItemWithDependencies = async (params: {
    itemId: string
    demandId?: string
    productId?: string
    quantity: number
    referencePrice: number | null
    bidInterval?: number | null
    bidIntervalType?: 'percentage' | 'monetary'
    unitSearch: string | { name?: string; id?: string }
  }) => {
    let finalUnitId: string

    // Determine unit search string or object
    let selectedUnitId: string | null = null
    let searchStr = ''

    if (typeof params.unitSearch === 'object' && params.unitSearch?.id) {
      selectedUnitId = params.unitSearch.id
    } else if (typeof params.unitSearch === 'string') {
      searchStr = params.unitSearch.trim()
      // check if it's an uuid
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(searchStr)) {
        selectedUnitId = searchStr
        searchStr = ''
      }
    } else if (typeof params.unitSearch === 'object' && params.unitSearch?.name) {
      searchStr = params.unitSearch.name.trim()
    }

    if (selectedUnitId) {
      finalUnitId = selectedUnitId
    } else if (searchStr) {
      // Look for existing
      const { data: existingUnits } = await supabase.from('measurement_units').select('id, name')
      const existingUnit = existingUnits?.find(
        (u) => u.name.toLowerCase() === searchStr.toLowerCase() || u.id === searchStr,
      )

      if (existingUnit) {
        finalUnitId = existingUnit.id
      } else {
        // Create new pending unit
        const { data: newUnit, error: insertError } = await supabase
          .from('measurement_units')
          .insert({ name: searchStr, is_active: false, is_pending: true })
          .select()
          .single()

        if (insertError) throw insertError
        finalUnitId = newUnit.id
      }
    } else {
      throw new Error('Selecione ou digite uma unidade de medida válida.')
    }

    // Link unit to product if productId is provided
    if (params.productId && finalUnitId) {
      const { data: existingLink } = await supabase
        .from('product_units')
        .select('id')
        .eq('product_id', params.productId)
        .eq('unit_id', finalUnitId)
        .maybeSingle()

      if (!existingLink) {
        await supabase
          .from('product_units')
          .insert({ product_id: params.productId, unit_id: finalUnitId })
      }
    }

    // Update the demand_product record
    const updatePayload: Database['public']['Tables']['demand_products']['Update'] = {
      quantity: params.quantity,
      unit_id: finalUnitId,
      reference_price: params.referencePrice,
    }

    if (params.bidInterval !== undefined) updatePayload.bid_interval = params.bidInterval
    if (params.bidIntervalType !== undefined)
      updatePayload.bid_interval_type = params.bidIntervalType

    const { error: updateErr } = await supabase
      .from('demand_products')
      .update(updatePayload)
      .eq('id', params.itemId)

    if (updateErr) {
      if (updateErr.code === '23505')
        throw new Error('Já existe esse produto com essa mesma unidade nesta demanda.')
      throw updateErr
    }

    await logAction(
      'UPDATE_DEMAND_ITEM',
      `Item ${params.itemId} atualizado na demanda`,
      user.value?.id,
    )
  }

  const updateDemandProduct = async (
    itemId: string,
    payload: Database['public']['Tables']['demand_products']['Update'],
  ) => {
    const { error } = await supabase.from('demand_products').update(payload).eq('id', itemId)
    if (error) throw error

    await logAction('UPDATE_DEMAND_PRODUCT', `Item ${itemId} atualizado na demanda`, user.value?.id)
  }

  const removeDemandProduct = async (itemId: string, demandId: string) => {
    const { error } = await supabase.from('demand_products').delete().eq('id', itemId)
    if (error) throw error

    await logAction(
      'REMOVE_DEMAND_PRODUCT',
      `Item ${itemId} removido da demanda ${demandId}`,
      user.value?.id,
    )
  }

  return {
    fetchDemandProducts,
    fetchDemandItemDetails,
    addDemandProduct,
    addDemandItemWithDependencies,
    updateDemandProduct,
    updateDemandItemWithDependencies,
    removeDemandProduct,
  }
}
