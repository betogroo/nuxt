import type { Database } from '~/types/database.types'
import type { IconName } from '~/components/ui/icons'

export type DemandItemExecutionStatus = Database['public']['Enums']['demand_item_execution_status']

export const DEMAND_ITEM_EXECUTION_FLOW: DemandItemExecutionStatus[] = [
  'homologated',
  'commitment_sent',
  'commitment_confirmed',
  'shipped',
  'delivered',
  'received',
  'completed',
]

export const DEMAND_ITEM_EXECUTION_STATUS_LABELS: Record<DemandItemExecutionStatus, string> = {
  homologated: 'Homologado',
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
