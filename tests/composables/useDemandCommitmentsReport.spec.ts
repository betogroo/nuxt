import { describe, it, expect } from 'vitest'
import {
  generateDemandCommitmentsReportData,
  buildDemandCommitmentsReportHtml,
  buildDemandCommitmentsReportCsv,
} from '~/composables/useDemandReports'
import type { DemandRow } from '~/composables/useDemands'
import type { DemandProductRow } from '~/composables/useDemandProducts'
import type { CommitmentRow } from '~/composables/useCommitments'

describe('Demand Commitments Report', () => {
  const mockDemand: DemandRow = {
    id: 'demand-uuid-1',
    name: 'Aquisição de Materiais de Escritório 2026',
    status: 'completed',
    type: 'consumption',
    process_number: '1234/2026',
    internal_process_number: 'INT-5678',
    bidding_notice_number: 'PE 01/2026',
    dispute_number: 'DISP-01',
    dispute_date: '2026-02-10',
    offer_opening_date: '2026-02-05',
    id_pca: 'PCA-2026',
    created_at: '2026-01-01T10:00:00Z',
    updated_at: '2026-02-15T15:00:00Z',
  } as unknown as DemandRow

  const mockCommitments: CommitmentRow[] = [
    {
      id: 'comm-1',
      demand_id: 'demand-uuid-1',
      commitment_number: '2026NE00313',
      issue_date: '2026-02-12',
      status: 'completed',
      supplier_id: 'supp-1',
      expense_nature_id: 'exp-1',
      disbursement_program_number: '2026PD00101',
      disbursement_program_paid_at: '2026-02-20T10:00:00Z',
      bank_order_number: '2026OBC00555',
      bank_order_paid_at: '2026-02-22T14:30:00Z',
      suppliers: {
        id: 'supp-1',
        company_name: 'Papelaria Alpha LTDA',
        cnpj: '12345678000199',
        is_simples_optant: false,
      },
      expense_natures: {
        id: 'exp-1',
        name: 'Material de Consumo - Papelaria',
      },
      demand_commitment_liquidations: [
        {
          id: 'nl-1',
          commitment_id: 'comm-1',
          liquidation_number: '2026NL00801',
          issue_date: '2026-02-16', // Secret/DB field: MUST NOT BE PRESENT IN REPORT
          is_ir_retention: false,
          ir_retention_amount: null,
          is_cancellation: false,
          observation: 'Liquidação ordinária dos itens',
          created_at: '2026-02-16T12:00:00Z',
        },
        {
          id: 'nl-2',
          commitment_id: 'comm-1',
          liquidation_number: '2026NL00802',
          issue_date: '2026-02-17', // Secret/DB field: MUST NOT BE PRESENT IN REPORT
          is_ir_retention: true,
          ir_retention_amount: 150.5,
          is_cancellation: false,
          observation: 'Retenção na fonte IR',
          created_at: '2026-02-17T12:00:00Z',
        },
      ],
    } as unknown as CommitmentRow,
    {
      id: 'comm-2',
      demand_id: 'demand-uuid-1',
      commitment_number: '2026NE00314',
      issue_date: '2026-02-13',
      status: 'commitment_issued',
      supplier_id: 'supp-2',
      expense_nature_id: 'exp-1',
      disbursement_program_number: null,
      disbursement_program_paid_at: null,
      bank_order_number: null,
      bank_order_paid_at: null,
      suppliers: {
        id: 'supp-2',
        company_name: 'Beta Suprimentos ME',
        cnpj: '98765432000188',
        is_simples_optant: true,
      },
      expense_natures: {
        id: 'exp-1',
        name: 'Material de Consumo - Papelaria',
      },
      demand_commitment_liquidations: [],
    } as unknown as CommitmentRow,
  ]

  const mockItems: DemandProductRow[] = [
    {
      id: 'item-1',
      demand_id: 'demand-uuid-1',
      commitment_number: '2026NE00313',
      quantity: 50,
      execution_status: 'completed',
      product_name_snapshot: 'Papel Sulfite A4 75g',
      product: {
        id: 'prod-1',
        name: 'Papel Sulfite A4 75g',
        cat_bec: '12345',
        measurement_unit: 'CX',
      },
      demand_product_bids: [
        {
          id: 'bid-1',
          supplier_id: 'supp-1',
          amount: 25.0,
          status: 'classified',
          created_at: '2026-02-10T11:00:00Z',
        },
      ],
    } as unknown as DemandProductRow,
    {
      id: 'item-2',
      demand_id: 'demand-uuid-1',
      commitment_number: '2026NE00314',
      quantity: 10,
      execution_status: 'commitment_issued',
      product_name_snapshot: 'Caneta Esferográfica Azul',
      product: {
        id: 'prod-2',
        name: 'Caneta Esferográfica Azul',
        cat_bec: '67890',
        measurement_unit: 'UN',
      },
      demand_product_bids: [
        {
          id: 'bid-2',
          supplier_id: 'supp-2',
          amount: 2.5,
          status: 'classified',
          created_at: '2026-02-10T11:05:00Z',
        },
      ],
    } as unknown as DemandProductRow,
  ]

  describe('generateDemandCommitmentsReportData', () => {
    it('aggregates commitments, items and documents correctly', () => {
      const data = generateDemandCommitmentsReportData(mockDemand, mockCommitments, mockItems)

      expect(data.demandName).toBe('Aquisição de Materiais de Escritório 2026')
      expect(data.processNumber).toBe('1234/2026')
      expect(data.totalCommitmentsCount).toBe(2)
      expect(data.totalItemsCount).toBe(2)

      // Total item 1: 50 * 25 = 1250
      // Total item 2: 10 * 2.5 = 25
      // Grand total = 1275
      expect(data.totalCommittedAmount).toBe(1275)

      // Only comm-1 has bank_order_number (paid)
      expect(data.totalPaidAmount).toBe(1250)

      const ne1 = data.commitments.find((c) => c.commitmentNumber === '2026NE00313')!
      expect(ne1).toBeDefined()
      expect(ne1.supplierName).toBe('Papelaria Alpha LTDA')
      expect(ne1.totalAmount).toBe(1250)
      expect(ne1.items.length).toBe(1)
      expect(ne1.items[0].description).toBe('Papel Sulfite A4 75g')
      expect(ne1.items[0].totalPrice).toBe(1250)

      // NL verification: Must NOT have issueDate property
      expect(ne1.liquidations.length).toBe(2)
      expect(ne1.liquidations[0].liquidationNumber).toBe('2026NL00801')
      expect('issueDate' in ne1.liquidations[0]).toBe(false)
      expect(ne1.liquidations[1].liquidationNumber).toBe('2026NL00802')
      expect(ne1.liquidations[1].isIrRetention).toBe(true)
      expect(ne1.liquidations[1].irRetentionAmount).toBe(150.5)
      expect('issueDate' in ne1.liquidations[1]).toBe(false)
    })

    it('handles empty commitments or empty items gracefully', () => {
      const data = generateDemandCommitmentsReportData(mockDemand, [], [])
      expect(data.totalCommitmentsCount).toBe(0)
      expect(data.totalItemsCount).toBe(0)
      expect(data.totalCommittedAmount).toBe(0)
      expect(data.totalPaidAmount).toBe(0)
      expect(data.commitments).toEqual([])
    })
  })

  describe('buildDemandCommitmentsReportHtml', () => {
    it('generates clear HTML without any NL issue date', () => {
      const data = generateDemandCommitmentsReportData(mockDemand, mockCommitments, mockItems)
      const html = buildDemandCommitmentsReportHtml(data)

      // Contains header and demand info
      expect(html).toContain('Relatório de Execução dos Empenhos')
      expect(html).toContain('Aquisição de Materiais de Escritório 2026')
      expect(html).toContain('1234/2026')

      // Contains NE info
      expect(html).toContain('NE 2026NE00313')
      expect(html).toContain('NE 2026NE00314')
      expect(html).toContain('Papelaria Alpha LTDA')
      expect(html).toContain('12.345.678/0001-99')

      // Contains items
      expect(html).toContain('Papel Sulfite A4 75g')
      expect(html).toContain('Caneta Esferográfica Azul')

      // Contains NL numbers and badges
      expect(html).toContain('2026NL00801')
      expect(html).toContain('2026NL00802')
      expect(html).toContain('Retenção IR')

      // CRITICAL CHECK: NL issue dates (2026-02-16 or 16/02/2026) must NOT appear in HTML
      expect(html).not.toContain('16/02/2026')
      expect(html).not.toContain('17/02/2026')
      expect(html).not.toContain('2026-02-16')
      expect(html).not.toContain('2026-02-17')
    })
  })

  describe('buildDemandCommitmentsReportCsv', () => {
    it('generates valid CSV without NL issue date column or values', () => {
      const data = generateDemandCommitmentsReportData(mockDemand, mockCommitments, mockItems)
      const csv = buildDemandCommitmentsReportCsv(data)

      // Starts with UTF-8 BOM
      expect(csv.charCodeAt(0)).toBe(0xfeff)

      const lines = csv.replace('\uFEFF', '').split('\r\n')
      expect(lines.length).toBeGreaterThan(1)

      const header = lines[0]
      expect(header).toContain('Nota de Empenho')
      expect(header).toContain('Data Emissão NE')
      expect(header).toContain('Notas de Liquidação (NL)')
      expect(header).toContain('Programa de Desembolso (PD)')
      expect(header).toContain('Ordem Bancária (OB)')

      // CRITICAL CHECK: Header must NOT have "Data Emissão NL" or "Data NL"
      expect(header).not.toContain('Data Emissão NL')
      expect(header).not.toContain('Data de Emissão da NL')

      // Data line checks
      expect(csv).toContain('2026NE00313')
      expect(csv).toContain('Papelaria Alpha LTDA')
      expect(csv).toContain('2026NL00801')
      expect(csv).toContain('2026NL00802')

      // Must not contain the NL dates
      expect(csv).not.toContain('16/02/2026')
      expect(csv).not.toContain('17/02/2026')
      expect(csv).not.toContain('2026-02-16')
      expect(csv).not.toContain('2026-02-17')
    })
  })
})
