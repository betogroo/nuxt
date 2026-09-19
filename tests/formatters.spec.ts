import { describe, it, expect } from 'vitest'
import { formatCurrency, slugify } from '../app/utils/formatters'

describe('Formatadores (utils/formatters.ts)', () => {
  describe('formatCurrency', () => {
    it('deve formatar o número corretamente para Real Brasileiro (BRL)', () => {
      // Arrange (Preparar)
      const valorBase = 1500.5

      // Act (Agir)
      const resultado = formatCurrency(valorBase)

      // Assert (Verificar)
      // Nota: o Intl.NumberFormat usa espaços sem quebra (NBSP) em alguns ambientes, então removemos caracteres especiais para checar o valor bruto.
      expect(resultado.replace(/\s/g, ' ')).toContain('R$ 1.500,50')
    })
  })

  describe('slugify', () => {
    it('deve transformar textos com espaços em hifens', () => {
      expect(slugify('Meu Produto Incrível')).toBe('meu-produto-incrivel')
    })

    it('deve remover acentuação e caracteres especiais', () => {
      expect(slugify('Ação & Reação!')).toBe('acao-reacao')
    })

    it('deve tratar hifens duplicados', () => {
      expect(slugify('Algo   com     muito espaço')).toBe('algo-com-muito-espaco')
    })
  })
})
