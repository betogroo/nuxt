import { describe, it, expect } from 'vitest'
import {
  generateTermsOfReferenceTableHtml,
  generateTermsOfReferenceTableText,
  formatSupplyUnit,
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
        product_characteristics: [],
      },
    },
  ]

  describe('formatSupplyUnit', () => {
    it('formats unit and alias with code correctly', () => {
      const formatted = formatSupplyUnit(sampleItems[0])
      expect(formatted).toBe('Caixa (38 - Caixa 100 UN)')
    })

    it('formats unit without alias correctly', () => {
      const formatted = formatSupplyUnit(sampleItems[1])
      expect(formatted).toBe('Resma')
    })

    it('handles fallback when unit and alias are missing', () => {
      const formatted = formatSupplyUnit({
        id: 'item-empty',
        quantity: 1,
      })
      expect(formatted).toBe('-')
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
    it('generates HTML table with dark header, zebra rows, and prices', () => {
      const html = generateTermsOfReferenceTableHtml(sampleItems)

      expect(html).toContain('<table')
      expect(html).toContain('background-color: #1e3a5f')
      expect(html).toContain('color: #ffffff')
      expect(html).toContain('Item')
      expect(html).toContain('Código')
      expect(html).toContain('Descrição do Objeto / Especificação Técnica')
      expect(html).toContain('Unidade')
      expect(html).toContain('Qtd.')
      expect(html).toContain('Valor Unit. (R$)')
      expect(html).toContain('Valor Total (R$)')

      // First row (white bg)
      expect(html).toContain('background-color: #ffffff')
      expect(html).toContain('Caneta Esferográfica Azul')
      expect(html).toContain('Ponta: </strong>Média 1.0mm')
      expect(html).toContain('Cor: </strong>Azul')

      // Second row (zebra bg)
      expect(html).toContain('background-color: #f8fafc')
      expect(html).toContain('Papel A4 Sulfite 75g')

      // Total calculation: (10 * 25.50 = 255.00) + (50 * 30.00 = 1500.00) = 1755.00
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

    it('escapes dangerous HTML characters in product names and characteristics', () => {
      const xssItems: DemandTermsItem[] = [
        {
          id: 'xss-1',
          product_name_snapshot: '<script>alert("hack")</script>',
          quantity: 1,
          product: {
            name: '<script>alert("hack")</script>',
            product_characteristics: [{ value: 'Value & <tag>', key: { name: 'Key & "Test"' } }],
          },
        },
      ]
      const html = generateTermsOfReferenceTableHtml(xssItems)
      expect(html).not.toContain('<script>')
      expect(html).toContain('&lt;script&gt;alert(&quot;hack&quot;)&lt;/script&gt;')
      expect(html).toContain('Key &amp; &quot;Test&quot;')
      expect(html).toContain('Value &amp; &lt;tag&gt;')
    })
  })

  describe('generateTermsOfReferenceTableText', () => {
    it('generates tab-separated text representation', () => {
      const text = generateTermsOfReferenceTableText(sampleItems)
      expect(text).toContain(
        'Item\tCódigo\tDescrição do Objeto / Especificação Técnica\tUnidade\tQtd.\tValor Unit. (R$)\tValor Total (R$)',
      )
      expect(text).toContain(
        '1\tCATMAT: 123456 / BEC: 78910\tCaneta Esferográfica Azul (Ponta: Média 1.0mm; Cor: Azul)\tCaixa (38 - Caixa 100 UN)\t10\t',
      )
      expect(text).toContain('Total Estimado:')
    })

    it('omits prices when includePrices is false in plain text', () => {
      const text = generateTermsOfReferenceTableText(sampleItems, { includePrices: false })
      expect(text).not.toContain('Valor Unit. (R$)')
      expect(text).not.toContain('Total Estimado:')
    })
  })
})
