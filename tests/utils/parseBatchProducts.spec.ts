import { describe, it, expect } from 'vitest'
import { parseBatchProductsText } from '~/utils/parseBatchProducts'

describe('parseBatchProductsText utility', () => {
  it('returns empty result for empty or whitespace text', () => {
    const res = parseBatchProductsText('')
    expect(res.items).toHaveLength(0)
    expect(res.ignoredLines).toHaveLength(0)
    expect(res.summary.totalParsed).toBe(0)
  })

  it('parses simple list of product names with default nature and class', () => {
    const text = `
      Caneta Azul Esferográfica
      Resma de Papel A4
      Grampeador Metálico
    `
    const defaultNature = 'nature-1'
    const defaultClass = 'class-1'

    const res = parseBatchProductsText(text, defaultNature, defaultClass)

    expect(res.items).toHaveLength(3)
    expect(res.summary.validCount).toBe(3)
    expect(res.summary.invalidCount).toBe(0)

    expect(res.items[0]).toMatchObject({
      name: 'Caneta Azul Esferográfica',
      cat_mat: null,
      cat_bec: null,
      expense_nature_id: 'nature-1',
      product_class_id: 'class-1',
      is_active: true,
      isValid: true,
    })
  })

  it('parses TSV copied from Excel with headers', () => {
    const text = [
      'Nome do Produto\tCATMAT\tCATBEC',
      'Papel Sulfite A4\t123456\t654321',
      'Caneta Marca Texto\t234567\t',
      'Post-it Amarelo\t\t789012',
    ].join('\n')

    const res = parseBatchProductsText(text, 'default-nature')

    expect(res.items).toHaveLength(3)
    expect(res.summary.validCount).toBe(3)

    expect(res.items[0]).toMatchObject({
      name: 'Papel Sulfite A4',
      cat_mat: 123456,
      cat_bec: 654321,
      expense_nature_id: 'default-nature',
      isValid: true,
    })
    expect(res.items[1]).toMatchObject({
      name: 'Caneta Marca Texto',
      cat_mat: 234567,
      cat_bec: null,
      isValid: true,
    })
    expect(res.items[2]).toMatchObject({
      name: 'Post-it Amarelo',
      cat_mat: null,
      cat_bec: 789012,
      isValid: true,
    })
  })

  it('parses semicolon and pipe separated lines', () => {
    const textSemicolon = 'Monitor 24 Pol;445566;778899\nTeclado USB;112233;332211'
    const resSemi = parseBatchProductsText(textSemicolon, 'nature-it')
    expect(resSemi.items).toHaveLength(2)
    expect(resSemi.items[0].name).toBe('Monitor 24 Pol')
    expect(resSemi.items[0].cat_mat).toBe(445566)
    expect(resSemi.items[0].cat_bec).toBe(778899)

    const textPipe = 'Mouse Óptico | 998877 | 665544'
    const resPipe = parseBatchProductsText(textPipe, 'nature-it')
    expect(resPipe.items).toHaveLength(1)
    expect(resPipe.items[0].name).toBe('Mouse Óptico')
    expect(resPipe.items[0].cat_mat).toBe(998877)
    expect(resPipe.items[0].cat_bec).toBe(665544)
  })

  it('marks items with invalid CATMAT/CATBEC or empty name as invalid', () => {
    const text = [
      'Produto Válido\t1001\t2001',
      '\t1002\t2002', // Nome vazio
      'Produto com Letras no CATMAT\tABC\t2003',
      'Produto com Zero no CATBEC\t1004\t0',
    ].join('\n')

    const res = parseBatchProductsText(text, 'nature-1')

    expect(res.items).toHaveLength(4)
    expect(res.items[0].isValid).toBe(true)

    expect(res.items[1].isValid).toBe(false)
    expect(res.items[1].errors).toContain('Nome do produto é obrigatório.')

    expect(res.items[2].isValid).toBe(false)
    expect(res.items[2].errors.some((e) => e.includes('CATMAT'))).toBe(true)

    expect(res.items[3].isValid).toBe(false)
    expect(res.items[3].errors.some((e) => e.includes('CATBEC'))).toBe(true)
  })

  it('detects and flags in-batch duplicates for CATMAT and CATBEC', () => {
    const text = [
      'Item A\t12345\t99999',
      'Item B\t12345\t88888', // Duplicate CATMAT
      'Item C\t54321\t99999', // Duplicate CATBEC
    ].join('\n')

    const res = parseBatchProductsText(text, 'nature-1')

    expect(res.items).toHaveLength(3)
    expect(res.items[0].isValid).toBe(false)
    expect(res.items[0].errors.some((e) => e.includes('CATMAT 12345 duplicado'))).toBe(true)

    expect(res.items[1].isValid).toBe(false)
    expect(res.items[1].errors.some((e) => e.includes('CATMAT 12345 duplicado'))).toBe(true)

    expect(res.items[2].isValid).toBe(false)
    expect(res.items[2].errors.some((e) => e.includes('CATBEC 99999 duplicado'))).toBe(true)
  })

  it('fails item if expense_nature is not set and no default provided', () => {
    const text = 'Item Sem Natureza'
    const res = parseBatchProductsText(text, null)

    expect(res.items).toHaveLength(1)
    expect(res.items[0].isValid).toBe(false)
    expect(res.items[0].errors).toContain('Natureza de despesa é obrigatória.')
  })
})
