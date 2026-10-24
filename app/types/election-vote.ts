import type { CandidateRow } from './candidate'

export interface ElectionVoteRow {
  id: string
  election_id: string
  ballot_box_id: string | null
  candidate_id: string | null
  candidate_number: string | null
  is_blank: boolean
  is_null: boolean
  created_at: string
}

export interface CastElectionVoteInput {
  election_id: string
  ballot_box_id?: string | null
  candidate_id?: string | null
  candidate_number?: string | null
  is_blank: boolean
  is_null: boolean
}

export interface CandidateTallyItem {
  rank: number
  candidate: CandidateRow
  votesCount: number
  percentageOfValid: number
  percentageOfTotal: number
}

export interface ElectionTallySummary {
  totalVotes: number
  validVotes: number
  blankVotes: number
  nullVotes: number
  validPercentage: number
  blankPercentage: number
  nullPercentage: number
  candidatesRanking: CandidateTallyItem[]
}
