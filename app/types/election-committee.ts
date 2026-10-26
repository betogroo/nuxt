export interface ElectionCommitteeMemberRow {
  id: string
  election_id: string
  name: string
  role_name: string
  sort_order: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ElectionCommitteeMemberInput {
  election_id: string
  name: string
  role_name: string
  sort_order?: number
}
