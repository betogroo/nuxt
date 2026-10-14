import { describe, it, expect } from 'vitest'
import { getWinningBid, getItemSubtotal } from '../../app/utils/bids'

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

    it('returns the first encountered bid in case of a tie for lowest amount', () => {
      const bids = [
        { id: 'b1', amount: 30 },
        { id: 'b2', amount: 30 },
      ]
      expect(getWinningBid(bids)?.id).toBe('b1')
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
