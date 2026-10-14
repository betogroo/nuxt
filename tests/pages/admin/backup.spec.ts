import { describe, it, expect, vi } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { ref } from 'vue'
import BackupAdminPage from '~/pages/admin/backup.vue'

mockNuxtImport('useHead', () => vi.fn())
mockNuxtImport('definePageMeta', () => vi.fn())
mockNuxtImport('useToast', () => () => ({
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
}))

const mockCounts = {
  profiles: 10,
  suppliers: 12,
  expense_natures: 6,
  product_classes: 8,
  measurement_units: 5,
  measurement_unit_aliases: 3,
  products: 45,
  product_units: 50,
  demands: 25,
  demand_products: 50,
  demand_product_bids: 15,
  demand_responsibles: 20,
  iirgd_citizens: 30,
  iirgd_document_types: 4,
  iirgd_demands: 35,
  iirgd_demand_status_history: 70,
  iirgd_settings: 2,
  logs: 120,
}

mockNuxtImport('useBackup', () => () => ({
  isGenerating: ref(false),
  isRestoring: ref(false),
  isFetchingCounts: ref(false),
  fetchCurrentCounts: vi.fn().mockResolvedValue(mockCounts),
  generateBackup: vi.fn().mockResolvedValue({}),
  inspectBackupFile: vi.fn().mockResolvedValue({ isValid: true, counts: {} }),
  restoreBackup: vi.fn().mockResolvedValue({ success: true, counts: mockCounts }),
}))

describe('Backup Admin Page', () => {
  it('should render successfully with shallowMount', () => {
    const wrapper = shallowMount(BackupAdminPage, {
      global: {
        stubs: {
          PageHeader: true,
          UiContainer: true,
          UiRow: true,
          UiCol: true,
          UiCard: true,
          UiButton: true,
          UiIcon: true,
          UiAlert: true,
          UiChip: true,
          UiModal: true,
        },
      },
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('should trigger backup generation when generate method is called', async () => {
    const wrapper = shallowMount(BackupAdminPage, {
      global: {
        stubs: {
          PageHeader: true,
          UiContainer: true,
          UiRow: true,
          UiCol: true,
          UiCard: true,
          UiButton: true,
          UiIcon: true,
          UiAlert: true,
          UiChip: true,
          UiModal: true,
        },
      },
    })

    const vm = wrapper.vm as unknown as { handleGenerateBackup: () => Promise<void> }
    await expect(vm.handleGenerateBackup()).resolves.toBeUndefined()
  })
})
