import type { Database } from '~/types/database.types'

export type ProductCharacteristicSummary = {
  id: string
  value: string
  key_id: string
  key?: {
    id: string
    name: string
    is_pending: boolean
    is_active: boolean
  } | null
}

export type ProductRow = Database['public']['Tables']['products']['Row'] & {
  expense_natures?: { id: string; name: string } | null
  product_classes?: { id: string; name: string } | null
  product_characteristics?: ProductCharacteristicSummary[]
}

export type ProductCharacteristicDetail = {
  id: string
  key_id: string
  key_name: string
  value: string
  is_pending: boolean
  is_active: boolean
}

export type ProductUnitAlias = { id: string; code: number; name: string }

export type ProductUnitDetail = {
  id: string
  name: string
  is_pending: boolean
  is_active: boolean
  aliases: ProductUnitAlias[]
}

export type ProductDemandUsage = {
  item_id: string
  quantity: number
  unit_name: string | null
  id: string
  name: string
  status: Database['public']['Enums']['demand_status']
  process_number: string | null
  dispute_date: string | null
}

export interface DuplicateProductPayload {
  sourceProductId: string
  name: string
  expense_nature_id: string
  product_class_id?: string | null
  cat_mat?: number | null
  cat_bec?: number | null
  is_active?: boolean
  unitIds?: string[]
  characteristics?: Array<{ key: string; value: string }>
}

export const useProducts = () => {
  const supabase = useSupabaseClient<Database>()
  const user = useSupabaseUser()
  const { logAction } = useLogger()

  const fetchProducts = async (
    currentPage: number,
    itemsPerPage: number,
    expenseNatureId: string | null,
    statusFilter: string | null = 'active',
    searchQuery: string | null = '',
  ) => {
    const from = (currentPage - 1) * itemsPerPage
    const to = from + itemsPerPage - 1

    let query = supabase
      .from('products')
      .select('*, expense_natures(id, name), product_classes(id, name)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)

    if (expenseNatureId) {
      query = query.eq('expense_nature_id', expenseNatureId)
    }

    if (statusFilter === 'active') {
      query = query.eq('is_active', true)
    } else if (statusFilter === 'inactive') {
      query = query.eq('is_active', false)
    }

    if (searchQuery) {
      const term = searchQuery.trim()
      if (term) {
        if (/^\d+$/.test(term)) {
          query = query.or(`name.ilike.%${term}%,cat_mat.eq.${term},cat_bec.eq.${term}`)
        } else {
          query = query.ilike('name', `%${term}%`)
        }
      }
    }

    const { data, count, error } = await query

    if (error) {
      console.error(error)
      throw error
    }

    return { data: (data as ProductRow[]) || [], count: count || 0 }
  }

  const handleProductDbError = (error: { code?: string; message?: string; details?: string }) => {
    if (error.code === '23505') {
      const detail = `${error.message || ''} ${error.details || ''}`
      if (detail.includes('cat_mat')) {
        return new Error('Já existe um produto cadastrado com este código CATMAT.')
      }
      if (detail.includes('cat_bec')) {
        return new Error('Já existe um produto cadastrado com este código CATBEC.')
      }
      return new Error('Já existe um produto cadastrado com este identificador único.')
    }
    return error
  }

  const createProduct = async (payload: Database['public']['Tables']['products']['Insert']) => {
    const { error } = await supabase.from('products').insert(payload)
    if (error) throw handleProductDbError(error)

    await logAction('CREATE_PRODUCT', `Novo produto criado: ${payload.name}`, user.value?.id)
  }

  const updateProduct = async (
    id: string,
    payload: Database['public']['Tables']['products']['Update'],
  ) => {
    const { error } = await supabase.from('products').update(payload).eq('id', id)
    if (error) throw handleProductDbError(error)

    await logAction('UPDATE_PRODUCT', `Produto atualizado: ${payload.name}`, user.value?.id)
  }

  const toggleProductStatus = async (product: ProductRow) => {
    const newStatus = !product.is_active
    const { error } = await supabase
      .from('products')
      .update({ is_active: newStatus })
      .eq('id', product.id)

    if (error) throw error

    await logAction(
      'TOGGLE_PRODUCT_STATUS',
      `Produto ${product.name} alterado para ${newStatus ? 'ATIVO' : 'INATIVO'}`,
      user.value?.id,
    )
  }

  const fetchAllActiveProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select(
        '*, expense_natures(id, name), product_classes(id, name), product_units(unit_id, measurement_units(*))',
      )
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) throw error
    return data
  }

  const fetchProductById = async (id: string) => {
    const { data, error } = await supabase
      .from('products')
      .select('*, expense_natures(id, name), product_classes(id, name)')
      .eq('id', id)
      .single()

    if (error) throw error

    const { data: unitsData } = await supabase
      .from('product_units')
      .select(
        'id, measurement_units(*, measurement_unit_alias_links(alias:measurement_unit_aliases(id, code, name)))',
      )
      .eq('product_id', id)

    const { data: characteristicsData } = await supabase
      .from('product_characteristics')
      .select('id, value, key_id, key:product_characteristic_keys(id, name, is_pending, is_active)')
      .eq('product_id', id)

    let profiles = null
    if (data.created_by) {
      const { data: p } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', data.created_by)
        .single()
      profiles = p
    }

    const rawUnits = (unitsData || []) as unknown as Array<{
      measurement_units:
        | (Omit<ProductUnitDetail, 'aliases'> & {
            measurement_unit_alias_links?: Array<{ alias: ProductUnitAlias | null }>
          })
        | null
    }>

    const units: ProductUnitDetail[] = rawUnits
      .map((u) => u.measurement_units)
      .filter((mu): mu is NonNullable<typeof mu> => !!mu)
      .map(({ measurement_unit_alias_links, ...unit }) => ({
        ...unit,
        aliases: (measurement_unit_alias_links || [])
          .map((link) => link.alias)
          .filter((a): a is ProductUnitAlias => !!a),
      }))

    const rawCharacteristics = (characteristicsData ||
      []) as unknown as ProductCharacteristicSummary[]
    const characteristics: ProductCharacteristicDetail[] = rawCharacteristics
      .filter(
        (
          c,
        ): c is ProductCharacteristicSummary & {
          key: NonNullable<ProductCharacteristicSummary['key']>
        } => !!c.key,
      )
      .map((c) => ({
        id: c.id,
        key_id: c.key_id,
        key_name: c.key.name,
        value: c.value,
        is_pending: c.key.is_pending,
        is_active: c.key.is_active,
      }))
      .sort((a, b) => a.key_name.localeCompare(b.key_name, 'pt-BR'))

    return { ...data, profiles, units, characteristics }
  }

  const fetchProductDemands = async (productId: string): Promise<ProductDemandUsage[]> => {
    const { data, error } = await supabase
      .from('demand_products')
      .select(
        'id, quantity, unit_name_snapshot, demands(id, name, status, process_number, dispute_date)',
      )
      .eq('product_id', productId)

    if (error) throw error

    return (
      (data || []) as unknown as Array<{
        id: string
        quantity: number
        unit_name_snapshot: string | null
        demands: Omit<ProductDemandUsage, 'item_id' | 'quantity' | 'unit_name'> | null
      }>
    )
      .filter((row) => !!row.demands)
      .map((row) => ({
        item_id: row.id,
        quantity: row.quantity,
        unit_name: row.unit_name_snapshot,
        ...(row.demands as Omit<ProductDemandUsage, 'item_id' | 'quantity' | 'unit_name'>),
      }))
  }

  const addProductUnit = async (productId: string, unitName: string) => {
    let unitId: string

    // Procurar por unidade existente
    const { data: existingUnit } = await supabase
      .from('measurement_units')
      .select('id')
      .ilike('name', unitName)
      .single()

    if (existingUnit) {
      unitId = existingUnit.id
    } else {
      // Criar nova como pendente
      const { data: newUnit, error: insertError } = await supabase
        .from('measurement_units')
        .insert({ name: unitName, is_active: false, is_pending: true })
        .select()
        .single()

      if (insertError) throw insertError
      unitId = newUnit.id
    }

    // Vincular ao produto
    const { error: linkError } = await supabase
      .from('product_units')
      .insert({ product_id: productId, unit_id: unitId })

    if (linkError) {
      if (linkError.code === '23505') throw new Error('Esta unidade já está vinculada ao produto.')
      throw linkError
    }
  }

  const removeProductUnit = async (productId: string, unitId: string) => {
    const { error } = await supabase
      .from('product_units')
      .delete()
      .eq('product_id', productId)
      .eq('unit_id', unitId)

    if (error) throw error
  }

  const upsertProductCharacteristic = async (productId: string, keyName: string, value: string) => {
    const cleanKey = keyName.trim()
    const cleanValue = value.trim()

    if (!cleanKey || !cleanValue) {
      throw new Error('A chave e o valor da característica são obrigatórios.')
    }

    let keyId: string

    const { data: existingKey, error: findKeyError } = await supabase
      .from('product_characteristic_keys')
      .select('id, name')
      .ilike('name', cleanKey)
      .maybeSingle()

    if (findKeyError) throw findKeyError

    if (existingKey) {
      keyId = existingKey.id
    } else {
      const { data: newKey, error: insertKeyError } = await supabase
        .from('product_characteristic_keys')
        .insert({
          name: cleanKey,
          is_active: false,
          is_pending: true,
        })
        .select('id, name')
        .single()

      if (insertKeyError) throw insertKeyError
      keyId = newKey.id

      await logAction(
        'CREATE_PENDING_CHARACTERISTIC_KEY',
        `Nova chave de característica sugerida: "${cleanKey}"`,
        user.value?.id,
      )
    }

    const { data: existingChar, error: findCharError } = await supabase
      .from('product_characteristics')
      .select('id')
      .eq('product_id', productId)
      .eq('key_id', keyId)
      .maybeSingle()

    if (findCharError) throw findCharError

    if (existingChar) {
      const { error: updateError } = await supabase
        .from('product_characteristics')
        .update({ value: cleanValue })
        .eq('id', existingChar.id)

      if (updateError) throw updateError

      await logAction(
        'UPDATE_PRODUCT_CHARACTERISTIC',
        `Característica "${cleanKey}" atualizada para "${cleanValue}" no produto (${productId})`,
        user.value?.id,
      )
    } else {
      const { error: insertError } = await supabase.from('product_characteristics').insert({
        product_id: productId,
        key_id: keyId,
        value: cleanValue,
      })

      if (insertError) throw insertError

      await logAction(
        'ADD_PRODUCT_CHARACTERISTIC',
        `Característica "${cleanKey}: ${cleanValue}" adicionada ao produto (${productId})`,
        user.value?.id,
      )
    }
  }

  const batchUpsertProductCharacteristics = async (
    productId: string,
    items: Array<{ key: string; value: string }>,
  ) => {
    if (!items || items.length === 0) {
      throw new Error('Nenhuma característica informada para inserção em lote.')
    }

    const processedKeys: string[] = []

    for (const item of items) {
      await upsertProductCharacteristic(productId, item.key, item.value)
      processedKeys.push(item.key.trim())
    }

    await logAction(
      'BATCH_UPSERT_PRODUCT_CHARACTERISTICS',
      `${processedKeys.length} características inseridas/atualizadas em lote no produto (${productId}): ${processedKeys.join(', ')}`,
      user.value?.id,
    )

    return { count: processedKeys.length }
  }

  const removeProductCharacteristic = async (characteristicId: string, label?: string) => {
    const { error } = await supabase
      .from('product_characteristics')
      .delete()
      .eq('id', characteristicId)

    if (error) throw error

    await logAction(
      'REMOVE_PRODUCT_CHARACTERISTIC',
      `Característica removida do produto: ${label || characteristicId}`,
      user.value?.id,
    )
  }

  const duplicateProduct = async (payload: DuplicateProductPayload): Promise<ProductRow> => {
    const cleanName = payload.name?.trim()
    if (!cleanName) {
      throw new Error('O nome do produto é obrigatório.')
    }

    const cleanNature = payload.expense_nature_id?.trim()
    if (!cleanNature) {
      throw new Error('A natureza de despesa é obrigatória.')
    }

    const insertPayload: Database['public']['Tables']['products']['Insert'] = {
      name: cleanName,
      expense_nature_id: cleanNature,
      product_class_id: payload.product_class_id || null,
      cat_mat: payload.cat_mat ?? null,
      cat_bec: payload.cat_bec ?? null,
      is_active: payload.is_active ?? true,
      created_by: user.value?.id,
    }

    const { data: newProduct, error: insertError } = await supabase
      .from('products')
      .insert(insertPayload)
      .select('*, expense_natures(id, name), product_classes(id, name)')
      .single()

    if (insertError) throw handleProductDbError(insertError)

    // Remover unidade inserida automaticamente pela trigger on_product_created para evitar duplicidade ou manter selecao do usuario
    await supabase.from('product_units').delete().eq('product_id', newProduct.id)

    // Clonar unidades de apresentação selecionadas
    if (payload.unitIds && payload.unitIds.length > 0) {
      const unitsToInsert = payload.unitIds.map((unitId) => ({
        product_id: newProduct.id,
        unit_id: unitId,
      }))
      const { error: unitsError } = await supabase.from('product_units').insert(unitsToInsert)
      if (unitsError) throw unitsError
    }

    // Clonar e inserir características com novos valores
    if (payload.characteristics && payload.characteristics.length > 0) {
      const validChars = payload.characteristics.filter(
        (c) => c.key && c.key.trim() && c.value && c.value.trim(),
      )
      for (const char of validChars) {
        await upsertProductCharacteristic(newProduct.id, char.key, char.value)
      }
    }

    await logAction(
      'DUPLICATE_PRODUCT',
      `Produto duplicado: "${cleanName}" criado a partir do produto ID ${payload.sourceProductId}`,
      user.value?.id,
    )

    return newProduct as ProductRow
  }

  return {
    fetchProducts,
    fetchProductById,
    fetchProductDemands,
    fetchAllActiveProducts,
    createProduct,
    updateProduct,
    duplicateProduct,
    toggleProductStatus,
    addProductUnit,
    removeProductUnit,
    upsertProductCharacteristic,
    batchUpsertProductCharacteristics,
    removeProductCharacteristic,
  }
}
