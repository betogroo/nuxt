import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useSystemSettings, parseAnnualCeilingsJson } from '../../app/composables/useSystemSettings'
import {
  DEFAULT_BEC_CATALOG_URL,
  DEFAULT_CLASS_CEILING_2026,
} from '../../app/schemas/forms/system-settings'

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

  describe('Product Class Annual Ceilings', () => {
    it('parseAnnualCeilingsJson returns default 2026 ceiling (65492.11) when input is empty or invalid', () => {
      expect(parseAnnualCeilingsJson(null)).toEqual({ '2026': DEFAULT_CLASS_CEILING_2026 })
      expect(parseAnnualCeilingsJson('')).toEqual({ '2026': DEFAULT_CLASS_CEILING_2026 })
      expect(parseAnnualCeilingsJson('invalid-json')).toEqual({
        '2026': DEFAULT_CLASS_CEILING_2026,
      })
    })

    it('parseAnnualCeilingsJson parses multiple years including historical years and preserves 2026 default if missing', () => {
      const parsed = parseAnnualCeilingsJson('{"2025":59906.02,"2024":57208.33}')
      expect(parsed).toEqual({
        '2026': 65492.11,
        '2025': 59906.02,
        '2024': 57208.33,
      })
    })

    it('fetches product class annual ceilings from system_settings', async () => {
      const { fetchProductClassAnnualCeilings } = useSystemSettings()

      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: { value: '{"2026":65492.11,"2025":59906.02}' },
        error: null,
      })
      const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })

      mockSupabase.from.mockReturnValue({ select: mockSelect })

      const ceilings = await fetchProductClassAnnualCeilings()

      expect(mockSupabase.from).toHaveBeenCalledWith('system_settings')
      expect(mockEq).toHaveBeenCalledWith('key', 'product_class_annual_ceilings')
      expect(ceilings).toEqual({
        '2026': 65492.11,
        '2025': 59906.02,
      })
    })

    it('upserts annual ceiling for a previous year (e.g. 2025) and logs action', async () => {
      const { upsertProductClassAnnualCeiling } = useSystemSettings()

      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: { value: '{"2026":65492.11}' },
        error: null,
      })
      const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      const mockUpsert = vi.fn().mockResolvedValue({ error: null })

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        upsert: mockUpsert,
      })

      const updated = await upsertProductClassAnnualCeiling(2025, 59906.02)

      expect(updated).toEqual({
        '2026': 65492.11,
        '2025': 59906.02,
      })
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'product_class_annual_ceilings',
          value: JSON.stringify({ '2025': 59906.02, '2026': 65492.11 }),
          updated_by: 'admin-user-id',
        }),
      )
      expect(mockLogAction).toHaveBeenCalledWith(
        'UPDATE_SYSTEM_SETTING',
        expect.stringContaining('2025'),
        'admin-user-id',
      )
    })

    it('removes a historical year ceiling while forbidding removal of base year 2026', async () => {
      const { removeProductClassAnnualCeiling, getCeilingForYear } = useSystemSettings()

      await expect(removeProductClassAnnualCeiling(2026)).rejects.toThrow(
        'O ano de 2026 possui valor padrão de referência e não pode ser removido',
      )

      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: { value: '{"2026":65492.11,"2024":57208.33}' },
        error: null,
      })
      const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      const mockUpsert = vi.fn().mockResolvedValue({ error: null })

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        upsert: mockUpsert,
      })

      const afterRemove = await removeProductClassAnnualCeiling(2024)
      expect(afterRemove).toEqual({ '2026': 65492.11 })

      expect(getCeilingForYear(afterRemove, 2026)).toEqual({
        amount: 65492.11,
        isConfigured: true,
      })
      expect(getCeilingForYear(afterRemove, 2023)).toEqual({
        amount: 65492.11,
        isConfigured: false,
      })
    })
  })
})
