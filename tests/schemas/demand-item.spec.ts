import { describe, it, expect } from 'vitest'
import { demandItemFormSchema } from '~/schemas/forms/demand-item'

const baseValues = {
  quantity: 2,
  searchUnitText: 'Caixa',
}

describe('schemas/forms/demand-item', () => {
  it('accepts an item without bid interval (no default value is applied)', () => {
    const result = demandItemFormSchema.safeParse(baseValues)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.bid_interval).toBeUndefined()
      expect(result.data.bid_interval_type).toBeUndefined()
    }
  })

  it('treats empty string interval as not informed', () => {
    const result = demandItemFormSchema.safeParse({
      ...baseValues,
      bid_interval: '',
      bid_interval_type: '',
    })
    expect(result.success).toBe(true)
  })

  it('accepts a complete bid interval', () => {
    const result = demandItemFormSchema.safeParse({
      ...baseValues,
      bid_interval: 5,
      bid_interval_type: 'monetary',
    })
    expect(result.success).toBe(true)
  })

  it('requires the type when only the value is informed', () => {
    const result = demandItemFormSchema.safeParse({ ...baseValues, bid_interval: 3 })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === 'bid_interval_type')).toBe(true)
    }
  })

  it('requires the value when only the type is informed', () => {
    const result = demandItemFormSchema.safeParse({
      ...baseValues,
      bid_interval_type: 'percentage',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === 'bid_interval')).toBe(true)
    }
  })

  it('rejects non-positive interval values', () => {
    const result = demandItemFormSchema.safeParse({
      ...baseValues,
      bid_interval: 0,
      bid_interval_type: 'percentage',
    })
    expect(result.success).toBe(false)
  })

  it('accepts decimal interval values smaller than 0.1 as a number', () => {
    const result = demandItemFormSchema.safeParse({
      ...baseValues,
      bid_interval: 0.05,
      bid_interval_type: 'percentage',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.bid_interval).toBe(0.05)
    }
  })

  it('accepts and normalizes decimal interval values with comma (pt-BR string)', () => {
    const result = demandItemFormSchema.safeParse({
      ...baseValues,
      bid_interval: '0,05',
      bid_interval_type: 'monetary',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.bid_interval).toBe(0.05)
    }
  })

  it('accepts and normalizes decimal interval values with dot (string)', () => {
    const result = demandItemFormSchema.safeParse({
      ...baseValues,
      bid_interval: '0.01',
      bid_interval_type: 'percentage',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.bid_interval).toBe(0.01)
    }
  })

  it('rejects zero and negative values provided as strings', () => {
    const zeroResult = demandItemFormSchema.safeParse({
      ...baseValues,
      bid_interval: '0',
      bid_interval_type: 'percentage',
    })
    expect(zeroResult.success).toBe(false)

    const negResult = demandItemFormSchema.safeParse({
      ...baseValues,
      bid_interval: '-0,05',
      bid_interval_type: 'percentage',
    })
    expect(negResult.success).toBe(false)
  })

  it('rejects non-numeric strings for bid_interval', () => {
    const result = demandItemFormSchema.safeParse({
      ...baseValues,
      bid_interval: 'abc',
      bid_interval_type: 'percentage',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === 'bid_interval')).toBe(true)
    }
  })

  it('accepts and normalizes reference_price with comma and small decimals', () => {
    const result = demandItemFormSchema.safeParse({
      ...baseValues,
      reference_price: '0,05',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.reference_price).toBe(0.05)
    }
  })
})
