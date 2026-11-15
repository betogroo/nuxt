import { describe, it, expect } from 'vitest'
import { parseBidAmount, parseBatchBidsText } from '~/utils/parseBatchBids'

describe('parseBatchBids', () => {
  describe('parseBidAmount', () => {
    it('handles Brazilian currency format with R$ and decimals', () => {
      expect(parseBidAmount('R$ 18,0000')).toBe(18)
      expect(parseBidAmount('R$ 18,9900')).toBe(18.99)
      expect(parseBidAmount('r$ 19,9900')).toBe(19.99)
      expect(parseBidAmount('R$22,5000')).toBe(22.5)
      expect(parseBidAmount('  R$   10,50  ')).toBe(10.5)
    })

    it('handles numbers without R$', () => {
      expect(parseBidAmount('18,0000')).toBe(18)
      expect(parseBidAmount('18.9900')).toBe(18.99)
      expect(parseBidAmount('250')).toBe(250)
    })

    it('handles thousands separator with decimal comma', () => {
      expect(parseBidAmount('R$ 1.250,50')).toBe(1250.5)
      expect(parseBidAmount('10.000,0000')).toBe(10000)
    })

    it('returns null for empty, zero or invalid values', () => {
      expect(parseBidAmount('')).toBeNull()
      expect(parseBidAmount('   ')).toBeNull()
      expect(parseBidAmount('R$ 0,00')).toBeNull()
      expect(parseBidAmount('-10.00')).toBeNull()
      expect(parseBidAmount('abc')).toBeNull()
      expect(parseBidAmount('R$ ')).toBeNull()
    })
  })

  describe('parseBatchBidsText', () => {
    it('correctly parses the exact example provided by user', () => {
      const text = `37.862.590/0001-71 R$ 18,0000
62.341.521/0001-60 R$ 18,9900
54.107.641/0001-79 R$ 19,9900
50.024.982/0001-20 R$ 22,5000`

      const result = parseBatchBidsText(text)

      expect(result.items).toHaveLength(4)
      expect(result.readyCount).toBe(4)
      expect(result.invalidCount).toBe(0)
      expect(result.ignoredLines).toHaveLength(0)

      expect(result.items[0]).toMatchObject({
        cleanCnpj: '37862590000171',
        formattedCnpj: '37.862.590/0001-71',
        amount: 18,
        isValid: true,
        status: 'ready',
      })
      expect(result.items[1]).toMatchObject({
        cleanCnpj: '62341521000160',
        formattedCnpj: '62.341.521/0001-60',
        amount: 18.99,
        isValid: true,
        status: 'ready',
      })
      expect(result.items[2]).toMatchObject({
        cleanCnpj: '54107641000179',
        formattedCnpj: '54.107.641/0001-79',
        amount: 19.99,
        isValid: true,
        status: 'ready',
      })
      expect(result.items[3]).toMatchObject({
        cleanCnpj: '50024982000120',
        formattedCnpj: '50.024.982/0001-20',
        amount: 22.5,
        isValid: true,
        status: 'ready',
      })
    })

    it('handles tab separation and values without R$', () => {
      const text = `37.862.590/0001-71\t18.0000
62.341.521/0001-60; 18,9900`

      const result = parseBatchBidsText(text)
      expect(result.readyCount).toBe(2)
      expect(result.items[0].amount).toBe(18)
      expect(result.items[1].amount).toBe(18.99)
    })

    it('ignores header lines', () => {
      const text = `CNPJ	VALOR DO LANCE
37.862.590/0001-71 R$ 18,0000`

      const result = parseBatchBidsText(text)
      expect(result.ignoredLines).toHaveLength(1)
      expect(result.ignoredLines[0].line).toContain('CNPJ')
      expect(result.readyCount).toBe(1)
      expect(result.items).toHaveLength(1)
    })

    it('flags invalid CNPJ (checksum error)', () => {
      const text = '11.111.111/1111-11 R$ 18,0000'
      const result = parseBatchBidsText(text)

      expect(result.items[0].isValid).toBe(false)
      expect(result.items[0].status).toBe('invalid_cnpj')
      expect(result.items[0].errorReason).toContain('CNPJ inválido')
    })

    it('flags invalid amount', () => {
      const text = '37.862.590/0001-71 R$ zero'
      const result = parseBatchBidsText(text)

      expect(result.items[0].isValid).toBe(false)
      expect(result.items[0].status).toBe('invalid_amount')
      expect(result.items[0].errorReason).toContain('Valor do lance inválido')
    })

    it('flags lines without CNPJ', () => {
      const text = 'Esta linha é apenas um comentário qualquer'
      const result = parseBatchBidsText(text)

      expect(result.items[0].isValid).toBe(false)
      expect(result.items[0].status).toBe('format_error')
      expect(result.items[0].errorReason).toContain('CNPJ não encontrado')
    })

    it('flags duplicate CNPJs in the same batch', () => {
      const text = `37.862.590/0001-71 R$ 18,0000
37.862.590/0001-71 R$ 17,5000`

      const result = parseBatchBidsText(text)

      expect(result.items[0].isValid).toBe(true)
      expect(result.items[0].status).toBe('ready')
      expect(result.items[1].isValid).toBe(false)
      expect(result.items[1].status).toBe('duplicate_in_batch')
      expect(result.items[1].isDuplicateInBatch).toBe(true)
      expect(result.readyCount).toBe(1)
      expect(result.invalidCount).toBe(1)
    })

    it('returns empty result for empty input', () => {
      expect(parseBatchBidsText('')).toEqual({
        items: [],
        readyCount: 0,
        invalidCount: 0,
        ignoredLines: [],
      })
    })
  })
})
