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
    ] as IirgdDemandStatus[],
  },
]
