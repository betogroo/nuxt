import { describe, it, expect } from 'vitest'
import {
  DEMAND_STATUS_META,
  formatDemandStatus,
  getDemandStatusColor,
  getDemandStatusFilterOptions,
} from '../../app/utils/demandStatus'

describe('utils/demandStatus', () => {
  describe('DEMAND_STATUS_META', () => {
    it('contains metadata for all expected demand statuses', () => {
      const keys = Object.keys(DEMAND_STATUS_META)
      expect(keys).toContain('planning')
      expect(keys).toContain('bidding_notice')
      expect(keys).toContain('quotation')
      expect(keys).toContain('dispute')
      expect(keys).toContain('homologation')
      expect(keys).toContain('completed')
      expect(keys).toContain('cancelled')
    })
  })

  describe('formatDemandStatus', () => {
    it('returns "-" for null or undefined', () => {
      expect(formatDemandStatus(null)).toBe('-')
      expect(formatDemandStatus(undefined)).toBe('-')
    })

    it('returns formatted label for known statuses', () => {
      expect(formatDemandStatus('planning')).toBe('Planejamento')
      expect(formatDemandStatus('dispute')).toBe('Disputa')
      expect(formatDemandStatus('homologation')).toBe('Homologação')
      expect(formatDemandStatus('completed')).toBe('Concluído')
    })

    it('returns raw status string when unknown', () => {
      expect(formatDemandStatus('custom_status')).toBe('custom_status')
    })
  })

  describe('getDemandStatusColor', () => {
    it('returns "grey" fallback for null or unknown statuses', () => {
      expect(getDemandStatusColor(null)).toBe('grey')
      expect(getDemandStatusColor('unknown_status')).toBe('grey')
    })

    it('returns correct theme color for known statuses', () => {
      expect(getDemandStatusColor('completed')).toBe('success')
      expect(getDemandStatusColor('cancelled')).toBe('error')
      expect(getDemandStatusColor('dispute')).toBe('warning')
    })
  })

  describe('getDemandStatusFilterOptions', () => {
    it('returns array of filter options including returns option', () => {
      const options = getDemandStatusFilterOptions()
      expect(options.length).toBeGreaterThanOrEqual(8)

      const values = options.map((o) => o.value)
      expect(values).toContain('planning')
      expect(values).toContain('dispute')
      expect(values).toContain('returns')
    })
  })
})
