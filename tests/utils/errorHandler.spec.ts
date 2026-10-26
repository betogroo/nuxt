import { describe, it, expect } from 'vitest'
import { getErrorMessage } from '~/utils/errorHandler'

describe('getErrorMessage', () => {
  it('should return default message for null or undefined', () => {
    expect(getErrorMessage(null)).toBe('Ocorreu um erro inesperado.')
    expect(getErrorMessage(undefined)).toBe('Ocorreu um erro inesperado.')
  })

  it('should return raw string when error is a string', () => {
    expect(getErrorMessage('Falha na conexão')).toBe('Falha na conexão')
  })

  it('should handle standard Error instances', () => {
    const error = new Error('Erro de validação')
    expect(getErrorMessage(error)).toBe('Erro de validação')
  })

  it('should translate PostgreSQL foreign key violation (code 23503) with default entity', () => {
    const pgError = {
      code: '23503',
      details: 'Key is still referenced from table "products".',
      hint: null,
      message: 'update or delete on table "product_classes" violates foreign key constraint',
    }
    expect(getErrorMessage(pgError)).toBe(
      'Não é possível excluir este item pois já está vinculado a outros registros no sistema.',
    )
  })

  it('should translate PostgreSQL foreign key violation (code 23503) with custom entity name', () => {
    const pgError = {
      code: '23503',
      details: 'Key is still referenced from table "products".',
      hint: null,
      message: 'update or delete on table "product_classes" violates foreign key constraint',
    }
    expect(getErrorMessage(pgError, 'esta classe de produto')).toBe(
      'Não é possível excluir esta classe de produto pois já está vinculado a outros registros no sistema.',
    )
  })

  it('should translate PostgreSQL unique violation (code 23505)', () => {
    const pgError = {
      code: '23505',
      message: 'duplicate key value violates unique constraint',
    }
    expect(getErrorMessage(pgError)).toBe(
      'Já existe um registro com este mesmo código ou identificador.',
    )
  })

  it('should extract message from PostgREST error objects', () => {
    const pgError = {
      code: 'PGRST116',
      message: 'JSON object requested, multiple (or no) rows returned',
    }
    expect(getErrorMessage(pgError)).toBe('JSON object requested, multiple (or no) rows returned')
  })

  it('should extract details if message is missing', () => {
    const pgError = {
      details: 'Detailed explanation of what went wrong',
    }
    expect(getErrorMessage(pgError)).toBe('Detailed explanation of what went wrong')
  })

  it('should stringify unknown plain objects without message or details', () => {
    const obj = { foo: 'bar', num: 42 }
    expect(getErrorMessage(obj)).toBe(JSON.stringify(obj))
  })
})
