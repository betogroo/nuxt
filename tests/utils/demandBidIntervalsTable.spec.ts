import { describe, it, expect } from 'vitest'
import {
  formatBidIntervalValue,
  formatReferencePriceValue,
  isItemBidIntervalValid,
  getPendingBidIntervalItems,
  areAllBidIntervalsConfigured,
  generateBidIntervalsTableHtml,
  generateBidIntervalsTableText,
  type DemandBidIntervalItem,
} from '../../app/utils/demandBidIntervalsTable'

describe('demandBidIntervalsTable utility', () => {
  const sampleItems: DemandBidIntervalItem[] = [
    {
      id: 'item-1',
      sort_order: 1,
      product_name_snapshot: 'Caneta Esferográfica Azul',
      reference_price: 2.5,
      bid_interval: 0.05,
      bid_interval_type: 'monetary',
      product: { name: 'Caneta Esferográfica Azul' },
    },
    {
      id: 'item-2',
      sort_order: 2,
      product_name_snapshot: 'Papel A4 Sulfite 75g',
      reference_price: 32.0,
      bid_interval: 1,
      bid_interval_type: 'percentage',
      product: { name: 'Papel A4 Sulfite 75g' },
    },
  ]

  describe('formatBidIntervalValue', () => {
    it('formats monetary bid intervals with currency formatting', () => {
      const formatted = formatBidIntervalValue({
        id: '1',
        bid_interval: 0.05,
        bid_interval_type: 'monetary',
      })
      expect(formatted).toContain('0,0500')
    })

    it('formats percentage bid intervals with % suffix and localized decimals', () => {
      expect(
        formatBidIntervalValue({
          id: '1',
          bid_interval: 1,
          bid_interval_type: 'percentage',
        }),
      ).toBe('1%')

      expect(
        formatBidIntervalValue({
          id: '2',
          bid_interval: 0.5,
          bid_interval_type: 'percentage',
        }),
      ).toBe('0,5%')
    })

    it('returns "-" for missing, null, NaN or undefined interval or type', () => {
      expect(formatBidIntervalValue({ id: '1', bid_interval: null, bid_interval_type: null })).toBe(
        '-',
      )
      expect(formatBidIntervalValue({ id: '2', bid_interval: 1, bid_interval_type: null })).toBe(
        '-',
      )
      expect(
        formatBidIntervalValue({ id: '3', bid_interval: null, bid_interval_type: 'monetary' }),
      ).toBe('-')
    })
  })

  describe('formatReferencePriceValue', () => {
    it('formats reference price with unit price 4 decimals', () => {
      expect(formatReferencePriceValue(25.5)).toContain('25,5000')
    })

    it('returns "-" for null, undefined or NaN', () => {
      expect(formatReferencePriceValue(null)).toBe('-')
      expect(formatReferencePriceValue(undefined)).toBe('-')
      expect(formatReferencePriceValue(Number.NaN)).toBe('-')
    })
  })

  describe('isItemBidIntervalValid', () => {
    it('returns true when item has positive interval and valid type', () => {
      expect(
        isItemBidIntervalValid({
          id: '1',
          bid_interval: 0.05,
          bid_interval_type: 'monetary',
        }),
      ).toBe(true)

      expect(
        isItemBidIntervalValid({
          id: '2',
          bid_interval: 1,
          bid_interval_type: 'percentage',
        }),
      ).toBe(true)
    })

    it('returns false when bid_interval is 0, negative, null or undefined', () => {
      expect(
        isItemBidIntervalValid({
          id: '1',
          bid_interval: 0,
          bid_interval_type: 'monetary',
        }),
      ).toBe(false)

      expect(
        isItemBidIntervalValid({
          id: '2',
          bid_interval: -1,
          bid_interval_type: 'percentage',
        }),
      ).toBe(false)

      expect(
        isItemBidIntervalValid({
          id: '3',
          bid_interval: null,
          bid_interval_type: 'monetary',
        }),
      ).toBe(false)
    })

    it('returns false when bid_interval_type is invalid or missing', () => {
      expect(
        isItemBidIntervalValid({
          id: '1',
          bid_interval: 1,
          bid_interval_type: null,
        }),
      ).toBe(false)

      expect(
        isItemBidIntervalValid({
          id: '2',
          bid_interval: 1,
          bid_interval_type: 'invalid',
        }),
      ).toBe(false)
    })
  })

  describe('areAllBidIntervalsConfigured and getPendingBidIntervalItems', () => {
    it('returns true for areAllBidIntervalsConfigured when all items are valid', () => {
      expect(areAllBidIntervalsConfigured(sampleItems)).toBe(true)
      expect(getPendingBidIntervalItems(sampleItems)).toHaveLength(0)
    })

    it('returns false for areAllBidIntervalsConfigured when empty array', () => {
      expect(areAllBidIntervalsConfigured([])).toBe(false)
    })

    it('detects pending items when some items lack valid intervals', () => {
      const itemsWithPending: DemandBidIntervalItem[] = [
        ...sampleItems,
        {
          id: 'item-3',
          sort_order: 3,
          product_name_snapshot: 'Grampeador de Mesa',
          reference_price: 15,
          bid_interval: null,
          bid_interval_type: null,
        },
      ]

      expect(areAllBidIntervalsConfigured(itemsWithPending)).toBe(false)
      const pending = getPendingBidIntervalItems(itemsWithPending)
      expect(pending).toHaveLength(1)
      expect(pending[0].id).toBe('item-3')
    })
  })

  describe('generateBidIntervalsTableHtml', () => {
    it('generates table with correct 4 headers and item values', () => {
      const html = generateBidIntervalsTableHtml(sampleItems)

      expect(html).toContain('<table')
      expect(html).toContain('Item')
      expect(html).toContain('Nome')
      expect(html).toContain('Valor de Referência')
      expect(html).toContain('Intervalo entre lances')

      expect(html).toContain('Caneta Esferográfica Azul')
      expect(html).toContain('Papel A4 Sulfite 75g')
      expect(html).toContain('1%')
      expect(html).toContain('0,0500')
    })

    it('escapes product names against XSS', () => {
      const maliciousItems: DemandBidIntervalItem[] = [
        {
          id: 'xss-1',
          product_name_snapshot: '<script>alert("xss")</script>',
          reference_price: 10,
          bid_interval: 1,
          bid_interval_type: 'percentage',
        },
      ]

      const html = generateBidIntervalsTableHtml(maliciousItems)
      expect(html).not.toContain('<script>')
      expect(html).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;')
    })
  })

  describe('generateBidIntervalsTableText', () => {
    it('generates tab-separated text with headers and items', () => {
      const text = generateBidIntervalsTableText(sampleItems)
      const lines = text.split('\n')

      expect(lines[0]).toBe('Item\tNome\tValor de Referência\tIntervalo entre lances')
      expect(lines[1]).toContain('1\tCaneta Esferográfica Azul\t')
      expect(lines[2]).toContain('2\tPapel A4 Sulfite 75g\t')
    })
  })
})
