import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import {
  generateDisputeReportData,
  buildDisputeReportCsv,
  buildDisputeReportHtml,
  buildDisputeReportPdfDoc,
  formatDecimalBr,
  useDemandReports,
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
})
