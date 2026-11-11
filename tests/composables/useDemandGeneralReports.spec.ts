import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import {
  useDemandGeneralReports,
  type IrRetentionReportRow,
} from '~/composables/useDemandGeneralReports'

const { downloadFileMock } = vi.hoisted(() => ({
  downloadFileMock: vi.fn(),
}))

vi.mock('~/utils/download', () => ({
  downloadFile: (...args: unknown[]) => downloadFileMock(...args),
  downloadBlob: vi.fn(),
}))

const mockPdfDoc = {
  setFont: vi.fn(),
  setFontSize: vi.fn(),
  setTextColor: vi.fn(),
  setDrawColor: vi.fn(),
  setFillColor: vi.fn(),
  setLineWidth: vi.fn(),
  text: vi.fn(),
  line: vi.fn(),
  rect: vi.fn(),
  roundedRect: vi.fn(),
  addPage: vi.fn(),
  getNumberOfPages: vi.fn().mockReturnValue(1),
  setPage: vi.fn(),
  save: vi.fn(),
}

vi.mock('~/utils/reportPdf', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~/utils/reportPdf')>()
  return {
    ...actual,
    createA4Doc: () => Promise.resolve(mockPdfDoc),
    appendPageFooters: vi.fn(),
  }
})

let mockLiquidationsData: unknown[] = []
let mockProductsData: unknown[] = []

const supabaseMock = {
  from: vi.fn((table: string) => {
    const chain: Record<string, unknown> = {}
    Object.assign(chain, {
      select: vi.fn(() => chain),
      order: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      gte: vi.fn(() => chain),
      lte: vi.fn(() => chain),
      not: vi.fn(() => chain),
      then: vi.fn((resolve: (val: unknown) => void) => {
        if (table === 'demand_commitment_liquidations') {
          return resolve({ data: mockLiquidationsData, error: null })
        }
        if (table === 'demand_products') {
          return resolve({ data: mockProductsData, error: null })
        }
        if (table === 'demand_commitments') {
          return resolve({ data: mockLiquidationsData, error: null })
        }
        return resolve({ data: [], error: null })
      }),
    })
    return chain
  }),
}

mockNuxtImport('useSupabaseClient', () => () => supabaseMock)

describe('useDemandGeneralReports', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLiquidationsData = []
    mockProductsData = []
  })

  describe('calculateIrRetentionSummary', () => {
    it('should correctly sum values and count unique suppliers, commitments and payment status', () => {
      const { calculateIrRetentionSummary } = useDemandGeneralReports()

      const rows: IrRetentionReportRow[] = [
        {
          liquidationId: 'liq-1',
          liquidationNumber: '2026NL00001',
          irRetentionAmount: 48,
          commitmentTotalAmount: 1000,
          issueDate: '2026-04-10',
          liquidationCreatedAt: '2026-04-10T10:00:00Z',
          commitmentId: 'ne-1',
          commitmentNumber: '2026NE00001',
          disbursementProgramNumber: '2026PD00001',
          disbursementProgramIssuedAt: '2026-04-12',
          disbursementProgramPaidAt: '2026-04-24',
          bankOrderNumber: '2026OB00001',
          bankOrderIssuedAt: '2026-04-24',
          bankOrderPaidAt: '2026-04-24',
          supplierId: 'sup-1',
          supplierName: 'FORNECEDOR ALFA LTDA',
          supplierCnpj: '12345678000199',
          supplierCnpjFormatted: '12.345.678/0001-99',
          isSimplesOptant: false,
          demandId: 'dem-1',
          demandName: 'Aquisição de Material de Consumo',
          demandProcessNumber: '001/2026',
          isPaid: true,
        },
        {
          liquidationId: 'liq-2',
          liquidationNumber: '2026NL00002',
          irRetentionAmount: 24,
          commitmentTotalAmount: 1000,
          issueDate: '2026-04-15',
          liquidationCreatedAt: '2026-04-15T10:00:00Z',
          commitmentId: 'ne-1',
          commitmentNumber: '2026NE00001',
          disbursementProgramNumber: null,
          disbursementProgramIssuedAt: null,
          disbursementProgramPaidAt: null,
          bankOrderNumber: null,
          bankOrderIssuedAt: null,
          bankOrderPaidAt: null,
          supplierId: 'sup-1',
          supplierName: 'FORNECEDOR ALFA LTDA',
          supplierCnpj: '12345678000199',
          supplierCnpjFormatted: '12.345.678/0001-99',
          isSimplesOptant: false,
          demandId: 'dem-1',
          demandName: 'Aquisição de Material de Consumo',
          demandProcessNumber: '001/2026',
          isPaid: false,
        },
        {
          liquidationId: 'liq-3',
          liquidationNumber: '2026NL00003',
          irRetentionAmount: 96,
          commitmentTotalAmount: 2000,
          issueDate: '2026-04-18',
          liquidationCreatedAt: '2026-04-18T10:00:00Z',
          commitmentId: 'ne-2',
          commitmentNumber: '2026NE00002',
          disbursementProgramNumber: '2026PD00002',
          disbursementProgramIssuedAt: '2026-04-20',
          disbursementProgramPaidAt: '2026-04-25',
          bankOrderNumber: '2026OB00002',
          bankOrderIssuedAt: '2026-04-25',
          bankOrderPaidAt: '2026-04-25',
          supplierId: 'sup-2',
          supplierName: 'FORNECEDOR BETA S/A',
          supplierCnpj: '98765432000188',
          supplierCnpjFormatted: '98.765.432/0001-88',
          isSimplesOptant: false,
          demandId: 'dem-2',
          demandName: 'Contratação de Serviços',
          demandProcessNumber: '002/2026',
          isPaid: true,
        },
      ]

      const summary = calculateIrRetentionSummary(rows)

      expect(summary.totalIrRetentionAmount).toBe(168)
      expect(summary.totalCommitmentAmount).toBe(3000)
      expect(summary.liquidationsCount).toBe(3)
      expect(summary.commitmentsCount).toBe(2)
      expect(summary.suppliersCount).toBe(2)
      expect(summary.paidLiquidationsCount).toBe(2)
      expect(summary.pendingLiquidationsCount).toBe(1)
    })
  })

  describe('fetchIrRetentionReport', () => {
    it('should map database rows into typed report rows with correct payment status', async () => {
      mockLiquidationsData = [
        {
          id: 'liq-100',
          liquidation_number: '2026NL00050',
          issue_date: '2026-04-10',
          observation: 'Retenção IR s/ nota',
          is_ir_retention: true,
          ir_retention_amount: 72,
          is_cancellation: false,
          created_at: '2026-04-10T12:00:00Z',
          commitment: {
            id: 'ne-100',
            commitment_number: '2026NE00050',
            status: 'issued',
            disbursement_program_number: '2026PD00050',
            disbursement_program_issued_at: '2026-04-12',
            disbursement_program_paid_at: '2026-04-24',
            bank_order_number: '2026OB00050',
            bank_order_issued_at: '2026-04-24',
            bank_order_paid_at: '2026-04-24',
            supplier: {
              id: 'sup-100',
              company_name: 'SUPPLIER TEST',
              cnpj: '12345678000195',
              is_simples_optant: false,
            },
            demand: {
              id: 'dem-100',
              name: 'Demanda de Teste',
              process_number: '123/2026',
              bidding_notice_number: '01/2026',
            },
          },
        },
      ]

      mockProductsData = [
        {
          commitment_number: '2026NE00050',
          quantity: 10,
          demand_product_bids: [
            {
              id: 'bid-1',
              supplier_id: 'sup-100',
              amount: 150,
              status: 'winner',
              created_at: '2026-04-01T10:00:00Z',
            },
          ],
        },
      ]

      const { fetchIrRetentionReport } = useDemandGeneralReports()
      const { rows, summary } = await fetchIrRetentionReport()

      expect(rows).toHaveLength(1)
      expect(rows[0].liquidationNumber).toBe('2026NL00050')
      expect(rows[0].irRetentionAmount).toBe(72)
      expect(rows[0].commitmentTotalAmount).toBe(1500)
      expect(rows[0].isPaid).toBe(true)
      expect(rows[0].disbursementProgramPaidAt).toBe('2026-04-24')
      expect(rows[0].commitmentNumber).toBe('2026NE00050')
      expect(rows[0].supplierName).toBe('SUPPLIER TEST')

      expect(summary.totalIrRetentionAmount).toBe(72)
      expect(summary.totalCommitmentAmount).toBe(1500)
      expect(summary.paidLiquidationsCount).toBe(1)
    })

    it('should filter by paymentStatus=paid or paymentStatus=pending', async () => {
      mockLiquidationsData = [
        {
          id: 'liq-paid',
          liquidation_number: '2026NL00001',
          issue_date: '2026-04-10',
          is_ir_retention: true,
          ir_retention_amount: 10,
          is_cancellation: false,
          created_at: '2026-04-10T12:00:00Z',
          commitment: {
            id: 'ne-1',
            commitment_number: '2026NE00001',
            disbursement_program_paid_at: '2026-04-20',
            supplier: null,
            demand: null,
          },
        },
        {
          id: 'liq-pending',
          liquidation_number: '2026NL00002',
          issue_date: '2026-04-11',
          is_ir_retention: true,
          ir_retention_amount: 20,
          is_cancellation: false,
          created_at: '2026-04-11T12:00:00Z',
          commitment: {
            id: 'ne-2',
            commitment_number: '2026NE00002',
            disbursement_program_paid_at: null,
            supplier: null,
            demand: null,
          },
        },
      ]

      const { fetchIrRetentionReport } = useDemandGeneralReports()

      const paidResult = await fetchIrRetentionReport({ paymentStatus: 'paid' })
      expect(paidResult.rows).toHaveLength(1)
      expect(paidResult.rows[0].liquidationId).toBe('liq-paid')

      const pendingResult = await fetchIrRetentionReport({ paymentStatus: 'pending' })
      expect(pendingResult.rows).toHaveLength(1)
      expect(pendingResult.rows[0].liquidationId).toBe('liq-pending')
    })
  })

  describe('exportIrRetentionToCsv', () => {
    it('should generate CSV with UTF-8 BOM, semicolon delimiter and trigger download', () => {
      const { exportIrRetentionToCsv } = useDemandGeneralReports()

      const rows: IrRetentionReportRow[] = [
        {
          liquidationId: 'l1',
          liquidationNumber: '2026NL00001',
          irRetentionAmount: 48,
          commitmentTotalAmount: 1000,
          issueDate: '2026-04-10',
          liquidationCreatedAt: '2026-04-10T10:00:00Z',
          commitmentId: 'c1',
          commitmentNumber: '2026NE00001',
          disbursementProgramNumber: '2026PD00001',
          disbursementProgramIssuedAt: '2026-04-12',
          disbursementProgramPaidAt: '2026-04-24',
          bankOrderNumber: '2026OB00001',
          bankOrderIssuedAt: '2026-04-24',
          bankOrderPaidAt: '2026-04-24',
          supplierId: 's1',
          supplierName: 'FORNECEDOR TESTE',
          supplierCnpj: '12345678000199',
          supplierCnpjFormatted: '12.345.678/0001-99',
          isSimplesOptant: false,
          demandId: 'd1',
          demandName: 'Demanda Teste',
          demandProcessNumber: '001/2026',
          isPaid: true,
        },
      ]

      exportIrRetentionToCsv(rows, 'teste-ir')

      expect(downloadFileMock).toHaveBeenCalledTimes(1)
      const [csvContent, filename] = downloadFileMock.mock.calls[0]
      expect(csvContent.startsWith('\uFEFF')).toBe(true)
      expect(csvContent).toContain('2026NE00001')
      expect(csvContent).toContain('2026NL00001')
      expect(csvContent).toContain('48,00')
      expect(filename).toContain('teste-ir')
    })
  })

  describe('exportIrRetentionToPdf', () => {
    it('should construct PDF doc and trigger doc.save', async () => {
      const { exportIrRetentionToPdf } = useDemandGeneralReports()

      const rows: IrRetentionReportRow[] = [
        {
          liquidationId: 'l1',
          liquidationNumber: '2026NL00001',
          irRetentionAmount: 48,
          commitmentTotalAmount: 1000,
          issueDate: '2026-04-10',
          liquidationCreatedAt: '2026-04-10T10:00:00Z',
          commitmentId: 'c1',
          commitmentNumber: '2026NE00001',
          disbursementProgramNumber: '2026PD00001',
          disbursementProgramIssuedAt: '2026-04-12',
          disbursementProgramPaidAt: '2026-04-24',
          bankOrderNumber: '2026OB00001',
          bankOrderIssuedAt: '2026-04-24',
          bankOrderPaidAt: '2026-04-24',
          supplierId: 's1',
          supplierName: 'FORNECEDOR TESTE',
          supplierCnpj: '12345678000199',
          supplierCnpjFormatted: '12.345.678/0001-99',
          isSimplesOptant: false,
          demandId: 'd1',
          demandName: 'Demanda Teste',
          demandProcessNumber: '001/2026',
          isPaid: true,
        },
      ]

      await exportIrRetentionToPdf({
        rows,
        summary: {
          totalIrRetentionAmount: 48,
          totalCommitmentAmount: 1000,
          liquidationsCount: 1,
          commitmentsCount: 1,
          suppliersCount: 1,
          paidLiquidationsCount: 1,
          pendingLiquidationsCount: 0,
        },
        periodLabel: 'Abril de 2026',
      })

      expect(mockPdfDoc.save).toHaveBeenCalledTimes(1)
      expect(mockPdfDoc.text).toHaveBeenCalledWith(
        'Relatório Geral de Retenção de Imposto de Renda (IR)',
        expect.any(Number),
        expect.any(Number),
      )
    })
  })
})
