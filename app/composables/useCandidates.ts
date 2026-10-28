import { ref } from 'vue'
import { useSupabaseClient } from '#imports'
import { useLogger } from './useLogger'
import type { CandidateRow, CandidateInput } from '~/types/candidate'

export function useCandidates() {
  const supabase = useSupabaseClient()
  const { logAction } = useLogger()

  const loading = ref(false)
  const error = ref<string | null>(null)

  const generateRandomPhotoUrl = (seed?: string): string => {
    const randomKey = seed || Math.random().toString(36).substring(2, 9)
    return `https://picsum.photos/seed/${randomKey}/300/300`
  }

  const uploadCandidatePhoto = async (
    file: File,
    electionId: string,
    candidateNumber: string,
  ): Promise<string> => {
    loading.value = true
    error.value = null

    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const sanitizedNumber = candidateNumber.replace(/\D/g, '') || 'cand'
      const filePath = `${electionId}/${sanitizedNumber}_${Date.now()}.${fileExt}`

      const { data, error: uploadErr } = await supabase.storage
        .from('candidate-photos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        })

      if (uploadErr) {
        console.error('Erro no upload da foto do candidato:', uploadErr)
        throw new Error(uploadErr.message || 'Falha ao enviar foto para o armazenamento.')
      }

      const { data: publicUrlData } = supabase.storage
        .from('candidate-photos')
        .getPublicUrl(data.path)

      return publicUrlData.publicUrl
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Erro ao fazer upload da foto.'
      error.value = message
      throw e
    } finally {
      loading.value = false
    }
  }

  const deleteCandidatePhoto = async (photoUrl: string): Promise<void> => {
    if (!photoUrl) return
    const marker = '/storage/v1/object/public/candidate-photos/'
    if (photoUrl.includes(marker)) {
      const filePath = photoUrl.split(marker)[1]
      if (filePath) {
        const { error: delErr } = await supabase.storage.from('candidate-photos').remove([filePath])
        if (delErr) {
          console.warn('Aviso: Não foi possível remover foto antiga do storage:', delErr)
        }
      }
    }
  }

  const fetchCandidates = async (electionId: string): Promise<CandidateRow[]> => {
    loading.value = true
    error.value = null

    try {
      const { data, error: err } = await supabase
        .from('candidates')
        .select('*')
        .eq('election_id', electionId)
        .is('deleted_at', null)
        .order('candidate_number', { ascending: true })

      if (err) {
        console.error('Erro ao buscar candidatos:', err)
        throw new Error(err.message || 'Falha ao buscar candidatos da eleição.')
      }

      return (data as CandidateRow[]) || []
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Erro ao buscar candidatos.'
      error.value = message
      throw e
    } finally {
      loading.value = false
    }
  }

  const createCandidate = async (
    electionId: string,
    payload: CandidateInput,
  ): Promise<CandidateRow> => {
    loading.value = true
    error.value = null

    try {
      let photoUrl = payload.photo_url && payload.photo_url.trim() ? payload.photo_url.trim() : null

      if (payload.photo_file) {
        photoUrl = await uploadCandidatePhoto(
          payload.photo_file,
          electionId,
          payload.candidate_number,
        )
      } else if (!photoUrl) {
        photoUrl = generateRandomPhotoUrl(payload.candidate_number)
      }

      const { data, error: err } = await supabase
        .from('candidates')
        .insert({
          election_id: electionId,
          name: payload.name.trim(),
          candidate_number: payload.candidate_number.trim(),
          photo_url: photoUrl,
        })
        .select('*')
        .single()

      if (err) {
        if (err.code === '23505') {
          throw new Error(
            `Já existe um candidato com o número ${payload.candidate_number.trim()} nesta eleição.`,
          )
        }
        console.error('Erro ao criar candidato:', err)
        throw new Error(err.message || 'Falha ao cadastrar candidato.')
      }

      await logAction(
        'CREATE_CANDIDATE',
        `Candidato cadastrado: "${payload.name.trim()}" (Nº ${payload.candidate_number.trim()}) na eleição ${electionId}`,
      )

      return data as CandidateRow
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Erro ao cadastrar candidato.'
      error.value = message
      throw e
    } finally {
      loading.value = false
    }
  }

  const updateCandidate = async (
    id: string,
    payload: Partial<CandidateInput> & { election_id?: string },
  ): Promise<CandidateRow> => {
    loading.value = true
    error.value = null

    try {
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      }

      if (payload.name !== undefined) updateData.name = payload.name.trim()
      if (payload.candidate_number !== undefined) {
        updateData.candidate_number = payload.candidate_number.trim()
      }

      if (payload.photo_file) {
        const targetElectionId = payload.election_id || 'general'
        const newPhotoUrl = await uploadCandidatePhoto(
          payload.photo_file,
          targetElectionId,
          payload.candidate_number || 'cand',
        )
        updateData.photo_url = newPhotoUrl
      } else if (payload.photo_url !== undefined) {
        updateData.photo_url = payload.photo_url ? payload.photo_url.trim() : null
      }

      const { data, error: err } = await supabase
        .from('candidates')
        .update(updateData)
        .eq('id', id)
        .select('*')
        .single()

      if (err) {
        if (err.code === '23505') {
          throw new Error('Já existe outro candidato com este número nesta eleição.')
        }
        console.error('Erro ao atualizar candidato:', err)
        throw new Error(err.message || 'Falha ao atualizar dados do candidato.')
      }

      await logAction('UPDATE_CANDIDATE', `Candidato atualizado: ${id}`)
      return data as CandidateRow
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Erro ao atualizar candidato.'
      error.value = message
      throw e
    } finally {
      loading.value = false
    }
  }

  const deleteCandidate = async (id: string): Promise<void> => {
    loading.value = true
    error.value = null

    try {
      // Safe delete: atualiza deleted_at mantendo integridade
      const { error: err } = await supabase
        .from('candidates')
        .update({
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (err) {
        console.error('Erro ao excluir candidato:', err)
        throw new Error(err.message || 'Falha ao excluir candidato.')
      }

      await logAction('DELETE_CANDIDATE', `Candidato excluído (safe delete): ${id}`)
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Erro ao excluir candidato.'
      error.value = message
      throw e
    } finally {
      loading.value = false
    }
  }

  const hasElectionCandidates = async (electionId: string): Promise<boolean> => {
    try {
      const { count } = await supabase
        .from('candidates')
        .select('id', { count: 'exact', head: true })
        .eq('election_id', electionId)
        .is('deleted_at', null)
      return (count || 0) > 0
    } catch {
      return false
    }
  }

  return {
    loading,
    error,
    generateRandomPhotoUrl,
    uploadCandidatePhoto,
    deleteCandidatePhoto,
    fetchCandidates,
    hasElectionCandidates,
    createCandidate,
    updateCandidate,
    deleteCandidate,
  }
}
