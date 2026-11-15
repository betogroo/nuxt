import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  formatCatalogCsvField,
  formatCatalogUnitPrice,
  buildDemandCatalogCsv,
  downloadDemandCatalogCsv,
} from '~/utils/demandCatalogCsv'
import * as downloadModule from '~/utils/download'
import type { DemandProductRow } from '~/composables/useDemandProducts'

vi.mock('~/utils/download', () => ({
  downloadFile: vi.fn(),
  downloadBlob: vi.fn(),
  downloadJson: vi.fn(),
}))

describe('demandCatalogCsv', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('formatCatalogCsvField', () => {
    it('returns empty string for null or undefined', () => {
      expect(formatCatalogCsvField(null)).toBe('')
      expect(formatCatalogCsvField(undefined)).toBe('')
    })

    it('returns trimmed string as-is when no special characters are present', () => {
      expect(formatCatalogCsvField('Apelido do material')).toBe('Apelido do material')
      expect(formatCatalogCsvField('  litro  ')).toBe('litro')
      expect(formatCatalogCsvField(69019)).toBe('69019')
    })

    it('wraps and escapes values containing commas, quotes or newlines (RFC 4180)', () => {
      expect(formatCatalogCsvField('Gasolina Especial, Aditivada')).toBe(
        '"Gasolina Especial, Aditivada"',
      )
      expect(formatCatalogCsvField('Ponta 1.0mm "Fina"')).toBe('"Ponta 1.0mm ""Fina"""')
      expect(formatCatalogCsvField('Linha 1\nLinha 2')).toBe('"Linha 1\nLinha 2"')
    })
  })

  describe('formatCatalogUnitPrice', () => {
    it('returns empty quotes for null, undefined or empty string', () => {
      expect(formatCatalogUnitPrice(null)).toBe('""')
      expect(formatCatalogUnitPrice(undefined)).toBe('""')
      expect(formatCatalogUnitPrice('')).toBe('""')
    })

    it('formats numbers with comma as decimal separator and wrapped in double quotes', () => {
      expect(formatCatalogUnitPrice(12.8976)).toBe('"12,8976"')
      expect(formatCatalogUnitPrice(10)).toBe('"10"')
      expect(formatCatalogUnitPrice(0.5)).toBe('"0,5"')
      expect(formatCatalogUnitPrice(0)).toBe('"0"')
    })

    it('accepts string representations of numbers', () => {
      expect(formatCatalogUnitPrice('12.8976')).toBe('"12,8976"')
      expect(formatCatalogUnitPrice('12,8976')).toBe('"12,8976"')
    })

    it('returns empty quotes for NaN strings', () => {
      expect(formatCatalogUnitPrice('invalid-price')).toBe('""')
    })
  })

  describe('buildDemandCatalogCsv', () => {
    it('generates the exact header and row layout requested by user', () => {
      const items: DemandProductRow[] = [
        {
          id: 'item-1',
          demand_id: 'dem-1',
          product_id: 'prod-1',
          unit_id: 'unit-1',
          quantity: 100,
          reference_price: 12.8976,
          sort_order: 1,
          created_at: '2026-01-01',
          updated_at: '2026-01-01',
          alias_code_snapshot: null,
          alias_id: null,
          alias_name_snapshot: null,
          bid_interval: null,
          bid_interval_type: null,
          commitment_number: null,
          created_by: null,
          execution_error_details: null,
          execution_status: null,
          execution_status_updated_at: null,
          expense_nature_name_snapshot: null,
          product_name_snapshot: null,
          unit_name_snapshot: null,
          product: {
            id: 'prod-1',
            name: 'Gasolina Especial',
            cat_mat: 69019,
            cat_bec: null,
            expense_nature_id: null,
            product_class_id: null,
            is_active: true,
            created_at: '2026-01-01',
            updated_at: '2026-01-01',
            created_by: null,
          },
          measurement_units: {
            id: 'unit-1',
            name: 'litro',
            is_active: true,
            is_pending: false,
            created_at: '2026-01-01',
            updated_at: '2026-01-01',
          },
        },
      ]

      const csv = buildDemandCatalogCsv(items)

      // Must start with UTF-8 BOM
      expect(csv.startsWith('\uFEFF')).toBe(true)

      const lines = csv.replace('\uFEFF', '').split('\r\n')
      expect(lines[0]).toBe(
        'CODIGO_ITEM_CATALOGO,APELIDO,TIPO_ITEM_CATALOGO,DESCRICAO_UNIDADE,VALOR_UNITARIO,INFORMACOES_COMPLEMENTARES',
      )
      expect(lines[1]).toBe('69019,Gasolina Especial,MATERIAL,litro,"12,8976",Gasolina Especial')
    })

    it('handles fallback snapshots when relations are missing', () => {
      const items: DemandProductRow[] = [
        {
          id: 'item-2',
          demand_id: 'dem-1',
          product_id: 'prod-2',
          unit_id: 'unit-2',
          quantity: 50,
          reference_price: null,
          sort_order: 2,
          created_at: '2026-01-01',
          updated_at: '2026-01-01',
          alias_code_snapshot: null,
          alias_id: null,
          alias_name_snapshot: null,
          bid_interval: null,
          bid_interval_type: null,
          commitment_number: null,
          created_by: null,
          execution_error_details: null,
          execution_status: null,
          execution_status_updated_at: null,
          expense_nature_name_snapshot: null,
          product_name_snapshot: 'Papel A4, 75g',
          unit_name_snapshot: 'resma',
          product: null,
          measurement_units: null,
        },
      ]

      const csv = buildDemandCatalogCsv(items)
      const lines = csv.replace('\uFEFF', '').split('\r\n')

      expect(lines[1]).toBe(',"Papel A4, 75g",MATERIAL,resma,"","Papel A4, 75g"')
    })

    it('handles multiple items and maintains sort order', () => {
      const items: DemandProductRow[] = [
        {
          id: 'i-1',
          demand_id: 'd-1',
          product_id: 'p-1',
          unit_id: 'u-1',
          quantity: 10,
          reference_price: 5.5,
          sort_order: 1,
          created_at: '2026-01-01',
          updated_at: '2026-01-01',
          alias_code_snapshot: null,
          alias_id: null,
          alias_name_snapshot: null,
          bid_interval: null,
          bid_interval_type: null,
          commitment_number: null,
          created_by: null,
          execution_error_details: null,
          execution_status: null,
          execution_status_updated_at: null,
          expense_nature_name_snapshot: null,
          product_name_snapshot: 'Caneta Azul',
          unit_name_snapshot: 'unidade',
        },
        {
          id: 'i-2',
          demand_id: 'd-1',
          product_id: 'p-2',
          unit_id: 'u-2',
          quantity: 20,
          reference_price: 2.25,
          sort_order: 2,
          created_at: '2026-01-01',
          updated_at: '2026-01-01',
          alias_code_snapshot: null,
          alias_id: null,
          alias_name_snapshot: null,
          bid_interval: null,
          bid_interval_type: null,
          commitment_number: null,
          created_by: null,
          execution_error_details: null,
          execution_status: null,
          execution_status_updated_at: null,
          expense_nature_name_snapshot: null,
          product_name_snapshot: 'Lápis Preto',
          unit_name_snapshot: 'caixa',
        },
      ]

      const csv = buildDemandCatalogCsv(items)
      const lines = csv.replace('\uFEFF', '').split('\r\n')

      expect(lines).toHaveLength(3)
      expect(lines[1]).toBe(',Caneta Azul,MATERIAL,unidade,"5,5",Caneta Azul')
      expect(lines[2]).toBe(',Lápis Preto,MATERIAL,caixa,"2,25",Lápis Preto')
    })
  })

  describe('downloadDemandCatalogCsv', () => {
    it('triggers downloadFile with filename based on internal_process_number', () => {
      const demand = {
        internal_process_number: '2026-01',
        name: 'Artigos de Escritório',
      }
      const items: DemandProductRow[] = []

      downloadDemandCatalogCsv({ demand, items })

      expect(downloadModule.downloadFile).toHaveBeenCalledWith(
        expect.stringContaining('CODIGO_ITEM_CATALOGO'),
        'catalogo-itens-2026-01.csv',
        'text/csv;charset=utf-8;',
      )
    })

    it('falls back to demand name or default slug when process number is not set', () => {
      const demand = {
        internal_process_number: null,
        name: 'Aquisicao de Monitores',
      }
      downloadDemandCatalogCsv({ demand, items: [] })

      expect(downloadModule.downloadFile).toHaveBeenCalledWith(
        expect.any(String),
        'catalogo-itens-aquisicao_de_monitores.csv',
        'text/csv;charset=utf-8;',
      )
    })
  })
})
