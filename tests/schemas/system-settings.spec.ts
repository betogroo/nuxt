import { describe, it, expect } from 'vitest'
import {
  becCatalogUrlFormSchema,
  DEFAULT_BEC_CATALOG_URL,
  DEFAULT_IR_RETENTION_RATE,
  irRetentionRateFormSchema,
} from '~/schemas/forms/system-settings'

describe('becCatalogUrlFormSchema', () => {
  it('accepts the default BEC catalog URL', () => {
    const result = becCatalogUrlFormSchema.safeParse({
      bec_catalog_url: DEFAULT_BEC_CATALOG_URL,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.bec_catalog_url).toBe(DEFAULT_BEC_CATALOG_URL)
    }
  })

  it('accepts any valid http or https URL', () => {
    const result = becCatalogUrlFormSchema.safeParse({
      bec_catalog_url: 'https://catalogo.sp.gov.br/item?id=',
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty URL with validation message', () => {
    const result = becCatalogUrlFormSchema.safeParse({
      bec_catalog_url: '   ',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('A URL base do catálogo BEC é obrigatória.')
    }
  })

  it('rejects invalid URL format', () => {
    const result = becCatalogUrlFormSchema.safeParse({
      bec_catalog_url: 'nao-e-uma-url-valida',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        'Informe uma URL válida iniciada por http:// ou https://',
      )
    }
  })
})

describe('irRetentionRateFormSchema', () => {
  it('accepts valid default IR retention rate (1.2%)', () => {
    const result = irRetentionRateFormSchema.safeParse({
      ir_retention_rate: DEFAULT_IR_RETENTION_RATE,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.ir_retention_rate).toBe(1.2)
    }
  })

  it('coerces string representations of numbers', () => {
    const result = irRetentionRateFormSchema.safeParse({
      ir_retention_rate: '2.5',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.ir_retention_rate).toBe(2.5)
    }
  })

  it('rejects negative rates and rates exceeding 100%', () => {
    const negativeResult = irRetentionRateFormSchema.safeParse({
      ir_retention_rate: -0.5,
    })
    expect(negativeResult.success).toBe(false)

    const overHundredResult = irRetentionRateFormSchema.safeParse({
      ir_retention_rate: 101,
    })
    expect(overHundredResult.success).toBe(false)
  })
})
