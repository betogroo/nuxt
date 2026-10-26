import { describe, it, expect } from 'vitest'
import { createCandidateSchema } from '~/schemas/forms/candidate'

describe('Candidate Form Schema', () => {
  it('validates a correct candidate with 2 digits', () => {
    const schema = createCandidateSchema(2)
    const validData = {
      name: 'Chapa Renovação',
      candidate_number: '12',
      photo_url: 'https://picsum.photos/200',
    }

    const result = schema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('rejects candidate number that does not match required digits count', () => {
    const schema2 = createCandidateSchema(2)
    expect(schema2.safeParse({ name: 'Chapa 1', candidate_number: '1' }).success).toBe(false)
    expect(schema2.safeParse({ name: 'Chapa 1', candidate_number: '123' }).success).toBe(false)

    const schema3 = createCandidateSchema(3)
    expect(schema3.safeParse({ name: 'Chapa 1', candidate_number: '12' }).success).toBe(false)
    expect(schema3.safeParse({ name: 'Chapa 1', candidate_number: '123' }).success).toBe(true)
  })

  it('rejects non-digit characters in candidate number', () => {
    const schema = createCandidateSchema(2)
    const result = schema.safeParse({
      name: 'Chapa Alfa',
      candidate_number: '1a',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('apenas dígitos')
    }
  })

  it('rejects short or empty candidate name', () => {
    const schema = createCandidateSchema(2)
    expect(schema.safeParse({ name: '', candidate_number: '10' }).success).toBe(false)
    expect(schema.safeParse({ name: 'A', candidate_number: '10' }).success).toBe(false)
  })

  it('accepts optional, empty or null photo_url', () => {
    const schema = createCandidateSchema(2)
    expect(
      schema.safeParse({ name: 'Chapa Teste', candidate_number: '99', photo_url: '' }).success,
    ).toBe(true)
    expect(
      schema.safeParse({ name: 'Chapa Teste', candidate_number: '99', photo_url: null }).success,
    ).toBe(true)
    expect(schema.safeParse({ name: 'Chapa Teste', candidate_number: '99' }).success).toBe(true)
  })

  it('rejects invalid photo_url format when provided', () => {
    const schema = createCandidateSchema(2)
    expect(
      schema.safeParse({ name: 'Chapa Teste', candidate_number: '99', photo_url: 'invalid-url' })
        .success,
    ).toBe(false)
  })
})
