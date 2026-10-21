import { ref } from 'vue'
import { useSupabaseClient } from '#imports'
import { useLogger } from './useLogger'
import type { BallotBoxRow, BallotBoxInput } from '~/types/ballot-box'
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
      const { data, error: err } = await supabase
        .from('ballot_boxes')
        .update({
          is_active: isActive,
          updated_at: new Date().toISOString(),
        })
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

  const subscribeToBallotBoxes = (electionId: string, onUpdate: () => void): RealtimeChannel => {
    const channelName = `ballot_boxes_election_${electionId}_${Date.now()}`
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ballot_boxes',
          filter: `election_id=eq.${electionId}`,
        },
        () => {
          onUpdate()
        },
      )
      .subscribe()

    return channel
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
    subscribeToBallotBoxes,
  }
}
