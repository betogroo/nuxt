import { describe, it, expect } from 'vitest'
import {
  parseBidAmount,
  parseBatchBidsText,
  convertRawBidsTextToStandardFormat,
  cleanSupplierName,
} from '~/utils/parseBatchBids'

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

    it('correctly parses multiline blocks from Compras.gov with company names and values', () => {
      const multilineText = `64.883.946/0001-26
ME/EPP
64.883.946 GUILHERME DANILO GODOY
SP
Valor ofertado (unitário)
Valor negociado (unitário)
R$ 20,0000
-

60.876.096/0001-88
ME/EPP
60.876.096 ANNA LUISA FRANCA BARROS SOUZA
RJ
Valor ofertado (unitário)
Valor negociado (unitário)
R$ 22,9000
-

60.201.006/0001-59
ME/EPP
60.201.006 MIRIAN LINHARES RAIN
PR
Valor ofertado (unitário)
Valor negociado (unitário)
R$ 24,9500
-

50.076.064/0001-44
ME/EPP
THHD COMERCIAL LTDA
SP
Valor ofertado (unitário)
Valor negociado (unitário)
R$ 24,9500
-`

      const result = parseBatchBidsText(multilineText)

      expect(result.items).toHaveLength(4)
      expect(result.readyCount).toBe(4)
      expect(result.invalidCount).toBe(0)

      expect(result.items[0]).toMatchObject({
        cleanCnpj: '64883946000126',
        formattedCnpj: '64.883.946/0001-26',
        supplierName: 'GUILHERME DANILO GODOY',
        amount: 20,
        isValid: true,
        status: 'ready',
      })

      expect(result.items[1]).toMatchObject({
        cleanCnpj: '60876096000188',
        formattedCnpj: '60.876.096/0001-88',
        supplierName: 'ANNA LUISA FRANCA BARROS SOUZA',
        amount: 22.9,
        isValid: true,
        status: 'ready',
      })

      expect(result.items[2]).toMatchObject({
        cleanCnpj: '60201006000159',
        formattedCnpj: '60.201.006/0001-59',
        supplierName: 'MIRIAN LINHARES RAIN',
        amount: 24.95,
        isValid: true,
        status: 'ready',
      })

      expect(result.items[3]).toMatchObject({
        cleanCnpj: '50076064000144',
        formattedCnpj: '50.076.064/0001-44',
        supplierName: 'THHD COMERCIAL LTDA',
        amount: 24.95,
        isValid: true,
        status: 'ready',
      })
    })

    it('prioritizes negotiated value when filled with valid numeric amount in multiline block', () => {
      const textWithNegotiation = `64.883.946/0001-26
ME/EPP
FORNECEDOR COM NEGOCIACAO LTDA
SP
Valor ofertado (unitário)
Valor negociado (unitário)
R$ 20,0000
R$ 18,5000`

      const result = parseBatchBidsText(textWithNegotiation)
      expect(result.readyCount).toBe(1)
      expect(result.items[0].amount).toBe(18.5)
      expect(result.items[0].supplierName).toBe('FORNECEDOR COM NEGOCIACAO LTDA')
    })

    it('parses single lines with semicolon-separated 3 columns (cnpj; supplier_name; amount)', () => {
      const text = `64.883.946/0001-26; 64.883.946 GUILHERME DANILO GODOY; 20,0000
50.076.064/0001-44; THHD COMERCIAL LTDA; R$ 24,9500`

      const result = parseBatchBidsText(text)
      expect(result.readyCount).toBe(2)
      expect(result.items[0].supplierName).toBe('GUILHERME DANILO GODOY')
      expect(result.items[0].amount).toBe(20)
      expect(result.items[1].supplierName).toBe('THHD COMERCIAL LTDA')
      expect(result.items[1].amount).toBe(24.95)
    })
  })

  describe('convertRawBidsTextToStandardFormat', () => {
    it('converts multiline blocks to standard format (cnpj; supplier_name; amount) with cleaned name', () => {
      const multilineText = `64.883.946/0001-26
ME/EPP
64.883.946 GUILHERME DANILO GODOY
SP
Valor ofertado (unitário)
Valor negociado (unitário)
R$ 20,0000
-

50.076.064/0001-44
ME/EPP
THHD COMERCIAL LTDA
SP
Valor ofertado (unitário)
Valor negociado (unitário)
R$ 24,9500
-`

      const converted = convertRawBidsTextToStandardFormat(multilineText)
      const lines = converted.split('\n')

      expect(lines).toHaveLength(2)
      expect(lines[0]).toBe('64.883.946/0001-26; GUILHERME DANILO GODOY; 20,0000')
      expect(lines[1]).toBe('50.076.064/0001-44; THHD COMERCIAL LTDA; 24,9500')
    })

    it('converts 2-column single lines to standard format', () => {
      const text = '37.862.590/0001-71 R$ 18,0000'
      const converted = convertRawBidsTextToStandardFormat(text)
      expect(converted).toBe('37.862.590/0001-71; 18,0000')
    })

    it('correctly parses historical demands with Desclassificada status and Envio de anexos noise', () => {
      const historicalText = `37.862.590/0001-71
ME/EPP
Desclassificada
CRISTIANE MARINA GEMAQUE DE MATOS GATTO
DF
Valor ofertado (unitário)
Valor negociado (unitário)
R$ 4,5000
-
Envio de anexos:
Encerrado

60.876.096/0001-88
ME/EPP
Desclassificada
60.876.096 ANNA LUISA FRANCA BARROS SOUZA
RJ
Valor ofertado (unitário)
Valor negociado (unitário)
R$ 4,5900
-
Envio de anexos:
Encerrado`

      const result = parseBatchBidsText(historicalText)

      expect(result.items).toHaveLength(2)
      expect(result.readyCount).toBe(2)

      expect(result.items[0]).toMatchObject({
        cleanCnpj: '37862590000171',
        formattedCnpj: '37.862.590/0001-71',
        supplierName: 'CRISTIANE MARINA GEMAQUE DE MATOS GATTO',
        amount: 4.5,
        isHistoricalDisqualified: true,
        isValid: true,
        status: 'ready',
      })

      expect(result.items[1]).toMatchObject({
        cleanCnpj: '60876096000188',
        formattedCnpj: '60.876.096/0001-88',
        supplierName: 'ANNA LUISA FRANCA BARROS SOUZA',
        amount: 4.59,
        isHistoricalDisqualified: true,
        isValid: true,
        status: 'ready',
      })

      const converted = convertRawBidsTextToStandardFormat(historicalText)
      expect(converted).toBe(
        '37.862.590/0001-71; CRISTIANE MARINA GEMAQUE DE MATOS GATTO; 4,5000\n60.876.096/0001-88; ANNA LUISA FRANCA BARROS SOUZA; 4,5900',
      )
    })
  })

  describe('cleanSupplierName', () => {
    it('removes cnpj root prefix from MEI supplier names', () => {
      expect(cleanSupplierName('64.883.946 GUILHERME DANILO GODOY', '64883946000126')).toBe(
        'GUILHERME DANILO GODOY',
      )
      expect(cleanSupplierName('60.876.096 ANNA LUISA FRANCA BARROS SOUZA', '60876096000188')).toBe(
        'ANNA LUISA FRANCA BARROS SOUZA',
      )
      expect(cleanSupplierName('60.201.006 MIRIAN LINHARES RAIN', '60201006000159')).toBe(
        'MIRIAN LINHARES RAIN',
      )
    })

    it('preserves names that do not start with CNPJ root', () => {
      expect(cleanSupplierName('THHD COMERCIAL LTDA', '50076064000144')).toBe('THHD COMERCIAL LTDA')
      expect(cleanSupplierName('EMPRESA MODELO S.A.')).toBe('EMPRESA MODELO S.A.')
    })

    it('handles empty or null rawName safely', () => {
      expect(cleanSupplierName(null)).toBe('')
      expect(cleanSupplierName('')).toBe('')
      expect(cleanSupplierName('   ')).toBe('')
    })
  })
})
