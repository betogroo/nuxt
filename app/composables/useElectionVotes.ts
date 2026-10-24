import { useSupabaseClient } from '#imports'
import { useLogger } from '~/composables/useLogger'
import type { CandidateRow } from '~/types/candidate'
import type {
  CandidateTallyItem,
  CastElectionVoteInput,
  ElectionTallySummary,
  ElectionVoteRow,
} from '~/types/election-vote'

export const useElectionVotes = () => {
  const supabase = useSupabaseClient()
  const { logAction } = useLogger()

  const castVote = async (payload: CastElectionVoteInput): Promise<ElectionVoteRow> => {
    const { data, error } = await supabase
      .from('election_votes')
      .insert({
        election_id: payload.election_id,
        ballot_box_id: payload.ballot_box_id ?? null,
        candidate_id: payload.candidate_id ?? null,
        candidate_number: payload.candidate_number ?? null,
        is_blank: payload.is_blank,
        is_null: payload.is_null,
      })
      .select('*')
      .single()

    if (error || !data) {
      throw new Error(`Erro ao registrar voto na urna: ${error?.message || 'Desconhecido'}`)
    }

    const vote = data as ElectionVoteRow
    await logAction(
      'CAST_ELECTION_VOTE',
      `Voto anônimo registrado na eleição (ID: ${payload.election_id})${payload.ballot_box_id ? ` via urna (ID: ${payload.ballot_box_id})` : ''}.`,
    )

    return vote
  }

  const fetchElectionVotes = async (electionId: string): Promise<ElectionVoteRow[]> => {
    const { data, error } = await supabase
      .from('election_votes')
      .select('*')
      .eq('election_id', electionId)
      .order('created_at', { ascending: true })

    if (error) {
      throw new Error(`Erro ao carregar votos da eleição: ${error.message}`)
    }

    return (data || []) as ElectionVoteRow[]
  }

  const computeElectionTally = (
    candidates: CandidateRow[],
    votes: ElectionVoteRow[],
  ): ElectionTallySummary => {
    const totalVotes = votes.length
    let blankVotes = 0
    let nullVotes = 0
    let validVotes = 0

    const candidateCounts = new Map<string, number>()
    for (const candidate of candidates) {
      candidateCounts.set(candidate.id, 0)
    }

    for (const vote of votes) {
      if (vote.is_blank) {
        blankVotes += 1
      } else if (vote.is_null || !vote.candidate_id) {
        nullVotes += 1
      } else {
        validVotes += 1
        const prev = candidateCounts.get(vote.candidate_id) ?? 0
        candidateCounts.set(vote.candidate_id, prev + 1)
      }
    }

    const roundPct = (value: number): number => Math.round(value * 100) / 100

    const validPercentage = totalVotes > 0 ? roundPct((validVotes / totalVotes) * 100) : 0
    const blankPercentage = totalVotes > 0 ? roundPct((blankVotes / totalVotes) * 100) : 0
    const nullPercentage = totalVotes > 0 ? roundPct((nullVotes / totalVotes) * 100) : 0

    const sortedCandidates = [...candidates].sort((a, b) => {
      const countA = candidateCounts.get(a.id) ?? 0
      const countB = candidateCounts.get(b.id) ?? 0
      if (countB !== countA) return countB - countA
      return a.name.localeCompare(b.name, 'pt-BR')
    })

    const candidatesRanking: CandidateTallyItem[] = sortedCandidates.map((candidate, index) => {
      const votesCount = candidateCounts.get(candidate.id) ?? 0
      return {
        rank: index + 1,
        candidate,
        votesCount,
        percentageOfValid: validVotes > 0 ? roundPct((votesCount / validVotes) * 100) : 0,
        percentageOfTotal: totalVotes > 0 ? roundPct((votesCount / totalVotes) * 100) : 0,
      }
    })

    return {
      totalVotes,
      validVotes,
      blankVotes,
      nullVotes,
      validPercentage,
      blankPercentage,
      nullPercentage,
      candidatesRanking,
    }
  }

  return {
    castVote,
    fetchElectionVotes,
    computeElectionTally,
  }
}
