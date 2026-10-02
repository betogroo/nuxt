import { describe, it, expect } from 'vitest'
import {
  formatCurrency,
  formatReferencePrice,
  formatDate,
  formatDateTime,
  formatCnpj,
  slugify,
  formatCpf,
  padAndFormatRg,
} from '../app/utils/formatters'

describe('Formatadores (utils/formatters.ts)', () => {
  describe('formatCurrency', () => {
    it('deve formatar o número corretamente para Real Brasileiro (BRL)', () => {
      const valorBase = 1500.5
      const resultado = formatCurrency(valorBase)
      expect(resultado.replace(/\s/g, ' ')).toContain('R$ 1.500,50')
    })

    it('deve retornar "-" para valores nulos, vazios ou inválidos', () => {
      expect(formatCurrency(null)).toBe('-')
      expect(formatCurrency(undefined)).toBe('-')
      expect(formatCurrency('')).toBe('-')
      expect(formatCurrency(NaN)).toBe('-')
    })

    it('deve respeitar fallback customizado', () => {
      expect(formatCurrency(null, { fallback: 'Grátis' })).toBe('Grátis')
    })
  })

  describe('formatReferencePrice', () => {
    it('deve formatar com 4 casas decimais', () => {
      const resultado = formatReferencePrice(12.3456)
      expect(resultado.replace(/\s/g, ' ')).toContain('12,3456')
    })

    it('deve retornar "-" quando nulo', () => {
      expect(formatReferencePrice(null)).toBe('-')
    })
  })

  describe('formatDate e formatDateTime', () => {
    it('deve formatar data válida', () => {
      const dateStr = '2026-10-02T12:00:00Z'
      const res = formatDate(dateStr)
      expect(res).not.toBe('-')
      expect(res).toMatch(/\d{2}\/\d{2}\/\d{4}/)
    })

    it('deve retornar "-" para data inválida ou nula', () => {
      expect(formatDate(null)).toBe('-')
      expect(formatDate('invalid-date')).toBe('-')
    })

    it('deve formatar data e hora', () => {
      const dateStr = '2026-10-02T12:00:00Z'
      const res = formatDateTime(dateStr)
      expect(res).not.toBe('-')
      expect(res).toContain(':')
    })
  })

  describe('formatCnpj', () => {
    it('deve formatar CNPJ com 14 dígitos', () => {
      expect(formatCnpj('12345678000195')).toBe('12.345.678/0001-95')
    })

    it('deve retornar "-" para CNPJ nulo', () => {
      expect(formatCnpj(null)).toBe('-')
    })

    it('deve retornar o valor original se tamanho for diferente de 14', () => {
      expect(formatCnpj('123')).toBe('123')
    })
  })

  describe('slugify', () => {
    it('deve transformar textos com espaços em hifens', () => {
      expect(slugify('Meu Produto Incrível')).toBe('meu-produto-incrivel')
    })

    it('deve remover acentuação e caracteres especiais', () => {
      expect(slugify('Ação & Reação!')).toBe('acao-reacao')
    })

    it('deve tratar hifens duplicados', () => {
      expect(slugify('Algo   com     muito espaço')).toBe('algo-com-muito-espaco')
    })
  })

  describe('formatCpf', () => {
    it('deve formatar CPF', () => {
      expect(formatCpf('12345678901')).toBe('123.456.789-01')
    })
  })

  describe('padAndFormatRg', () => {
    it('deve formatar e preencher RG', () => {
      expect(padAndFormatRg('12345X', true)).toBe('00012345-X')
      expect(padAndFormatRg('123456789', false)).toBe('12345678-9')
    })
  })
})
