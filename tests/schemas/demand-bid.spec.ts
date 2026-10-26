import { describe, it, expect } from 'vitest'
import { demandBidFormSchema } from '~/schemas/forms/demand-bid'

describe('demandBidFormSchema', () => {
  const validSupplierId = '158eb9b9-57ef-481d-bc69-3303d3a19998'

  describe('Amount parsing & decimal validation', () => {
    it('accepts number amounts and preserves decimals', () => {
      const res = demandBidFormSchema.safeParse({
        supplierId: validSupplierId,
        amount: 405.5,
      })
      expect(res.success).toBe(true)
      if (res.success) {
        expect(res.data.amount).toBe(405.5)
      }
    })

    it('accepts string amounts formatted with comma (Brazilian format) and parses to float', () => {
      const res = demandBidFormSchema.safeParse({
        supplierId: validSupplierId,
        amount: '405,50',
      })
      expect(res.success).toBe(true)
      if (res.success) {
        expect(res.data.amount).toBe(405.5)
      }
    })

    it('accepts string amounts formatted with thousands dot and decimal comma', () => {
      const res = demandBidFormSchema.safeParse({
        supplierId: validSupplierId,
        amount: '1.250,75',
      })
      expect(res.success).toBe(true)
      if (res.success) {
        expect(res.data.amount).toBe(1250.75)
      }
    })

    it('accepts string amounts formatted with dot as decimal', () => {
      const res = demandBidFormSchema.safeParse({
        supplierId: validSupplierId,
        amount: '405.50',
      })
      expect(res.success).toBe(true)
      if (res.success) {
        expect(res.data.amount).toBe(405.5)
      }
    })

    it('rejects zero or negative amount', () => {
      const resZero = demandBidFormSchema.safeParse({
        supplierId: validSupplierId,
        amount: 0,
      })
      expect(resZero.success).toBe(false)

      const resNeg = demandBidFormSchema.safeParse({
        supplierId: validSupplierId,
        amount: '-10,50',
      })
      expect(resNeg.success).toBe(false)
    })

    it('rejects empty, undefined or invalid strings', () => {
      const resEmpty = demandBidFormSchema.safeParse({
        supplierId: validSupplierId,
        amount: '',
      })
      expect(resEmpty.success).toBe(false)

      const resAlpha = demandBidFormSchema.safeParse({
        supplierId: validSupplierId,
        amount: 'abc',
      })
      expect(resAlpha.success).toBe(false)
    })
  })

  describe('Supplier validation', () => {
    it('requires supplierId when isNewSupplier is false', () => {
      const res = demandBidFormSchema.safeParse({
        isNewSupplier: false,
        amount: 100,
      })
      expect(res.success).toBe(false)
    })

    it('validates new supplier CNPJ and name when isNewSupplier is true', () => {
      const resInvalidCnpj = demandBidFormSchema.safeParse({
        isNewSupplier: true,
        newSupplierCnpj: '00000000000000',
        newSupplierName: 'Empresa Teste',
        amount: 100,
      })
      expect(resInvalidCnpj.success).toBe(false)

      // Valid test CNPJ
      const resValid = demandBidFormSchema.safeParse({
        isNewSupplier: true,
        newSupplierCnpj: '11.222.333/0001-81',
        newSupplierName: 'Empresa Teste',
        newSupplierEmail: '',
        amount: '150,00',
      })
      expect(resValid.success).toBe(true)
      if (resValid.success) {
        expect(resValid.data.amount).toBe(150)
      }
    })
  })
})
