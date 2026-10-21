export interface CandidateRow {
  id: string
  election_id: string
  name: string
  candidate_number: string
  photo_url?: string | null
  deleted_at?: string | null
  created_at: string
  updated_at: string
}

export interface CandidateInput {
  name: string
  candidate_number: string
  photo_url?: string | null
}
