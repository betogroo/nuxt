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

export interface VoterAttendanceRow {
  id: string
  election_id: string
  ballot_box_id: string | null
  voter_id?: string | null
  voter_registration_number: string
  released_by: string | null
  voted_at: string
  created_at: string
}

export interface ReleaseBallotBoxForVoterInput {
  electionId: string
  ballotBoxId: string
  voterRegistrationNumber: string
  voterId?: string | null
}
