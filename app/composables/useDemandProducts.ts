import type { Database } from '~/types/database.types'

export type DemandProductRow = Database['public']['Tables']['demand_products']['Row'] & {
  product?: { id: string; name: string } | null
  measurement_units?: Database['public']['Tables']['measurement_units']['Row'] | null
  measurement_unit_aliases?: Database['public']['Tables']['measurement_unit_aliases']['Row'] | null
  demand_product_bids?: (Database['public']['Tables']['demand_product_bids']['Row'] & {
    suppliers?: Database['public']['Tables']['suppliers']['Row'] | null
  })[]
}

export const useDemandProducts = () => {
  const supabase = useSupabaseClient<Database>()
  const user = useSupabaseUser()
  const { logAction } = useLogger()

  const fetchDemandProducts = async (demandId: string) => {
    const { data, error } = await supabase
      .from('demand_products')
      .select(
        '*, product:products(*, expense_natures(id, name)), measurement_units(*), measurement_unit_aliases(*), demand_product_bids(*, suppliers(*))',
      )
      .eq('demand_id', demandId)
      .order('sort_order', { ascending: true })
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
    newProductExpenseNatureId?: string | null
    isSuggestingNature?: boolean
    suggestedNatureId?: string
    suggestedNatureName?: string
    newProductClassId?: string | null
    isSuggestingClass?: boolean
    suggestedClassId?: string
    suggestedClassName?: string
    newProductCatMat?: number | null
    newProductCatBec?: number | null
    selectedProductId?: string | null
    finalUnitId: string
    selectedAliasId?: string | null
    isSuggestingAlias?: boolean
    suggestedAliasCode?: number | null
    suggestedAliasName?: string | null
    itemQuantity: number
    itemReferencePrice: number
  }) => {
    let finalProductId = params.selectedProductId || ''
    const finalUnitId = params.finalUnitId

    if (params.isNewProductMode) {
      let expenseNatureId = params.newProductExpenseNatureId
      let productClassId = params.newProductClassId || null

      if (params.isSuggestingNature) {
        if (!params.suggestedNatureId || !params.suggestedNatureName) {
          throw new Error('Código e Nome da nova natureza são obrigatórios.')
        }

        // Register pending nature if it doesn't exist
        const { data: existing } = await supabase
          .from('expense_natures')
          .select('id')
          .eq('id', params.suggestedNatureId)
          .maybeSingle()

        if (!existing) {
          const { error: insErr } = await supabase.from('expense_natures').insert({
            id: params.suggestedNatureId,
            name: params.suggestedNatureName,
            is_pending: true,
            is_active: false,
          })
          if (insErr) throw insErr
          await logAction(
            'CREATE_PENDING_EXPENSE_NATURE',
            `Sugerida via Demanda: ${params.suggestedNatureName}`,
            user.value?.id,
          )
        }
        expenseNatureId = params.suggestedNatureId
      }

      if (params.isSuggestingClass) {
        if (!params.suggestedClassId || !params.suggestedClassName) {
          throw new Error('Código e Nome da nova classe são obrigatórios.')
        }

        // Register pending product class if it doesn't exist
        const { data: existingClass } = await supabase
          .from('product_classes')
          .select('id')
          .eq('id', params.suggestedClassId)
          .maybeSingle()

        if (!existingClass) {
          const { error: insClassErr } = await supabase.from('product_classes').insert({
            id: params.suggestedClassId,
            name: params.suggestedClassName,
            is_pending: true,
            is_active: false,
          })
          if (insClassErr) throw insClassErr
          await logAction(
            'CREATE_PENDING_PRODUCT_CLASS',
            `Sugerida via Demanda: ${params.suggestedClassName}`,
            user.value?.id,
          )
        }
        productClassId = params.suggestedClassId
      }

      if (!params.newProductName || !expenseNatureId) {
        throw new Error('Nome e Natureza de Despesa são obrigatórios para novo produto.')
      }

      const { data: newProd, error: prodError } = await supabase
        .from('products')
        .insert({
          name: params.newProductName,
          expense_nature_id: expenseNatureId,
          product_class_id: productClassId,
          cat_mat: params.newProductCatMat || null,
          cat_bec: params.newProductCatBec || null,
        })
        .select()
        .single()

      if (prodError) {
        if (prodError.code === '23505') {
          const detail = `${prodError.message || ''} ${prodError.details || ''}`
          if (detail.includes('cat_mat')) {
            throw new Error('Já existe um produto cadastrado com este código CATMAT.')
          }
          if (detail.includes('cat_bec')) {
            throw new Error('Já existe um produto cadastrado com este código CATBEC.')
          }
          throw new Error('Já existe um produto cadastrado com este código identificador.')
        }
        throw prodError
      }
      await logAction(
        'CREATE_PRODUCT',
        `Novo produto criado via demanda: ${newProd.name}`,
        user.value?.id,
      )
      finalProductId = newProd.id
    }

    if (!finalUnitId) throw new Error('Unidade de medida inválida.')

    // 2. Resolve alternative record (alias)
    let finalAliasId: string | null = null

    if (params.isSuggestingAlias) {
      if (!params.suggestedAliasCode || !params.suggestedAliasName?.trim()) {
        throw new Error('Código e Nome do registro alternativo (alias) são obrigatórios.')
      }

      const { data: existingAlias } = await supabase
        .from('measurement_unit_aliases')
        .select('id, name')
        .eq('code', params.suggestedAliasCode)
        .maybeSingle()

      if (existingAlias) {
        finalAliasId = existingAlias.id
      } else {
        const { data: newAlias, error: aliasErr } = await supabase
          .from('measurement_unit_aliases')
          .insert({
            code: params.suggestedAliasCode,
            name: params.suggestedAliasName.trim(),
            is_pending: true,
          })
          .select('id')
          .single()

        if (aliasErr) throw aliasErr
        finalAliasId = newAlias.id
        await logAction(
          'CREATE_PENDING_ALIAS',
          `Registro alternativo sugerido via Demanda: ${params.suggestedAliasName} (${params.suggestedAliasCode})`,
          user.value?.id,
        )
      }

      if (finalAliasId && finalUnitId) {
        const { data: existingLink } = await supabase
          .from('measurement_unit_alias_links')
          .select('id')
          .eq('unit_id', finalUnitId)
          .eq('alias_id', finalAliasId)
          .maybeSingle()

        if (!existingLink) {
          const { error: linkErr } = await supabase.from('measurement_unit_alias_links').insert({
            unit_id: finalUnitId,
            alias_id: finalAliasId,
          })
          if (linkErr && linkErr.code !== '23505') throw linkErr
        }
      }
    } else if (params.selectedAliasId) {
      finalAliasId = params.selectedAliasId

      if (finalAliasId && finalUnitId) {
        const { data: existingLink } = await supabase
          .from('measurement_unit_alias_links')
          .select('id')
          .eq('unit_id', finalUnitId)
          .eq('alias_id', finalAliasId)
          .maybeSingle()

        if (!existingLink) {
          const { error: linkErr } = await supabase.from('measurement_unit_alias_links').insert({
            unit_id: finalUnitId,
            alias_id: finalAliasId,
          })
          if (linkErr && linkErr.code !== '23505') throw linkErr
        }
      }
    }

    // 3. Ensure standard 'Unidade' is linked to product
    const { data: defaultUnit } = await supabase
      .from('measurement_units')
      .select('id')
      .ilike('name', 'unidade')
      .maybeSingle()

    if (defaultUnit) {
      const { data: existingDefaultLink } = await supabase
        .from('product_units')
        .select('id')
        .eq('product_id', finalProductId)
        .eq('unit_id', defaultUnit.id)
        .maybeSingle()

      if (!existingDefaultLink) {
        const { error: defLinkErr } = await supabase
          .from('product_units')
          .insert({ product_id: finalProductId, unit_id: defaultUnit.id })
        if (defLinkErr && defLinkErr.code !== '23505') throw defLinkErr
      }
    }

    // Ensure finalUnitId is linked to product (if different from default Unidade)
    if (finalUnitId && (!defaultUnit || finalUnitId !== defaultUnit.id)) {
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
        alias_id: finalAliasId,
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
      .select(
        '*, product:products(*), measurement_units(*), measurement_unit_aliases(*), demand:demands(status)',
      )
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
    finalUnitId: string
    finalAliasId?: string | null
  }) => {
    const finalUnitId = params.finalUnitId
    if (!finalUnitId) throw new Error('Unidade de medida inválida.')

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

    // Link alias to unit if alias is provided
    if (params.finalAliasId && finalUnitId) {
      const { data: existingLink } = await supabase
        .from('measurement_unit_alias_links')
        .select('id')
        .eq('unit_id', finalUnitId)
        .eq('alias_id', params.finalAliasId)
        .maybeSingle()

      if (!existingLink) {
        const { error: linkErr } = await supabase.from('measurement_unit_alias_links').insert({
          unit_id: finalUnitId,
          alias_id: params.finalAliasId,
        })
        if (linkErr && linkErr.code !== '23505') throw linkErr
      }
    }

    // Update the demand_product record
    const updatePayload: Database['public']['Tables']['demand_products']['Update'] = {
      quantity: params.quantity,
      unit_id: finalUnitId,
      alias_id: params.finalAliasId !== undefined ? params.finalAliasId : undefined,
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

  const reorderDemandItems = async (updates: { id: string; sort_order: number }[]) => {
    // Supabase JS doesn't support bulk updates directly with a single call returning data nicely,
    // but we can do it via a loop since we don't have an RPC function right now,
    // or use Promise.all
    const promises = updates.map((update) =>
      supabase
        .from('demand_products')
        .update({ sort_order: update.sort_order })
        .eq('id', update.id),
    )
    const results = await Promise.all(promises)
    const errors = results.filter((r) => r.error).map((r) => r.error)
    if (errors.length > 0) throw new Error('Erro ao reordenar os itens')
  }
  return {
    reorderDemandItems,
    fetchDemandProducts,
    fetchDemandItemDetails,
    addDemandProduct,
    addDemandItemWithDependencies,
    updateDemandProduct,
    updateDemandItemWithDependencies,
    removeDemandProduct,
  }
}
