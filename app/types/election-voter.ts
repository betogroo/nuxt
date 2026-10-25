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

export interface ElectionVoterFilter extends VoterSearchFilter {
  page?: number
  sortOrder?: 'asc' | 'desc'
  sortBy?: 'name' | 'voter_registration_number' | 'created_at'
}

export interface ElectionVotersPagedResponse {
  data: ElectionVoterRow[]
  count: number
}

export interface VoterCardItem {
  id: string
  voter_registration_number: string
  name: string
  is_active: boolean
  issueDate: string
}

export interface VoterCardEmissionOptions {
  issueDate: string
  voters: ElectionVoterRow[]
}
