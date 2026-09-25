import type { Database } from '~/types/database.types'

export type ProductRow = Database['public']['Tables']['products']['Row'] & {
  product_categories?: { id: string; name: string } | null
}

export const useProducts = () => {
  const supabase = useSupabaseClient<Database>()
  const user = useSupabaseUser()
  const { logAction } = useLogger()

  const fetchProducts = async (
    currentPage: number,
    itemsPerPage: number,
    categoryId: string | null,
    statusFilter: string | null = 'active',
  ) => {
    const from = (currentPage - 1) * itemsPerPage
    const to = from + itemsPerPage - 1

    let query = supabase
      .from('products')
      .select('*, product_categories(id, name)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)

    if (categoryId) {
      query = query.eq('category_id', categoryId)
    }

    if (statusFilter === 'active') {
      query = query.eq('is_active', true)
    } else if (statusFilter === 'inactive') {
      query = query.eq('is_active', false)
    }

    const { data, count, error } = await query

    if (error) {
      console.error(error)
      throw error
    }

    return { data: (data as ProductRow[]) || [], count: count || 0 }
  }

  const createProduct = async (payload: Database['public']['Tables']['products']['Insert']) => {
    const { error } = await supabase.from('products').insert(payload)
    if (error) throw error

    await logAction('CREATE_PRODUCT', `Novo produto criado: ${payload.name}`, user.value?.id)
  }

  const updateProduct = async (
    id: string,
    payload: Database['public']['Tables']['products']['Update'],
  ) => {
    const { error } = await supabase.from('products').update(payload).eq('id', id)
    if (error) throw error

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

  const fetchPendingProductSuggestions = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('suggested_category')
      .not('suggested_category', 'is', null)

    if (error) {
      console.error(error)
      throw error
    }

    const unique = [...new Set(data.map((p) => p.suggested_category as string))]
    return unique.sort()
  }

  const fetchAllActiveProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*, product_categories(id, name), product_units(unit_id, measurement_units(*))')
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) throw error
    return data
  }

  const fetchProductById = async (id: string) => {
    const { data, error } = await supabase
      .from('products')
      .select('*, product_categories(id, name)')
      .eq('id', id)
      .single()

    if (error) throw error

    const { data: unitsData } = await supabase
      .from('product_units')
      .select('id, measurement_units(*)')
      .eq('product_id', id)

    return {
      ...data,
      units:
        unitsData?.map(
          (u: {
            measurement_units: {
              id: string
              name: string
              is_pending: boolean
              is_active: boolean
              legacy_alias: string | null
            }
          }) => u.measurement_units,
        ) || [],
    }
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

  return {
    fetchProducts,
    fetchProductById,
    fetchAllActiveProducts,
    createProduct,
    updateProduct,
    toggleProductStatus,
    fetchPendingProductSuggestions,
    addProductUnit,
    removeProductUnit,
  }
}
