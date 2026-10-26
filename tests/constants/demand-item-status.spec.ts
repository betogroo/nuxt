import { describe, it, expect } from 'vitest'
import {
  DEMAND_ITEM_EXECUTION_FLOW,
  DEMAND_ITEM_EXECUTION_STATUS_LABELS,
  DEMAND_ITEM_EXECUTION_STATUS_COLORS,
  DEMAND_ITEM_EXECUTION_STATUS_ICONS,
  ALL_DEMAND_ITEM_EXECUTION_STATUSES,
  getNextExecutionStatus,
  getPreviousExecutionStatus,
} from '~/constants/demand-item-status'

describe('demand-item-status constants', () => {
  it('should maintain the exact 8-step sequential progression', () => {
    expect(DEMAND_ITEM_EXECUTION_FLOW).toEqual([
      'homologated',
      'commitment_issued',
      'commitment_sent',
      'commitment_confirmed',
      'shipped',
      'delivered',
      'received',
      'completed',
    ])
  })

  it('should include error in ALL_DEMAND_ITEM_EXECUTION_STATUSES', () => {
    expect(ALL_DEMAND_ITEM_EXECUTION_STATUSES).toContain('error')
    expect(ALL_DEMAND_ITEM_EXECUTION_STATUSES.length).toBe(9)
  })

  it('should define human-readable labels for all statuses in Portuguese', () => {
    expect(DEMAND_ITEM_EXECUTION_STATUS_LABELS.homologated).toBe('Homologado')
    expect(DEMAND_ITEM_EXECUTION_STATUS_LABELS.commitment_issued).toBe('Empenho Emitido')
    expect(DEMAND_ITEM_EXECUTION_STATUS_LABELS.commitment_sent).toBe('Empenho Enviado')
    expect(DEMAND_ITEM_EXECUTION_STATUS_LABELS.commitment_confirmed).toBe('Empenho Confirmado')
    expect(DEMAND_ITEM_EXECUTION_STATUS_LABELS.shipped).toBe('Enviado')
    expect(DEMAND_ITEM_EXECUTION_STATUS_LABELS.delivered).toBe('Entregue')
    expect(DEMAND_ITEM_EXECUTION_STATUS_LABELS.received).toBe('Recebido')
    expect(DEMAND_ITEM_EXECUTION_STATUS_LABELS.completed).toBe('Concluído')
    expect(DEMAND_ITEM_EXECUTION_STATUS_LABELS.error).toBe('Erro')
  })

  it('should define semantic colors for all statuses', () => {
    for (const status of ALL_DEMAND_ITEM_EXECUTION_STATUSES) {
      expect(DEMAND_ITEM_EXECUTION_STATUS_COLORS[status]).toBeDefined()
    }
    expect(DEMAND_ITEM_EXECUTION_STATUS_COLORS.error).toBe('error')
    expect(DEMAND_ITEM_EXECUTION_STATUS_COLORS.completed).toBe('success')
  })

  it('should define valid icons for all statuses', () => {
    for (const status of ALL_DEMAND_ITEM_EXECUTION_STATUSES) {
      expect(DEMAND_ITEM_EXECUTION_STATUS_ICONS[status]).toBeDefined()
    }
  })

  describe('getNextExecutionStatus', () => {
    it('returns homologated when current is null or undefined', () => {
      expect(getNextExecutionStatus(null)).toBe('homologated')
      expect(getNextExecutionStatus(undefined)).toBe('homologated')
    })

    it('returns commitment_issued when current is homologated', () => {
      expect(getNextExecutionStatus('homologated')).toBe('commitment_issued')
    })

    it('returns commitment_sent when current is commitment_issued', () => {
      expect(getNextExecutionStatus('commitment_issued')).toBe('commitment_sent')
    })

    it('returns completed when current is received', () => {
      expect(getNextExecutionStatus('received')).toBe('completed')
    })

    it('returns null when current is completed or error', () => {
      expect(getNextExecutionStatus('completed')).toBeNull()
      expect(getNextExecutionStatus('error')).toBeNull()
    })
  })

  describe('getPreviousExecutionStatus', () => {
    it('returns null when current is null or homologated', () => {
      expect(getPreviousExecutionStatus(null)).toBeNull()
      expect(getPreviousExecutionStatus('homologated')).toBeNull()
      expect(getPreviousExecutionStatus('error')).toBeNull()
    })

    it('returns previous status along the flow', () => {
      expect(getPreviousExecutionStatus('commitment_issued')).toBe('homologated')
      expect(getPreviousExecutionStatus('commitment_sent')).toBe('commitment_issued')
      expect(getPreviousExecutionStatus('completed')).toBe('received')
    })
  })
})
