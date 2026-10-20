import type { ElectionStatus } from '~/types/election'

export const ELECTION_STATUS: Record<string, ElectionStatus> = {
  AWAITING_RELEASE: 'awaiting_release',
  RELEASED: 'released',
  TALLYING: 'tallying',
  FINISHED: 'finished',
} as const

export const ELECTION_STATUS_LABELS: Record<ElectionStatus, string> = {
  awaiting_release: 'Aguardando Liberação',
  released: 'Liberada',
  tallying: 'Em Apuração',
  finished: 'Finalizada',
}

export const ELECTION_STATUS_COLORS: Record<ElectionStatus, string> = {
  awaiting_release: 'warning',
  released: 'success',
  tallying: 'info',
  finished: 'secondary',
}
