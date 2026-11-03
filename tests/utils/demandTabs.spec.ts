import { describe, it, expect } from 'vitest'
import {
  isValidDemandTab,
  getDemandDefaultTab,
  resolveInitialDemandTab,
  VALID_DEMAND_TABS,
} from '../../app/utils/demandTabs'

describe('utils/demandTabs', () => {
  describe('isValidDemandTab', () => {
    it('returns true for all valid demand tabs', () => {
      expect(VALID_DEMAND_TABS).toEqual(['planning', 'items', 'suppliers'])
      expect(isValidDemandTab('planning')).toBe(true)
      expect(isValidDemandTab('items')).toBe(true)
      expect(isValidDemandTab('suppliers')).toBe(true)
    })

    it('returns false for invalid values or types', () => {
      expect(isValidDemandTab('overview')).toBe(false)
      expect(isValidDemandTab('')).toBe(false)
      expect(isValidDemandTab(null)).toBe(false)
      expect(isValidDemandTab(undefined)).toBe(false)
      expect(isValidDemandTab(123)).toBe(false)
      expect(isValidDemandTab({})).toBe(false)
    })
  })

  describe('getDemandDefaultTab', () => {
    it('returns "items" for quotation, bidding_notice, and dispute phases', () => {
      expect(getDemandDefaultTab('quotation')).toBe('items')
      expect(getDemandDefaultTab('bidding_notice')).toBe('items')
      expect(getDemandDefaultTab('dispute')).toBe('items')
    })

    it('returns "suppliers" for homologation and completed phases', () => {
      expect(getDemandDefaultTab('homologation')).toBe('suppliers')
      expect(getDemandDefaultTab('completed')).toBe('suppliers')
    })

    it('returns "planning" for planning and cancelled phases', () => {
      expect(getDemandDefaultTab('planning')).toBe('planning')
      expect(getDemandDefaultTab('cancelled')).toBe('planning')
    })

    it('falls back to "planning" for null, undefined, or unexpected statuses', () => {
      expect(getDemandDefaultTab(null)).toBe('planning')
      expect(getDemandDefaultTab(undefined)).toBe('planning')
      expect(getDemandDefaultTab('unknown_status')).toBe('planning')
    })
  })

  describe('resolveInitialDemandTab', () => {
    it('prioritizes valid query tab over demand status', () => {
      expect(resolveInitialDemandTab('planning', 'quotation')).toBe('planning')
      expect(resolveInitialDemandTab('suppliers', 'dispute')).toBe('suppliers')
      expect(resolveInitialDemandTab('items', 'planning')).toBe('items')
    })

    it('falls back to status-based intelligent tab if query tab is invalid or absent', () => {
      expect(resolveInitialDemandTab(null, 'quotation')).toBe('items')
      expect(resolveInitialDemandTab(undefined, 'homologation')).toBe('suppliers')
      expect(resolveInitialDemandTab('invalid_tab', 'dispute')).toBe('items')
      expect(resolveInitialDemandTab('', 'planning')).toBe('planning')
    })
  })
})
