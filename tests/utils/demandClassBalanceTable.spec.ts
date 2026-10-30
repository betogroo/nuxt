import { describe, it, expect } from 'vitest'
import type { DemandWithClassProductsRow } from '~/composables/useDemandReports'
import {
  buildDemandClassBalanceRows,
  formatClassBalanceLabel,
  generateDemandClassBalanceTableHtml,
  generateDemandClassBalanceTableText,
} from '~/utils/demandClassBalanceTable'
import type { DemandTermsItem } from '~/utils/demandTermsOfReferenceTable'

describe('demandClassBalanceTable utility', () => {
  const sampleCurrentItems: DemandTermsItem[] = [
    {
      id: 'item-1',
      quantity: 100,
      reference_price: 20, // 2,000.00
      product: {
        name: 'Resma Papel A4',
        product_class_id: '7530',
        product_classes: { id: '7530', name: 'Papelaria e Papel' },
      },
    },
    {
      id: 'item-2',
      quantity: 50,
      reference_price: 10, // 500.00 -> Total 7530 = 2,500.00 (2 itens)
      product: {
        name: 'Bloco Adesivo',
        product_class_id: '7530',
        product_classes: { id: '7530', name: 'Papelaria e Papel' },
      },
    },
    {
      id: 'item-3',
      quantity: 10,
      reference_price: 150, // 1,500.00 -> Total 7510 = 1,500.00 (1 item)
      product: {
        name: 'Toner Impressora',
        product_class_id: '7510',
        product_classes: { id: '7510', name: 'Artigos para Escritório' },
      },
    },
  ]

  const makeCommittedDemand = (
    overrides: Partial<DemandWithClassProductsRow> & { id: string },
  ): DemandWithClassProductsRow => ({
    id: overrides.id,
    name: overrides.name ?? 'Demanda Anterior',
    status: overrides.status ?? 'completed',
    process_number: overrides.process_number ?? '058.0001/2026-01',
    internal_process_number: overrides.internal_process_number ?? '2026-0001',
    dispute_date: overrides.dispute_date ?? '2026-03-10',
    created_at: overrides.created_at ?? '2026-01-15T10:00:00Z',
    deleted_at: overrides.deleted_at ?? null,
    demand_products: overrides.demand_products ?? [],
  })

  describe('buildDemandClassBalanceRows', () => {
    it('returns empty array when currentItems is empty', () => {
      const rows = buildDemandClassBalanceRows({
        currentDemandId: 'dem-current',
        currentItems: [],
        allDemands: [],
        year: 2026,
        ceilingAmount: 65492.11,
      })
      expect(rows).toEqual([])
    })

    it('groups current demand items by class and sums committed amounts from other demands of the same year', () => {
      const otherDemands: DemandWithClassProductsRow[] = [
        makeCommittedDemand({
          id: 'dem-other-2026',
          internal_process_number: '2026-0002',
          demand_products: [
            {
              id: 'dp-1',
              demand_id: 'dem-other-2026',
              product_id: 'p-1',
              quantity: 10,
              commitment_number: '2026NE00100',
              execution_status: 'commitment_issued',
              product: {
                id: 'p-1',
                name: 'Papel Sulfite',
                product_class_id: '7530',
                product_classes: { id: '7530', name: 'Papelaria e Papel' },
              },
              demand_product_bids: [
                {
                  id: 'bid-1',
                  demand_product_id: 'dp-1',
                  supplier_id: 'sup-1',
                  amount: 90, // 10 * 90 = 900.00
                  status: 'classified',
                },
              ],
            } as unknown as NonNullable<DemandWithClassProductsRow['demand_products']>[number],
          ],
        }),
        // Demanda de outro ano (2025) deve ser ignorada
        makeCommittedDemand({
          id: 'dem-other-2025',
          dispute_date: '2025-05-10',
          internal_process_number: '2025-0010',
          demand_products: [
            {
              id: 'dp-2',
              demand_id: 'dem-other-2025',
              product_id: 'p-2',
              quantity: 10,
              commitment_number: '2025NE00100',
              execution_status: 'completed',
              product: {
                id: 'p-2',
                name: 'Papel 2025',
                product_class_id: '7530',
                product_classes: { id: '7530', name: 'Papelaria e Papel' },
              },
              demand_product_bids: [
                {
                  id: 'bid-2',
                  demand_product_id: 'dp-2',
                  supplier_id: 'sup-1',
                  amount: 500,
                  status: 'classified',
                },
              ],
            } as unknown as NonNullable<DemandWithClassProductsRow['demand_products']>[number],
          ],
        }),
        // Própria demanda atual deve ser ignorada em committedInOtherDemands
        makeCommittedDemand({
          id: 'dem-current',
          internal_process_number: '2026-0005',
          demand_products: [
            {
              id: 'dp-3',
              demand_id: 'dem-current',
              product_id: 'p-3',
              quantity: 10,
              commitment_number: '2026NE00999',
              execution_status: 'commitment_issued',
              product: {
                id: 'p-3',
                name: 'Papel Atual',
                product_class_id: '7530',
                product_classes: { id: '7530', name: 'Papelaria e Papel' },
              },
              demand_product_bids: [
                {
                  id: 'bid-3',
                  demand_product_id: 'dp-3',
                  supplier_id: 'sup-1',
                  amount: 200,
                  status: 'classified',
                },
              ],
            } as unknown as NonNullable<DemandWithClassProductsRow['demand_products']>[number],
          ],
        }),
      ]

      const rows = buildDemandClassBalanceRows({
        currentDemandId: 'dem-current',
        currentItems: sampleCurrentItems,
        allDemands: otherDemands,
        year: 2026,
        ceilingAmount: 10000,
      })

      expect(rows).toHaveLength(2)
      // Ordenado alfabeticamente por className: "Artigos para Escritório" depois "Papelaria e Papel"
      expect(rows[0]).toEqual({
        classId: '7510',
        className: 'Artigos para Escritório',
        itemsCount: 1,
        ceilingAmount: 10000,
        committedInOtherDemands: 0,
        currentDemandAmount: 1500,
        remainingBalance: 8500,
        isExceeded: false,
      })
      expect(rows[1]).toEqual({
        classId: '7530',
        className: 'Papelaria e Papel',
        itemsCount: 2,
        ceilingAmount: 10000,
        committedInOtherDemands: 900,
        currentDemandAmount: 2500,
        remainingBalance: 6600,
        isExceeded: false,
      })
    })

    it('marks isExceeded as true when remainingBalance is negative', () => {
      const rows = buildDemandClassBalanceRows({
        currentDemandId: 'dem-current',
        currentItems: sampleCurrentItems,
        allDemands: [],
        year: 2026,
        ceilingAmount: 2000, // Menor que 2500 da classe 7530
      })

      const papelaria = rows.find((r) => r.classId === '7530')
      expect(papelaria).toBeDefined()
      expect(papelaria?.remainingBalance).toBe(-500)
      expect(papelaria?.isExceeded).toBe(true)
    })
  })

  describe('formatClassBalanceLabel', () => {
    it('formats class code and name together', () => {
      expect(formatClassBalanceLabel({ classId: '7530', className: 'Papelaria e Papel' })).toBe(
        '7530 - Papelaria e Papel',
      )
      expect(
        formatClassBalanceLabel({ classId: 'SEM_CLASSE', className: 'Sem Classe Vinculada' }),
      ).toBe('Sem Classe Vinculada')
    })
  })

  describe('generateDemandClassBalanceTableHtml', () => {
    const sampleRows = buildDemandClassBalanceRows({
      currentDemandId: 'dem-1',
      currentItems: sampleCurrentItems,
      allDemands: [],
      year: 2026,
      ceilingAmount: 2000,
    })

    it('generates formatted HTML table with columns, values, negative highlight, and footer', () => {
      const html = generateDemandClassBalanceTableHtml(sampleRows, 2026, {
        includeItemsCount: true,
        includeTotalsFooter: true,
      })

      expect(html).toContain('<table')
      expect(html).toContain('Classe de Materiais')
      expect(html).toContain('Teto Anual (2026)')
      expect(html).toContain('Já Empenhado (Outras Demandas)')
      expect(html).toContain('Valor Nesta Demanda')
      expect(html).toContain('Saldo Restante')
      expect(html).toContain('7510 - Artigos para Escritório')
      expect(html).toContain('(1 item)')
      expect(html).toContain('7530 - Papelaria e Papel')
      expect(html).toContain('(2 itens)')
      expect(html).toContain('#dc2626')
      expect(html).toContain('Totais Consolidados (2 classes):')
    })

    it('escapes HTML special characters in className', () => {
      const html = generateDemandClassBalanceTableHtml(
        [
          {
            classId: '1',
            className: 'Classe <script>alert(1)</script>',
            itemsCount: 1,
            ceilingAmount: 1000,
            committedInOtherDemands: 0,
            currentDemandAmount: 100,
            remainingBalance: 900,
            isExceeded: false,
          },
        ],
        2026,
      )

      expect(html).not.toContain('<script>')
      expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    })
  })

  describe('generateDemandClassBalanceTableText', () => {
    it('generates tab-separated plain text with headers and totals', () => {
      const sampleRows = buildDemandClassBalanceRows({
        currentDemandId: 'dem-1',
        currentItems: sampleCurrentItems,
        allDemands: [],
        year: 2026,
        ceilingAmount: 10000,
      })

      const text = generateDemandClassBalanceTableText(sampleRows, 2026, {
        includeItemsCount: true,
        includeTotalsFooter: true,
      })

      expect(text).toContain(
        '#\tClasse de Materiais\tTeto Anual (2026)\tJá Empenhado (Outras Demandas)\tValor Nesta Demanda\tSaldo Restante',
      )
      expect(text).toContain('7510 - Artigos para Escritório (1 item)')
      expect(text).toContain('7530 - Papelaria e Papel (2 itens)')
      expect(text).toContain('Totais Consolidados (2 classes):')
    })
  })
})
