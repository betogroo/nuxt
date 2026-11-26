import { describe, it, expect } from 'vitest'
import { formatCurrencyInWords, integerToWordsPtBr } from '~/utils/currencyInWords'

describe('currencyInWords', () => {
  describe('integerToWordsPtBr', () => {
    it('converts basic units, teens and tens', () => {
      expect(integerToWordsPtBr(0)).toBe('zero')
      expect(integerToWordsPtBr(1)).toBe('um')
      expect(integerToWordsPtBr(9)).toBe('nove')
      expect(integerToWordsPtBr(10)).toBe('dez')
      expect(integerToWordsPtBr(15)).toBe('quinze')
      expect(integerToWordsPtBr(19)).toBe('dezenove')
      expect(integerToWordsPtBr(20)).toBe('vinte')
      expect(integerToWordsPtBr(24)).toBe('vinte e quatro')
      expect(integerToWordsPtBr(99)).toBe('noventa e nove')
    })

    it('converts hundreds correctly', () => {
      expect(integerToWordsPtBr(100)).toBe('cem')
      expect(integerToWordsPtBr(101)).toBe('cento e um')
      expect(integerToWordsPtBr(800)).toBe('oitocentos')
      expect(integerToWordsPtBr(850)).toBe('oitocentos e cinquenta')
    })

    it('converts thousands correctly', () => {
      expect(integerToWordsPtBr(1000)).toBe('mil')
      expect(integerToWordsPtBr(1050)).toBe('mil e cinquenta')
      expect(integerToWordsPtBr(1250)).toBe('mil duzentos e cinquenta')
      expect(integerToWordsPtBr(24800)).toBe('vinte e quatro mil e oitocentos')
    })

    it('converts millions and billions correctly', () => {
      expect(integerToWordsPtBr(1000000)).toBe('um milhão')
      expect(integerToWordsPtBr(2000000)).toBe('dois milhões')
      expect(integerToWordsPtBr(1000000000)).toBe('um bilhão')
    })
  })

  describe('formatCurrencyInWords', () => {
    it('formats exact user request value', () => {
      expect(formatCurrencyInWords(24800)).toBe('vinte e quatro mil e oitocentos reais')
      expect(formatCurrencyInWords(24800.0)).toBe('vinte e quatro mil e oitocentos reais')
    })

    it('formats values with cents', () => {
      expect(formatCurrencyInWords(24800.5)).toBe(
        'vinte e quatro mil e oitocentos reais e cinquenta centavos',
      )
      expect(formatCurrencyInWords(1.01)).toBe('um real e um centavo')
      expect(formatCurrencyInWords(0.75)).toBe('setenta e cinco centavos')
      expect(formatCurrencyInWords(0.01)).toBe('um centavo')
    })

    it('handles singular and plural of currency correctly', () => {
      expect(formatCurrencyInWords(1)).toBe('um real')
      expect(formatCurrencyInWords(2)).toBe('dois reais')
      expect(formatCurrencyInWords(1000000)).toBe('um milhão de reais')
      expect(formatCurrencyInWords(2000000)).toBe('dois milhões de reais')
      expect(formatCurrencyInWords(1000001)).toBe('um milhão e um reais')
    })

    it('handles zero and edge cases', () => {
      expect(formatCurrencyInWords(0)).toBe('zero real')
      expect(formatCurrencyInWords(NaN)).toBe('')
    })
  })
})
