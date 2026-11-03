import type { DemandStatus } from './demandStatus'

export type DemandTab = 'planning' | 'items' | 'suppliers'

export const VALID_DEMAND_TABS: readonly DemandTab[] = ['planning', 'items', 'suppliers'] as const

/**
 * Valida se um valor de string corresponde a uma aba válida da demanda.
 */
export function isValidDemandTab(tab: unknown): tab is DemandTab {
  return typeof tab === 'string' && (VALID_DEMAND_TABS as readonly string[]).includes(tab)
}

/**
 * Determina inteligentemente a aba de trabalho prioritária com base na fase da demanda:
 * - 'planning' | 'cancelled' -> 'planning' (Processo & Planejamento)
 * - 'quotation' | 'bidding_notice' | 'dispute' -> 'items' (Itens da Demanda)
 * - 'homologation' | 'completed' -> 'suppliers' (Fornecedores & Empenhos)
 */
export function getDemandDefaultTab(status: DemandStatus | string | null | undefined): DemandTab {
  if (!status) return 'planning'

  switch (status) {
    case 'quotation':
    case 'bidding_notice':
    case 'dispute':
      return 'items'
    case 'homologation':
    case 'completed':
      return 'suppliers'
    case 'planning':
    case 'cancelled':
    default:
      return 'planning'
  }
}

/**
 * Resolve a aba inicial considerando query params da URL e a aba inteligente da fase.
 */
export function resolveInitialDemandTab(
  queryTab: unknown,
  demandStatus: DemandStatus | string | null | undefined,
): DemandTab {
  if (isValidDemandTab(queryTab)) {
    return queryTab
  }
  return getDemandDefaultTab(demandStatus)
}
