import type { Database } from '~/types/database.types'

export type CategoryRow = Database['public']['Tables']['product_categories']['Row']

export const useCategories = () => {
  const supabase = useSupabaseClient<Database>()
  const user = useSupabaseUser()
  const { logAction } = useLogger()

  const fetchCategories = async (currentPage: number, itemsPerPage: number) => {
    const from = (currentPage - 1) * itemsPerPage
    const to = from + itemsPerPage - 1

    const { data, count, error } = await supabase
      .from('product_categories')
      .select('*', { count: 'exact' })
      .order('name', { ascending: true })
      .range(from, to)

    if (error) {
      console.error(error)
      throw error
    }

    return { data: data || [], count: count || 0 }
  }

  const fetchAllActiveCategories = async () => {
    const { data, error } = await supabase
      .from('product_categories')
      .select('id, name')
      .eq('is_active', true)
      .order('name')

    if (error) {
      console.error(error)
      throw error
    }
    return data || []
  }

  const fetchPendingSuggestions = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('suggested_category')
      .not('suggested_category', 'is', null)

    if (error) {
      console.error(error)
      throw error
    }

    const groups: Record<string, number> = {}
    data.forEach((p) => {
      const cat = p.suggested_category as string
      groups[cat] = (groups[cat] || 0) + 1
    })

    return Object.keys(groups).map((name) => ({
      name,
      count: groups[name],
    }))
  }

  const createCategory = async (name: string, is_active: boolean) => {
    const { error } = await supabase.from('product_categories').insert({
      name: name.trim(),
      is_active,
    })

    if (error) {
      if (error.code === '23505') throw new Error('Já existe uma categoria com este nome.')
      throw error
    }

    await logAction('CREATE_CATEGORY', `Nova categoria criada: ${name}`, user.value?.id)
  }

  const updateCategory = async (id: string, name: string, is_active: boolean) => {
    const { error } = await supabase
      .from('product_categories')
      .update({
        name: name.trim(),
        is_active,
      })
      .eq('id', id)

    if (error) {
      if (error.code === '23505') throw new Error('Já existe uma categoria com este nome.')
      throw error
    }

    await logAction('UPDATE_CATEGORY', `Categoria atualizada: ${name}`, user.value?.id)
  }

  const resolveSuggestion = async (
    resolveTarget: string,
    mode: 'new' | 'existing',
    newName: string,
    existingId: string | null,
  ) => {
    let finalCategoryId = existingId

    if (mode === 'new') {
      if (!newName.trim()) {
        throw new Error('Informe o nome da nova categoria.')
      }
      const { data: newCat, error: insertError } = await supabase
        .from('product_categories')
        .insert({ name: newName.trim(), is_active: true })
        .select()
        .single()

      if (insertError) {
        if (insertError.code === '23505') throw new Error('Já existe uma categoria com este nome.')
        throw insertError
      }
      finalCategoryId = newCat.id
    }

    if (!finalCategoryId) {
      throw new Error('Selecione uma categoria existente.')
    }

    const { error: updateError } = await supabase
      .from('products')
      .update({
        category_id: finalCategoryId,
        suggested_category: null,
      })
      .eq('suggested_category', resolveTarget)

    if (updateError) throw updateError

    await logAction('RESOLVE_SUGGESTION', `Sugestão "${resolveTarget}" resolvida`, user.value?.id)
  }

  const toggleCategoryStatus = async (category: CategoryRow) => {
    const newStatus = !category.is_active
    const { error } = await supabase
      .from('product_categories')
      .update({ is_active: newStatus })
      .eq('id', category.id)

    if (error) throw error

    await logAction(
      'TOGGLE_CATEGORY_STATUS',
      `Categoria ${category.name} alterada para ${newStatus ? 'ATIVO' : 'INATIVO'}`,
      user.value?.id,
    )
  }

  return {
    fetchCategories,
    fetchAllActiveCategories,
    fetchPendingSuggestions,
    createCategory,
    updateCategory,
    resolveSuggestion,
    toggleCategoryStatus,
  }
}
