import { describe, it, expect } from 'vitest'
import { demandFormSchema } from '../../app/schemas/forms/demand'

describe('demandFormSchema', () => {
  it('validates successfully when siafem_number is omitted (optional initially)', () => {
    const data = {
      name: 'Demanda Teste',
      type: 'consumption' as const,
    }
    const result = demandFormSchema.safeParse(data)
    expect(result.success).toBe(true)
  })

  it('validates successfully when siafem_number is null or empty', () => {
    const data = {
      name: 'Demanda Teste',
      type: 'permanent' as const,
      siafem_number: null,
    }
    const result = demandFormSchema.safeParse(data)
    expect(result.success).toBe(true)
  })

  it('validates and trims siafem_number when provided', () => {
    const data = {
      name: 'Demanda com SIAFEM',
      type: 'consumption' as const,
      siafem_number: '  2026NE000123  ',
    }
    const result = demandFormSchema.safeParse(data)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.siafem_number).toBe('2026NE000123')
    }
  })

  it('fails validation when required fields are missing', () => {
    const data = {
      name: '',
      type: 'consumption' as const,
    }
    const result = demandFormSchema.safeParse(data)
    expect(result.success).toBe(false)
  })

  it('validates successfully with valid internal_process_number format (AAAA-XXXX)', () => {
    const data = {
      name: 'Demanda Teste',
      type: 'consumption' as const,
      internal_process_number: '2026-0042',
    }
    const result = demandFormSchema.safeParse(data)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.internal_process_number).toBe('2026-0042')
    }
  })

  it('fails validation when internal_process_number format is invalid', () => {
    const data = {
      name: 'Demanda Teste',
      type: 'consumption' as const,
      internal_process_number: '2026/001',
    }
    const result = demandFormSchema.safeParse(data)
    expect(result.success).toBe(false)
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes('internal_process_number'))
      expect(issue?.message).toContain('AAAA-XXXX')
    }
  })
})
