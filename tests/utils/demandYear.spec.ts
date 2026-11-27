import { describe, it, expect } from 'vitest'
import { resolveDemandYear } from '../../app/utils/demandYear'

describe('utils/demandYear', () => {
  it('resolves year from internal_process_number prefix as primary priority', () => {
    const demand = {
      internal_process_number: '2026-0042',
      dispute_date: '2025-10-15',
      created_at: '2024-01-01T10:00:00Z',
    }
    expect(resolveDemandYear(demand)).toBe(2026)
  })

  it('resolves year from dispute_date when internal_process_number is absent', () => {
    const demand = {
      internal_process_number: null,
      dispute_date: '2025-11-20',
      created_at: '2024-01-01T10:00:00Z',
    }
    expect(resolveDemandYear(demand)).toBe(2025)
  })

  it('resolves year from created_at when both internal_process_number and dispute_date are absent', () => {
    const demand = {
      internal_process_number: null,
      dispute_date: null,
      created_at: '2024-05-10T12:00:00Z',
    }
    expect(resolveDemandYear(demand)).toBe(2024)
  })

  it('falls back to current year when all fields are empty or invalid', () => {
    const demand = {
      internal_process_number: '',
      dispute_date: null,
      created_at: 'invalid-date',
    }
    expect(resolveDemandYear(demand)).toBe(new Date().getFullYear())
  })

  it('ignores internal_process_number if year is outside reasonable range', () => {
    const demand = {
      internal_process_number: '1850-0001',
      dispute_date: '2026-03-01',
      created_at: null,
    }
    expect(resolveDemandYear(demand)).toBe(2026)
  })
})
