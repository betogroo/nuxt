import type { CandidateRow } from './candidate'

export interface ElectionVoteRow {
  id: string
  election_id: string
  ballot_box_id: string | null
  candidate_id: string | null
  candidate_number: string | null
  is_blank: boolean
  is_null: boolean
  voter_id?: string | null
  voter_registration_number?: string | null
  voter_name?: string | null
  created_at: string
}

export interface CastElectionVoteInput {
  election_id: string
  ballot_box_id?: string | null
  candidate_id?: string | null
  candidate_number?: string | null
  is_blank: boolean
  is_null: boolean
  voter_id?: string | null
  voter_registration_number?: string | null
  voter_name?: string | null
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
