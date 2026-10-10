import type { Database } from '~/types/database.types'

export type IirgdDocumentTypeRow = Database['public']['Tables']['iirgd_document_types']['Row']
export type IirgdDocumentTypeInsert = Database['public']['Tables']['iirgd_document_types']['Insert']

export const useIirgdDocumentTypes = () => {
  const supabase = useSupabaseClient<Database>()
  const { logAction } = useLogger()

  const fetchDocumentTypes = async (
    currentPage: number,
    itemsPerPage: number,
    searchQuery?: string,
  ) => {
    const from = (currentPage - 1) * itemsPerPage
    const to = from + itemsPerPage - 1

    let query = supabase
      .from('iirgd_document_types')
      .select('*', { count: 'exact' })
      .eq('is_pending', false)
      .order('name', { ascending: true })
      .range(from, to)

    if (searchQuery) {
      query = query.ilike('name', `%${searchQuery}%`)
    }

    const { data, count, error } = await query

    if (error) throw error
    return { data: (data || []) as IirgdDocumentTypeRow[], count: count || 0 }
  }

  const fetchPendingDocumentTypes = async () => {
    const { data, error } = await supabase
      .from('iirgd_document_types')
      .select('*')
      .eq('is_pending', true)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data || []) as IirgdDocumentTypeRow[]
  }

  const fetchAllActiveDocumentTypes = async () => {
    const { data, error } = await supabase
      .from('iirgd_document_types')
      .select('*')
      .eq('is_active', true)
      .eq('is_pending', false)
      .order('name', { ascending: true })

    if (error) throw error
    return (data || []) as IirgdDocumentTypeRow[]
  }

  const createDocumentType = async (payload: IirgdDocumentTypeInsert) => {
    const { error, data } = await supabase
      .from('iirgd_document_types')
      .insert(payload)
      .select()
      .single()
    if (error) throw error
    await logAction('CREATE_IIRGD_DOCUMENT_TYPE', `Tipo de documento IIRGD criado: ${data.name}`)
    return data
  }

  /**
   * Suggestion flow: any IIRGD user can type a new document type.
   * It is stored as pending/inactive so an admin can review it later.
   */
  const createPendingDocumentType = async (name: string) => {
    const { error, data } = await supabase
      .from('iirgd_document_types')
      .insert({ name: name.trim(), is_pending: true, is_active: false })
      .select()
      .single()
    if (error) throw error
    await logAction(
      'CREATE_PENDING_IIRGD_DOCUMENT_TYPE',
      `Usuário sugeriu novo tipo de documento IIRGD: ${data.name}`,
    )
    return data
  }

  const updateDocumentType = async (id: string, payload: { name: string; is_active: boolean }) => {
    const { error } = await supabase.from('iirgd_document_types').update(payload).eq('id', id)
    if (error) throw error
    await logAction('UPDATE_IIRGD_DOCUMENT_TYPE', `Tipo de documento IIRGD atualizado: ${payload.name}`)
  }

  const deleteDocumentType = async (id: string) => {
    const { error } = await supabase.from('iirgd_document_types').delete().eq('id', id)
    if (error) throw error
    await logAction('DELETE_IIRGD_DOCUMENT_TYPE', `Tipo de documento IIRGD excluído: ID ${id}`)
  }

  const toggleDocumentTypeStatus = async (item: IirgdDocumentTypeRow) => {
    const newStatus = !item.is_active
    const { error } = await supabase
      .from('iirgd_document_types')
      .update({ is_active: newStatus })
      .eq('id', item.id)

    if (error) throw error
    await logAction(
      'TOGGLE_IIRGD_DOCUMENT_TYPE_STATUS',
      `Tipo de documento IIRGD ${item.name} alterado para ${newStatus ? 'ATIVO' : 'INATIVO'}`,
    )
  }

  const approvePendingDocumentType = async (item: IirgdDocumentTypeRow, newName: string) => {
    const { error } = await supabase
      .from('iirgd_document_types')
      .update({ name: newName, is_pending: false, is_active: true })
      .eq('id', item.id)

    if (error) throw error
    await logAction(
      'APPROVE_IIRGD_DOCUMENT_TYPE',
      `Tipo de documento IIRGD sugerido aprovado: ${newName}`,
    )
  }

  const mergePendingDocumentType = async (item: IirgdDocumentTypeRow, targetId: string) => {
    // Re-point all demands using this pending document type to the target ID
    const { error: updateError } = await supabase
      .from('iirgd_demands')
      .update({ document_type_id: targetId })
      .eq('document_type_id', item.id)

    if (updateError) throw updateError

    // Delete the pending item
    const { error: deleteError } = await supabase
      .from('iirgd_document_types')
      .delete()
      .eq('id', item.id)

    if (deleteError) throw deleteError

    await logAction(
      'MERGE_IIRGD_DOCUMENT_TYPE',
      `Tipo de documento IIRGD sugerido "${item.name}" mesclado no oficial.`,
    )
  }

  return {
    fetchDocumentTypes,
    fetchPendingDocumentTypes,
    fetchAllActiveDocumentTypes,
    createDocumentType,
    createPendingDocumentType,
    updateDocumentType,
    deleteDocumentType,
    toggleDocumentTypeStatus,
    approvePendingDocumentType,
    mergePendingDocumentType,
  }
}
