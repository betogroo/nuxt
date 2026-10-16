import { describe, it, expect } from 'vitest'
import {
  getWinningBid,
  compareBids,
  formatBidStatus,
  getBidStatusColor,
  getItemSubtotal,
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
})
