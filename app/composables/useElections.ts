import { ref } from 'vue'
import { useSupabaseClient } from '#imports'
import { useLogger } from './useLogger'
import type {
  ElectionRow,
  ElectionInput,
  ElectionMetrics,
  ElectionTimelineFilter,
} from '~/types/election'

interface FetchElectionsOptions {
  page?: number
  limit?: number
  status?: string | null
  timeline?: ElectionTimelineFilter
  search?: string | null
}

export function useElections() {
  const supabase = useSupabaseClient()
  const { logAction } = useLogger()

  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchElections = async (
    options: FetchElectionsOptions = {},
  ): Promise<{ data: ElectionRow[]; count: number }> => {
    loading.value = true
    error.value = null

    try {
      const page = options.page || 1
      const limit = options.limit || 10
      const from = (page - 1) * limit
      const to = from + limit - 1

      let query = supabase
        .from('elections')
        .select('*, profiles:created_by(name)', { count: 'exact' })
        .is('deleted_at', null)

      // Search filter
      if (options.search && options.search.trim()) {
        query = query.ilike('name', `%${options.search.trim()}%`)
      }

      // Direct status filter
      if (options.status) {
        query = query.eq('status', options.status)
      }

      // Timeline filter
      if (options.timeline && options.timeline !== 'all') {
        if (options.timeline === 'active') {
          query = query.in('status', ['released', 'tallying'])
        } else if (options.timeline === 'upcoming') {
          query = query.eq('status', 'awaiting_release')
        } else if (options.timeline === 'past') {
          query = query.eq('status', 'finished')
        }
      }

      query = query.order('election_date', { ascending: false }).range(from, to)

      const { data, count, error: err } = await query

      if (err) {
        console.error('Erro ao buscar eleições:', err)
        throw new Error(err.message || 'Falha ao buscar eleições.')
      }

      type RawElectionItem = ElectionRow & {
        profiles?: { name: string } | null
      }

      const rows: ElectionRow[] = ((data as unknown as RawElectionItem[]) || []).map((item) => ({
        ...item,
        creator_name: item.profiles?.name || null,
      }))

      return {
        data: rows,
        count: count || 0,
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Erro inesperado ao buscar eleições.'
      error.value = message
      throw e
    } finally {
      loading.value = false
    }
  }

  const fetchElectionMetrics = async (): Promise<ElectionMetrics> => {
    try {
      const [
        { count: totalCount },
        { count: releasedCount },
        { count: tallyingCount },
        { count: upcomingCount },
        { count: pastCount },
      ] = await Promise.all([
        supabase
          .from('elections')
          .select('id', { count: 'exact', head: true })
          .is('deleted_at', null),
        supabase
          .from('elections')
          .select('id', { count: 'exact', head: true })
          .is('deleted_at', null)
          .eq('status', 'released'),
        supabase
          .from('elections')
          .select('id', { count: 'exact', head: true })
          .is('deleted_at', null)
          .eq('status', 'tallying'),
        supabase
          .from('elections')
          .select('id', { count: 'exact', head: true })
          .is('deleted_at', null)
          .eq('status', 'awaiting_release'),
        supabase
          .from('elections')
          .select('id', { count: 'exact', head: true })
          .is('deleted_at', null)
          .eq('status', 'finished'),
      ])

      return {
        total: totalCount || 0,
        active: (releasedCount || 0) + (tallyingCount || 0),
        upcoming: upcomingCount || 0,
        past: pastCount || 0,
      }
    } catch (e: unknown) {
      console.error('Erro ao calcular métricas de eleições:', e)
      return { total: 0, active: 0, upcoming: 0, past: 0 }
    }
  }

  const createElection = async (payload: ElectionInput): Promise<ElectionRow> => {
    loading.value = true
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const { data, error: err } = await supabase
        .from('elections')
        .insert({
          name: payload.name.trim(),
          election_date: payload.election_date,
          digits_count: payload.digits_count,
          is_uppercase: payload.is_uppercase,
          status: payload.status,
          description: payload.description?.trim() || null,
          created_by: user?.id || null,
        })
        .select('*')
        .single()

      if (err) {
        console.error('Erro ao criar eleição:', err)
        throw new Error(err.message || 'Falha ao criar eleição.')
      }

      await logAction('CREATE_ELECTION', `Eleição criada com sucesso: ${payload.name.trim()}`)
      return data as unknown as ElectionRow
    } finally {
      loading.value = false
    }
  }

  const updateElection = async (
    id: string,
    payload: Partial<ElectionInput>,
  ): Promise<ElectionRow> => {
    loading.value = true
    try {
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      }
      if (payload.name !== undefined) updateData.name = payload.name.trim()
      if (payload.election_date !== undefined) updateData.election_date = payload.election_date
      if (payload.digits_count !== undefined) updateData.digits_count = payload.digits_count
      if (payload.is_uppercase !== undefined) updateData.is_uppercase = payload.is_uppercase
      if (payload.status !== undefined) updateData.status = payload.status
      if (payload.description !== undefined) {
        updateData.description = payload.description?.trim() || null
      }

      const { data, error: err } = await supabase
        .from('elections')
        .update(updateData)
        .eq('id', id)
        .select('*')
        .single()

      if (err) {
        console.error('Erro ao atualizar eleição:', err)
        throw new Error(err.message || 'Falha ao atualizar eleição.')
      }

      await logAction('UPDATE_ELECTION', `Eleição atualizada: ${id}`)
      return data as unknown as ElectionRow
    } finally {
      loading.value = false
    }
  }

  const deleteElection = async (id: string): Promise<void> => {
    loading.value = true
    try {
      // Safe delete: soft delete setting deleted_at
      const { error: err } = await supabase
        .from('elections')
        .update({
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (err) {
        console.error('Erro ao excluir eleição (safe delete):', err)
        throw new Error(err.message || 'Falha ao excluir eleição.')
      }

      await logAction('DELETE_ELECTION', `Eleição excluída com safe delete: ${id}`)
    } finally {
      loading.value = false
    }
  }

  const fetchElectionById = async (id: string): Promise<ElectionRow | null> => {
    loading.value = true
    error.value = null
    try {
      const { data, error: err } = await supabase
        .from('elections')
        .select('*, profiles:created_by(name)')
        .eq('id', id)
        .is('deleted_at', null)
        .single()

      if (err) {
        if (err.code === 'PGRST116') return null
        console.error('Erro ao buscar eleição por id:', err)
        throw new Error(err.message || 'Falha ao buscar detalhes da eleição.')
      }

      if (!data) return null

      type RawElectionItem = ElectionRow & {
        profiles?: { name: string } | null
      }
      const raw = data as unknown as RawElectionItem

      return {
        ...raw,
        creator_name: raw.profiles?.name || null,
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Erro ao buscar detalhes da eleição.'
      error.value = message
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    fetchElections,
    fetchElectionMetrics,
    fetchElectionById,
    createElection,
    updateElection,
    deleteElection,
  }
}
