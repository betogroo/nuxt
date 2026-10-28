import type { ElectionStatus, ElectionVotingMode } from '~/types/election'

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

export const ELECTION_VOTING_MODE_LABELS: Record<ElectionVotingMode, string> = {
  simple: 'Simples (Contínua)',
  monitored: 'Monitorada (Por Título)',
}

export const ELECTION_VOTING_MODE_COLORS: Record<ElectionVotingMode, string> = {
  simple: 'teal',
  monitored: 'indigo',
}

export const ELECTION_VOTER_STATUS_OPTIONS = [
  { title: 'Todas as Situações', value: 'all' },
  { title: 'Apenas Ativos (Aptos)', value: 'active' },
  { title: 'Apenas Inativos', value: 'inactive' },
]
