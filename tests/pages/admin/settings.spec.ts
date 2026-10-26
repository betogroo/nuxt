import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import SettingsAdminPage from '~/pages/admin/settings.vue'
import { DEFAULT_BEC_CATALOG_URL } from '~/schemas/forms/system-settings'

const mockFetchBecCatalogUrl = vi.fn().mockResolvedValue(DEFAULT_BEC_CATALOG_URL)
const mockUpdateBecCatalogUrl = vi.fn().mockResolvedValue(undefined)
const mockResetBecCatalogUrl = vi.fn().mockResolvedValue(undefined)

const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  confirm: vi.fn().mockResolvedValue(true),
}

mockNuxtImport('useHead', () => vi.fn())
mockNuxtImport('definePageMeta', () => vi.fn())
mockNuxtImport('useToast', () => () => mockToast)
mockNuxtImport('useSystemSettings', () => () => ({
  becCatalogUrl: { value: DEFAULT_BEC_CATALOG_URL },
  fetchBecCatalogUrl: mockFetchBecCatalogUrl,
  updateBecCatalogUrl: mockUpdateBecCatalogUrl,
  resetBecCatalogUrl: mockResetBecCatalogUrl,
}))

describe('SettingsAdminPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders settings page and loads existing BEC catalog URL', async () => {
    const wrapper = mount(SettingsAdminPage, {
      global: {
        stubs: {
          PageHeader: {
            template: '<div><slot /></div>',
          },
          UiPageHeader: {
            template: '<div><slot /></div>',
          },
          UiContainer: { template: '<div><slot /></div>' },
          UiCard: { template: '<div><slot /><slot name="header" /><slot name="actions" /></div>' },
          UiAlert: { template: '<div><slot /></div>' },
          UiRow: { template: '<div><slot /></div>' },
          UiCol: { template: '<div><slot /></div>' },
          UiInput: true,
          UiIcon: true,
          UiButton: true,
          UiSpacer: true,
          UiProgressCircular: true,
          UiActionButton: true,
        },
      },
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vm = wrapper.vm as any
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(mockFetchBecCatalogUrl).toHaveBeenCalled()
    expect(vm.urlInput).toBe(DEFAULT_BEC_CATALOG_URL)
    expect(vm.previewUrl).toContain('6460526')
  })

  it('saves updated BEC catalog URL when form is submitted', async () => {
    const wrapper = mount(SettingsAdminPage, {
      global: {
        stubs: {
          PageHeader: true,
          UiPageHeader: true,
          UiContainer: { template: '<div><slot /></div>' },
          UiCard: { template: '<div><slot /><slot name="actions" /></div>' },
          UiAlert: true,
          UiRow: { template: '<div><slot /></div>' },
          UiCol: { template: '<div><slot /></div>' },
          UiInput: true,
          UiIcon: true,
          UiButton: true,
          UiSpacer: true,
          UiProgressCircular: true,
          UiActionButton: true,
        },
      },
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vm = wrapper.vm as any
    await new Promise((resolve) => setTimeout(resolve, 0))

    const newUrl = 'https://novocatalogo.sp.gov.br/detalhe?id='
    vm.urlInput = newUrl

    await vm.onSave()

    expect(mockUpdateBecCatalogUrl).toHaveBeenCalledWith(newUrl)
    expect(mockToast.success).toHaveBeenCalledWith('Configuração salva com sucesso!')
  })

  it('resets URL back to default when confirmed by user', async () => {
    const wrapper = mount(SettingsAdminPage, {
      global: {
        stubs: {
          PageHeader: true,
          UiPageHeader: true,
          UiContainer: { template: '<div><slot /></div>' },
          UiCard: { template: '<div><slot /><slot name="actions" /></div>' },
          UiAlert: true,
          UiRow: { template: '<div><slot /></div>' },
          UiCol: { template: '<div><slot /></div>' },
          UiInput: true,
          UiIcon: true,
          UiButton: true,
          UiSpacer: true,
          UiProgressCircular: true,
          UiActionButton: true,
        },
      },
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vm = wrapper.vm as any
    await new Promise((resolve) => setTimeout(resolve, 0))

    await vm.onResetDefault()

    expect(mockToast.confirm).toHaveBeenCalled()
    expect(mockResetBecCatalogUrl).toHaveBeenCalled()
    expect(mockToast.success).toHaveBeenCalledWith('URL padrão restaurada com sucesso.')
    expect(vm.urlInput).toBe(DEFAULT_BEC_CATALOG_URL)
  })
})
