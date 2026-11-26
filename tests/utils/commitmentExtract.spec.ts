import { describe, it, expect } from 'vitest'
import {
  generateCommitmentExtract,
  cleanProcurementNumber,
  cleanSeiProcessNumber,
  resolveExpenseNatureCode,
  DEFAULT_EXTRACT_CONTRACTOR,
  DEFAULT_EXTRACT_WORK_PROGRAM,
  DEFAULT_EXTRACT_PTRES,
} from '~/utils/commitmentExtract'

describe('commitmentExtract', () => {
  it('cleans procurement and SEI process numbers', () => {
    expect(cleanProcurementNumber('Dispensa de Licitação nº 63/2026')).toBe('63/2026')
    expect(cleanProcurementNumber('Aviso de Contratação 63/2026')).toBe('63/2026')
    expect(cleanProcurementNumber('63/2026')).toBe('63/2026')

    expect(cleanSeiProcessNumber('Processo SEI nº 058.00125162/2026-03')).toBe(
      '058.00125162/2026-03',
    )
    expect(cleanSeiProcessNumber('058.00125162/2026-03')).toBe('058.00125162/2026-03')
  })

  it('resolves expense nature code from id or name', () => {
    expect(resolveExpenseNatureCode({ id: '33903016', name: 'Material de Consumo' })).toBe(
      '33903016',
    )
    expect(resolveExpenseNatureCode({ id: null, name: '33903016 - Material' })).toBe('33903016')
    expect(resolveExpenseNatureCode({ id: null, name: 'Material sem código' })).toBe(
      'Material sem código',
    )
    expect(resolveExpenseNatureCode(null)).toBe('-')
  })

  it('generates the exact sample extract from the user prompt', () => {
    const extract = generateCommitmentExtract({
      commitmentNumber: '2026NE00386',
      issueDate: '2026-11-13',
      totalAmount: 24800,
      demand: {
        contract_number: '63/2026',
        name: 'Material de Escritório e Papelaria',
        process_number: '058.00125162/2026-03',
      },
      supplier: {
        company_name: 'FAROL SOLUÇÕES COMÉRCIO E SERVIÇOS LTDA',
        cnpj: '22.466.779/0001-78',
      },
      expenseNature: {
        id: '33903016',
        name: 'Material de Escritório',
      },
    })

    const expected = [
      'EXTRATO NOTA DE EMPENHO',
      'Dispensa de Licitação nº 63/2026',
      'Processo SEI nº 058.00125162/2026-03',
      'Contratante - Delegacia Seccional de Polícia de São Joaquim da Barra',
      'Objeto: Material de Escritório e Papelaria',
      'Natureza de despesa: 33903016',
      'Programa de trabalho: 06181180149890000',
      'PTRES: 180205',
      'Contratada: FAROL SOLUÇÕES COMÉRCIO E SERVIÇOS LTDA',
      'CNPJ 22.466.779/0001-78',
      'Valor total: R$ 24.800,00 (vinte e quatro mil e oitocentos reais)',
      'Nota de empenho: 2026NE00386',
      'Data de emissão: 13/11/2026',
    ].join('\n')

    expect(extract).toBe(expected)
  })

  it('applies fallbacks when optional fields are missing', () => {
    const extract = generateCommitmentExtract({
      commitmentNumber: '2026NE00001',
      totalAmount: 150.5,
    })

    expect(extract).toContain('EXTRATO NOTA DE EMPENHO')
    expect(extract).toContain(`Contratante - ${DEFAULT_EXTRACT_CONTRACTOR}`)
    expect(extract).toContain(`Programa de trabalho: ${DEFAULT_EXTRACT_WORK_PROGRAM}`)
    expect(extract).toContain(`PTRES: ${DEFAULT_EXTRACT_PTRES}`)
    expect(extract).toContain('Objeto: -')
    expect(extract).toContain('Contratada: -')
    expect(extract).toContain('CNPJ -')
    expect(extract).toContain(
      'Valor total: R$ 150,50 (cento e cinquenta reais e cinquenta centavos)',
    )
    expect(extract).toContain('Nota de empenho: 2026NE00001')
    expect(extract).toContain('Data de emissão: -')
  })
})
