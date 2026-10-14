import type { Database } from '~/types/database.types'

export type DemandStatus = Database['public']['Enums']['demand_status']

export interface DemandStatusMeta {
  title: string
  color: string
}

/**
 * Metadados centralizados de status de demanda.
 * Rótulos alinhados com o fluxo de trabalho (workflow) e telas do sistema.
 */
export const DEMAND_STATUS_META: Record<DemandStatus, DemandStatusMeta> = {
  planning: {
    title: 'Planejamento',
    color: 'grey',
  },
  bidding_notice: {
    title: 'Aviso de Contratação',
    color: 'info',
  },
  quotation: {
    title: 'Cotação',
    color: 'deep-purple',
  },
  dispute: {
    title: 'Disputa',
    color: 'warning',
  },
  homologation: {
    title: 'Homologação',
    color: 'primary',
  },
  completed: {
    title: 'Concluído',
    color: 'success',
  },
  cancelled: {
    title: 'Cancelado',
    color: 'error',
  },
}

export function formatDemandStatus(status: string | null | undefined): string {
  if (!status) return '-'
  return DEMAND_STATUS_META[status as DemandStatus]?.title || status
}

export function getDemandStatusColor(status: string | null | undefined): string {
  if (!status) return 'grey'
  return DEMAND_STATUS_META[status as DemandStatus]?.color || 'grey'
}

export interface DemandStatusOption {
  title: string
  value: DemandStatus | 'returns'
  color: string
}

/**
 * Retorna as opções disponíveis para filtros de status em listagens de demandas.
 */
export function getDemandStatusFilterOptions(): DemandStatusOption[] {
  return [
    { title: DEMAND_STATUS_META.planning.title, value: 'planning', color: 'blue-grey' },
    { title: DEMAND_STATUS_META.bidding_notice.title, value: 'bidding_notice', color: 'info' },
    { title: DEMAND_STATUS_META.quotation.title, value: 'quotation', color: 'secondary' },
    { title: DEMAND_STATUS_META.dispute.title, value: 'dispute', color: 'warning' },
    { title: DEMAND_STATUS_META.homologation.title, value: 'homologation', color: 'deep-purple' },
    { title: DEMAND_STATUS_META.completed.title, value: 'completed', color: 'success' },
    { title: DEMAND_STATUS_META.cancelled.title, value: 'cancelled', color: 'error' },
    { title: 'Retorno (Admin)', value: 'returns', color: 'orange' },
  ]
}
