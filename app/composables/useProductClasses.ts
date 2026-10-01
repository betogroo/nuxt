import type { Database } from '~/types/database.types'

export type ProductClassRow = Database['public']['Tables']['product_classes']['Row']
export type ProductClassInsert = Database['public']['Tables']['product_classes']['Insert']

export const useProductClasses = () => {
  const supabase = useSupabaseClient<Database>()
  const user = useSupabaseUser()
  const { logAction } = useLogger()

  const fetchProductClasses = async (
    currentPage: number,
    itemsPerPage: number,
    searchQuery?: string,
  ) => {
    const from = (currentPage - 1) * itemsPerPage
    const to = from + itemsPerPage - 1

    let query = supabase
      .from('product_classes')
      .select('*', { count: 'exact' })
      .order('id', { ascending: true })
      .range(from, to)

    if (searchQuery) {
      query = query.or('id.ilike.%' + searchQuery + '%,name.ilike.%' + searchQuery + '%')
    }

    const { data, count, error } = await query

    if (error) throw error
    return { data: data as ProductClassRow[], count: count || 0 }
  }

  const fetchAllActiveProductClasses = async () => {
    const { data, error } = await supabase
      .from('product_classes')
      .select('*')
      .eq('is_active', true)
      .order('id', { ascending: true })

    if (error) throw error
    return data as ProductClassRow[]
  }

  const fetchPendingProductClasses = async () => {
    const { data, error } = await supabase
      .from('product_classes')
      .select('*')
      .eq('is_pending', true)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as ProductClassRow[]
  }

  const createProductClass = async (payload: ProductClassInsert) => {
    const { error } = await supabase.from('product_classes').insert(payload)

    if (error) throw error

    await logAction(
      'CREATE_PRODUCT_CLASS',
      `Nova classe de produto cadastrada: ${payload.name}`,
      user.value?.id,
    )
  }

  const toggleProductClassStatus = async (productClass: ProductClassRow) => {
    const newStatus = !productClass.is_active
    const { error } = await supabase
      .from('product_classes')
      .update({ is_active: newStatus })
      .eq('id', productClass.id)

    if (error) throw error

    await logAction(
      'TOGGLE_PRODUCT_CLASS_STATUS',
      `Status da Classe de Produto ${productClass.id} alterado para ${newStatus ? 'Ativo' : 'Inativo'}`,
      user.value?.id,
    )
  }

  const updateProductClass = async (id: string, payload: Partial<ProductClassInsert>) => {
    const { error } = await supabase.from('product_classes').update(payload).eq('id', id)

    if (error) throw error

    await logAction('UPDATE_PRODUCT_CLASS', `Classe de produto atualizada: ${id}`, user.value?.id)
  }

  const deleteProductClass = async (id: string) => {
    const { error } = await supabase.from('product_classes').delete().eq('id', id)

    if (error) throw error

    await logAction('DELETE_PRODUCT_CLASS', `Classe de produto removida: ${id}`, user.value?.id)
  }

  const registerPendingProductClass = async (payload: { id: string; name: string }) => {
    const { data, error } = await supabase
      .from('product_classes')
      .insert({
        id: payload.id,
        name: payload.name,
        is_pending: true,
        is_active: false,
      })
      .select()
      .single()

    if (error) throw error

    await logAction(
      'CREATE_PENDING_PRODUCT_CLASS',
      `Usuário sugeriu nova classe de produto: ${payload.name} (${payload.id})`,
      user.value?.id,
    )
    return data as ProductClassRow
  }

  const approvePendingProductClass = async (targetClass: ProductClassRow, newName?: string) => {
    const updatePayload: Partial<ProductClassInsert> = {
      is_pending: false,
      is_active: true,
    }
    if (newName && newName.trim() !== '') {
      updatePayload.name = newName.trim()
    }

    const { error } = await supabase
      .from('product_classes')
      .update(updatePayload)
      .eq('id', targetClass.id)

    if (error) throw error

    await logAction(
      'APPROVE_PRODUCT_CLASS',
      `Classe sugerida aprovada: ${targetClass.name} (${targetClass.id})`,
      user.value?.id,
    )
  }

  const mergePendingProductClass = async (targetClass: ProductClassRow, finalClassId: string) => {
    if (!finalClassId) throw new Error('Selecione uma classe de produto existente para mesclar.')

    // Update any products linked to this pending class
    const { data: productLinks } = await supabase
      .from('products')
      .select('id')
      .eq('product_class_id', targetClass.id)

    if (productLinks && productLinks.length > 0) {
      for (const link of productLinks) {
        await supabase.from('products').update({ product_class_id: finalClassId }).eq('id', link.id)
      }
    }

    // Delete the pending class
    const { error: delError } = await supabase
      .from('product_classes')
      .delete()
      .eq('id', targetClass.id)

    if (delError) throw delError

    await logAction(
      'MERGE_PRODUCT_CLASS',
      `Classe sugerida "${targetClass.name}" mesclada na oficial (${finalClassId}).`,
      user.value?.id,
    )
  }

  return {
    fetchProductClasses,
    fetchAllActiveProductClasses,
    fetchPendingProductClasses,
    createProductClass,
    updateProductClass,
    deleteProductClass,
    toggleProductClassStatus,
    registerPendingProductClass,
    approvePendingProductClass,
    mergePendingProductClass,
  }
}
