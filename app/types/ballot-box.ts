export interface BallotBoxRow {
  id: string
  election_id: string
  name: string
  device_info: string | null
  is_active: boolean
  created_by: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export interface BallotBoxInput {
  election_id: string
  name: string
  device_info?: string | null
}
