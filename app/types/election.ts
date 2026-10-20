export type ElectionStatus = 'awaiting_release' | 'released' | 'tallying' | 'finished'

export type ElectionTimelineFilter = 'all' | 'active' | 'upcoming' | 'past'

export interface ElectionRow {
  id: string
  name: string
  election_date: string
  digits_count: number
  is_uppercase: boolean
  status: ElectionStatus
  description?: string | null
  created_at: string
  updated_at: string
  created_by?: string | null
  creator_name?: string | null
  deleted_at?: string | null
}

export interface ElectionInput {
  name: string
  election_date: string
  digits_count: number
  is_uppercase: boolean
  status: ElectionStatus
  description?: string | null
}

export interface ElectionMetrics {
  total: number
  active: number
  upcoming: number
  past: number
}
