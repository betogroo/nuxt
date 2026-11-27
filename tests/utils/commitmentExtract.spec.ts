import { describe, it, expect } from 'vitest'
import {
  generateCommitmentExtract,
  generateDemandCommitmentExtracts,
  buildCombinedExtractsText,
  cleanProcurementNumber,
  cleanSeiProcessNumber,
  resolveExpenseNatureCode,
  DEFAULT_EXTRACT_CONTRACTOR,
  DEFAULT_EXTRACT_WORK_PROGRAM,
  DEFAULT_EXTRACT_PTRES,
  EXTRACT_SEPARATOR,
} from '~/utils/commitmentExtract'
import type { CommitmentRow } from '~/composables/useCommitments'
import type { DemandProductRow } from '~/composables/useDemandProducts'

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

  describe('generateDemandCommitmentExtracts & buildCombinedExtractsText', () => {
    const mockDemand = {
      name: 'Material de Escritório e Papelaria',
      contract_number: '63/2026',
      process_number: '058.00125162/2026-03',
      internal_process_number: '2026-0063',
    }

    const mockCommitments = [
      {
        id: 'comm-1',
        commitment_number: '2026NE00386',
        issue_date: '2026-11-13',
        status: 'delivered',
        suppliers: {
          id: 'sup-1',
          company_name: 'FAROL SOLUÇÕES COMÉRCIO E SERVIÇOS LTDA',
          cnpj: '22466779000178',
        },
        expense_natures: { id: '33903016', name: 'Material de Consumo' },
      },
      {
        id: 'comm-2',
        commitment_number: '2026NE00387',
        issue_date: '2026-11-14',
        status: 'cancelled',
        suppliers: {
          id: 'sup-2',
          company_name: 'EMPRESA CANCELADA LTDA',
          cnpj: '11222333000144',
        },
      },
      {
        id: 'comm-3',
        commitment_number: '2026NE00388',
        issue_date: '2026-11-15',
        status: 'commitment_sent',
        suppliers: {
          id: 'sup-3',
          company_name: 'PAPELARIA CENTRAL LTDA',
          cnpj: '99888777000155',
        },
        expense_natures: { id: '33903016', name: 'Material de Consumo' },
      },
    ] as unknown as CommitmentRow[]

    const mockItems = [
      {
        id: 'item-1',
        commitment_number: '2026NE00386',
        quantity: 10,
        demand_product_bids: [{ id: 'b-1', amount: 2480, status: 'classified' }],
      },
      {
        id: 'item-2',
        commitment_number: '2026NE00388',
        quantity: 5,
        demand_product_bids: [{ id: 'b-2', amount: 100, status: 'classified' }],
      },
      {
        id: 'item-cancelled',
        commitment_number: '2026NE00387',
        quantity: 1,
        demand_product_bids: [{ id: 'b-3', amount: 500, status: 'classified' }],
      },
    ] as unknown as DemandProductRow[]

    it('strictly filters out cancelled commitments and generates extracts for active commitments', () => {
      const result = generateDemandCommitmentExtracts({
        demand: mockDemand,
        commitments: mockCommitments,
        items: mockItems,
      })

      expect(result).toHaveLength(2)
      expect(result[0]!.commitmentNumber).toBe('2026NE00386')
      expect(result[0]!.totalAmount).toBe(24800)
      expect(result[0]!.extractText).toContain('Nota de empenho: 2026NE00386')
      expect(result[0]!.extractText).toContain('FAROL SOLUÇÕES COMÉRCIO E SERVIÇOS LTDA')
      expect(result[0]!.extractText).toContain(
        'Valor total: R$ 24.800,00 (vinte e quatro mil e oitocentos reais)',
      )

      expect(result[1]!.commitmentNumber).toBe('2026NE00388')
      expect(result[1]!.totalAmount).toBe(500)
      expect(result[1]!.extractText).toContain('Nota de empenho: 2026NE00388')
      expect(result[1]!.extractText).toContain('PAPELARIA CENTRAL LTDA')
      expect(result[1]!.extractText).toContain('Valor total: R$ 500,00 (quinhentos reais)')
    })

    it('returns empty array when commitments are null or all cancelled', () => {
      const resultEmpty = generateDemandCommitmentExtracts({
        demand: mockDemand,
        commitments: [],
      })
      expect(resultEmpty).toEqual([])

      const resultAllCancelled = generateDemandCommitmentExtracts({
        demand: mockDemand,
        commitments: [mockCommitments[1]!],
      })
      expect(resultAllCancelled).toEqual([])
    })

    it('buildCombinedExtractsText joins multiple extracts using EXTRACT_SEPARATOR', () => {
      const extracts = generateDemandCommitmentExtracts({
        demand: mockDemand,
        commitments: mockCommitments,
        items: mockItems,
      })

      const combined = buildCombinedExtractsText(extracts)
      expect(combined).toContain(EXTRACT_SEPARATOR)
      expect(combined).toContain('Nota de empenho: 2026NE00386')
      expect(combined).toContain('Nota de empenho: 2026NE00388')
    })

    it('resolves official permanent codes for permanent demands', () => {
      const extract = generateCommitmentExtract({
        commitmentNumber: '2026NE00999',
        issueDate: '2026-11-20',
        totalAmount: 15000,
        demand: {
          contract_number: '10/2026',
          name: 'Equipamentos de Informática',
          process_number: '058.00199999/2026-99',
          type: 'permanent',
        },
        supplier: {
          company_name: 'TECH COMÉRCIO LTDA',
          cnpj: '11.222.333/0001-44',
        },
      })

      expect(extract).toContain('Programa de trabalho: 06181181862960000')
      expect(extract).toContain('PTRES: 180211')
    })

    it('resolves custom budget codes when demand has custom overrides', () => {
      const extract = generateCommitmentExtract({
        commitmentNumber: '2026NE00888',
        issueDate: '2026-11-21',
        totalAmount: 5000,
        demand: {
          contract_number: '11/2026',
          name: 'Material Especial',
          process_number: '058.00188888/2026-88',
          type: 'consumption',
          work_program: '06181189999990000',
          ptres: '180299',
        },
        supplier: {
          company_name: 'ESPECIAL LTDA',
          cnpj: '99.888.777/0001-66',
        },
      })

      expect(extract).toContain('Programa de trabalho: 06181189999990000')
      expect(extract).toContain('PTRES: 180299')
    })
  })
})
