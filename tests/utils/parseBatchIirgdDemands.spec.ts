import { describe, it, expect } from 'vitest'
import {
  parseBatchIirgdDemandsText,
  normalizeIirgdCatalogText,
} from '~/utils/parseBatchIirgdDemands'

describe('parseBatchIirgdDemandsText', () => {
  it('returns empty result for blank input', () => {
    const res = parseBatchIirgdDemandsText('   \n  ')
    expect(res.items).toHaveLength(0)
    expect(res.readyCount).toBe(0)
    expect(res.ignoredCount).toBe(0)
    expect(res.ignoredLines).toHaveLength(0)
  })

  it('parses the standard 4-column tab-separated format with valid RGs', () => {
    const input = [
      '1342-5\t49770365-8\tCAROLINA SANTOS DA CRUZ\tAntecedentes Numeral',
      '1062-9\t73271119-8\tMARIA FERNANDA SICOLI BRUNHARA\tPrimeira Via CIN',
      '1062-9\t11864903-6\tANTONIO DE SOUZA LEITE\tSegunda Via',
      '1342-5\t14376013-0\tZÉLIA DE JESUS SILVA\tSegunda Via',
    ].join('\n')

    const res = parseBatchIirgdDemandsText(input)

    expect(res.readyCount).toBe(4)
    expect(res.ignoredCount).toBe(0)
    expect(res.items).toHaveLength(4)

    expect(res.items[0]).toMatchObject({
      station_code: '1342-5',
      citizenDocumentType: 'rg',
      formattedDocument: '49770365-8',
      rg: '49770365-8',
      cpf: null,
      name: 'CAROLINA SANTOS DA CRUZ',
      document_type_name: 'Antecedentes Numeral',
      isValid: true,
      status: 'ready',
    })

    expect(res.items[3]).toMatchObject({
      station_code: '1342-5',
      citizenDocumentType: 'rg',
      formattedDocument: '14376013-0',
      rg: '14376013-0',
      cpf: null,
      name: 'ZÉLIA DE JESUS SILVA',
      document_type_name: 'Segunda Via',
      isValid: true,
      status: 'ready',
    })
  })

  it('supports valid CPFs (formatted or unformatted) in the second column', () => {
    const input = [
      '1342-5\t52998224725\tJOAO SILVA\tPrimeira Via CIN',
      '1062-9\t111.444.777-35\tMARIA OLIVEIRA\tAntecedentes Nominal',
    ].join('\n')

    const res = parseBatchIirgdDemandsText(input)

    expect(res.readyCount).toBe(2)
    expect(res.items[0]).toMatchObject({
      station_code: '1342-5',
      citizenDocumentType: 'cpf',
      formattedDocument: '529.982.247-25',
      rg: null,
      cpf: '529.982.247-25',
      name: 'JOAO SILVA',
      document_type_name: 'Primeira Via CIN',
      isValid: true,
      status: 'ready',
    })

    expect(res.items[1]).toMatchObject({
      station_code: '1062-9',
      citizenDocumentType: 'cpf',
      formattedDocument: '111.444.777-35',
      rg: null,
      cpf: '111.444.777-35',
      name: 'MARIA OLIVEIRA',
      document_type_name: 'Antecedentes Nominal',
      isValid: true,
      status: 'ready',
    })
  })

  it('normalizes station codes without hyphen and pads RGs with leading zeros', () => {
    // 049770365 is 9 chars, let's use an RG that starts with 0: e.g. 01864903-4 -> base 01864903:
    // 0*2 + 1*3 + 8*4 + 6*5 + 4*6 + 9*7 + 0*8 + 3*9 = 0 + 3 + 32 + 30 + 24 + 63 + 0 + 27 = 179.
    // 179 % 11 = 3 -> 11 - 3 = 8 -> 01864903-8
    const input = '13425; 1864903-8; carlos alberto; segunda via'
    const res = parseBatchIirgdDemandsText(input)

    expect(res.readyCount).toBe(1)
    expect(res.items[0]).toMatchObject({
      station_code: '1342-5',
      citizenDocumentType: 'rg',
      formattedDocument: '01864903-8',
      rg: '01864903-8',
      name: 'CARLOS ALBERTO',
      document_type_name: 'segunda via',
      isValid: true,
      status: 'ready',
    })
  })

  it('ignores header lines and detects invalid station, invalid RG/CPF, missing name, missing doc type, and duplicates', () => {
    const input = [
      'Posto\tRG / CPF\tNome do Cidadão\tTipo de Documento',
      '9999-9\t49770365-8\tCAROLINA SANTOS\tSegunda Via',
      '1342-5\t49770365-0\tRG INVALIDO\tSegunda Via',
      '1342-5\t111.111.111-11\tCPF INVALIDO\tSegunda Via',
      '1342-5\t49770365-8\t\tSegunda Via',
      '1342-5\t73271119-8\tMARIA FERNANDA\t',
      '1342-5\t49770365-8\tCAROLINA SANTOS\tSegunda Via',
      '1062-9\t49770365-8\tCAROLINA DUPLICADA\tPrimeira Via',
      '1342-5\t52998224725\tJOAO CPF\tPrimeira Via CIN',
      '1062-9\t529.982.247-25\tJOAO CPF DUPLICADO\tSegunda Via CIN',
    ].join('\n')

    const res = parseBatchIirgdDemandsText(input)

    expect(res.ignoredLines).toHaveLength(1)
    expect(res.items[0]?.status).toBe('invalid_station')
    expect(res.items[1]?.status).toBe('invalid_document')
    expect(res.items[2]?.status).toBe('invalid_document')
    expect(res.items[3]?.status).toBe('missing_name')
    expect(res.items[4]?.status).toBe('missing_document_type')
    expect(res.items[5]?.status).toBe('ready')
    expect(res.items[6]?.status).toBe('duplicate_in_batch')
    expect(res.items[7]?.status).toBe('ready')
    expect(res.items[8]?.status).toBe('duplicate_in_batch')
  })

  it('normalizes catalog text ignoring case and accents', () => {
    expect(normalizeIirgdCatalogText('  Antecedentes   Numeral ')).toBe('antecedentes numeral')
    expect(normalizeIirgdCatalogText('1ª Via Emissão Rápida')).toBe('1a via emissao rapida')
  })
})
