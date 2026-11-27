import type { Database } from '~/types/database.types'
import type { DemandStatus } from '~/utils/demandStatus'
import type { DemandModality } from '~/utils/demandModality'
import { resolveDemandYear } from '~/utils/demandYear'

export type DemandRow = Database['public']['Tables']['demands']['Row'] & {
  profiles?: { name: string | null } | null
  demand_responsibles?: { user_id: string }[] | null
  demand_products?:
    | {
        id: string
        quantity: number
        reference_price: number | null
        product_name_snapshot?: string | null
        product?: {
          id?: string
          name: string
          product_class_id?: string | null
          product_classes?: { id: string; name: string } | null
        } | null
      }[]
    | null
}
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
  byModality: {
    dispensation: number
    bidding: number
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
    byModality: {
      dispensation: 0,
      bidding: 0,
    },
  }
}

export function calculateDemandDashboardSummary(
  rows:
    | (Pick<DemandRow, 'status' | 'type' | 'is_return_requested'> & {
        modality?: DemandModality | string | null
      })[]
    | null
    | undefined,
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

      if (row.modality === 'bidding') {
        summary.byModality.bidding++
      } else {
        summary.byModality.dispensation++
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
    hideCompleted?: boolean,
    yearFilter?: number | string | null,
  ) => {
    const from = (currentPage - 1) * itemsPerPage
    const to = from + itemsPerPage - 1

    let query = supabase
      .from('demands')
      .select(
        '*, profiles!demands_user_id_fkey(name), demand_responsibles(user_id), demand_products(id, quantity, reference_price, product_name_snapshot, product:products(id, name, product_class_id, product_classes(id, name)))',
        {
          count: 'exact',
        },
      )
      .is('deleted_at', null)
      .order('internal_process_number', { ascending: false, nullsFirst: false })
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

    if (hideCompleted && statusFilter !== 'completed') {
      query = query.neq('status', 'completed')
    }

    if (typeFilter === 'consumption' || typeFilter === 'permanent') {
      query = query.eq('type', typeFilter)
    }

    if (yearFilter) {
      const yr = String(yearFilter).trim()
      const startOfYear = `${yr}-01-01T00:00:00.000Z`
      const endOfYear = `${yr}-12-31T23:59:59.999Z`
      query = query.or(
        `internal_process_number.ilike.${yr}-%,and(internal_process_number.is.null,created_at.gte.${startOfYear},created_at.lte.${endOfYear})`,
      )
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
      .select('status, type, modality, is_return_requested')
      .is('deleted_at', null)

    if (error) {
      console.error(error)
      throw error
    }

    return calculateDemandDashboardSummary(
      (data as Pick<DemandRow, 'status' | 'type' | 'modality' | 'is_return_requested'>[]) || [],
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

  const executeDemandUpdate = async (
    demandId: string,
    payload: Database['public']['Tables']['demands']['Update'],
  ) => {
    const query = supabase.from('demands').update(payload).eq('id', demandId)
    const result =
      typeof (query as { select?: unknown }).select === 'function'
        ? await query.select('id')
        : await query

    if (result.error) throw result.error
    if (Array.isArray(result.data) && result.data.length === 0) {
      throw new Error(
        'Não foi possível atualizar a demanda. Verifique se você é um dos responsáveis por esta demanda.',
      )
    }
  }

  const updateDemand = async (
    demandId: string,
    payload: Database['public']['Tables']['demands']['Update'],
  ) => {
    await executeDemandUpdate(demandId, payload)

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
    await executeDemandUpdate(demandId, payload)

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
    await executeDemandUpdate(demandId, {
      status: previousStatus,
      is_return_requested: false,
    })

    const { refreshPendingReturns } = usePendingTasks()
    await refreshPendingReturns()

    await logAction(
      'REVERT_DEMAND_STATUS',
      `Demanda ${demandId} retornou para ${previousStatus}`,
      user.value?.id,
    )
  }

  const requestDemandReturn = async (demandId: string) => {
    await executeDemandUpdate(demandId, {
      is_return_requested: true,
    })

    const { refreshPendingReturns } = usePendingTasks()
    await refreshPendingReturns()

    await logAction(
      'REQUEST_DEMAND_RETURN',
      `Solicitação de retorno para demanda ${demandId}`,
      user.value?.id,
    )
  }

  const fetchDemandYears = async (): Promise<number[]> => {
    const { data, error } = await supabase
      .from('demands')
      .select('internal_process_number, dispute_date, created_at')
      .is('deleted_at', null)

    if (error) {
      console.error(error)
      throw error
    }

    const yearsSet = new Set<number>()
    for (const row of data || []) {
      const yr = resolveDemandYear(row)
      if (Number.isInteger(yr) && yr >= 1990 && yr <= 2100) {
        yearsSet.add(yr)
      }
    }

    return Array.from(yearsSet).sort((a, b) => b - a)
  }

  return {
    fetchDemands,
    fetchDemandYears,
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
