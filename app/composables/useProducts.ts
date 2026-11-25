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
  real_products?: RealProduct[]
  keywords?: ProductKeyword[]
  product_keywords?: ProductKeyword[]
}

export interface ProductKeyword {
  id: string
  product_id: string
  keyword: string
  created_at: string
  created_by?: string | null
}

export interface RealProduct {
  id: string
  product_id: string
  brand_id?: string | null
  name: string
  brand: string
  link: string | null
  created_at: string
  updated_at: string
  created_by?: string | null
}

export interface RealProductPayload {
  name: string
  brand: string
  brand_id?: string | null
  link?: string | null
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
  realProducts?: Array<{
    brand: string
    name: string
    link?: string | null
    brand_id?: string | null
  }>
  keywords?: string[]
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
      .select(
        '*, expense_natures(id, name), product_classes(id, name), product_keywords(id, keyword)',
        { count: 'exact' },
      )
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
          const { data: keywordMatches } = await supabase
            .from('product_keywords')
            .select('product_id')
            .ilike('keyword', `%${term}%`)

          const matchedIds = (keywordMatches || []).map((k) => k.product_id).filter(Boolean)
          if (matchedIds.length > 0) {
            query = query.or(`name.ilike.%${term}%,id.in.(${matchedIds.join(',')})`)
          } else {
            query = query.ilike('name', `%${term}%`)
          }
        }
      }
    }

    const { data, count, error } = await query

    if (error) {
      console.error(error)
      throw error
    }

    const mappedData = ((data as ProductRow[]) || []).map((p) => ({
      ...p,
      keywords: p.product_keywords || p.keywords || [],
    }))

    return { data: mappedData, count: count || 0 }
  }

  const handleProductDbError = (error: { code?: string; message?: string; details?: string }) => {
    if (error.code === '23505') {
      const detail = `${error.message || ''} ${error.details || ''}`
      if (detail.includes('cat_mat')) {
        return new Error('Já existe um produto cadastrado com este código CATMAT.')
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

  const createProductsBatch = async (
    payloads: Database['public']['Tables']['products']['Insert'][],
  ): Promise<ProductRow[]> => {
    if (!payloads || payloads.length === 0) return []

    const { data, error } = await supabase.from('products').insert(payloads).select()
    if (error) throw handleProductDbError(error)

    await logAction(
      'CREATE_PRODUCTS_BATCH',
      `${payloads.length} produtos cadastrados em lote`,
      user.value?.id,
    )

    return (data || []) as ProductRow[]
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

    const { data: realProductsData } = await supabase
      .from('real_products')
      .select('*')
      .eq('product_id', id)
      .order('brand', { ascending: true })
      .order('name', { ascending: true })

    const { data: keywordsData } = await supabase
      .from('product_keywords')
      .select('*')
      .eq('product_id', id)
      .order('keyword', { ascending: true })

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

    const real_products: RealProduct[] = (realProductsData || []) as unknown as RealProduct[]
    const keywords: ProductKeyword[] = (keywordsData || []) as unknown as ProductKeyword[]

    return {
      ...data,
      profiles,
      units,
      characteristics,
      real_products,
      keywords,
      product_keywords: keywords,
    }
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

    // Clonar produtos reais se fornecidos
    if (payload.realProducts && payload.realProducts.length > 0) {
      const { ensureBrand } = useBrands()
      const realProductsToInsert = []

      for (const rp of payload.realProducts) {
        const cleanBrand = rp.brand?.trim()
        const cleanName = rp.name?.trim()
        if (!cleanBrand || !cleanName) continue

        let brandId = rp.brand_id || null
        if (!brandId) {
          try {
            const brandRecord = await ensureBrand(cleanBrand)
            brandId = brandRecord?.id || null
          } catch {
            // fallback if ensureBrand fails
          }
        }

        realProductsToInsert.push({
          product_id: newProduct.id,
          brand: cleanBrand,
          brand_id: brandId,
          name: cleanName,
          link: rp.link?.trim() || null,
          created_by: user.value?.id,
        })
      }

      if (realProductsToInsert.length > 0) {
        const { error: realProductsError } = await supabase
          .from('real_products')
          .insert(realProductsToInsert)
        if (realProductsError) throw realProductsError
      }
    }

    // Clonar palavras-chave se fornecidas
    if (payload.keywords && payload.keywords.length > 0) {
      const uniqueKeywords = Array.from(
        new Set(payload.keywords.map((k) => k?.trim()).filter(Boolean)),
      )
      const keywordsToInsert = uniqueKeywords.map((k) => ({
        product_id: newProduct.id,
        keyword: k,
        created_by: user.value?.id,
      }))
      if (keywordsToInsert.length > 0) {
        const { error: kwError } = await supabase.from('product_keywords').insert(keywordsToInsert)
        if (kwError) throw kwError
      }
    }

    await logAction(
      'DUPLICATE_PRODUCT',
      `Produto duplicado: "${cleanName}" criado a partir do produto ID ${payload.sourceProductId}`,
      user.value?.id,
    )

    return newProduct as ProductRow
  }

  const addRealProduct = async (
    productId: string,
    payload: RealProductPayload,
  ): Promise<RealProduct> => {
    const cleanBrand = payload.brand?.trim()
    const cleanName = payload.name?.trim()
    const cleanLink = payload.link?.trim() || null

    if (!cleanBrand) {
      throw new Error('A marca do produto real é obrigatória.')
    }
    if (!cleanName) {
      throw new Error('O nome do produto real é obrigatório.')
    }

    const { ensureBrand } = useBrands()
    const brandRecord = await ensureBrand(cleanBrand)

    const { data, error } = await supabase
      .from('real_products')
      .insert({
        product_id: productId,
        brand_id: brandRecord.id,
        brand: cleanBrand,
        name: cleanName,
        link: cleanLink,
        created_by: user.value?.id,
      })
      .select()
      .single()

    if (error) throw error

    await logAction(
      'ADD_REAL_PRODUCT',
      `Produto real "${cleanName}" (${cleanBrand}) adicionado ao produto técnico (${productId})`,
      user.value?.id,
    )

    return data as unknown as RealProduct
  }

  const updateRealProduct = async (
    realProductId: string,
    payload: RealProductPayload,
  ): Promise<void> => {
    const cleanBrand = payload.brand?.trim()
    const cleanName = payload.name?.trim()
    const cleanLink = payload.link?.trim() || null

    if (!cleanBrand) {
      throw new Error('A marca do produto real é obrigatória.')
    }
    if (!cleanName) {
      throw new Error('O nome do produto real é obrigatório.')
    }

    const { ensureBrand } = useBrands()
    const brandRecord = await ensureBrand(cleanBrand)

    const { error } = await supabase
      .from('real_products')
      .update({
        brand_id: brandRecord.id,
        brand: cleanBrand,
        name: cleanName,
        link: cleanLink,
      })
      .eq('id', realProductId)

    if (error) throw error

    await logAction(
      'UPDATE_REAL_PRODUCT',
      `Produto real "${cleanName}" (${cleanBrand}) atualizado`,
      user.value?.id,
    )
  }

  const removeRealProduct = async (realProductId: string, label?: string): Promise<void> => {
    const { error } = await supabase.from('real_products').delete().eq('id', realProductId)

    if (error) throw error

    await logAction(
      'REMOVE_REAL_PRODUCT',
      `Produto real removido do produto: ${label || realProductId}`,
      user.value?.id,
    )
  }

  const addProductKeyword = async (
    productId: string,
    rawKeyword: string,
  ): Promise<ProductKeyword> => {
    const cleanProductId = productId?.trim()
    if (!cleanProductId) {
      throw new Error('ID do produto é obrigatório.')
    }

    const cleanKeyword = rawKeyword?.trim()
    if (!cleanKeyword) {
      throw new Error('A palavra-chave não pode ser vazia.')
    }

    const { data, error } = await supabase
      .from('product_keywords')
      .insert({
        product_id: productId,
        keyword: cleanKeyword,
        created_by: user.value?.id,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        throw new Error('Esta palavra-chave já está cadastrada para este produto.')
      }
      throw error
    }

    await logAction(
      'ADD_PRODUCT_KEYWORD',
      `Palavra-chave "${cleanKeyword}" adicionada ao produto (${productId})`,
      user.value?.id,
    )

    return data as unknown as ProductKeyword
  }

  const batchAddProductKeywords = async (
    productId: string,
    rawKeywords: string | string[],
  ): Promise<ProductKeyword[]> => {
    let items: string[] = []
    if (typeof rawKeywords === 'string') {
      items = rawKeywords.split(/[,;\n]/)
    } else if (Array.isArray(rawKeywords)) {
      items = rawKeywords
    }

    const cleanedItems = items
      .map((k) => (typeof k === 'string' ? k.trim() : ''))
      .filter((k) => k.length > 0)

    if (cleanedItems.length === 0) {
      throw new Error('Nenhuma palavra-chave informada para inserção.')
    }

    // Deduplicate case-insensitively
    const seen = new Set<string>()
    const uniqueKeywords: string[] = []
    for (const item of cleanedItems) {
      const lower = item.toLowerCase()
      if (!seen.has(lower)) {
        seen.add(lower)
        uniqueKeywords.push(item)
      }
    }

    const payloads = uniqueKeywords.map((keyword) => ({
      product_id: productId,
      keyword,
      created_by: user.value?.id,
    }))

    const { data, error } = await supabase.from('product_keywords').insert(payloads).select()

    if (error) {
      if (error.code === '23505') {
        throw new Error(
          'Uma ou mais palavras-chave informadas já estão cadastradas para este produto.',
        )
      }
      throw error
    }

    await logAction(
      'BATCH_ADD_PRODUCT_KEYWORDS',
      `${uniqueKeywords.length} palavras-chave adicionadas ao produto (${productId}): ${uniqueKeywords.join(', ')}`,
      user.value?.id,
    )

    return (data || []) as unknown as ProductKeyword[]
  }

  const removeProductKeyword = async (
    keywordId: string,
    keywordName?: string,
    productId?: string,
  ): Promise<void> => {
    const { error } = await supabase.from('product_keywords').delete().eq('id', keywordId)

    if (error) throw error

    await logAction(
      'REMOVE_PRODUCT_KEYWORD',
      `Palavra-chave "${keywordName || keywordId}" removida do produto${productId ? ` (${productId})` : ''}`,
      user.value?.id,
    )
  }

  const fetchAllDistinctKeywords = async (): Promise<string[]> => {
    const { data, error } = await supabase.from('product_keywords').select('keyword')

    if (error) throw error

    const seen = new Set<string>()
    const distinct: string[] = []
    for (const row of data || []) {
      const trimmed = (row.keyword || '').trim()
      if (!trimmed) continue
      const lower = trimmed.toLowerCase()
      if (!seen.has(lower)) {
        seen.add(lower)
        distinct.push(trimmed)
      }
    }

    return distinct.sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }

  return {
    fetchProducts,
    fetchProductById,
    fetchProductDemands,
    fetchAllActiveProducts,
    createProduct,
    createProductsBatch,
    updateProduct,
    duplicateProduct,
    toggleProductStatus,
    addProductUnit,
    removeProductUnit,
    upsertProductCharacteristic,
    batchUpsertProductCharacteristics,
    removeProductCharacteristic,
    addRealProduct,
    updateRealProduct,
    removeRealProduct,
    addProductKeyword,
    batchAddProductKeywords,
    removeProductKeyword,
    fetchAllDistinctKeywords,
  }
}
