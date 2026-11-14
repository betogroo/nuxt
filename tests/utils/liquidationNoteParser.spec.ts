import { describe, it, expect } from 'vitest'
import {
  normalizeNlToken,
  parseLiquidationInput,
  generateSequenceTokens,
  calculateSuggestedIrRetention,
} from '~/utils/liquidationNoteParser'

describe('liquidationNoteParser', () => {
  describe('normalizeNlToken', () => {
    it('normalizes raw digits into YYYYNL00000 format', () => {
      expect(normalizeNlToken('45', '2026')).toBe('2026NL00045')
      expect(normalizeNlToken(45, '2026')).toBe('2026NL00045')
      expect(normalizeNlToken('00045', '2026')).toBe('2026NL00045')
      expect(normalizeNlToken('12345', '2026')).toBe('2026NL12345')
    })

    it('handles year parameter correctly', () => {
      expect(normalizeNlToken('78', '2025')).toBe('2025NL00078')
      expect(normalizeNlToken('78', 2024)).toBe('2024NL00078')
    })

    it('normalizes tokens with NL prefix', () => {
      expect(normalizeNlToken('nl45', '2026')).toBe('2026NL00045')
      expect(normalizeNlToken('NL00045', '2026')).toBe('2026NL00045')
    })

    it('preserves already fully formatted SIAFEM numbers', () => {
      expect(normalizeNlToken('2026NL00045', '2026')).toBe('2026NL00045')
      expect(normalizeNlToken('2025NL00078', '2026')).toBe('2025NL00078')
    })

    it('returns empty string for empty input', () => {
      expect(normalizeNlToken('', '2026')).toBe('')
      expect(normalizeNlToken('   ', '2026')).toBe('')
    })
  })

  describe('parseLiquidationInput', () => {
    it('parses comma-separated numbers', () => {
      const input = '00045, 00046, 00078, 00079, 00080'
      const parsed = parseLiquidationInput(input, '2026')
      expect(parsed).toEqual([
        '2026NL00045',
        '2026NL00046',
        '2026NL00078',
        '2026NL00079',
        '2026NL00080',
      ])
    })

    it('parses space, newline and semicolon separated numbers', () => {
      const input = '45 46;\n78\t79,80'
      const parsed = parseLiquidationInput(input, '2026')
      expect(parsed).toEqual([
        '2026NL00045',
        '2026NL00046',
        '2026NL00078',
        '2026NL00079',
        '2026NL00080',
      ])
    })

    it('expands ranges like 45-46 and 78-80', () => {
      const input = '45-46, 78-80'
      const parsed = parseLiquidationInput(input, '2026')
      expect(parsed).toEqual([
        '2026NL00045',
        '2026NL00046',
        '2026NL00078',
        '2026NL00079',
        '2026NL00080',
      ])
    })

    it('expands ranges with leading zeros like 00045-00046', () => {
      const input = '00045-00046, 00078-00080'
      const parsed = parseLiquidationInput(input, '2026')
      expect(parsed).toEqual([
        '2026NL00045',
        '2026NL00046',
        '2026NL00078',
        '2026NL00079',
        '2026NL00080',
      ])
    })

    it('deduplicates numbers and ignores duplicates', () => {
      const input = '45, 45, 46, 45'
      const parsed = parseLiquidationInput(input, '2026')
      expect(parsed).toEqual(['2026NL00045', '2026NL00046'])
    })

    it('returns empty array on empty or whitespace string', () => {
      expect(parseLiquidationInput('', '2026')).toEqual([])
      expect(parseLiquidationInput('   ', '2026')).toEqual([])
    })
  })

  describe('generateSequenceTokens', () => {
    it('generates sequential NL tokens starting from a given number', () => {
      const seq1 = generateSequenceTokens(45, 2, '2026')
      expect(seq1).toEqual(['2026NL00045', '2026NL00046'])

      const seq2 = generateSequenceTokens(78, 3, '2026')
      expect(seq2).toEqual(['2026NL00078', '2026NL00079', '2026NL00080'])
    })

    it('handles invalid count or start gracefully', () => {
      expect(generateSequenceTokens(NaN, 2, '2026')).toEqual([])
      expect(generateSequenceTokens(45, 0, '2026')).toEqual([])
      expect(generateSequenceTokens(45, -1, '2026')).toEqual([])
    })
  })

  describe('calculateSuggestedIrRetention', () => {
    it('calculates 1.2% by default', () => {
      // 10000 * 1.2% = 120.00
      expect(calculateSuggestedIrRetention(10000)).toBe(120)
      // 5432.10 * 1.2% = 65.1852 -> 65.19
      expect(calculateSuggestedIrRetention(5432.1)).toBe(65.19)
    })

    it('calculates custom rate percent', () => {
      // 10000 * 2.5% = 250.00
      expect(calculateSuggestedIrRetention(10000, 2.5)).toBe(250)
      // 10000 * 0% = 0
      expect(calculateSuggestedIrRetention(10000, 0)).toBe(0)
    })

    it('returns 0 for negative or zero amounts', () => {
      expect(calculateSuggestedIrRetention(0)).toBe(0)
      expect(calculateSuggestedIrRetention(-500)).toBe(0)
    })
  })
})
