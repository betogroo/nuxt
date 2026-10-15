import type { Database } from '~/types/database.types'

export type ProductRow = Database['public']['Tables']['products']['Row'] & {
  expense_natures?: { id: string; name: string } | null
  product_classes?: { id: string; name: string } | null
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

export const useProducts = () => {
  const supabase = useSupabaseClient<Database>()
  const user = useSupabaseUser()
  const { logAction } = useLogger()

  const fetchProducts = async (
    currentPage: number,
    itemsPerPage: number,
    expenseNatureId: string | null,
    statusFilter: string | null = 'active',
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

    return { ...data, profiles, units }
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

  return {
    fetchProducts,
    fetchProductById,
    fetchProductDemands,
    fetchAllActiveProducts,
    createProduct,
    updateProduct,
    toggleProductStatus,
    addProductUnit,
    removeProductUnit,
  }
}
