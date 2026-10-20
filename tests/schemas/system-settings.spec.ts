import { describe, it, expect } from 'vitest'
import { becCatalogUrlFormSchema, DEFAULT_BEC_CATALOG_URL } from '~/schemas/forms/system-settings'

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
