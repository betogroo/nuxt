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
})
