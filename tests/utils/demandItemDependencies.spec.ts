import { describe, it, expect } from 'vitest'
import { mapProductDuplicateError } from '~/utils/demandItemDependencies'

describe('utils/demandItemDependencies', () => {
  describe('mapProductDuplicateError', () => {
    it('maps 23505 cat_mat violation to user-friendly CATMAT error', () => {
      const err = mapProductDuplicateError({
        code: '23505',
        message: 'duplicate key value violates unique constraint "products_cat_mat_key"',
      })
      expect(err).toBeInstanceOf(Error)
      expect((err as Error).message).toBe('Já existe um produto cadastrado com este código CATMAT.')
    })

    it('maps 23505 cat_bec violation to user-friendly CATBEC error', () => {
      const err = mapProductDuplicateError({
        code: '23505',
        details: 'Key (cat_bec)=(12345) already exists.',
      })
      expect(err).toBeInstanceOf(Error)
      expect((err as Error).message).toBe('Já existe um produto cadastrado com este código CATBEC.')
    })

    it('maps generic 23505 violation to generic identifier error', () => {
      const err = mapProductDuplicateError({
        code: '23505',
        message: 'duplicate key value',
      })
      expect(err).toBeInstanceOf(Error)
      expect((err as Error).message).toBe(
        'Já existe um produto cadastrado com este código identificador.',
      )
    })

    it('returns non-23505 error unchanged', () => {
      const rawError = { code: '42501', message: 'permission denied' }
      expect(mapProductDuplicateError(rawError)).toBe(rawError)
    })
  })
})
