import { describe, it, expect } from 'vitest'
import { ballotBoxSchema } from '~/schemas/forms/ballot-box'

describe('Ballot Box Form Schema', () => {
  it('validates a correct ballot box input', () => {
    const validData = {
      name: 'Urna 01 - Tablet Sala 1',
      device_info: 'Samsung Galaxy Tab A9',
    }

    const result = ballotBoxSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('accepts ballot box without device_info or with empty/null device_info', () => {
    expect(ballotBoxSchema.safeParse({ name: 'Urna 02' }).success).toBe(true)
    expect(ballotBoxSchema.safeParse({ name: 'Urna 02', device_info: '' }).success).toBe(true)
    expect(ballotBoxSchema.safeParse({ name: 'Urna 02', device_info: null }).success).toBe(true)
  })

  it('rejects short or empty ballot box name', () => {
    expect(ballotBoxSchema.safeParse({ name: '' }).success).toBe(false)
    expect(ballotBoxSchema.safeParse({ name: 'A' }).success).toBe(false)
  })

  it('rejects overly long name or device_info', () => {
    expect(ballotBoxSchema.safeParse({ name: 'A'.repeat(101) }).success).toBe(false)
    expect(
      ballotBoxSchema.safeParse({
        name: 'Urna Válida',
        device_info: 'B'.repeat(256),
      }).success,
    ).toBe(false)
  })
})
