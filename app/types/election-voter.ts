export interface ElectionVoterRow {
  id: string
  voter_registration_number: string
  name: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ElectionVoterInput {
  voter_registration_number: string
  name: string
  is_active?: boolean
}

export interface VoterSearchFilter {
  search?: string
  is_active?: boolean
  limit?: number
  offset?: number
}
