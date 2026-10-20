import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import {
  generateDisputeReportData,
  buildDisputeReportCsv,
  formatDecimalBr,
  escapeCsvField,
  useDemandReports,
} from '~/composables/useDemandReports'
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
      expect(formatDecimalBr(10)).toBe('10,00')
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
  })

  describe('generateDisputeReportData', () => {
    const mockDemand: DemandRow = {
      id: 'demand-1',
      name: 'Pregão Presencial 01/2026',
      type: 'consumption',
      status: 'homologation',
      process_number: '123/2026',
      bidding_notice_number: 'AV-01',
      dispute_number: 'DISP-01',
      dispute_date: '2026-10-25',
      offer_opening_date: null,
      contract_number: null,
      id_pca: null,
      is_return_requested: false,
      return_reason: null,
      deleted_at: null,
      user_id: 'user-1',
      created_at: '2026-10-15T10:00:00Z',
      updated_at: '2026-10-19T10:00:00Z',
    }

    it('returns empty data when items is empty or null', () => {
      const dataEmpty = generateDisputeReportData(mockDemand, [])
      expect(dataEmpty.groups).toEqual([])
      expect(dataEmpty.grandTotalValorFinal).toBe(0)
      expect(dataEmpty.totalItemsCount).toBe(0)

      const dataNull = generateDisputeReportData(mockDemand, null)
      expect(dataNull.groups).toEqual([])
      expect(dataNull.grandTotalValorFinal).toBe(0)
      expect(dataNull.totalItemsCount).toBe(0)
    })

    it('groups items by NATUREZA (expense nature code) and calculates subtotals & grand totals', () => {
      const mockItems: DemandProductRow[] = [
        // Group Natureza 339030 (Material de Consumo) - 2 items
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
                company_name: 'Papelaria Central',
                cnpj: '12345678000199',
                name: 'Papelaria Central',
                fantasy_name: null,
                state_registration: null,
                address: null,
                phone: null,
                email: null,
                created_at: '',
                updated_at: '',
              },
            },
          ],
        },
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
                company_name: 'Papelaria Central',
                cnpj: '12345678000199',
                name: 'Papelaria Central',
                fantasy_name: null,
                state_registration: null,
                address: null,
                phone: null,
                email: null,
                created_at: '',
                updated_at: '',
              },
            },
          ],
        },
        // Group Natureza 339039 (Outros Serviços de Terceiros) - 1 deserted item, 1 failed item
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
          product: {
            id: 'prod-3',
            name: 'Serviço de Manutenção Preventiva',
            cat_bec: 11223,
            cat_mat: null,
            expense_nature_id: '339039',
            product_class_id: null,
            is_active: true,
            created_at: '2026-10-15T10:00:00Z',
            created_by: null,
            updated_at: '2026-10-15T10:00:00Z',
            expense_natures: {
              id: '339039',
              name: 'Outros Serviços de Terceiros',
              created_at: '',
              updated_at: '',
              is_active: true,
              is_pending: false,
            },
          },
          measurement_units: {
            id: 'unit-3',
            name: 'Unidade',
            created_at: '',
            updated_at: '',
            is_active: true,
            is_pending: false,
          },
          measurement_unit_aliases: null,
          demand_product_bids: [], // Deserted
        },
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
          product: {
            id: 'prod-4',
            name: 'Serviço de Instalação Elétrica',
            cat_bec: 44556,
            cat_mat: null,
            expense_nature_id: '339039',
            product_class_id: null,
            is_active: true,
            created_at: '2026-10-15T10:00:00Z',
            created_by: null,
            updated_at: '2026-10-15T10:00:00Z',
            expense_natures: {
              id: '339039',
              name: 'Outros Serviços de Terceiros',
              created_at: '',
              updated_at: '',
              is_active: true,
              is_pending: false,
            },
          },
          measurement_units: {
            id: 'unit-3',
            name: 'Unidade',
            created_at: '',
            updated_at: '',
            is_active: true,
            is_pending: false,
          },
          measurement_unit_aliases: null,
          demand_product_bids: [
            {
              id: 'bid-4',
              demand_product_id: 'item-4',
              supplier_id: 'supp-1',
              amount: 500.0,
              status: 'disqualified',
              disqualification_reason: 'Não atendeu ao edital',
              created_at: '2026-10-19T10:00:00Z',
              updated_at: '2026-10-19T10:00:00Z',
              suppliers: {
                id: 'supp-1',
                company_name: 'Papelaria Central',
                cnpj: '12345678000199',
                name: 'Papelaria Central',
                fantasy_name: null,
                state_registration: null,
                address: null,
                phone: null,
                email: null,
                created_at: '',
                updated_at: '',
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

      // Subtotals & Filtering:
      // Group 1 (339030): item 1 = 10 * 25.5 = 255; item 2 = 5 * 10 = 50 => subtotal = 305
      // Natureza 339039 has only deserted & failed items, so it is NOT included in report.groups!
      // Total groups should be 1
      // Grand Total: 305
      expect(report.groups).toHaveLength(1)

      const group30 = report.groups.find((g) => g.natureza === '339030')!
      expect(group30).toBeDefined()
      expect(group30.items).toHaveLength(2)
      expect(group30.subtotalValorFinal).toBe(305.0)
      expect(group30.hasDesertedOrFailed).toBe(false)

      const group39 = report.groups.find((g) => g.natureza === '339039')
      expect(group39).toBeUndefined()

      expect(report.grandTotalValorFinal).toBe(305.0)

      // Test Field values
      const item1 = group30.items.find((i) => i.id === 'item-1')!
      expect(item1.natureza).toBe('339030')
      expect(item1.itemBec).toBe('12345')
      expect(item1.especificacao).toBe('Papel A4')
      expect(item1.unidadeBec).toBe('101 - Pacote 500fls')
      expect(item1.qtd).toBe(10)
      expect(item1.valorOfertado).toBe(25.5)
      expect(item1.valorFinal).toBe(255.0)

      // Item 2 has no alias code, so it falls back to unit name
      const item2 = group30.items.find((i) => i.id === 'item-2')!
      expect(item2.unidadeBec).toBe('Caixa')
    })
  })

  describe('buildDisputeReportCsv', () => {
    it('constructs CSV with UTF-8 BOM, semicolons, exact headers, and subtotal/total rows', () => {
      const mockData = {
        demandId: 'demand-1',
        demandName: 'Demanda Teste',
        totalItemsCount: 1,
        winnersCount: 1,
        failedCount: 0,
        desertedCount: 0,
        grandTotalValorFinal: 250.0,
        groups: [
          {
            natureza: '339030',
            subtotalValorFinal: 250.0,
            hasDesertedOrFailed: false,
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
      }

      const csv = buildDisputeReportCsv(mockData)

      // Has UTF-8 BOM
      expect(csv.startsWith('\uFEFF')).toBe(true)

      // Check header row
      expect(csv).toContain(
        '"NATUREZA";"ITEM BEC";"ESPECIFICAÇÃO";"Unidade BEC";"QTD";"Valor Ofertado";"Valor Final"',
      )

      // Check data row
      expect(csv).toContain('"339030";"1234";"Produto A";"UN";"10";"25,00";"250,00"')

      // Check subtotal row
      expect(csv).toContain('"SUBTOTAL (Natureza 339030)";"";"";"";"";"";"250,00"')

      // Check grand total row
      expect(csv).toContain('"TOTAL GERAL";"";"";"";"";"";"250,00"')
    })
  })

  describe('exportDisputeReportToCsv composable method', () => {
    it('logs action when exporting dispute report to CSV', async () => {
      const { exportDisputeReportToCsv } = useDemandReports()

      const mockData = {
        demandId: 'demand-1',
        demandName: 'Demanda Teste',
        totalItemsCount: 0,
        winnersCount: 0,
        failedCount: 0,
        desertedCount: 0,
        grandTotalValorFinal: 0,
        groups: [],
      }

      await exportDisputeReportToCsv(mockData)

      expect(logActionMock).toHaveBeenCalledWith(
        'EXPORT_DEMAND_DISPUTE_REPORT',
        expect.stringContaining('Demanda Teste'),
      )
    })
  })
})
