import { ref } from 'vue'
import { useSupabaseClient } from '#imports'
import { useLogger } from './useLogger'
import type {
  BallotBoxRow,
  BallotBoxInput,
  VoterAttendanceRow,
  ReleaseBallotBoxForVoterInput,
} from '~/types/ballot-box'
import type { RealtimeChannel } from '@supabase/supabase-js'

export function useBallotBoxes() {
  const supabase = useSupabaseClient()
  const { logAction } = useLogger()

  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchBallotBoxes = async (electionId: string): Promise<BallotBoxRow[]> => {
    loading.value = true
    error.value = null

    try {
      const { data, error: err } = await supabase
        .from('ballot_boxes')
        .select('*')
        .eq('election_id', electionId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })

      if (err) {
        console.error('Erro ao buscar urnas virtuais:', err)
        throw new Error(err.message || 'Falha ao buscar urnas da eleição.')
      }

      return (data as BallotBoxRow[]) || []
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Erro ao buscar urnas.'
      error.value = message
      throw e
    } finally {
      loading.value = false
    }
  }

  const fetchBallotBoxById = async (id: string): Promise<BallotBoxRow | null> => {
    loading.value = true
    error.value = null

    try {
      const { data, error: err } = await supabase
        .from('ballot_boxes')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .maybeSingle()

      if (err) {
        console.error('Erro ao buscar urna virtual:', err)
        throw new Error(err.message || 'Falha ao buscar detalhes da urna.')
      }

      return data as BallotBoxRow | null
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Erro ao buscar urna.'
      error.value = message
      throw e
    } finally {
      loading.value = false
    }
  }

  const createBallotBox = async (payload: BallotBoxInput): Promise<BallotBoxRow> => {
    loading.value = true
    error.value = null

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const { data, error: err } = await supabase
        .from('ballot_boxes')
        .insert({
          election_id: payload.election_id,
          name: payload.name.trim(),
          device_info: payload.device_info ? payload.device_info.trim() : null,
          is_active: false,
          created_by: user?.id || null,
        })
        .select()
        .single()

      if (err) {
        console.error('Erro ao criar urna virtual:', err)
        throw new Error(err.message || 'Falha ao cadastrar urna virtual.')
      }

      await logAction(
        'CREATE_BALLOT_BOX',
        `Urna virtual "${payload.name.trim()}" cadastrada para a eleição ${payload.election_id}.`,
      )

      return data as BallotBoxRow
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Erro ao cadastrar urna virtual.'
      error.value = message
      throw e
    } finally {
      loading.value = false
    }
  }

  const updateBallotBox = async (
    id: string,
    payload: Partial<BallotBoxInput>,
  ): Promise<BallotBoxRow> => {
    loading.value = true
    error.value = null

    try {
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      }

      if (payload.name !== undefined) {
        updateData.name = payload.name.trim()
      }
      if (payload.device_info !== undefined) {
        updateData.device_info = payload.device_info ? payload.device_info.trim() : null
      }

      const { data, error: err } = await supabase
        .from('ballot_boxes')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (err) {
        console.error('Erro ao atualizar urna virtual:', err)
        throw new Error(err.message || 'Falha ao atualizar dados da urna.')
      }

      await logAction('UPDATE_BALLOT_BOX', `Urna virtual ${id} atualizada com sucesso.`)

      return data as BallotBoxRow
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Erro ao atualizar urna virtual.'
      error.value = message
      throw e
    } finally {
      loading.value = false
    }
  }

  const toggleBallotBoxStatus = async (id: string, isActive: boolean): Promise<BallotBoxRow> => {
    loading.value = true
    error.value = null

    try {
      const updatePayload: Record<string, unknown> = {
        is_active: isActive,
        updated_at: new Date().toISOString(),
      }
      if (!isActive) {
        updatePayload.current_voter_id = null
        updatePayload.current_voter_registration_number = null
        updatePayload.current_voter_name = null
      }

      const { data, error: err } = await supabase
        .from('ballot_boxes')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single()

      if (err) {
        console.error('Erro ao alterar status da urna:', err)
        throw new Error(err.message || 'Falha ao alterar status da urna.')
      }

      const action = isActive ? 'ACTIVATE_BALLOT_BOX' : 'DEACTIVATE_BALLOT_BOX'
      const label = isActive ? 'ativada' : 'desativada'
      await logAction(action, `Urna virtual ${id} foi ${label}.`)

      return data as BallotBoxRow
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Erro ao alterar status da urna.'
      error.value = message
      throw e
    } finally {
      loading.value = false
    }
  }

  const deleteBallotBox = async (id: string): Promise<void> => {
    loading.value = true
    error.value = null

    try {
      const { error: err } = await supabase
        .from('ballot_boxes')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)

      if (err) {
        console.error('Erro ao excluir urna virtual:', err)
        throw new Error(err.message || 'Falha ao remover urna virtual.')
      }

      await logAction('DELETE_BALLOT_BOX', `Urna virtual ${id} foi removida (safe delete).`)
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Erro ao excluir urna virtual.'
      error.value = message
      throw e
    } finally {
      loading.value = false
    }
  }

  const checkVoterAlreadyVoted = async (
    electionId: string,
    voterRegistrationNumber: string,
  ): Promise<VoterAttendanceRow | null> => {
    const cleanNumber = voterRegistrationNumber.trim()
    if (!cleanNumber) return null

    const { data, error: err } = await supabase
      .from('election_voter_attendance')
      .select('*')
      .eq('election_id', electionId)
      .eq('voter_registration_number', cleanNumber)
      .maybeSingle()

    if (err) {
      console.error('Erro ao verificar presença do eleitor:', err)
      throw new Error(err.message || 'Falha ao consultar situação do título do eleitor.')
    }

    return data as VoterAttendanceRow | null
  }

  const releaseBallotBoxForVoter = async (
    params: ReleaseBallotBoxForVoterInput,
  ): Promise<VoterAttendanceRow> => {
    loading.value = true
    error.value = null

    try {
      const cleanNumber = params.voterRegistrationNumber.trim()
      if (!cleanNumber) {
        throw new Error('Informe o número do título do eleitor para liberar a urna.')
      }

      // Check if voter exists in election_voters table
      const { data: voterRecord, error: voterLookupErr } = await supabase
        .from('election_voters')
        .select('id, name, is_active')
        .eq('voter_registration_number', cleanNumber)
        .maybeSingle()

      if (voterLookupErr) {
        console.error('Erro ao consultar cadastro do eleitor:', voterLookupErr)
        throw new Error(voterLookupErr.message || 'Falha ao consultar cadastro do eleitor.')
      }

      if (!voterRecord) {
        throw new Error(
          `Eleitor com título nº ${cleanNumber} não foi encontrado no cadastro de eleitores.`,
        )
      }

      if (!voterRecord.is_active) {
        throw new Error(
          `O cadastro do eleitor "${voterRecord.name}" (Título nº ${cleanNumber}) está desativado.`,
        )
      }

      const existingAttendance = await checkVoterAlreadyVoted(params.electionId, cleanNumber)
      if (existingAttendance) {
        throw new Error(
          `O eleitor "${voterRecord.name}" (Título nº ${cleanNumber}) já votou nesta eleição. A urna não será liberada.`,
        )
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()

      const { data: attendanceData, error: insertErr } = await supabase
        .from('election_voter_attendance')
        .insert({
          election_id: params.electionId,
          ballot_box_id: params.ballotBoxId,
          voter_id: voterRecord.id,
          voter_registration_number: cleanNumber,
          released_by: user?.id || null,
          voted_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (insertErr) {
        if (insertErr.code === '23505') {
          throw new Error(
            `Este eleitor (Título nº ${cleanNumber}) já votou nesta eleição. A urna não será liberada.`,
          )
        }
        console.error('Erro ao registrar presença do eleitor:', insertErr)
        throw new Error(insertErr.message || 'Falha ao registrar validação do eleitor.')
      }

      const { error: boxUpdateErr } = await supabase
        .from('ballot_boxes')
        .update({
          is_active: true,
          current_voter_id: voterRecord.id,
          current_voter_registration_number: cleanNumber,
          current_voter_name: voterRecord.name,
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.ballotBoxId)

      if (boxUpdateErr) {
        console.error('Erro ao atualizar status da urna:', boxUpdateErr)
        throw new Error(boxUpdateErr.message || 'Falha ao liberar status da urna.')
      }

      await logAction(
        'RELEASE_BALLOT_BOX_FOR_VOTER',
        `Urna virtual ${params.ballotBoxId} liberada para o eleitor ${voterRecord.name} (título nº ${cleanNumber}) na eleição ${params.electionId}.`,
      )

      return attendanceData as VoterAttendanceRow
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Erro ao liberar urna para o eleitor.'
      error.value = message
      throw e
    } finally {
      loading.value = false
    }
  }

  const subscribeToBallotBoxes = (electionId: string, onUpdate: () => void): RealtimeChannel => {
    const { subscribeToPostgresChanges } = useRealtimeChannel()
    const channelName = `ballot_boxes_election_${electionId}_${Date.now()}`
    return subscribeToPostgresChanges(channelName, [
      {
        event: '*',
        schema: 'public',
        table: 'ballot_boxes',
        filter: `election_id=eq.${electionId}`,
        callback: () => {
          onUpdate()
        },
      },
    ])
  }

  return {
    loading,
    error,
    fetchBallotBoxes,
    fetchBallotBoxById,
    createBallotBox,
    updateBallotBox,
    toggleBallotBoxStatus,
    deleteBallotBox,
    checkVoterAlreadyVoted,
    releaseBallotBoxForVoter,
    subscribeToBallotBoxes,
  }
}
