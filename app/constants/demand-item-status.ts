import type { Database } from '~/types/database.types'
import type { IconName } from '~/components/ui/icons'

export type DemandItemExecutionStatus = Database['public']['Enums']['demand_item_execution_status']

export const DEMAND_ITEM_EXECUTION_FLOW: DemandItemExecutionStatus[] = [
  'homologated',
  'commitment_issued',
  'commitment_sent',
  'commitment_confirmed',
  'shipped',
  'delivered',
  'received',
  'completed',
]

export const DEMAND_ITEM_EXECUTION_STATUS_LABELS: Record<DemandItemExecutionStatus, string> = {
  homologated: 'Homologado',
  commitment_issued: 'Empenho Emitido',
  commitment_sent: 'Empenho Enviado',
  commitment_confirmed: 'Empenho Confirmado',
  shipped: 'Enviado',
  delivered: 'Entregue',
  received: 'Recebido',
  completed: 'Concluído',
  error: 'Erro',
}

export const DEMAND_ITEM_EXECUTION_STATUS_COLORS: Record<DemandItemExecutionStatus, string> = {
  homologated: 'primary',
  commitment_issued: 'purple',
  commitment_sent: 'indigo',
  commitment_confirmed: 'teal',
  shipped: 'blue',
  delivered: 'cyan',
  received: 'orange',
  completed: 'success',
  error: 'error',
}

export const DEMAND_ITEM_EXECUTION_STATUS_ICONS: Record<DemandItemExecutionStatus, IconName> = {
  homologated: 'check',
  commitment_issued: 'document',
  commitment_sent: 'document',
  commitment_confirmed: 'recordsList',
  shipped: 'delivery',
  delivered: 'packageSolid',
  received: 'clipboardClock',
  completed: 'success',
  error: 'alert',
}

export const ALL_DEMAND_ITEM_EXECUTION_STATUSES: DemandItemExecutionStatus[] = [
  ...DEMAND_ITEM_EXECUTION_FLOW,
  'error',
]

export interface DemandItemExecutionStatusOption {
  value: DemandItemExecutionStatus
  title: string
  color: string
  icon: IconName
}

export const DEMAND_ITEM_EXECUTION_STATUS_OPTIONS: DemandItemExecutionStatusOption[] =
  ALL_DEMAND_ITEM_EXECUTION_STATUSES.map((status) => ({
    value: status,
    title: DEMAND_ITEM_EXECUTION_STATUS_LABELS[status],
    color: DEMAND_ITEM_EXECUTION_STATUS_COLORS[status],
    icon: DEMAND_ITEM_EXECUTION_STATUS_ICONS[status],
  }))

export function formatDemandItemExecutionStatus(
  status: DemandItemExecutionStatus | null | undefined,
): string {
  if (!status) return DEMAND_ITEM_EXECUTION_STATUS_LABELS.homologated
  return DEMAND_ITEM_EXECUTION_STATUS_LABELS[status] || status
}

export function getDemandItemExecutionStatusColor(
  status: DemandItemExecutionStatus | null | undefined,
): string {
  if (!status) return DEMAND_ITEM_EXECUTION_STATUS_COLORS.homologated
  return DEMAND_ITEM_EXECUTION_STATUS_COLORS[status] || 'grey'
}

export function getDemandItemExecutionStatusIcon(
  status: DemandItemExecutionStatus | null | undefined,
): IconName {
  if (!status) return DEMAND_ITEM_EXECUTION_STATUS_ICONS.homologated
  return DEMAND_ITEM_EXECUTION_STATUS_ICONS[status] || 'circle'
}

export function getDemandItemExecutionStatusStepIndex(
  status: DemandItemExecutionStatus | null | undefined,
): number {
  if (!status) return 0
  const idx = DEMAND_ITEM_EXECUTION_FLOW.indexOf(status)
  return idx >= 0 ? idx : 0
}

export function getNextExecutionStatus(
  currentStatus: DemandItemExecutionStatus | null | undefined,
): DemandItemExecutionStatus | null {
  if (!currentStatus) return DEMAND_ITEM_EXECUTION_FLOW[0]
  const currentIndex = DEMAND_ITEM_EXECUTION_FLOW.indexOf(currentStatus)
  if (currentIndex === -1 || currentIndex >= DEMAND_ITEM_EXECUTION_FLOW.length - 1) {
    return null
  }
  return DEMAND_ITEM_EXECUTION_FLOW[currentIndex + 1]
}

export function getPreviousExecutionStatus(
  currentStatus: DemandItemExecutionStatus | null | undefined,
): DemandItemExecutionStatus | null {
  if (!currentStatus) return null
  const currentIndex = DEMAND_ITEM_EXECUTION_FLOW.indexOf(currentStatus)
  if (currentIndex <= 0) return null
  return DEMAND_ITEM_EXECUTION_FLOW[currentIndex - 1]
}
