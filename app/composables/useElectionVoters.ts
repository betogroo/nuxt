import { ref } from 'vue'
import { useSupabaseClient } from '#imports'
import { useLogger } from './useLogger'
import type {
  ElectionVoterRow,
  ElectionVoterInput,
  VoterSearchFilter,
  ElectionVoterFilter,
  ElectionVotersPagedResponse,
} from '~/types/election-voter'

export function useElectionVoters() {
  const supabase = useSupabaseClient()
  const { logAction } = useLogger()

  const isLoading = ref<boolean>(false)
  const error = ref<string | null>(null)

  const fetchVoters = async (filter?: VoterSearchFilter): Promise<ElectionVoterRow[]> => {
    isLoading.value = true
    error.value = null
    try {
      let query = supabase.from('election_voters').select('*').order('name', { ascending: true })

      if (filter?.search) {
        const term = `%${filter.search.trim()}%`
        query = query.or(`name.ilike.${term},voter_registration_number.ilike.${term}`)
      }

      if (filter?.is_active !== undefined) {
        query = query.eq('is_active', filter.is_active)
      }

      if (filter?.limit) {
        query = query.limit(filter.limit)
      }

      if (filter?.offset) {
        query = query.range(filter.offset, filter.offset + (filter.limit || 50) - 1)
      }

      const { data, error: err } = await query

      if (err) throw err
      return (data || []) as ElectionVoterRow[]
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Falha ao buscar eleitores.'
      error.value = message
      throw new Error(message, { cause: err })
    } finally {
      isLoading.value = false
    }
  }

  const fetchVotersPaged = async (
    filter?: ElectionVoterFilter,
  ): Promise<ElectionVotersPagedResponse> => {
    isLoading.value = true
    error.value = null
    try {
      const page = Math.max(1, filter?.page || 1)
      const limit = Math.max(1, filter?.limit || 20)
      const offset = (page - 1) * limit

      const sortBy = filter?.sortBy || 'name'
      const ascending = filter?.sortOrder !== 'desc'

      let query = supabase
        .from('election_voters')
        .select('*', { count: 'exact' })
        .order(sortBy, { ascending })

      if (filter?.search) {
        const term = `%${filter.search.trim()}%`
        query = query.or(`name.ilike.${term},voter_registration_number.ilike.${term}`)
      }

      if (filter?.is_active !== undefined) {
        query = query.eq('is_active', filter.is_active)
      }

      query = query.range(offset, offset + limit - 1)

      const { data, error: err, count } = await query

      if (err) throw err

      return {
        data: (data || []) as ElectionVoterRow[],
        count: count ?? 0,
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Falha ao carregar eleitores paginados.'
      error.value = message
      throw new Error(message, { cause: err })
    } finally {
      isLoading.value = false
    }
  }

  const fetchVoterByNumber = async (voterNumber: string): Promise<ElectionVoterRow | null> => {
    isLoading.value = true
    error.value = null
    try {
      const cleanNumber = voterNumber.trim()
      const { data, error: err } = await supabase
        .from('election_voters')
        .select('*')
        .eq('voter_registration_number', cleanNumber)
        .maybeSingle()

      if (err) throw err
      return (data as ElectionVoterRow) || null
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Falha ao buscar eleitor por número.'
      error.value = message
      throw new Error(message, { cause: err })
    } finally {
      isLoading.value = false
    }
  }

  const generateNextVoterNumber = async (): Promise<string> => {
    try {
      const { data, error: err } = await supabase
        .from('election_voters')
        .select('voter_registration_number')
        .order('created_at', { ascending: false })
        .limit(50)

      if (err) throw err

      let maxNumeric = 100000
      for (const row of data || []) {
        const num = parseInt(row.voter_registration_number, 10)
        if (!isNaN(num) && num > maxNumeric) {
          maxNumeric = num
        }
      }

      return String(maxNumeric + 1)
    } catch {
      return String(Math.floor(100000 + Math.random() * 900000))
    }
  }

  const checkVoterElectionStatus = async (
    electionId: string,
    voterNumber: string,
  ): Promise<{
    voter: ElectionVoterRow | null
    hasVoted: boolean
    attendedAt: string | null
  }> => {
    isLoading.value = true
    error.value = null
    try {
      const cleanNumber = voterNumber.trim()
      const voter = await fetchVoterByNumber(cleanNumber)

      if (!voter) {
        return { voter: null, hasVoted: false, attendedAt: null }
      }

      const { data: attendance, error: attErr } = await supabase
        .from('election_voter_attendance')
        .select('id, voted_at')
        .eq('election_id', electionId)
        .eq('voter_registration_number', cleanNumber)
        .maybeSingle()

      if (attErr) throw attErr

      const record = attendance as { id: string; voted_at: string } | null

      return {
        voter,
        hasVoted: !!record,
        attendedAt: record?.voted_at || null,
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Falha ao verificar status do eleitor.'
      error.value = message
      throw new Error(message, { cause: err })
    } finally {
      isLoading.value = false
    }
  }

  const createVoter = async (payload: ElectionVoterInput): Promise<ElectionVoterRow> => {
    isLoading.value = true
    error.value = null
    try {
      const { data, error: err } = await supabase
        .from('election_voters')
        .insert({
          voter_registration_number: payload.voter_registration_number.trim(),
          name: payload.name.trim(),
          is_active: payload.is_active ?? true,
        })
        .select()
        .single()

      if (err) throw err

      const created = data as ElectionVoterRow
      await logAction(
        'ELECTION_VOTER_CREATE',
        `Eleitor cadastrado: ${created.name} (${created.voter_registration_number})`,
      )

      return created
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Falha ao cadastrar eleitor.'
      error.value = message
      throw new Error(message, { cause: err })
    } finally {
      isLoading.value = false
    }
  }

  const updateVoter = async (
    id: string,
    payload: Partial<ElectionVoterInput>,
  ): Promise<ElectionVoterRow> => {
    isLoading.value = true
    error.value = null
    try {
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      }
      if (payload.name !== undefined) updateData.name = payload.name.trim()
      if (payload.voter_registration_number !== undefined)
        updateData.voter_registration_number = payload.voter_registration_number.trim()
      if (payload.is_active !== undefined) updateData.is_active = payload.is_active

      const { data, error: err } = await supabase
        .from('election_voters')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (err) throw err

      const updated = data as ElectionVoterRow
      await logAction(
        'ELECTION_VOTER_UPDATE',
        `Eleitor atualizado: ${updated.name} (${updated.voter_registration_number})`,
      )

      return updated
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Falha ao atualizar eleitor.'
      error.value = message
      throw new Error(message, { cause: err })
    } finally {
      isLoading.value = false
    }
  }

  const toggleVoterActive = async (
    id: string,
    currentStatus: boolean,
  ): Promise<ElectionVoterRow> => {
    return await updateVoter(id, { is_active: !currentStatus })
  }

  const deleteVoter = async (id: string): Promise<void> => {
    isLoading.value = true
    error.value = null
    try {
      const { error: err } = await supabase.from('election_voters').delete().eq('id', id)

      if (err) throw err

      await logAction('ELECTION_VOTER_DELETE', `Eleitor removido (ID: ${id})`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Falha ao excluir eleitor.'
      error.value = message
      throw new Error(message, { cause: err })
    } finally {
      isLoading.value = false
    }
  }

  return {
    isLoading,
    error,
    fetchVoters,
    fetchVotersPaged,
    fetchVoterByNumber,
    generateNextVoterNumber,
    checkVoterElectionStatus,
    createVoter,
    updateVoter,
    toggleVoterActive,
    deleteVoter,
  }
}
