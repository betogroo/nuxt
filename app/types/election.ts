export type ElectionStatus = 'awaiting_release' | 'released' | 'tallying' | 'finished'

export type ElectionVotingMode = 'simple' | 'monitored'

export type ElectionTimelineFilter = 'all' | 'active' | 'upcoming' | 'past'

export interface ElectionRow {
  id: string
  name: string
  election_date: string
  digits_count: number
  is_uppercase: boolean
  status: ElectionStatus
  voting_mode?: ElectionVotingMode
  description?: string | null
  created_at: string
  updated_at: string
  created_by?: string | null
  creator_name?: string | null
  deleted_at?: string | null
  candidates_count?: number
}

export interface ElectionInput {
  name: string
  election_date: string
  digits_count: number
  is_uppercase: boolean
  status: ElectionStatus
  voting_mode?: ElectionVotingMode
  description?: string | null
}

export interface ElectionMetrics {
  total: number
  active: number
  upcoming: number
  past: number
}
