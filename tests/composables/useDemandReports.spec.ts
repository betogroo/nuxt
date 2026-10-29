import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import {
  generateDisputeReportData,
  buildDisputeReportCsv,
  buildDisputeReportHtml,
  buildDisputeReportPdfDoc,
  formatDecimalBr,
  resolveDemandYear,
  hasItemCommitmentIssued,
  calculateClassSpendingByYear,
  buildClassSpendingReportHtml,
  buildClassSpendingReportCsv,
  useDemandReports,
  type DemandWithClassProductsRow,
} from '~/composables/useDemandReports'
import { escapeCsvField } from '~/utils/reportCsv'
import { formatDemandType } from '~/utils/formatters'
import type { DemandRow } from '~/composables/useDemands'
import type { DemandProductRow } from '~/composables/useDemandProducts'

const logActionMock = vi.fn()
mockNuxtImport('useLogger', () => () => ({
  logAction: logActionMock,
}))

describe('useDemandReports', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('helper functions', () => {
    it('formatDecimalBr formats numbers to Brazilian decimal style', () => {
      expect(formatDecimalBr(1234.56)).toBe('1234,56')
      expect(formatDecimalBr(1234.5678, 4)).toBe('1234,5678')
      expect(formatDecimalBr(10)).toBe('10,00')
      expect(formatDecimalBr(10, 4)).toBe('10,0000')
      expect(formatDecimalBr(0)).toBe('0,00')
      expect(formatDecimalBr(null)).toBe('-')
      expect(formatDecimalBr(undefined)).toBe('-')
    })

    it('escapeCsvField properly escapes double quotes and handles nulls', () => {
      expect(escapeCsvField('Caneta Esferográfica')).toBe('"Caneta Esferográfica"')
      expect(escapeCsvField('Parafuso 1/2" zincado')).toBe('"Parafuso 1/2"" zincado"')
      expect(escapeCsvField(123)).toBe('"123"')
      expect(escapeCsvField(null)).toBe('""')
      expect(escapeCsvField(undefined)).toBe('""')
    })

    it('formatDemandType returns friendly label', () => {
      expect(formatDemandType('consumption')).toBe('Consumo')
      expect(formatDemandType('permanent')).toBe('Permanente')
    })
  })

  describe('generateDisputeReportData', () => {
    const mockDemand: DemandRow = {
      id: 'demand-1',
      name: 'Pregão Presencial 01/2026',
      type: 'consumption',
      status: 'homologation',
      process_number: '123/2026',
      internal_process_number: 'INT-999',
      bidding_notice_number: 'AV-01',
      dispute_number: 'DISP-01',
      dispute_date: '2026-10-25',
      offer_opening_date: '2026-10-22T09:00:00Z',
      contract_number: null,
      id_pca: 'PCA-2026-001',
      siafem_number: 'SIAFEM-888',
      is_return_requested: false,
      return_reason: null,
      deleted_at: null,
      user_id: 'user-1',
      created_at: '2026-10-15T10:00:00Z',
      updated_at: '2026-10-19T10:00:00Z',
    }

    it('returns empty groups and populated demand info when items is empty or null', () => {
      const dataEmpty = generateDisputeReportData(mockDemand, [])
      expect(dataEmpty.winnerGroups).toEqual([])
      expect(dataEmpty.nonWinnerItems).toEqual([])
      expect(dataEmpty.grandTotalValorFinal).toBe(0)
      expect(dataEmpty.totalItemsCount).toBe(0)
      expect(dataEmpty.demand.name).toBe('Pregão Presencial 01/2026')
      expect(dataEmpty.demand.processNumber).toBe('123/2026')
      expect(dataEmpty.demand.internalProcessNumber).toBe('INT-999')
      expect(dataEmpty.demand.biddingNoticeNumber).toBe('AV-01')
      expect(dataEmpty.demand.siafemNumber).toBe('SIAFEM-888')
      expect(dataEmpty.demand.disputeNumber).toBe('DISP-01')
      expect(dataEmpty.demand.idPca).toBe('PCA-2026-001')

      const dataNull = generateDisputeReportData(mockDemand, null)
      expect(dataNull.winnerGroups).toEqual([])
      expect(dataNull.grandTotalValorFinal).toBe(0)
      expect(dataNull.totalItemsCount).toBe(0)
    })

    it('groups items by WINNING SUPPLIER with complete supplier details, subtotals and grand totals', () => {
      const mockItems: DemandProductRow[] = [
        // Item 1: Winner - Fornecedor A (Papelaria Central)
        {
          id: 'item-1',
          demand_id: 'demand-1',
          product_id: 'prod-1',
          unit_id: 'unit-1',
          alias_id: 'alias-1',
          quantity: 10,
          sort_order: 1,
          product_name_snapshot: 'Papel A4',
          unit_name_snapshot: 'Pacote',
          alias_name_snapshot: 'Pacote 500fls',
          alias_code_snapshot: 101,
          bid_interval: null,
          bid_interval_type: null,
          created_at: '2026-10-15T10:00:00Z',
          updated_at: '2026-10-15T10:00:00Z',
          product: {
            id: 'prod-1',
            name: 'Papel A4 Sulfite',
            cat_bec: 12345,
            cat_mat: 54321,
            expense_nature_id: '339030',
            product_class_id: null,
            is_active: true,
            created_at: '2026-10-15T10:00:00Z',
            created_by: null,
            updated_at: '2026-10-15T10:00:00Z',
            expense_natures: {
              id: '339030',
              name: 'Material de Consumo',
              created_at: '',
              updated_at: '',
              is_active: true,
              is_pending: false,
            },
          },
          measurement_units: {
            id: 'unit-1',
            name: 'Pacote',
            created_at: '',
            updated_at: '',
            is_active: true,
            is_pending: false,
          },
          measurement_unit_aliases: {
            id: 'alias-1',
            name: 'Pacote 500fls',
            code: 101,
            unit_id: 'unit-1',
            created_at: '',
            is_pending: false,
          },
          demand_product_bids: [
            {
              id: 'bid-1',
              demand_product_id: 'item-1',
              supplier_id: 'supp-1',
              amount: 25.5,
              status: 'classified',
              disqualification_reason: null,
              created_at: '2026-10-19T10:00:00Z',
              updated_at: '2026-10-19T10:00:00Z',
              suppliers: {
                id: 'supp-1',
                company_name: 'Papelaria Central LTDA',
                cnpj: '12345678000199',
                address: 'Rua das Flores, 100',
                cell_phone: '11999998888',
                landline: '1133334444',
                email: 'contato@papelariacentral.com',
                responsible_name: 'Carlos Silva',
                is_simples_optant: true,
                has_bb_account: 'Ag 1234 / CC 5678-9',
                is_active: true,
                created_at: '',
                updated_at: '',
                created_by: null,
                simples_optant_verified_at: null,
              },
            },
          ],
        },
        // Item 2: Winner - Also Fornecedor A (Papelaria Central)
        {
          id: 'item-2',
          demand_id: 'demand-1',
          product_id: 'prod-2',
          unit_id: 'unit-2',
          alias_id: null,
          quantity: 5,
          sort_order: 2,
          product_name_snapshot: 'Caneta Azul',
          unit_name_snapshot: 'Caixa',
          alias_name_snapshot: null,
          alias_code_snapshot: null,
          bid_interval: null,
          bid_interval_type: null,
          created_at: '2026-10-15T10:00:00Z',
          updated_at: '2026-10-15T10:00:00Z',
          product: {
            id: 'prod-2',
            name: 'Caneta Azul Esferográfica',
            cat_bec: 67890,
            cat_mat: null,
            expense_nature_id: '339030',
            product_class_id: null,
            is_active: true,
            created_at: '2026-10-15T10:00:00Z',
            created_by: null,
            updated_at: '2026-10-15T10:00:00Z',
            expense_natures: {
              id: '339030',
              name: 'Material de Consumo',
              created_at: '',
              updated_at: '',
              is_active: true,
              is_pending: false,
            },
          },
          measurement_units: {
            id: 'unit-2',
            name: 'Caixa',
            created_at: '',
            updated_at: '',
            is_active: true,
            is_pending: false,
          },
          measurement_unit_aliases: null,
          demand_product_bids: [
            {
              id: 'bid-2',
              demand_product_id: 'item-2',
              supplier_id: 'supp-1',
              amount: 10.0,
              status: 'classified',
              disqualification_reason: null,
              created_at: '2026-10-19T10:00:00Z',
              updated_at: '2026-10-19T10:00:00Z',
              suppliers: {
                id: 'supp-1',
                company_name: 'Papelaria Central LTDA',
                cnpj: '12345678000199',
                address: 'Rua das Flores, 100',
                cell_phone: '11999998888',
                landline: '1133334444',
                email: 'contato@papelariacentral.com',
                responsible_name: 'Carlos Silva',
                is_simples_optant: true,
                has_bb_account: 'Ag 1234 / CC 5678-9',
                is_active: true,
                created_at: '',
                updated_at: '',
                created_by: null,
                simples_optant_verified_at: null,
              },
            },
          ],
        },
        // Item 3: Deserted (no bids)
        {
          id: 'item-3',
          demand_id: 'demand-1',
          product_id: 'prod-3',
          unit_id: 'unit-3',
          alias_id: null,
          quantity: 2,
          sort_order: 3,
          product_name_snapshot: 'Serviço de Manutenção',
          unit_name_snapshot: 'Unidade',
          alias_name_snapshot: null,
          alias_code_snapshot: null,
          bid_interval: null,
          bid_interval_type: null,
          created_at: '2026-10-15T10:00:00Z',
          updated_at: '2026-10-15T10:00:00Z',
          product: null,
          measurement_units: null,
          measurement_unit_aliases: null,
          demand_product_bids: [], // Deserted
        },
        // Item 4: Failed (all bids disqualified)
        {
          id: 'item-4',
          demand_id: 'demand-1',
          product_id: 'prod-4',
          unit_id: 'unit-3',
          alias_id: null,
          quantity: 1,
          sort_order: 4,
          product_name_snapshot: 'Serviço de Instalação',
          unit_name_snapshot: 'Unidade',
          alias_name_snapshot: null,
          alias_code_snapshot: null,
          bid_interval: null,
          bid_interval_type: null,
          created_at: '2026-10-15T10:00:00Z',
          updated_at: '2026-10-15T10:00:00Z',
          product: null,
          measurement_units: null,
          measurement_unit_aliases: null,
          demand_product_bids: [
            {
              id: 'bid-4',
              demand_product_id: 'item-4',
              supplier_id: 'supp-2',
              amount: 500.0,
              status: 'disqualified',
              disqualification_reason: 'Não atendeu ao edital',
              created_at: '2026-10-19T10:00:00Z',
              updated_at: '2026-10-19T10:00:00Z',
              suppliers: {
                id: 'supp-2',
                company_name: 'Eletro Tech LTDA',
                cnpj: '98765432000188',
                address: null,
                cell_phone: null,
                landline: null,
                email: null,
                responsible_name: null,
                is_simples_optant: false,
                has_bb_account: null,
                is_active: true,
                created_at: '',
                updated_at: '',
                created_by: null,
                simples_optant_verified_at: null,
              },
            },
          ], // Failed
        },
      ]

      const report = generateDisputeReportData(mockDemand, mockItems)

      expect(report.totalItemsCount).toBe(4)
      expect(report.winnersCount).toBe(2)
      expect(report.desertedCount).toBe(1)
      expect(report.failedCount).toBe(1)

      // Winner groups
      expect(report.winnerGroups).toHaveLength(1)
      const group1 = report.winnerGroups[0]
      expect(group1.supplier.companyName).toBe('Papelaria Central LTDA')
      expect(group1.supplier.cnpjFormatted).toBe('12.345.678/0001-99')
      expect(group1.supplier.responsibleName).toBe('Carlos Silva')
      expect(group1.supplier.email).toBe('contato@papelariacentral.com')
      expect(group1.supplier.cellPhone).toBe('11999998888')
      expect(group1.supplier.isSimplesOptant).toBe(true)
      expect(group1.supplier.hasBbAccount).toBe('Ag 1234 / CC 5678-9')

      // Items inside winner group
      expect(group1.items).toHaveLength(2)
      expect(group1.subtotalValorFinal).toBe(305.0) // 10 * 25.5 + 5 * 10 = 255 + 50 = 305

      // Grand total
      expect(report.grandTotalValorFinal).toBe(305.0)

      // Non-winner items
      expect(report.nonWinnerItems).toHaveLength(2)
      expect(report.nonWinnerItems.some((i) => i.outcome === 'deserted')).toBe(true)
      expect(report.nonWinnerItems.some((i) => i.outcome === 'failed')).toBe(true)
    })
  })

  describe('buildDisputeReportCsv', () => {
    it('constructs CSV with UTF-8 BOM, demand header metadata, winner supplier block, and subtotal/total rows', () => {
      const mockData = {
        demandId: 'demand-1',
        demandName: 'Demanda Teste 2026',
        demand: {
          id: 'demand-1',
          name: 'Demanda Teste 2026',
          type: 'consumption',
          typeLabel: 'Material de Consumo',
          status: 'homologation',
          statusLabel: 'Homologação',
          processNumber: 'PROC-100',
          internalProcessNumber: 'INT-200',
          biddingNoticeNumber: 'AV-300',
          disputeNumber: 'DISP-400',
          disputeDate: '25/10/2026',
          offerOpeningDate: '22/10/2026 09:00',
          idPca: 'PCA-500',
          siafemNumber: 'SIAFEM-600',
        },
        totalItemsCount: 1,
        winnersCount: 1,
        failedCount: 0,
        desertedCount: 0,
        grandTotalValorFinal: 250.0,
        winnerGroups: [
          {
            supplier: {
              id: 'supp-1',
              companyName: 'Alfa Comércio',
              cnpj: '11222333000144',
              cnpjFormatted: '11.222.333/0001-44',
              email: 'alfa@comercio.com',
              cellPhone: '11999991111',
              landline: null,
              address: 'Av Paulista, 1000',
              responsibleName: 'Maria Alfa',
              isSimplesOptant: true,
              hasBbAccount: 'Sim',
            },
            subtotalValorFinal: 250.0,
            totalItemsCount: 1,
            items: [
              {
                id: 'item-1',
                natureza: '339030',
                itemBec: '1234',
                especificacao: 'Produto A',
                unidadeBec: 'UN',
                qtd: 10,
                valorOfertado: 25.0,
                valorFinal: 250.0,
                outcome: 'winner' as const,
                outcomeLabel: 'Vencedor',
              },
            ],
          },
        ],
        nonWinnerItems: [],
      }

      const csv = buildDisputeReportCsv(mockData)

      // Has UTF-8 BOM
      expect(csv.startsWith('\uFEFF')).toBe(true)

      // Check demand header metadata in CSV
      expect(csv).toContain('"RELATÓRIO DE HOMOLOGAÇÃO DA DISPUTA";"Demanda Teste 2026"')
      expect(csv).toContain('"Nº Processo:";"PROC-100"')
      expect(csv).toContain('"Nº Processo Interno:";"INT-200"')
      expect(csv).toContain('"Nº Aviso de Contratação:";"AV-300"')
      expect(csv).toContain('"Nº Disputa:";"DISP-400"')
      expect(csv).toContain('"Data da Disputa:";"25/10/2026"')
      expect(csv).toContain('"PCA:";"PCA-500"')
      expect(csv).toContain('"Nº SIAFEM:";"SIAFEM-600"')

      // Check supplier header in CSV
      expect(csv).toContain('"FORNECEDOR VENCEDOR: Alfa Comércio"')
      expect(csv).toContain('"CNPJ: 11.222.333/0001-44"')
      expect(csv).toContain('"Responsável: Maria Alfa"')
      expect(csv).toContain('"E-mail: alfa@comercio.com"')

      // Check table header row
      expect(csv).toContain(
        '"NATUREZA";"ITEM BEC";"ESPECIFICAÇÃO";"Unidade BEC";"QTD";"Valor Ofertado";"Valor Final"',
      )

      // Check data row (unit bid formatted with 4 decimals, subtotal with 2 decimals)
      expect(csv).toContain('"339030";"1234";"Produto A";"UN";"10";"25,0000";"250,00"')

      // Check subtotal row
      expect(csv).toContain('"SUBTOTAL (Alfa Comércio)";"";"";"";"";"";"250,00"')

      // Check grand total row
      expect(csv).toContain('"TOTAL GERAL HOMOLOGADO DA DEMANDA";"";"";"";"";"";"250,00"')
    })
  })

  describe('buildDisputeReportHtml', () => {
    it('constructs a standalone HTML document with demand metadata, winner supplier and items table', () => {
      const mockData = {
        demandId: 'demand-1',
        demandName: 'Demanda Teste 2026',
        demand: {
          id: 'demand-1',
          name: 'Demanda Teste 2026',
          type: 'consumption',
          typeLabel: 'Consumo',
          status: 'homologation',
          statusLabel: 'Homologação',
          processNumber: 'PROC-100',
          internalProcessNumber: 'INT-200',
          biddingNoticeNumber: 'AV-300',
          disputeNumber: 'DISP-400',
          disputeDate: '25/10/2026',
          offerOpeningDate: '22/10/2026 09:00',
          idPca: 'PCA-500',
          siafemNumber: 'SIAFEM-600',
        },
        totalItemsCount: 1,
        winnersCount: 1,
        failedCount: 0,
        desertedCount: 0,
        grandTotalValorFinal: 250.0,
        winnerGroups: [
          {
            supplier: {
              id: 'supp-1',
              companyName: 'Alfa Comércio',
              cnpj: '11222333000144',
              cnpjFormatted: '11.222.333/0001-44',
              email: 'alfa@comercio.com',
              cellPhone: '11999991111',
              landline: null,
              address: 'Av Paulista, 1000',
              responsibleName: 'Maria Alfa',
              isSimplesOptant: true,
              hasBbAccount: 'Sim',
            },
            subtotalValorFinal: 250.0,
            totalItemsCount: 1,
            items: [
              {
                id: 'item-1',
                natureza: '339030',
                itemBec: '1234',
                especificacao: 'Produto A',
                unidadeBec: 'UN',
                qtd: 10,
                valorOfertado: 25.0,
                valorFinal: 250.0,
                outcome: 'winner' as const,
                outcomeLabel: 'Vencedor',
              },
            ],
          },
        ],
        nonWinnerItems: [],
      }

      const html = buildDisputeReportHtml(mockData)

      expect(html).toContain('<!DOCTYPE html>')
      expect(html).toContain('Demanda Teste 2026')
      expect(html).toContain('PROC-100')
      expect(html).toContain('SIAFEM-600')
      expect(html).toContain('Alfa Comércio')
      expect(html).toContain('11.222.333/0001-44')
      expect(html).toContain('Produto A')
      expect(html).toContain('SUBTOTAL (Alfa Comércio):')
      expect(html).toContain('TOTAL GERAL HOMOLOGADO DA DISPUTA:')
    })
  })

  describe('useDemandReports composable methods', () => {
    const mockData = {
      demandId: 'demand-1',
      demandName: 'Demanda Teste',
      demand: {
        id: 'demand-1',
        name: 'Demanda Teste',
        type: 'consumption',
        typeLabel: 'Material de Consumo',
        status: 'homologation',
        statusLabel: 'Homologação',
        processNumber: '-',
        internalProcessNumber: '-',
        biddingNoticeNumber: '-',
        disputeNumber: '-',
        disputeDate: '-',
        offerOpeningDate: '-',
        idPca: '-',
        siafemNumber: '-',
      },
      totalItemsCount: 0,
      winnersCount: 0,
      failedCount: 0,
      desertedCount: 0,
      grandTotalValorFinal: 0,
      winnerGroups: [],
      nonWinnerItems: [],
    }

    it('logs action when exporting dispute report to CSV', async () => {
      const { exportDisputeReportToCsv } = useDemandReports()

      await exportDisputeReportToCsv(mockData)

      expect(logActionMock).toHaveBeenCalledWith(
        'EXPORT_DEMAND_DISPUTE_REPORT_CSV',
        expect.stringContaining('Demanda Teste'),
      )
    })

    it('logs action when exporting/printing dispute report to PDF', async () => {
      const { logPdfExport, printDisputeReport } = useDemandReports()

      await logPdfExport('Demanda Teste PDF')

      expect(logActionMock).toHaveBeenCalledWith(
        'EXPORT_DEMAND_DISPUTE_REPORT_PDF',
        expect.stringContaining('Demanda Teste PDF'),
      )

      await printDisputeReport(mockData)
      expect(logActionMock).toHaveBeenCalledWith(
        'EXPORT_DEMAND_DISPUTE_REPORT_PDF',
        expect.stringContaining('Demanda Teste'),
      )
    })

    it('buildDisputeReportPdfDoc creates a searchable jsPDF document with winner items and demand metadata', async () => {
      const fullMockData = {
        demandId: 'demand-1',
        demandName: 'Pregão Presencial 01/2026',
        demand: {
          id: 'demand-1',
          name: 'Pregão Presencial 01/2026',
          type: 'consumption',
          typeLabel: 'Material de Consumo',
          status: 'homologation',
          statusLabel: 'Homologação',
          processNumber: '123/2026',
          internalProcessNumber: 'INT-999',
          biddingNoticeNumber: 'AV-01',
          disputeNumber: 'DISP-01',
          disputeDate: '25/10/2026',
          offerOpeningDate: '22/10/2026 09:00',
          idPca: 'PCA-2026-001',
        },
        winnerGroups: [
          {
            supplier: {
              id: 'supp-1',
              companyName: 'Papelaria Central LTDA',
              cnpj: '12345678000199',
              cnpjFormatted: '12.345.678/0001-99',
              email: 'contato@papelariacentral.com',
              cellPhone: '11999998888',
              landline: null,
              address: 'Rua das Flores, 100',
              responsibleName: 'Carlos Silva',
              isSimplesOptant: true,
              hasBbAccount: 'Ag 1234 / CC 5678-9',
            },
            subtotalValorFinal: 255.0,
            totalItemsCount: 1,
            items: [
              {
                id: 'item-1',
                natureza: '339030',
                itemBec: '12345',
                especificacao: 'Papel A4 Sulfite',
                unidadeBec: '101 - Pacote 500fls',
                qtd: 10,
                valorOfertado: 25.5,
                valorFinal: 255.0,
                outcome: 'winner' as const,
                outcomeLabel: 'Vencedor',
              },
            ],
          },
        ],
        nonWinnerItems: [
          {
            id: 'item-2',
            natureza: '339030',
            itemBec: '54321',
            especificacao: 'Grampeador Grande',
            unidadeBec: 'Unidade',
            qtd: 2,
            valorOfertado: null,
            valorFinal: null,
            outcome: 'deserted' as const,
            outcomeLabel: 'Deserto',
          },
        ],
        grandTotalValorFinal: 255.0,
        totalItemsCount: 2,
        winnersCount: 1,
        failedCount: 0,
        desertedCount: 1,
      }

      const doc = await buildDisputeReportPdfDoc(fullMockData)
      expect(doc).toBeDefined()
      expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1)

      const raw = doc.output()
      // Verify vector text content exists in the PDF document stream
      expect(raw).toContain('Papelaria Central LTDA')
      expect(raw).toContain('12.345.678/0001-99')
      expect(raw).toContain('Carlos Silva')
      expect(raw).toContain('Papel A4 Sulfite')
      expect(raw).toContain('Grampeador Grande')
      expect(raw).toContain('PCA-2026-001')
    })

    it('exportDisputeReportToPdf downloads the blob and logs action', async () => {
      const { exportDisputeReportToPdf } = useDemandReports()

      await exportDisputeReportToPdf(mockData)

      expect(logActionMock).toHaveBeenCalledWith(
        'EXPORT_DEMAND_DISPUTE_REPORT_PDF',
        expect.stringContaining('Demanda Teste'),
      )
    })
  })

  describe('Annual Product Class Spending (Empenhos Emitidos & Teto Anual)', () => {
    it('resolveDemandYear prioritizes dispute_date, then internal_process_number prefix, then created_at', () => {
      expect(
        resolveDemandYear({
          dispute_date: '2025-07-15',
          internal_process_number: '2026-0010',
          created_at: '2026-01-10T10:00:00Z',
        }),
      ).toBe(2025)

      expect(
        resolveDemandYear({
          dispute_date: null,
          internal_process_number: '2024-0098',
          created_at: '2026-02-01T10:00:00Z',
        }),
      ).toBe(2024)

      expect(
        resolveDemandYear({
          dispute_date: null,
          internal_process_number: 'SEM-PADRAO',
          created_at: '2026-05-12T10:00:00Z',
        }),
      ).toBe(2026)
    })

    it('hasItemCommitmentIssued returns true only when commitment_number is filled or execution_status is >= commitment_issued', () => {
      expect(
        hasItemCommitmentIssued({
          commitment_number: null,
          execution_status: 'homologated',
        }),
      ).toBe(false)

      expect(
        hasItemCommitmentIssued({
          commitment_number: '   ',
          execution_status: null,
        }),
      ).toBe(false)

      expect(
        hasItemCommitmentIssued({
          commitment_number: '2026NE00045',
          execution_status: 'homologated',
        }),
      ).toBe(true)

      expect(
        hasItemCommitmentIssued({
          commitment_number: null,
          execution_status: 'commitment_issued',
        }),
      ).toBe(true)

      expect(
        hasItemCommitmentIssued({
          commitment_number: null,
          execution_status: 'completed',
        }),
      ).toBe(true)
    })

    it('calculateClassSpendingByYear includes ONLY classes with issued commitments and uses dispute result totalFinal against 2026 ceiling (65492.11)', () => {
      const mockDemands: DemandWithClassProductsRow[] = [
        {
          id: 'dem-2026-1',
          name: 'Aquisição de Material de Escritório',
          status: 'completed',
          process_number: '058.0001/2026-11',
          internal_process_number: '2026-0001',
          dispute_date: '2026-03-10',
          created_at: '2026-03-01T10:00:00Z',
          deleted_at: null,
          demand_products: [
            // Item 1: Classe 7510 - Empenho Emitido - Vencedor R$ 15,00 * 100 = R$ 1.500,00
            {
              id: 'dp-1',
              demand_id: 'dem-2026-1',
              product_id: 'p-1',
              quantity: 100,
              commitment_number: '2026NE00100',
              execution_status: 'commitment_issued',
              product_name_snapshot: 'Caneta Azul',
              product: {
                id: 'p-1',
                name: 'Caneta Azul',
                cat_bec: 11111,
                cat_mat: null,
                product_class_id: '7510',
                product_classes: {
                  id: '7510',
                  name: 'Artigos de Escritório',
                  is_active: true,
                  is_pending: false,
                  created_at: '',
                  updated_at: '',
                },
                expense_nature_id: '339030',
                is_active: true,
                created_at: '',
                created_by: null,
                updated_at: '',
              },
              demand_product_bids: [
                {
                  id: 'bid-1',
                  demand_product_id: 'dp-1',
                  supplier_id: 's-1',
                  amount: 15.0,
                  status: 'winner',
                  created_at: '',
                  updated_at: '',
                  suppliers: {
                    id: 's-1',
                    company_name: 'Papelaria Alfa',
                    cnpj: '11111111000111',
                  } as never,
                },
              ],
            } as unknown as DemandProductRow,

            // Item 2: Classe 7510 - Empenho Concluído - Vencedor R$ 200,00 * 10 = R$ 2.000,00
            {
              id: 'dp-2',
              demand_id: 'dem-2026-1',
              product_id: 'p-2',
              quantity: 10,
              commitment_number: '2026NE00101',
              execution_status: 'completed',
              product_name_snapshot: 'Caixa Arquivo',
              product: {
                id: 'p-2',
                name: 'Caixa Arquivo',
                cat_bec: 22222,
                cat_mat: null,
                product_class_id: '7510',
                product_classes: {
                  id: '7510',
                  name: 'Artigos de Escritório',
                  is_active: true,
                  is_pending: false,
                  created_at: '',
                  updated_at: '',
                },
                expense_nature_id: '339030',
                is_active: true,
                created_at: '',
                created_by: null,
                updated_at: '',
              },
              demand_product_bids: [
                {
                  id: 'bid-2',
                  demand_product_id: 'dp-2',
                  supplier_id: 's-1',
                  amount: 200.0,
                  status: 'winner',
                  created_at: '',
                  updated_at: '',
                  suppliers: {
                    id: 's-1',
                    company_name: 'Papelaria Alfa',
                    cnpj: '11111111000111',
                  } as never,
                },
              ],
            } as unknown as DemandProductRow,

            // Item 3: Classe 9999 - SEM EMPENHO EMITIDO (apenas homologado) -> DEVE SER IGNORADO!
            {
              id: 'dp-3',
              demand_id: 'dem-2026-1',
              product_id: 'p-3',
              quantity: 50,
              commitment_number: null,
              execution_status: 'homologated',
              product_name_snapshot: 'Produto Sem Empenho',
              product: {
                id: 'p-3',
                name: 'Produto Sem Empenho',
                cat_bec: 33333,
                cat_mat: null,
                product_class_id: '9999',
                product_classes: {
                  id: '9999',
                  name: 'Classe Sem Empenho',
                  is_active: true,
                  is_pending: false,
                  created_at: '',
                  updated_at: '',
                },
                expense_nature_id: '339030',
                is_active: true,
                created_at: '',
                created_by: null,
                updated_at: '',
              },
              demand_product_bids: [
                {
                  id: 'bid-3',
                  demand_product_id: 'dp-3',
                  supplier_id: 's-1',
                  amount: 100.0,
                  status: 'winner',
                  created_at: '',
                  updated_at: '',
                },
              ],
            } as unknown as DemandProductRow,
          ],
        },
        // Demanda de 2025 (ano anterior) -> não deve entrar no cálculo de 2026, mas deve entrar no de 2025
        {
          id: 'dem-2025-1',
          name: 'Demanda Legada 2025',
          status: 'completed',
          process_number: '058.0099/2025-00',
          internal_process_number: '2025-0050',
          dispute_date: '2025-11-20',
          created_at: '2026-01-05T10:00:00Z',
          deleted_at: null,
          demand_products: [
            {
              id: 'dp-2025',
              demand_id: 'dem-2025-1',
              product_id: 'p-2025',
              quantity: 5,
              commitment_number: '2025NE00999',
              execution_status: 'completed',
              product_name_snapshot: 'Equipamento 2025',
              product: {
                id: 'p-2025',
                name: 'Equipamento 2025',
                cat_bec: 44444,
                cat_mat: null,
                product_class_id: '5915',
                product_classes: {
                  id: '5915',
                  name: 'Filtros e Redes',
                  is_active: true,
                  is_pending: false,
                  created_at: '',
                  updated_at: '',
                },
                expense_nature_id: '449052',
                is_active: true,
                created_at: '',
                created_by: null,
                updated_at: '',
              },
              demand_product_bids: [
                {
                  id: 'bid-2025',
                  demand_product_id: 'dp-2025',
                  supplier_id: 's-2',
                  amount: 1000.0,
                  status: 'winner',
                  created_at: '',
                  updated_at: '',
                },
              ],
            } as unknown as DemandProductRow,
          ],
        },
      ]

      // 1. Cálculo para 2026 (Teto R$ 65.492,11)
      const report2026 = calculateClassSpendingByYear({
        demands: mockDemands,
        year: 2026,
        ceilingAmount: 65492.11,
        isCeilingConfigured: true,
      })

      expect(report2026.year).toBe(2026)
      expect(report2026.ceilingAmount).toBe(65492.11)
      expect(report2026.totalClassesWithCommitment).toBe(1) // Apenas Classe 7510! Classe 9999 foi excluída por não ter empenho
      expect(report2026.totalCommittedItems).toBe(2)
      expect(report2026.grandTotalSpent).toBe(3500.0) // 1500 + 2000

      const cls7510 = report2026.classes[0]!
      expect(cls7510.classId).toBe('7510')
      expect(cls7510.className).toBe('Artigos de Escritório')
      expect(cls7510.accumulatedSpent).toBe(3500.0)
      expect(cls7510.remainingBalance).toBe(61992.11) // 65492.11 - 3500.00 = 61992.11
      expect(cls7510.isExceeded).toBe(false)

      // 2. Cálculo para 2025 (Ano anterior cadastrado pelo admin)
      const report2025 = calculateClassSpendingByYear({
        demands: mockDemands,
        year: 2025,
        ceilingAmount: 59906.02,
        isCeilingConfigured: true,
      })

      expect(report2025.year).toBe(2025)
      expect(report2025.totalClassesWithCommitment).toBe(1)
      expect(report2025.classes[0]!.classId).toBe('5915')
      expect(report2025.classes[0]!.accumulatedSpent).toBe(5000.0)
      expect(report2025.classes[0]!.remainingBalance).toBe(54906.02)

      // 3. Geração de HTML e CSV do relatório
      const html = buildClassSpendingReportHtml(report2026, true)
      expect(html).toContain('Relatório de Gastos por Classe de Produtos — Exercício 2026')
      expect(html).toContain('Artigos de Escritório')
      expect(html).toContain('2026NE00100')
      expect(html).not.toContain('Classe Sem Empenho')

      const csv = buildClassSpendingReportCsv(report2026)
      expect(csv).toContain('7510')
      expect(csv).toContain('Artigos de Escritório')
      expect(csv).toContain('65492,11')
      expect(csv).toContain('3500,00')
      expect(csv).toContain('61992,11')
    })
  })
})
