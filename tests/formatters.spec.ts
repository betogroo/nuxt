import { describe, it, expect } from 'vitest'
import {
  formatCurrency,
  formatReferencePrice,
  formatDate,
  formatDateTime,
  formatCnpj,
  slugify,
  formatCpf,
  isValidCpf,
  padAndFormatRg,
  isValidRgSP,
  formatCitizenName,
  isValidCnpj,
  splitDateTime,
  combineDateTime,
  validateOfferOpeningRules,
} from '../app/utils/formatters'

describe('Formatadores (utils/formatters.ts)', () => {
  describe('isValidCpf', () => {
    it('returns true for valid CPF', () => {
      expect(isValidCpf('12345678909')).toBe(true)
    })

    it('returns false for invalid CPF', () => {
      expect(isValidCpf('11111111111')).toBe(false)
      expect(isValidCpf('12345678900')).toBe(false)
      expect(isValidCpf('123')).toBe(false)
      expect(isValidCpf('')).toBe(false)
    })
  })

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

  describe('isValidCnpj', () => {
    it('deve validar CNPJs matematicamente corretos com ou sem pontuação', () => {
      expect(isValidCnpj('00.000.000/0001-91')).toBe(true)
      expect(isValidCnpj('00000000000191')).toBe(true)
      expect(isValidCnpj('33.000.167/0001-01')).toBe(true)
      expect(isValidCnpj('33000167000101')).toBe(true)
      expect(isValidCnpj('12.345.678/0001-95')).toBe(true)
      expect(isValidCnpj('12345678000195')).toBe(true)
    })

    it('deve rejeitar CNPJs com dígitos verificadores matematicamente incorretos', () => {
      expect(isValidCnpj('12.345.678/0001-99')).toBe(false)
      expect(isValidCnpj('12345678000199')).toBe(false)
      expect(isValidCnpj('33.000.167/0001-02')).toBe(false)
    })

    it('deve rejeitar sequências de dígitos repetidos', () => {
      expect(isValidCnpj('00000000000000')).toBe(false)
      expect(isValidCnpj('11111111111111')).toBe(false)
      expect(isValidCnpj('11.111.111/1111-11')).toBe(false)
      expect(isValidCnpj('99999999999999')).toBe(false)
    })

    it('deve rejeitar valores nulos, vazios ou com tamanho incorreto', () => {
      expect(isValidCnpj(null)).toBe(false)
      expect(isValidCnpj(undefined)).toBe(false)
      expect(isValidCnpj('')).toBe(false)
      expect(isValidCnpj('123')).toBe(false)
      expect(isValidCnpj('1234567800019')).toBe(false)
      expect(isValidCnpj('123456780001950')).toBe(false)
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

  describe('isValidRgSP', () => {
    it('deve retornar true para um RG de SP válido com dígito numérico', () => {
      expect(isValidRgSP('72894286-0')).toBe(true)
      expect(isValidRgSP('32919523-2')).toBe(true)
      expect(isValidRgSP('73016721-5')).toBe(true)
    })

    it('deve retornar true para um RG de SP válido com dígito X', () => {
      expect(isValidRgSP('08678853-X')).toBe(true)
      expect(isValidRgSP('08678853x')).toBe(true)
    })

    it('deve retornar false para RGs de SP inválidos matematicamente', () => {
      expect(isValidRgSP('72894286-1')).toBe(false)
      expect(isValidRgSP('32919523-9')).toBe(false)
      expect(isValidRgSP('08678853-0')).toBe(false)
    })

    it('deve retornar false para RGs com formato errado', () => {
      expect(isValidRgSP('123')).toBe(false)
      expect(isValidRgSP('')).toBe(false)
      expect(isValidRgSP('00000000')).toBe(false) // length < 9
      expect(isValidRgSP('A2345678-X')).toBe(false) // letter in base
    })
  })

  describe('formatCitizenName', () => {
    it('deve converter nome em minúsculas para maiúsculas e remover espaços extras', () => {
      expect(formatCitizenName('joão da silva')).toBe('JOÃO DA SILVA')
      expect(formatCitizenName('  maria aparecida  ')).toBe('MARIA APARECIDA')
    })

    it('deve manter nome já em maiúsculas inalterado', () => {
      expect(formatCitizenName('CARLOS EDUARDO')).toBe('CARLOS EDUARDO')
    })

    it('deve retornar string vazia para valores nulos, indefinidos ou vazios', () => {
      expect(formatCitizenName(null)).toBe('')
      expect(formatCitizenName(undefined)).toBe('')
      expect(formatCitizenName('')).toBe('')
      expect(formatCitizenName('   ')).toBe('')
    })
  })

  describe('splitDateTime', () => {
    it('deve dividir string ISO em date e time', () => {
      const result = splitDateTime('2026-10-25T14:30:00')
      expect(result.date).toBe('2026-10-25')
      expect(result.time).toBe('14:30')
    })

    it('deve retornar strings vazias para valores nulos ou inválidos', () => {
      expect(splitDateTime(null)).toEqual({ date: '', time: '' })
      expect(splitDateTime(undefined)).toEqual({ date: '', time: '' })
      expect(splitDateTime('invalido')).toEqual({ date: '', time: '' })
    })
  })

  describe('combineDateTime', () => {
    it('deve combinar data e hora em ISO string', () => {
      const result = combineDateTime('2026-10-25', '14:30')
      expect(result).toBeTruthy()
      expect(new Date(result!).getFullYear()).toBe(2026)
    })

    it('deve assumir 00:00 se hora não informada', () => {
      const result = combineDateTime('2026-10-25', '')
      expect(result).toBeTruthy()
    })

    it('deve retornar null se data vazia ou inválida', () => {
      expect(combineDateTime(null)).toBeNull()
      expect(combineDateTime('')).toBeNull()
      expect(combineDateTime('data-invalida')).toBeNull()
    })
  })

  describe('validateOfferOpeningRules', () => {
    const fixedNow = new Date('2026-10-16T12:00:00')

    it('deve exigir data e hora', () => {
      expect(validateOfferOpeningRules('', '10:00', '2026-11-01', fixedNow)).toBe(
        'A data de abertura das ofertas é obrigatória.',
      )
      expect(validateOfferOpeningRules('2026-10-25', '', '2026-11-01', fixedNow)).toBe(
        'A hora de abertura das ofertas é obrigatória.',
      )
    })

    it('deve validar horário entre 08:00 e 18:00', () => {
      expect(validateOfferOpeningRules('2026-10-25', '07:59', '2026-11-01', fixedNow)).toBe(
        'A hora de abertura das ofertas deve estar entre 08:00 e 18:00.',
      )
      expect(validateOfferOpeningRules('2026-10-25', '18:01', '2026-11-01', fixedNow)).toBe(
        'A hora de abertura das ofertas deve estar entre 08:00 e 18:00.',
      )
      expect(validateOfferOpeningRules('2026-10-25', '08:00', '2026-11-01', fixedNow)).toBeNull()
      expect(validateOfferOpeningRules('2026-10-25', '18:00', '2026-11-01', fixedNow)).toBeNull()
    })

    it('deve exigir pelo menos 5 dias após hoje', () => {
      // 16 + 4 dias = 20 (inválido)
      expect(validateOfferOpeningRules('2026-10-20', '10:00', '2026-11-01', fixedNow)).toBe(
        'A data de abertura das ofertas deve ser pelo menos 5 dias após hoje.',
      )
      // 16 + 5 dias = 21 (válido)
      expect(validateOfferOpeningRules('2026-10-21', '10:00', '2026-11-01', fixedNow)).toBeNull()
    })

    it('deve exigir pelo menos 3 dias antes da disputa', () => {
      // Disputa em 2026-10-25. 3 dias antes é 22. Se for 23, diferença é 2 dias (inválido).
      expect(validateOfferOpeningRules('2026-10-23', '10:00', '2026-10-25', fixedNow)).toBe(
        'A data de abertura das ofertas deve ser pelo menos 3 dias antes da data da disputa.',
      )
      // 22 é exatamente 3 dias antes (válido)
      expect(validateOfferOpeningRules('2026-10-22', '10:00', '2026-10-25', fixedNow)).toBeNull()
    })
  })
})
