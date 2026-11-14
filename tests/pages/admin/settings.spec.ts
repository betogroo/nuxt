import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import SettingsAdminPage from '~/pages/admin/settings.vue'
import {
  DEFAULT_BEC_CATALOG_URL,
  DEFAULT_DEMAND_BATCH_SUBFOLDERS,
  DEFAULT_IR_RETENTION_RATE,
} from '~/schemas/forms/system-settings'

const mockFetchBecCatalogUrl = vi.fn().mockResolvedValue(DEFAULT_BEC_CATALOG_URL)
const mockUpdateBecCatalogUrl = vi.fn().mockResolvedValue(undefined)
const mockResetBecCatalogUrl = vi.fn().mockResolvedValue(undefined)

const mockFetchIrRetentionRate = vi.fn().mockResolvedValue(DEFAULT_IR_RETENTION_RATE)
const mockUpdateIrRetentionRate = vi.fn().mockResolvedValue(undefined)
const mockResetIrRetentionRate = vi.fn().mockResolvedValue(undefined)

const mockFetchDemandBatchSubfolders = vi
  .fn()
  .mockResolvedValue([...DEFAULT_DEMAND_BATCH_SUBFOLDERS])
const mockUpdateDemandBatchSubfolders = vi.fn().mockResolvedValue(undefined)
const mockResetDemandBatchSubfolders = vi.fn().mockResolvedValue(undefined)

const mockFetchProductClassAnnualCeilings = vi.fn().mockResolvedValue({ '2026': 65492.11 })
const mockUpsertProductClassAnnualCeiling = vi.fn().mockResolvedValue({ '2026': 65492.11 })
const mockRemoveProductClassAnnualCeiling = vi.fn().mockResolvedValue({ '2026': 65492.11 })

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
  fetchIrRetentionRate: mockFetchIrRetentionRate,
  updateIrRetentionRate: mockUpdateIrRetentionRate,
  resetIrRetentionRate: mockResetIrRetentionRate,
  fetchDemandBatchSubfolders: mockFetchDemandBatchSubfolders,
  updateDemandBatchSubfolders: mockUpdateDemandBatchSubfolders,
  resetDemandBatchSubfolders: mockResetDemandBatchSubfolders,
  fetchProductClassAnnualCeilings: mockFetchProductClassAnnualCeilings,
  upsertProductClassAnnualCeiling: mockUpsertProductClassAnnualCeiling,
  removeProductClassAnnualCeiling: mockRemoveProductClassAnnualCeiling,
}))

const defaultStubs = {
  PageHeader: { template: '<div><slot /></div>' },
  UiPageHeader: { template: '<div><slot /></div>' },
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
  UiTable: true,
  UiChip: true,
}

describe('SettingsAdminPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders settings page and loads existing BEC catalog URL, IR rate and subfolders', async () => {
    const wrapper = mount(SettingsAdminPage, {
      global: { stubs: defaultStubs },
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vm = wrapper.vm as any
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(mockFetchBecCatalogUrl).toHaveBeenCalled()
    expect(mockFetchIrRetentionRate).toHaveBeenCalled()
    expect(mockFetchDemandBatchSubfolders).toHaveBeenCalled()
    expect(vm.urlInput).toBe(DEFAULT_BEC_CATALOG_URL)
    expect(vm.irRetentionRateInput).toBe(String(DEFAULT_IR_RETENTION_RATE))
    expect(vm.subfoldersList).toEqual(['itens', 'sei', 'siafem'])
    expect(vm.previewUrl).toContain('6460526')
  })

  it('saves updated BEC catalog URL when form is submitted', async () => {
    const wrapper = mount(SettingsAdminPage, {
      global: { stubs: defaultStubs },
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
      global: { stubs: defaultStubs },
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

  it('updates IR retention rate and displays toast', async () => {
    const wrapper = mount(SettingsAdminPage, {
      global: { stubs: defaultStubs },
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vm = wrapper.vm as any
    await new Promise((resolve) => setTimeout(resolve, 0))

    vm.irRetentionRateInput = '2.5'
    await vm.onSaveIrRate()

    expect(mockUpdateIrRetentionRate).toHaveBeenCalledWith(2.5)
    expect(mockToast.success).toHaveBeenCalledWith(
      'Alíquota de retenção de IR atualizada para 2.5%.',
    )
  })

  it('allows adding and removing subfolders and saving them', async () => {
    const wrapper = mount(SettingsAdminPage, {
      global: { stubs: defaultStubs },
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vm = wrapper.vm as any
    await new Promise((resolve) => setTimeout(resolve, 0))

    vm.newSubfolderInput = 'documentos'
    vm.onAddSubfolder()
    expect(vm.subfoldersList).toContain('documentos')

    vm.onRemoveSubfolder('sei')
    expect(vm.subfoldersList).not.toContain('sei')

    await vm.onSaveSubfolders()
    expect(mockUpdateDemandBatchSubfolders).toHaveBeenCalledWith(vm.subfoldersList)
    expect(mockToast.success).toHaveBeenCalledWith(
      'Estrutura de pastas da demanda atualizada com sucesso!',
    )
  })
})
