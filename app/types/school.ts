export type SchoolIncidentStatus = 'new' | 'under_review' | 'in_progress' | 'resolved' | 'archived'

export type IncidentParticipantRole = 'offender' | 'victim'

export interface SchoolIncidentParticipant {
  id: string
  incident_id: string
  role: IncidentParticipantRole
  name: string
  classroom: string | null
  created_at: string
  updated_at: string
}

export interface SchoolIncidentAuthor {
  id: string
  name: string | null
  role: string | null
  email?: string | null
}

export interface SchoolIncident {
  id: string
  title: string
  description: string
  status: SchoolIncidentStatus
  terms_accepted: boolean
  created_by: string
  created_at: string
  updated_at: string
  participants?: SchoolIncidentParticipant[]
  author?: SchoolIncidentAuthor
}

export interface IncidentParticipantInput {
  name: string
  classroom?: string
}

export interface CreateSchoolIncidentPayload {
  title: string
  description: string
  terms_accepted: boolean
  offenders: IncidentParticipantInput[]
  victims?: IncidentParticipantInput[]
}
