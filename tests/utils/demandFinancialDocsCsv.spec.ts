import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  extractDemandFinancialDocumentNumbers,
  groupDemandDocumentsByNe,
  buildDemandFinancialDocsCsv,
  downloadDemandFinancialDocsCsv,
} from '~/utils/demandFinancialDocsCsv'
import * as downloadModule from '~/utils/download'
import type { CommitmentRow } from '~/composables/useCommitments'

vi.mock('~/utils/download', () => ({
  downloadFile: vi.fn(),
  downloadBlob: vi.fn(),
  downloadJson: vi.fn(),
}))

describe('demandFinancialDocsCsv', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockCommitment1: CommitmentRow = {
    id: 'comm-1',
    demand_id: 'dem-1',
    supplier_id: 'supp-1',
    expense_nature_id: 'exp-1',
    commitment_number: '2026NE00010',
    issue_date: '2026-03-01',
    status: 'completed',
    observation: 'Empenho inicial',
    cancels_commitment_number: null,
    cancellation_commitment_number: null,
    disbursement_program_number: '2026PD00010',
    disbursement_program_issued_at: '2026-03-10',
    disbursement_program_paid_at: '2026-03-15',
    disbursement_program_observation: 'Pago no prazo',
    bank_order_number: '2026OB00010',
    bank_order_issued_at: '2026-03-16',
    bank_order_paid_at: '2026-03-17',
    bank_order_observation: 'OB confirmada',
    error_details: null,
    created_at: '2026-03-01',
    created_by: null,
    updated_at: '2026-03-17',
    demands: {
      id: 'dem-1',
      name: 'Aquisição de Material de Consumo',
      internal_process_number: 'PROC-001/2026',
      process_number: '001/2026',
      status: 'completed',
    },
    suppliers: {
      id: 'supp-1',
      company_name: 'Fornecedor Alpha LTDA',
      cnpj: '12345678000190',
      is_simples_optant: false,
    },
    expense_natures: {
      id: 'exp-1',
      name: 'Material de Consumo',
    },
    demand_commitment_liquidations: [
      {
        id: 'liq-1',
        commitment_id: 'comm-1',
        liquidation_number: '2026NL00011',
        issue_date: '2026-03-05',
        is_cancellation: false,
        is_ir_retention: false,
        ir_retention_amount: null,
        observation: 'Primeira entrega',
        created_at: '2026-03-05',
        created_by: null,
      },
      {
        id: 'liq-2',
        commitment_id: 'comm-1',
        liquidation_number: '2026NL00012',
        issue_date: '2026-03-06',
        is_cancellation: false,
        is_ir_retention: true,
        ir_retention_amount: 150.5,
        observation: 'Retenção tributária',
        created_at: '2026-03-06',
        created_by: null,
      },
    ],
  }

  const mockCommitment2: CommitmentRow = {
    id: 'comm-2',
    demand_id: 'dem-1',
    supplier_id: 'supp-2',
    expense_nature_id: 'exp-1',
    commitment_number: '2026NE00020',
    issue_date: '2026-03-02',
    status: 'completed',
    observation: null,
    cancels_commitment_number: null,
    cancellation_commitment_number: null,
    disbursement_program_number: '2026PD00020',
    disbursement_program_issued_at: '2026-03-11',
    disbursement_program_paid_at: null,
    disbursement_program_observation: null,
    bank_order_number: '2026OB00020',
    bank_order_issued_at: null,
    bank_order_paid_at: null,
    bank_order_observation: null,
    error_details: null,
    created_at: '2026-03-02',
    created_by: null,
    updated_at: '2026-03-11',
    demands: {
      id: 'dem-1',
      name: 'Aquisição de Material de Consumo',
      internal_process_number: 'PROC-001/2026',
      process_number: '001/2026',
      status: 'completed',
    },
    suppliers: {
      id: 'supp-2',
      company_name: 'Fornecedor Beta LTDA',
      cnpj: '98765432000109',
      is_simples_optant: true,
    },
    expense_natures: {
      id: 'exp-1',
      name: 'Material de Consumo',
    },
    demand_commitment_liquidations: [
      {
        id: 'liq-3',
        commitment_id: 'comm-2',
        liquidation_number: '2026NL00021',
        issue_date: '2026-03-07',
        is_cancellation: true,
        is_ir_retention: false,
        ir_retention_amount: null,
        observation: 'Cancelamento parcial',
        created_at: '2026-03-07',
        created_by: null,
      },
    ],
  }

  describe('groupDemandDocumentsByNe', () => {
    it('returns empty array when commitments list is empty', () => {
      expect(groupDemandDocumentsByNe([])).toEqual([])
    })

    it('groups documents per NE and keeps logical order (NLs, PD, OB)', () => {
      const groups = groupDemandDocumentsByNe([mockCommitment1])
      expect(groups).toEqual([
        {
          neNumber: '2026NE00010',
          documents: ['2026NL00011', '2026NL00012', '2026PD00010', '2026OB00010'],
        },
      ])
    })

    it('sorts columns alphabetically by NE number and merges any duplicated commitment rows', () => {
      const duplicateComm: CommitmentRow = {
        ...mockCommitment1,
        demand_commitment_liquidations: [
          {
            ...mockCommitment1.demand_commitment_liquidations![0],
            liquidation_number: '2026nl00011',
          },
          {
            id: 'liq-extra',
            commitment_id: 'comm-1',
            liquidation_number: '2026NL00019',
            issue_date: '2026-03-08',
            is_cancellation: false,
            is_ir_retention: false,
            ir_retention_amount: null,
            observation: null,
            created_at: '2026-03-08',
            created_by: null,
          },
        ],
      }

      const groups = groupDemandDocumentsByNe([mockCommitment2, duplicateComm, mockCommitment1])
      expect(groups).toHaveLength(2)
      expect(groups[0].neNumber).toBe('2026NE00010')
      expect(groups[0].documents).toContain('2026NL00011')
      expect(groups[0].documents).toContain('2026NL00019')
      expect(groups[1].neNumber).toBe('2026NE00020')
      expect(groups[1].documents).toEqual(['2026NL00021', '2026PD00020', '2026OB00020'])
    })
  })

  describe('extractDemandFinancialDocumentNumbers', () => {
    it('returns empty array when commitments list is empty', () => {
      expect(extractDemandFinancialDocumentNumbers([])).toEqual([])
    })

    it('extracts all document numbers in logical order (NE, NLs, PD, OB)', () => {
      const numbers = extractDemandFinancialDocumentNumbers([mockCommitment1])
      expect(numbers).toEqual([
        '2026NE00010',
        '2026NL00011',
        '2026NL00012',
        '2026PD00010',
        '2026OB00010',
      ])
    })

    it('deduplicates numbers across multiple commitments and normalizes case and trimming', () => {
      const duplicateComm: CommitmentRow = {
        ...mockCommitment1,
        commitment_number: ' 2026ne00010 ',
        disbursement_program_number: '2026pd00010',
        demand_commitment_liquidations: [
          {
            ...mockCommitment1.demand_commitment_liquidations![0],
            liquidation_number: '2026nl00011',
          },
        ],
      }

      const numbers = extractDemandFinancialDocumentNumbers([mockCommitment1, duplicateComm])
      expect(numbers).toEqual([
        '2026NE00010',
        '2026NL00011',
        '2026NL00012',
        '2026PD00010',
        '2026OB00010',
      ])
    })
  })

  describe('buildDemandFinancialDocsCsv', () => {
    it('returns empty string when commitments list is empty or has no docs', () => {
      expect(buildDemandFinancialDocsCsv([])).toBe('')
      expect(
        buildDemandFinancialDocsCsv([
          {
            ...mockCommitment1,
            commitment_number: '',
            disbursement_program_number: null,
            bank_order_number: null,
            demand_commitment_liquidations: [],
          },
        ]),
      ).toBe('')
    })

    it('generates multi-column CSV with each NE as a column and its documents below', () => {
      const csv = buildDemandFinancialDocsCsv([mockCommitment1, mockCommitment2])
      expect(csv.startsWith('\uFEFF')).toBe(true)

      const lines = csv.replace('\uFEFF', '').split('\r\n')
      // Linha 0 (Cabeçalho): cada NE em uma coluna
      expect(lines[0]).toBe('2026NE00010;2026NE00020')

      // Linha 1: primeiro documento de cada NE
      expect(lines[1]).toBe('2026NL00011;2026NL00021')

      // Linha 2: segundo documento de cada NE
      expect(lines[2]).toBe('2026NL00012;2026PD00020')

      // Linha 3: terceiro documento de cada NE
      expect(lines[3]).toBe('2026PD00010;2026OB00020')

      // Linha 4: quarto documento (comm1 tem OB, comm2 não tem mais documentos -> vazio)
      expect(lines[4]).toBe('2026OB00010;')
    })

    it('generates detailed multi-column CSV when detailed option is true', () => {
      const csv = buildDemandFinancialDocsCsv([mockCommitment1], { detailed: true })
      expect(csv.startsWith('\uFEFF')).toBe(true)

      const lines = csv.replace('\uFEFF', '').split('\r\n')
      expect(lines[0]).toBe(
        '"Tipo de Documento";"Número do Documento";"Data de Emissão";"Data de Pagamento";"Nota de Empenho";"Processo";"Fornecedor";"CNPJ";"Status / Natureza";"Observações"',
      )

      // Linha 1: NE
      expect(lines[1]).toContain('"Nota de Empenho (NE)";"2026NE00010"')
      expect(lines[1]).toContain('"Fornecedor Alpha LTDA"')
      expect(lines[1]).toContain('"12.345.678/0001-90"')

      // Linha 2: NL ordinária
      expect(lines[2]).toContain('"Nota de Liquidação (NL)";"2026NL00011"')
      expect(lines[2]).toContain('"Ordinária"')

      // Linha 3: NL de Retenção de IR
      expect(lines[3]).toContain('"Nota de Liquidação (NL)";"2026NL00012"')
      expect(lines[3]).toContain('Retenção de IR')

      // Linha 4: PD
      expect(lines[4]).toContain('"Programa de Desembolso (PD)";"2026PD00010"')

      // Linha 5: OB
      expect(lines[5]).toContain('"Ordem Bancária (OB)";"2026OB00010"')
    })
  })

  describe('downloadDemandFinancialDocsCsv', () => {
    it('returns false and does not download when commitments has no documents', () => {
      const success = downloadDemandFinancialDocsCsv({
        demand: { name: 'Demanda Vazia' },
        commitments: [],
      })

      expect(success).toBe(false)
      expect(downloadModule.downloadFile).not.toHaveBeenCalled()
    })

    it('returns true and triggers download with safe filename and proper mime type', () => {
      const success = downloadDemandFinancialDocsCsv({
        demand: {
          internal_process_number: 'PROC. 2026/045',
          name: 'Material de Escritório',
        },
        commitments: [mockCommitment1, mockCommitment2],
      })

      expect(success).toBe(true)
      expect(downloadModule.downloadFile).toHaveBeenCalledTimes(1)

      const [content, filename, mimeType] = vi.mocked(downloadModule.downloadFile).mock.calls[0]
      expect(content).toContain('2026NE00010;2026NE00020')
      expect(content).toContain('2026NL00011;2026NL00021')
      expect(filename).toMatch(/^documentos-siafem-proc__2026_045-\d{4}-\d{2}-\d{2}\.csv$/)
      expect(mimeType).toBe('text/csv;charset=utf-8;')
    })
  })
})
