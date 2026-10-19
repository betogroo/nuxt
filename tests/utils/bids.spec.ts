import { describe, it, expect } from 'vitest'
import {
  getWinningBid,
  compareBids,
  formatBidStatus,
  getBidStatusColor,
  getItemSubtotal,
  getItemDisputeResult,
} from '../../app/utils/bids'

describe('utils/bids', () => {
  describe('getWinningBid', () => {
    it('returns null for null, undefined or empty arrays', () => {
      expect(getWinningBid(null)).toBeNull()
      expect(getWinningBid(undefined)).toBeNull()
      expect(getWinningBid([])).toBeNull()
    })

    it('returns the only bid if there is just one', () => {
      const single = { id: 'b1', amount: 50 }
      expect(getWinningBid([single])).toEqual(single)
    })

    it('returns the lowest bid among multiple bids', () => {
      const bids = [
        { id: 'b1', amount: 100 },
        { id: 'b2', amount: 45.5 },
        { id: 'b3', amount: 80 },
      ]
      expect(getWinningBid(bids)).toEqual({ id: 'b2', amount: 45.5 })
    })

    it('returns the first encountered bid in case of a tie without created_at', () => {
      const bids = [
        { id: 'b1', amount: 30 },
        { id: 'b2', amount: 30 },
      ]
      expect(getWinningBid(bids)?.id).toBe('b1')
    })

    it('breaks ties by created_at (older bid wins over newer bid)', () => {
      const bids = [
        { id: 'b-newer', amount: 30, created_at: '2026-10-16T10:05:00Z' },
        { id: 'b-older', amount: 30, created_at: '2026-10-16T10:00:00Z' },
      ]
      expect(getWinningBid(bids)?.id).toBe('b-older')
    })

    it('ignores disqualified bids and selects the next lowest classified bid', () => {
      const bids = [
        { id: 'b1', amount: 25, status: 'disqualified' as const },
        { id: 'b2', amount: 40, status: 'classified' as const },
        { id: 'b3', amount: 60, status: 'classified' as const },
      ]
      expect(getWinningBid(bids)?.id).toBe('b2')
    })

    it('returns null if all bids are disqualified', () => {
      const bids = [
        { id: 'b1', amount: 25, status: 'disqualified' as const },
        { id: 'b2', amount: 40, status: 'disqualified' as const },
      ]
      expect(getWinningBid(bids)).toBeNull()
    })

    it('correctly handles bids with string numbers', () => {
      const bids = [
        { id: 'b1', amount: '100.00' },
        { id: 'b2', amount: '45.50' },
        { id: 'b3', amount: 80 },
      ]
      expect(getWinningBid(bids)?.id).toBe('b2')
    })
  })

  describe('compareBids', () => {
    it('sorts by amount ascending and breaks ties by oldest created_at', () => {
      const bids = [
        { id: 'b3', amount: 50, created_at: '2026-10-16T08:00:00Z' },
        { id: 'b2', amount: 30, created_at: '2026-10-16T09:30:00Z' },
        { id: 'b1', amount: 30, created_at: '2026-10-16T09:00:00Z' },
      ]
      const sorted = [...bids].sort(compareBids)
      expect(sorted.map((b) => b.id)).toEqual(['b1', 'b2', 'b3'])
    })
  })

  describe('formatBidStatus & getBidStatusColor', () => {
    it('formats status labels and colors properly', () => {
      expect(formatBidStatus('classified')).toBe('Classificado')
      expect(formatBidStatus('disqualified')).toBe('Desclassificado')
      expect(formatBidStatus(null)).toBe('Classificado')

      expect(getBidStatusColor('classified')).toBe('success')
      expect(getBidStatusColor('disqualified')).toBe('error')
      expect(getBidStatusColor(undefined)).toBe('success')
    })
  })

  describe('getItemSubtotal', () => {
    it('calculates subtotal multiplying unitAmount by quantity', () => {
      expect(getItemSubtotal(10, 5)).toBe(50)
      expect(getItemSubtotal(2.5, 4)).toBe(10)
    })

    it('defaults quantity to 1 if null, undefined, or <= 0', () => {
      expect(getItemSubtotal(15, null)).toBe(15)
      expect(getItemSubtotal(15, undefined)).toBe(15)
      expect(getItemSubtotal(15, 0)).toBe(15)
      expect(getItemSubtotal(15, -2)).toBe(15)
    })
  })

  describe('getItemDisputeResult', () => {
    it('returns deserted when item has no bids', () => {
      const resultEmpty = getItemDisputeResult({ quantity: 5, demand_product_bids: [] })
      expect(resultEmpty.outcome).toBe('deserted')
      expect(resultEmpty.label).toBe('Deserto')
      expect(resultEmpty.color).toBe('warning')
      expect(resultEmpty.winningBid).toBeNull()

      const resultNull = getItemDisputeResult({ quantity: 5, demand_product_bids: null })
      expect(resultNull.outcome).toBe('deserted')
      expect(resultNull.winningBid).toBeNull()
    })

    it('returns failed when item has bids but all are disqualified', () => {
      const result = getItemDisputeResult({
        quantity: 10,
        demand_product_bids: [
          {
            amount: 50,
            status: 'disqualified',
            disqualification_reason: 'Desacordo técnico',
            suppliers: { company_name: 'Fornecedor A' },
          },
          {
            amount: 45,
            status: 'disqualified',
            disqualification_reason: 'Valor inexequível',
            suppliers: { company_name: 'Fornecedor B' },
          },
        ],
      })
      expect(result.outcome).toBe('failed')
      expect(result.label).toBe('Fracassado')
      expect(result.color).toBe('error')
      expect(result.winningBid).toBeNull()
      expect(result.winningAmount).toBeUndefined()
    })

    it('returns winner with lowest classified bid and calculates totals', () => {
      const result = getItemDisputeResult({
        quantity: 3,
        demand_product_bids: [
          {
            id: 'b1',
            amount: 100,
            status: 'classified',
            suppliers: { company_name: 'Empresa Alfa' },
          },
          {
            id: 'b2',
            amount: 70,
            status: 'disqualified',
            suppliers: { company_name: 'Empresa Beta' },
          },
          {
            id: 'b3',
            amount: 85.5,
            status: 'classified',
            suppliers: { name: 'Empresa Gama ME' },
          },
        ],
      })
      expect(result.outcome).toBe('winner')
      expect(result.label).toBe('Vencedor')
      expect(result.color).toBe('success')
      expect(result.winningBid?.id).toBe('b3')
      expect(result.winnerSupplierName).toBe('Empresa Gama ME')
      expect(result.winningAmount).toBe(85.5)
      expect(result.totalFinal).toBe(85.5 * 3)
    })

    it('defaults quantity to 1 when calculating totalFinal if quantity is missing', () => {
      const result = getItemDisputeResult({
        quantity: null,
        demand_product_bids: [
          {
            id: 'b1',
            amount: 120,
            status: 'classified',
            suppliers: { company_name: 'Fornecedor X' },
          },
        ],
      })
      expect(result.outcome).toBe('winner')
      expect(result.winningAmount).toBe(120)
      expect(result.totalFinal).toBe(120)
      expect(result.winnerSupplierName).toBe('Fornecedor X')
    })
  })
})
