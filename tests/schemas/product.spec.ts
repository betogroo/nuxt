import { describe, it, expect } from 'vitest'
import { productFormSchema } from '../../app/schemas/forms/product'

describe('productFormSchema', () => {
  const baseValidProduct = {
    name: 'Cadeira Ergonômica',
    expense_nature_id: '33903000',
    product_class_id: '5915',
    is_active: true,
  }

  it('validates a product with valid numerical CATMAT and CATBEC', () => {
    const result = productFormSchema.safeParse({
      ...baseValidProduct,
      cat_mat: 123456,
      cat_bec: 78910,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.cat_mat).toBe(123456)
      expect(result.data.cat_bec).toBe(78910)
    }
  })

  it('converts string digits to numbers for CATMAT and CATBEC', () => {
    const result = productFormSchema.safeParse({
      ...baseValidProduct,
      cat_mat: '654321',
      cat_bec: '98765',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.cat_mat).toBe(654321)
      expect(result.data.cat_bec).toBe(98765)
    }
  })

  it('transforms empty string, null, or undefined to null', () => {
    const result = productFormSchema.safeParse({
      ...baseValidProduct,
      cat_mat: '',
      cat_bec: null,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.cat_mat).toBeNull()
      expect(result.data.cat_bec).toBeNull()
    }
  })

  it('rejects negative numbers or zero for CATMAT and CATBEC', () => {
    const resNegative = productFormSchema.safeParse({
      ...baseValidProduct,
      cat_mat: -10,
    })
    expect(resNegative.success).toBe(false)

    const resZero = productFormSchema.safeParse({
      ...baseValidProduct,
      cat_bec: 0,
    })
    expect(resZero.success).toBe(false)
  })

  it('rejects non-numeric characters in CATMAT or CATBEC strings', () => {
    const result = productFormSchema.safeParse({
      ...baseValidProduct,
      cat_mat: '123ABC',
    })
    expect(result.success).toBe(false)
  })
})
