import { describe, it, expect } from 'vitest'
import {
  generateTermsOfReferenceTableHtml,
  generateTermsOfReferenceTableText,
  formatSupplyUnit,
  formatProductClass,
  formatItemCodes,
  formatItemCodesPlainText,
  type DemandTermsItem,
} from '../../app/utils/demandTermsOfReferenceTable'

describe('demandTermsOfReferenceTable utility', () => {
  const sampleItems: DemandTermsItem[] = [
    {
      id: 'item-1',
      sort_order: 1,
      product_name_snapshot: 'Caneta Esferográfica Azul',
      unit_name_snapshot: 'Caixa',
      alias_name_snapshot: 'Caixa 100 UN',
      alias_code_snapshot: 38,
      quantity: 10,
      reference_price: 25.5,
      product: {
        name: 'Caneta Esferográfica Azul',
        cat_mat: 123456,
        cat_bec: 78910,
        product_classes: {
          id: '7520',
          name: 'Artigos para Escritório',
        },
        product_characteristics: [
          { value: 'Média 1.0mm', key: { name: 'Ponta' } },
          { value: 'Azul', key: { name: 'Cor' } },
        ],
      },
    },
    {
      id: 'item-2',
      sort_order: 2,
      product_name_snapshot: 'Papel A4 Sulfite 75g',
      unit_name_snapshot: 'Resma',
      alias_name_snapshot: null,
      alias_code_snapshot: null,
      quantity: 50,
      reference_price: 30,
      product: {
        name: 'Papel A4 Sulfite 75g',
        cat_mat: 654321,
        cat_bec: null,
        product_classes: null,
        product_characteristics: [],
      },
    },
  ]

  describe('formatSupplyUnit', () => {
    it('returns only the standard unit and ignores alias/alternative unit', () => {
      const formatted = formatSupplyUnit(sampleItems[0])
      expect(formatted).toBe('Caixa')
      expect(formatted).not.toContain('Caixa 100 UN')
      expect(formatted).not.toContain('38')
    })

    it('formats unit correctly when no alias exists', () => {
      const formatted = formatSupplyUnit(sampleItems[1])
      expect(formatted).toBe('Resma')
    })

    it('falls back to measurement_units relation if unit_name_snapshot is empty', () => {
      const formatted = formatSupplyUnit({
        id: 'item-unit-rel',
        quantity: 1,
        measurement_units: { name: 'Unidade' },
      })
      expect(formatted).toBe('Unidade')
    })

    it('handles fallback when unit is missing', () => {
      const formatted = formatSupplyUnit({
        id: 'item-empty',
        quantity: 1,
      })
      expect(formatted).toBe('-')
    })
  })

  describe('formatProductClass', () => {
    it('formats class with id and name', () => {
      expect(formatProductClass(sampleItems[0])).toBe('7520 - Artigos para Escritório')
    })

    it('returns "-" when product has no class', () => {
      expect(formatProductClass(sampleItems[1])).toBe('-')
    })

    it('handles partial class info gracefully', () => {
      const partial1: DemandTermsItem = {
        id: 'partial-1',
        quantity: 1,
        product: { product_classes: { id: '', name: 'Sem Código' } },
      }
      expect(formatProductClass(partial1)).toBe('Sem Código')

      const partial2: DemandTermsItem = {
        id: 'partial-2',
        quantity: 1,
        product: { product_classes: { id: '9999', name: '' } },
      }
      expect(formatProductClass(partial2)).toBe('9999')
    })
  })

  describe('formatItemCodes', () => {
    it('formats both CATMAT and BEC', () => {
      expect(formatItemCodes(sampleItems[0], 'both')).toBe('CATMAT: 123456<br>BEC: 78910')
      expect(formatItemCodesPlainText(sampleItems[0], 'both')).toBe('CATMAT: 123456 / BEC: 78910')
    })

    it('formats CATMAT only', () => {
      expect(formatItemCodes(sampleItems[0], 'catmat')).toBe('123456')
      expect(formatItemCodes(sampleItems[1], 'catbec')).toBe('-')
    })

    it('handles missing codes gracefully', () => {
      const itemWithoutCodes: DemandTermsItem = {
        id: 'no-code',
        quantity: 1,
        product: { name: 'Sem código', cat_mat: null, cat_bec: null },
      }
      expect(formatItemCodes(itemWithoutCodes, 'both')).toBe('-')
      expect(formatItemCodesPlainText(itemWithoutCodes, 'both')).toBe('-')
    })
  })

  describe('generateTermsOfReferenceTableHtml', () => {
    it('generates HTML table with class column, standard unit, dark header, zebra rows, and prices', () => {
      const html = generateTermsOfReferenceTableHtml(sampleItems)

      expect(html).toContain('<table')
      expect(html).toContain('background-color: #1e3a5f')
      expect(html).toContain('color: #ffffff')
      expect(html).toContain('Item')
      expect(html).toContain('Classe')
      expect(html).toContain('Código')
      expect(html).toContain('Descrição do Objeto / Especificação Técnica')
      expect(html).toContain('Unidade')
      expect(html).toContain('Qtd.')
      expect(html).toContain('Valor Unit. (R$)')
      expect(html).toContain('Valor Total (R$)')

      // Class rendered
      expect(html).toContain('7520 - Artigos para Escritório')

      // Standard unit only
      expect(html).toContain('Caixa')
      expect(html).not.toContain('Caixa (38 - Caixa 100 UN)')

      // First row (white bg)
      expect(html).toContain('background-color: #ffffff')
      expect(html).toContain('Caneta Esferográfica Azul')
      expect(html).toContain('Ponta: </strong>Média 1.0mm')
      expect(html).toContain('Cor: </strong>Azul')

      // Second row (zebra bg)
      expect(html).toContain('background-color: #f8fafc')
      expect(html).toContain('Papel A4 Sulfite 75g')

      // Unit price formatted with 4 decimals
      expect(html.replace(/\s/g, ' ')).toContain('25,5000')
      expect(html.replace(/\s/g, ' ')).toContain('30,0000')

      // Footer has colspan="6" for base columns
      expect(html).toContain('colspan="6"')
      expect(html).toContain('Valor Total Estimado da Contratação:')
      expect(html).toContain('1.755,00')
    })

    it('omits characteristics when includeCharacteristics is false', () => {
      const html = generateTermsOfReferenceTableHtml(sampleItems, {
        includeCharacteristics: false,
      })
      expect(html).not.toContain('Ponta: </strong>Média 1.0mm')
      expect(html).not.toContain('<ul style="margin:')
      expect(html).toContain('Caneta Esferográfica Azul')
    })

    it('omits prices and total row when includePrices is false', () => {
      const html = generateTermsOfReferenceTableHtml(sampleItems, {
        includePrices: false,
      })
      expect(html).not.toContain('Valor Unit. (R$)')
      expect(html).not.toContain('Valor Total (R$)')
      expect(html).not.toContain('Valor Total Estimado da Contratação:')
      expect(html).not.toContain('<tfoot>')
    })

    it('escapes dangerous HTML characters in product names, classes, and characteristics', () => {
      const xssItems: DemandTermsItem[] = [
        {
          id: 'xss-1',
          product_name_snapshot: '<script>alert("hack")</script>',
          quantity: 1,
          product: {
            name: '<script>alert("hack")</script>',
            product_classes: { id: '<tag>', name: 'Classe & "Perigosa"' },
            product_characteristics: [{ value: 'Value & <tag>', key: { name: 'Key & "Test"' } }],
          },
        },
      ]
      const html = generateTermsOfReferenceTableHtml(xssItems)
      expect(html).not.toContain('<script>')
      expect(html).toContain('&lt;script&gt;alert(&quot;hack&quot;)&lt;/script&gt;')
      expect(html).toContain('&lt;tag&gt; - Classe &amp; &quot;Perigosa&quot;')
      expect(html).toContain('Key &amp; &quot;Test&quot;')
      expect(html).toContain('Value &amp; &lt;tag&gt;')
    })
  })

  describe('generateTermsOfReferenceTableText', () => {
    it('generates tab-separated text representation including class and standard unit', () => {
      const text = generateTermsOfReferenceTableText(sampleItems)
      expect(text).toContain(
        [
          'Item',
          'Classe',
          'Código',
          'Descrição do Objeto / Especificação Técnica',
          'Unidade',
          'Qtd.',
          'Valor Unit. (R$)',
          'Valor Total (R$)',
        ].join('\t'),
      )
      expect(text).toContain(
        '1\t7520 - Artigos para Escritório\tCATMAT: 123456 / BEC: 78910\tCaneta Esferográfica Azul (Ponta: Média 1.0mm; Cor: Azul)\tCaixa\t10\t',
      )
      expect(text.replace(/\s/g, ' ')).toContain('25,5000')
      expect(text.replace(/\s/g, ' ')).toContain('30,0000')
      expect(text).toContain('Total Estimado:')
    })

    it('omits prices when includePrices is false in plain text', () => {
      const text = generateTermsOfReferenceTableText(sampleItems, { includePrices: false })
      expect(text).not.toContain('Valor Unit. (R$)')
      expect(text).not.toContain('Total Estimado:')
    })
  })
})
