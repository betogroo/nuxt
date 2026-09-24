import type { Database } from '~/types/database.types'

export type DemandRow = Database['public']['Tables']['demands']['Row']

export const useDemands = () => {
  const supabase = useSupabaseClient<Database>()
  const user = useSupabaseUser()
  const { logAction } = useLogger()

  const fetchDemands = async (
    currentPage: number,
    itemsPerPage: number,
    statusFilter?: string | null,
    searchQuery?: string | null,
  ) => {
    const from = (currentPage - 1) * itemsPerPage
    const to = from + itemsPerPage - 1

    let query = supabase
      .from('demands')
      .select('*, profiles!demands_user_id_fkey(name)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)

    if (statusFilter) {
      if (statusFilter === 'returns') {
        query = query.eq('is_return_requested', true)
      } else {
        query = query.eq('status', statusFilter as Database['public']['Enums']['demand_status'])
      }
    }

    if (searchQuery) {
      query = query.ilike('name', `%${searchQuery}%`)
    }

    const { data, count, error } = await query

    if (error) {
      console.error(error)
      throw error
    }

    return { data: (data as DemandRow[]) || [], count: count || 0 }
  }

  const fetchDemandById = async (demandId: string) => {
    const { data, error } = await supabase.from('demands').select('*').eq('id', demandId).single()

    if (error) throw error
    return data as DemandRow
  }

  const createDemand = async (payload: Database['public']['Tables']['demands']['Insert']) => {
    const { data, error } = await supabase.from('demands').insert(payload).select().single()
    if (error) throw error

    await logAction('CREATE_DEMAND', `Nova demanda criada: ${payload.name}`, user.value?.id)
    return data as DemandRow
  }

  const updateDemand = async (
    demandId: string,
    payload: Database['public']['Tables']['demands']['Update'],
  ) => {
    const { error } = await supabase.from('demands').update(payload).eq('id', demandId)
    if (error) throw error

    await logAction('UPDATE_DEMAND', `Demanda atualizada: ${demandId}`, user.value?.id)
  }

  const deleteDemand = async (demandId: string) => {
    const { error } = await supabase.from('demands').delete().eq('id', demandId)
    if (error) throw error

    await logAction('DELETE_DEMAND', `Demanda removida: ${demandId}`, user.value?.id)
  }

  const addResponsible = async (demandId: string, userId: string) => {
    const { error } = await supabase
      .from('demand_responsibles')
      .insert({ demand_id: demandId, user_id: userId })

    if (error) {
      if (error.code === '23505') throw new Error('Usuário já é responsável por esta demanda.')
      throw error
    }
  }

  const removeResponsible = async (demandId: string, userId: string) => {
    const { error } = await supabase
      .from('demand_responsibles')
      .delete()
      .eq('demand_id', demandId)
      .eq('user_id', userId)

    if (error) throw error
  }

  const fetchDemandResponsibles = async (demandId: string) => {
    const { data, error } = await supabase
      .from('demand_responsibles')
      .select('*, profiles(name)')
      .eq('demand_id', demandId)

    if (error) throw error
    return data
  }

  const advanceDemandStatus = async (
    demandId: string,
    targetStatus: Database['public']['Enums']['demand_status'],
    payload: Partial<Database['public']['Tables']['demands']['Update']>,
  ) => {
    payload.status = targetStatus
    const { error } = await supabase.from('demands').update(payload).eq('id', demandId)
    if (error) throw error

    await logAction(
      'ADVANCE_DEMAND_STATUS',
      `Demanda ${demandId} avançou para ${targetStatus}`,
      user.value?.id,
    )
  }

  const revertDemandStatus = async (
    demandId: string,
    previousStatus: Database['public']['Enums']['demand_status'],
  ) => {
    const { error } = await supabase
      .from('demands')
      .update({
        status: previousStatus,
        is_return_requested: false,
      })
      .eq('id', demandId)

    if (error) throw error

    await logAction(
      'REVERT_DEMAND_STATUS',
      `Demanda ${demandId} retornou para ${previousStatus}`,
      user.value?.id,
    )
  }

  const requestDemandReturn = async (demandId: string) => {
    const { error } = await supabase
      .from('demands')
      .update({
        is_return_requested: true,
      })
      .eq('id', demandId)

    if (error) throw error

    await logAction(
      'REQUEST_DEMAND_RETURN',
      `Solicitação de retorno para demanda ${demandId}`,
      user.value?.id,
    )
  }

  return {
    fetchDemands,
    fetchDemandById,
    fetchDemandResponsibles,
    createDemand,
    updateDemand,
    deleteDemand,
    addResponsible,
    removeResponsible,
    advanceDemandStatus,
    revertDemandStatus,
    requestDemandReturn,
  }
}
