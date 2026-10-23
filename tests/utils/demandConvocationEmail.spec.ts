import { describe, it, expect } from 'vitest'
import {
  resolveProcurementNumberWithYear,
  formatCommitmentsList,
  generateConvocationEmail,
} from '~/utils/demandConvocationEmail'
import type { SupplierCommitmentGroup } from '~/composables/useDemandDetail'

describe('demandConvocationEmail utility', () => {
  describe('resolveProcurementNumberWithYear', () => {
    it('always prioritizes contract_number if present with year slash', () => {
      const demand = {
        contract_number: '90001/2026',
        bidding_notice_number: '123/2025',
      }
      expect(resolveProcurementNumberWithYear(demand)).toBe('90001/2026')
    })

    it('appends year from dispute_date if contract_number lacks a slash', () => {
      const demand = {
        contract_number: '90001',
        dispute_date: '2026-11-15T10:00:00Z',
      }
      expect(resolveProcurementNumberWithYear(demand)).toBe('90001/2026')
    })

    it('appends year from created_at if dispute_date is absent and contract_number lacks slash', () => {
      const demand = {
        contract_number: 45,
        created_at: '2025-05-20T08:00:00Z',
      }
      expect(resolveProcurementNumberWithYear(demand)).toBe('45/2025')
    })

    it('falls back to current year if dates are absent and contract_number lacks slash', () => {
      const currentYear = new Date().getFullYear()
      const demand = {
        contract_number: '88',
      }
      expect(resolveProcurementNumberWithYear(demand)).toBe(`88/${currentYear}`)
    })

    it('falls back to bidding_notice_number if contract_number is empty', () => {
      const demand = {
        contract_number: '',
        bidding_notice_number: '7/2026',
      }
      expect(resolveProcurementNumberWithYear(demand)).toBe('7/2026')
    })

    it('returns placeholder when demand is null or without numbers', () => {
      const currentYear = new Date().getFullYear()
      expect(resolveProcurementNumberWithYear(null)).toBe(`[Nº CONTRATAÇÃO/${currentYear}]`)
      expect(resolveProcurementNumberWithYear({})).toBe(`[Nº CONTRATAÇÃO/${currentYear}]`)
    })
  })

  describe('formatCommitmentsList', () => {
    it('returns empty message if commitments array is empty', () => {
      expect(formatCommitmentsList([])).toContain('Nenhuma nota de empenho')
    })

    it('formats single commitment with items list and currency', () => {
      const commitments: SupplierCommitmentGroup[] = [
        {
          commitmentNumber: '2026NE00012',
          itemsCount: 1,
          totalAmount: 1500.5,
          itemNames: ['Resma Papel A4'],
        },
      ]
      const result = formatCommitmentsList(commitments)
      expect(result).toContain('• Nota de Empenho nº 2026NE00012')
      expect(result).toContain('1.500,50')
      expect(result).toContain('(1 item: Resma Papel A4)')
    })

    it('formats multiple commitments properly', () => {
      const commitments: SupplierCommitmentGroup[] = [
        {
          commitmentNumber: '2026NE00012',
          itemsCount: 2,
          totalAmount: 2000,
          itemNames: ['Caneta', 'Lápis'],
        },
        {
          commitmentNumber: '2026NE00013',
          itemsCount: 1,
          totalAmount: 500,
          itemNames: ['Borracha'],
        },
      ]
      const result = formatCommitmentsList(commitments)
      const lines = result.split('\n')
      expect(lines).toHaveLength(2)
      expect(lines[0]).toContain('2026NE00012')
      expect(lines[0]).toContain('(2 itens: Caneta, Lápis)')
      expect(lines[1]).toContain('2026NE00013')
    })
  })

  describe('generateConvocationEmail', () => {
    it('generates email with correct subject, body, and mailto link', () => {
      const demand = {
        contract_number: '90001/2026',
      }
      const supplier = {
        company_name: 'Papelaria Central LTDA',
        email: 'contato@papelariacentral.com.br',
        commitments: [
          {
            commitmentNumber: '2026NE00100',
            itemsCount: 1,
            totalAmount: 1200,
            itemNames: ['Toner HP'],
          },
        ],
      }

      const emailData = generateConvocationEmail(demand, supplier)

      expect(emailData.subject).toBe(
        'CONVOCAÇÃO: Envio de Nota de Empenho - Dispensa Eletrônica nº 90001/2026',
      )
      expect(emailData.body).toContain('Prezado(a) responsável pela Papelaria Central LTDA')
      expect(emailData.body).toContain(
        'vencedora na Dispensa de Licitação Eletrônica nº 90001/2026 promovida pela Delegacia Seccional de Polícia de São Joaquim da Barra',
      )
      expect(emailData.body).toContain('• Nota de Empenho nº 2026NE00100')
      expect(emailData.body).toContain(
        'Prazo Legal: Vossa Senhoria dispõe do prazo improrrogável de 5 (cinco) dias úteis',
      )
      expect(emailData.recipientEmail).toBe('contato@papelariacentral.com.br')
      expect(emailData.fullText).toContain(`Assunto: ${emailData.subject}`)
      expect(emailData.mailtoLink).toContain('mailto:contato%40papelariacentral.com.br')
      expect(emailData.mailtoLink).toContain('CONVO')
    })

    it('handles missing supplier email gracefully', () => {
      const emailData = generateConvocationEmail(
        { contract_number: '123/2026' },
        {
          company_name: 'Empresa Teste',
          email: null,
          commitments: [],
        },
      )
      expect(emailData.recipientEmail).toBeNull()
      expect(emailData.mailtoLink.startsWith('mailto:?subject=')).toBe(true)
    })
  })
})
