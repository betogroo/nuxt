import type { SchoolIncidentStatus } from '~/types/school'
import type { IconName } from '~/components/ui/icons'

export const SCHOOL_INCIDENT_STATUS: Record<string, SchoolIncidentStatus> = {
  NEW: 'new',
  UNDER_REVIEW: 'under_review',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
  ARCHIVED: 'archived',
} as const

export interface SchoolIncidentStatusConfig {
  label: string
  color: string
  icon: IconName
  variant?: 'solid' | 'outline' | 'soft' | 'ghost'
}

export const SCHOOL_INCIDENT_STATUS_MAP: Record<SchoolIncidentStatus, SchoolIncidentStatusConfig> =
  {
    new: {
      label: 'Nova',
      color: 'info',
      icon: 'clockAlert',
      variant: 'soft',
    },
    under_review: {
      label: 'Em Análise',
      color: 'warning',
      icon: 'alertCircle',
      variant: 'soft',
    },
    in_progress: {
      label: 'Em Andamento',
      color: 'primary',
      icon: 'history',
      variant: 'soft',
    },
    resolved: {
      label: 'Resolvida',
      color: 'success',
      icon: 'check',
      variant: 'soft',
    },
    archived: {
      label: 'Arquivada',
      color: 'secondary',
      icon: 'archive',
      variant: 'ghost',
    },
  }

export const SCHOOL_INCIDENT_TERMS_TEXT =
  'Declaro que li e estou ciente dos termos de registro e proteção de dados escolares. Afirmo expressamente que não escrevi nomes de alunos de forma desprotegida no histórico do relato da ocorrência, tendo utilizado exclusivamente os campos próprios de identificação de ofensores e vítimas e as respectivas citações por meio de @ (para ofensores) e / (para vítimas).'
