import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useSystemSettings } from '../../app/composables/useSystemSettings'
import { DEFAULT_BEC_CATALOG_URL } from '../../app/schemas/forms/system-settings'

const mockLogAction = vi.fn()

const mockSupabase = {
  from: vi.fn(),
}

mockNuxtImport('useSupabaseClient', () => vi.fn(() => mockSupabase))
mockNuxtImport('useSupabaseUser', () => vi.fn(() => ({ value: { id: 'admin-user-id' } })))
mockNuxtImport('useLogger', () => () => ({ logAction: mockLogAction }))

describe('useSystemSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('generates the correct BEC product URL with numeric or string code', () => {
    const { getBecProductUrl, becCatalogUrl } = useSystemSettings()
    becCatalogUrl.value = DEFAULT_BEC_CATALOG_URL

    expect(getBecProductUrl(6460526)).toBe(
      'https://www.bec.sp.gov.br/BEC_Catalogo_ui/CatalogDetalheNovo.aspx?chave=&cod_id=6460526',
    )
    expect(getBecProductUrl('6460526')).toBe(
      'https://www.bec.sp.gov.br/BEC_Catalogo_ui/CatalogDetalheNovo.aspx?chave=&cod_id=6460526',
    )
  })

  it('returns null when catBec is empty, null, undefined or hyphen', () => {
    const { getBecProductUrl } = useSystemSettings()

    expect(getBecProductUrl(null)).toBeNull()
    expect(getBecProductUrl(undefined)).toBeNull()
    expect(getBecProductUrl('')).toBeNull()
    expect(getBecProductUrl('   ')).toBeNull()
    expect(getBecProductUrl('-')).toBeNull()
  })

  it('fetches BEC catalog URL from supabase system_settings table', async () => {
    const { fetchBecCatalogUrl, becCatalogUrl } = useSystemSettings()

    const mockMaybeSingle = vi.fn().mockResolvedValue({
      data: { value: 'https://custom-bec.sp.gov.br/?item=' },
      error: null,
    })
    const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle })
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })

    mockSupabase.from.mockReturnValue({ select: mockSelect })

    const result = await fetchBecCatalogUrl()

    expect(mockSupabase.from).toHaveBeenCalledWith('system_settings')
    expect(mockSelect).toHaveBeenCalledWith('value')
    expect(mockEq).toHaveBeenCalledWith('key', 'bec_catalog_url')
    expect(result).toBe('https://custom-bec.sp.gov.br/?item=')
    expect(becCatalogUrl.value).toBe('https://custom-bec.sp.gov.br/?item=')
  })

  it('updates BEC catalog URL and registers audit log', async () => {
    const { updateBecCatalogUrl, becCatalogUrl } = useSystemSettings()

    const mockUpsert = vi.fn().mockResolvedValue({ error: null })
    mockSupabase.from.mockReturnValue({ upsert: mockUpsert })

    const newUrl = 'https://novocatalogo.sp.gov.br/detalhe?id='
    await updateBecCatalogUrl(newUrl)

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'bec_catalog_url',
        value: newUrl,
        updated_by: 'admin-user-id',
      }),
    )
    expect(becCatalogUrl.value).toBe(newUrl)
    expect(mockLogAction).toHaveBeenCalledWith(
      'UPDATE_SYSTEM_SETTING',
      expect.stringContaining(newUrl),
      'admin-user-id',
    )
  })

  it('resets BEC catalog URL back to default', async () => {
    const { resetBecCatalogUrl, becCatalogUrl } = useSystemSettings()

    const mockUpsert = vi.fn().mockResolvedValue({ error: null })
    mockSupabase.from.mockReturnValue({ upsert: mockUpsert })

    await resetBecCatalogUrl()

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'bec_catalog_url',
        value: DEFAULT_BEC_CATALOG_URL,
      }),
    )
    expect(becCatalogUrl.value).toBe(DEFAULT_BEC_CATALOG_URL)
  })
})
