import type { Database } from '~/types/database.types'
import type { DemandStatus } from '~/utils/demandStatus'

export type DemandRow = Database['public']['Tables']['demands']['Row']
export type DemandType = Database['public']['Enums']['demand_type']

export interface DemandDashboardSummary {
  totalAll: number
  totalActive: number
  inPreparation: number
  inExecution: number
  completed: number
  cancelled: number
  returnsCount: number
  byStatus: Record<DemandStatus, number>
  byType: {
    consumption: number
    permanent: number
  }
}

export function createEmptyDemandDashboardSummary(): DemandDashboardSummary {
  return {
    totalAll: 0,
    totalActive: 0,
    inPreparation: 0,
    inExecution: 0,
    completed: 0,
    cancelled: 0,
    returnsCount: 0,
    byStatus: {
      planning: 0,
      bidding_notice: 0,
      quotation: 0,
      dispute: 0,
      homologation: 0,
      completed: 0,
      cancelled: 0,
    },
    byType: {
      consumption: 0,
      permanent: 0,
    },
  }
}

export function calculateDemandDashboardSummary(
  rows: Pick<DemandRow, 'status' | 'type' | 'is_return_requested'>[] | null | undefined,
): DemandDashboardSummary {
  const summary = createEmptyDemandDashboardSummary()
  if (!rows || rows.length === 0) return summary

  for (const row of rows) {
    summary.totalAll++
    const st = row.status
    if (st && st in summary.byStatus) {
      summary.byStatus[st]++
    }

    if (st !== 'cancelled') {
      summary.totalActive++
      if (row.type === 'consumption') {
        summary.byType.consumption++
      } else if (row.type === 'permanent') {
        summary.byType.permanent++
      }
    }

    if (row.is_return_requested) {
      summary.returnsCount++
    }
  }

  summary.inPreparation =
    summary.byStatus.planning + summary.byStatus.bidding_notice + summary.byStatus.quotation
  summary.inExecution = summary.byStatus.dispute + summary.byStatus.homologation
  summary.completed = summary.byStatus.completed
  summary.cancelled = summary.byStatus.cancelled

  return summary
}

export const useDemands = () => {
  const supabase = useSupabaseClient<Database>()
  const user = useSupabaseUser()
  const { logAction } = useLogger()

  const fetchDemands = async (
    currentPage: number,
    itemsPerPage: number,
    statusFilter?: string | null,
    searchQuery?: string | null,
    typeFilter?: DemandType | string | null,
  ) => {
    const from = (currentPage - 1) * itemsPerPage
    const to = from + itemsPerPage - 1

    let query = supabase
      .from('demands')
      .select('*, profiles!demands_user_id_fkey(name)', { count: 'exact' })
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (statusFilter) {
      if (statusFilter === 'returns') {
        query = query.eq('is_return_requested', true)
      } else if (statusFilter === 'preparation') {
        query = query.in('status', ['planning', 'bidding_notice', 'quotation'])
      } else if (statusFilter === 'execution') {
        query = query.in('status', ['dispute', 'homologation'])
      } else {
        query = query.eq('status', statusFilter as DemandStatus)
      }
    }

    if (typeFilter === 'consumption' || typeFilter === 'permanent') {
      query = query.eq('type', typeFilter)
    }

    const trimmedSearch = searchQuery?.trim()
    if (trimmedSearch) {
      const safeTerm = trimmedSearch.replace(/[,()]/g, ' ').trim()
      if (safeTerm) {
        query = query.or(
          `name.ilike.%${safeTerm}%,process_number.ilike.%${safeTerm}%,internal_process_number.ilike.%${safeTerm}%`,
        )
      }
    }

    const { data, count, error } = await query

    if (error) {
      console.error(error)
      throw error
    }

    return { data: (data as DemandRow[]) || [], count: count || 0 }
  }

  const fetchDemandDashboardSummary = async (): Promise<DemandDashboardSummary> => {
    const { data, error } = await supabase
      .from('demands')
      .select('status, type, is_return_requested')
      .is('deleted_at', null)

    if (error) {
      console.error(error)
      throw error
    }

    return calculateDemandDashboardSummary(
      (data as Pick<DemandRow, 'status' | 'type' | 'is_return_requested'>[]) || [],
    )
  }

  const fetchDemandById = async (demandId: string) => {
    const { data, error } = await supabase
      .from('demands')
      .select('*')
      .eq('id', demandId)
      .is('deleted_at', null)
      .single()

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
    const { error } = await supabase
      .from('demands')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', demandId)
    if (error) throw error

    await logAction(
      'DELETE_DEMAND',
      `Demanda enviada para a lixeira (safe delete): ${demandId}`,
      user.value?.id,
    )
  }

  const restoreDemand = async (demandId: string) => {
    const { error } = await supabase.from('demands').update({ deleted_at: null }).eq('id', demandId)
    if (error) throw error

    await logAction('RESTORE_DEMAND', `Demanda restaurada: ${demandId}`, user.value?.id)
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
      .select('*, profiles(name, avatar_url)')
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

    const { refreshPendingReturns } = usePendingTasks()
    await refreshPendingReturns()

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

    const { refreshPendingReturns } = usePendingTasks()
    await refreshPendingReturns()

    await logAction(
      'REQUEST_DEMAND_RETURN',
      `Solicitação de retorno para demanda ${demandId}`,
      user.value?.id,
    )
  }

  return {
    fetchDemands,
    fetchDemandDashboardSummary,
    fetchDemandById,
    fetchDemandResponsibles,
    createDemand,
    updateDemand,
    deleteDemand,
    restoreDemand,
    addResponsible,
    removeResponsible,
    advanceDemandStatus,
    revertDemandStatus,
    requestDemandReturn,
  }
}
