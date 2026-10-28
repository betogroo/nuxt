export type IirgdDemandStatus =
  | 'new'
  | 'confronted'
  | 'released'
  | 'issued'
  | 'mailbag'
  | 'cegaf'
  | 'no_data'
  | 'other_pending'
  | 'protocol_cancelled'
  | 'awaiting_collection'
  | 'confrontation_failed'
  | 'unknown_error'

export const IIRGD_STATUS_LABELS: Record<IirgdDemandStatus, string> = {
  new: 'Novo',
  confronted: 'Consultado',
  released: 'Liberado',
  issued: 'Emitido',
  mailbag: 'Malote',
  cegaf: 'Cegaf',
  no_data: 'Sem dados para Confronto',
  other_pending: 'Outra Pendência (constar)',
  protocol_cancelled: 'Protocolo Cancelado',
  awaiting_collection: 'Aguardando Nova Coleta',
  confrontation_failed: 'Confronto Fracassado',
  unknown_error: 'Erro Desconhecido',
}

export const IIRGD_STATUS_COLORS: Record<IirgdDemandStatus, string> = {
  // Success Flow (Blue -> Teal -> Green)
  new: 'info',
  confronted: 'primary',
  released: 'teal',
  issued: 'success',

  // Pending Flow (Warning / Orange)
  mailbag: 'warning',
  cegaf: 'warning',
  no_data: 'warning',
  other_pending: 'warning',

  // Error Flow (Red)
  protocol_cancelled: 'error',
  awaiting_collection: 'error',
  confrontation_failed: 'error',
  unknown_error: 'error',
}

export const IIRGD_STATUS_GROUPS = [
  {
    label: 'Fluxo Principal',
    options: ['new', 'confronted', 'released', 'issued'] as IirgdDemandStatus[],
  },
  {
    label: 'Pendências',
    options: ['mailbag', 'cegaf', 'no_data', 'other_pending'] as IirgdDemandStatus[],
  },
  {
    label: 'Erros e Cancelamentos',
    options: [
      'protocol_cancelled',
      'awaiting_collection',
      'confrontation_failed',
      'unknown_error',
    ] as IirgdDemandStatus[],
  },
]

export type IirgdStatusGroup =
  'in-progress' | 'consulted' | 'released' | 'issued' | 'issued-antecedents' | 'errors'

export const IIRGD_STATUS_GROUP_TITLES: Record<IirgdStatusGroup, string> = {
  'in-progress': 'Em Andamento',
  consulted: 'Consultados',
  released: 'Liberados',
  issued: 'RGs Emitidos',
  'issued-antecedents': 'Antecedentes Emitidos',
  errors: 'Erros e Pendências',
}

export const IIRGD_STATUS_BY_GROUP: Record<IirgdStatusGroup, IirgdDemandStatus[]> = {
  'in-progress': ['new', 'mailbag', 'cegaf', 'no_data', 'other_pending'],
  consulted: ['confronted'],
  released: ['released'],
  issued: ['issued'],
  'issued-antecedents': ['issued'],
  errors: ['protocol_cancelled', 'awaiting_collection', 'confrontation_failed', 'unknown_error'],
}

export const IIRGD_ACTIVE_STATUSES: IirgdDemandStatus[] = [
  ...IIRGD_STATUS_BY_GROUP['in-progress'],
  ...IIRGD_STATUS_BY_GROUP.consulted,
  ...IIRGD_STATUS_BY_GROUP.released,
]

export const IIRGD_SLA_IGNORED_STATUSES: IirgdDemandStatus[] = [
  ...IIRGD_STATUS_BY_GROUP.issued,
  ...IIRGD_STATUS_BY_GROUP.errors,
]

export function getIirgdStatusSelectOptions(): Array<{
  title: string
  value: IirgdDemandStatus
}> {
  return IIRGD_STATUS_GROUPS.flatMap((group) =>
    group.options.map((opt) => ({
      title: `${IIRGD_STATUS_LABELS[opt]} (${group.label})`,
      value: opt,
    })),
  )
}
