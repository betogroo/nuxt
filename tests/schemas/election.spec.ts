import { describe, it, expect } from 'vitest'
import { electionFormSchema } from '~/schemas/forms/election'

describe('Election Form Schema', () => {
  it('validates a correct election input successfully', () => {
    const input = {
      name: 'Eleição Grêmio 2026',
      election_date: '2026-10-25',
      digits_count: 2,
      is_uppercase: true,
      status: 'released',
      description: 'Eleição anual do grêmio',
    }

    const result = electionFormSchema.safeParse(input)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe('Eleição Grêmio 2026')
      expect(result.data.digits_count).toBe(2)
      expect(result.data.is_uppercase).toBe(true)
      expect(result.data.status).toBe('released')
    }
  })

  it('rejects short name less than 3 chars', () => {
    const input = {
      name: 'El',
      election_date: '2026-10-25',
      digits_count: 2,
      is_uppercase: false,
      status: 'awaiting_release',
    }

    const result = electionFormSchema.safeParse(input)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('pelo menos 3 caracteres')
    }
  })

  it('rejects invalid digits_count below 1 or above 6', () => {
    const tooLow = {
      name: 'Eleição Válida',
      election_date: '2026-10-25',
      digits_count: 0,
      is_uppercase: false,
      status: 'awaiting_release',
    }
    expect(electionFormSchema.safeParse(tooLow).success).toBe(false)

    const tooHigh = {
      name: 'Eleição Válida',
      election_date: '2026-10-25',
      digits_count: 7,
      is_uppercase: false,
      status: 'awaiting_release',
    }
    expect(electionFormSchema.safeParse(tooHigh).success).toBe(false)
  })

  it('rejects invalid status', () => {
    const input = {
      name: 'Eleição Válida',
      election_date: '2026-10-25',
      digits_count: 2,
      is_uppercase: false,
      status: 'invalid_status',
    }

    const result = electionFormSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it('applies default values for optional and default fields', () => {
    const input = {
      name: 'Eleição Padrão',
      election_date: '2026-11-01',
    }

    const result = electionFormSchema.safeParse(input)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.digits_count).toBe(2)
      expect(result.data.is_uppercase).toBe(false)
      expect(result.data.status).toBe('awaiting_release')
      expect(result.data.description).toBeUndefined()
    }
  })
})
