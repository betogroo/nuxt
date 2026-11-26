import { describe, it, expect } from 'vitest'
import {
  formatDateLongPtBr,
  formatCurrencyBrl,
  formatQuantityPtBr,
  calculateTechnicalCertificateTotals,
  generateTechnicalCapacityCertificateHtml,
  generateTechnicalCapacityCertificateText,
  type TechnicalCertificateSupplier,
  type TechnicalCertificateItem,
} from '~/utils/technicalCapacityCertificate'

describe('technicalCapacityCertificate', () => {
  const mockSupplier: TechnicalCertificateSupplier = {
    id: 'supp-1',
    company_name: 'FAROL SOLUÇÕES COMÉRCIO E SERVIÇOS LTDA',
    cnpj: '22.466.779/0001-78',
    address: 'Rua das Flores, 123, Centro, São Paulo/SP',
    responsible_name: 'João da Silva',
    email: 'contato@farolsolucoes.com.br',
  }

  const mockItems: TechnicalCertificateItem[] = [
    {
      id: 'item-1',
      product_name: 'Papel Sulfite A4 75g',
      unit_name: 'CX',
      quantity: 100,
      unit_price: 24.8,
      total_price: 2480,
      demand_id: 'dem-1',
      demand_name: 'Material de Escritório 2026',
      process_number: '058.00125162/2026-03',
      contract_number: '63/2026',
    },
    {
      id: 'item-2',
      product_name: 'Caneta Esferográfica Azul',
      unit_name: 'UN',
      quantity: 500,
      unit_price: 1.5,
      total_price: 750,
      demand_id: 'dem-2',
      demand_name: 'Papelaria Geral 2025',
      process_number: '058.00099887/2025-11',
      contract_number: '12/2025',
    },
  ]

  it('formats dates in Brazilian Portuguese long format', () => {
    expect(formatDateLongPtBr('2026-11-26')).toBe('26 de novembro de 2026')
    expect(formatDateLongPtBr('2026-01-01')).toBe('1 de janeiro de 2026')
    expect(formatDateLongPtBr('2025-05-15')).toBe('15 de maio de 2025')
  })

  it('formats currency and quantities with Brazilian locale', () => {
    expect(formatCurrencyBrl(24800)).toBe('R$ 24.800,00')
    expect(formatCurrencyBrl(0)).toBe('R$ 0,00')
    expect(formatQuantityPtBr(100)).toBe('100')
    expect(formatQuantityPtBr(12.5)).toBe('12,5')
  })

  it('calculates totals and text in words correctly', () => {
    const totals = calculateTechnicalCertificateTotals(mockItems)

    expect(totals.itemCount).toBe(2)
    expect(totals.totalQuantity).toBe(600)
    expect(totals.totalAmount).toBe(3230)
    expect(totals.formattedTotalAmount).toBe('R$ 3.230,00')
    expect(totals.totalAmountInWords).toBe('três mil duzentos e trinta reais')
  })

  it('generates official HTML certificate with proper structure', () => {
    const html = generateTechnicalCapacityCertificateHtml(mockSupplier, mockItems, {
      issuerOrganization: 'Delegacia Seccional de Polícia de São Joaquim da Barra',
      issuerUge: '180297',
      issueDate: '2026-11-26',
      customNotes: 'Entregas realizadas rigorosamente no prazo estabelecido.',
    })

    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('Governo do Estado de São Paulo')
    expect(html).toContain('Delegacia Seccional de Polícia de São Joaquim da Barra')
    expect(html).toContain('UGE 180297')
    expect(html).toContain('Atestado de Capacidade Técnica')
    expect(html).toContain('FAROL SOLUÇÕES COMÉRCIO E SERVIÇOS LTDA')
    expect(html).toContain('22.466.779/0001-78')
    expect(html).toContain('Papel Sulfite A4 75g')
    expect(html).toContain('Caneta Esferográfica Azul')
    expect(html).toContain('R$ 3.230,00')
    expect(html).toContain('três mil duzentos e trinta reais')
    expect(html).toContain('Entregas realizadas rigorosamente no prazo estabelecido.')
    expect(html).toContain('26 de novembro de 2026')
  })

  it('generates formatted plain text certificate for copying', () => {
    const text = generateTechnicalCapacityCertificateText(mockSupplier, mockItems, {
      issueDate: '2026-11-26',
      customNotes: 'Sem apontamento de irregularidades.',
    })

    expect(text).toContain('ATESTADO DE CAPACIDADE TÉCNICA')
    expect(text).toContain('FAROL SOLUÇÕES COMÉRCIO E SERVIÇOS LTDA')
    expect(text).toContain('22.466.779/0001-78')
    expect(text).toContain('Item 1: Papel Sulfite A4 75g')
    expect(text).toContain('Item 2: Caneta Esferográfica Azul')
    expect(text).toContain('VALOR TOTAL ATESTADO: R$ 3.230,00 (três mil duzentos e trinta reais)')
    expect(text).toContain('QUANTIDADE TOTAL DE ITENS: 2')
    expect(text).toContain('Sem apontamento de irregularidades.')
    expect(text).toContain('26 de novembro de 2026')
  })
})
