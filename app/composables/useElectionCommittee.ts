import { useSupabaseClient } from '#imports'
import { useLogger } from '~/composables/useLogger'
import type {
  ElectionCommitteeMemberInput,
  ElectionCommitteeMemberRow,
} from '~/types/election-committee'

export const useElectionCommittee = () => {
  const supabase = useSupabaseClient()
  const { logAction } = useLogger()

  const fetchCommitteeMembers = async (
    electionId: string,
  ): Promise<ElectionCommitteeMemberRow[]> => {
    const { data, error } = await supabase
      .from('election_committee_members')
      .select('*')
      .eq('election_id', electionId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) {
      throw new Error(`Erro ao carregar comissão eleitoral: ${error.message}`)
    }

    return (data || []) as ElectionCommitteeMemberRow[]
  }

  const addCommitteeMember = async (
    payload: ElectionCommitteeMemberInput,
  ): Promise<ElectionCommitteeMemberRow> => {
    const cleanName = payload.name.trim()
    const cleanRole = payload.role_name.trim()

    if (!cleanName || !cleanRole) {
      throw new Error('O nome e o cargo do membro da comissão são obrigatórios.')
    }

    const { data: userData } = await supabase.auth.getUser()
    const userId = userData?.user?.id || null

    const { data, error } = await supabase
      .from('election_committee_members')
      .insert({
        election_id: payload.election_id,
        name: cleanName,
        role_name: cleanRole,
        sort_order: payload.sort_order ?? 0,
        created_by: userId,
      })
      .select('*')
      .single()

    if (error || !data) {
      throw new Error(`Erro ao adicionar membro à comissão: ${error?.message || 'Desconhecido'}`)
    }

    const member = data as ElectionCommitteeMemberRow
    await logAction(
      'ADD_ELECTION_COMMITTEE_MEMBER',
      `Membro "${member.name}" (${member.role_name}) adicionado à comissão da eleição (ID: ${member.election_id}).`,
    )

    return member
  }

  const updateCommitteeMember = async (
    id: string,
    payload: Partial<Pick<ElectionCommitteeMemberInput, 'name' | 'role_name' | 'sort_order'>>,
  ): Promise<ElectionCommitteeMemberRow> => {
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (payload.name !== undefined) {
      const cleanName = payload.name.trim()
      if (!cleanName) throw new Error('O nome do membro da comissão é obrigatório.')
      updateData.name = cleanName
    }

    if (payload.role_name !== undefined) {
      const cleanRole = payload.role_name.trim()
      if (!cleanRole) throw new Error('O cargo do membro da comissão é obrigatório.')
      updateData.role_name = cleanRole
    }

    if (payload.sort_order !== undefined) {
      updateData.sort_order = payload.sort_order
    }

    const { data, error } = await supabase
      .from('election_committee_members')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single()

    if (error || !data) {
      throw new Error(`Erro ao atualizar membro da comissão: ${error?.message || 'Desconhecido'}`)
    }

    const member = data as ElectionCommitteeMemberRow
    await logAction(
      'UPDATE_ELECTION_COMMITTEE_MEMBER',
      `Membro da comissão "${member.name}" (${member.role_name}) atualizado (ID: ${member.id}).`,
    )

    return member
  }

  const deleteCommitteeMember = async (id: string, memberName?: string): Promise<void> => {
    const { error } = await supabase.from('election_committee_members').delete().eq('id', id)

    if (error) {
      throw new Error(`Erro ao remover membro da comissão: ${error.message}`)
    }

    await logAction(
      'DELETE_ELECTION_COMMITTEE_MEMBER',
      `Membro da comissão ${memberName ? `"${memberName}" ` : ''}removido (ID: ${id}).`,
    )
  }

  return {
    fetchCommitteeMembers,
    addCommitteeMember,
    updateCommitteeMember,
    deleteCommitteeMember,
  }
}
