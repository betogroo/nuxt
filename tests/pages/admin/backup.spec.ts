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
  measurement_unit_alias_links: 7,
  products: 45,
  product_units: 50,
  demands: 25,
  demand_products: 50,
  demand_product_bids: 15,
  demand_responsibles: 20,
  demand_item_status_history: 10,
  iirgd_citizens: 30,
  iirgd_document_types: 4,
  iirgd_demands: 35,
  iirgd_demand_status_history: 70,
  iirgd_settings: 2,
  system_settings: 3,
  elections: 3,
  candidates: 4,
  ballot_boxes: 2,
  election_committee_members: 3,
  election_voters: 25,
  election_voter_attendance: 8,
  election_votes: 15,
  logs: 120,
}

mockNuxtImport('useBackup', () => () => ({
  isGenerating: ref(false),
  isRestoring: ref(false),
  isFetchingCounts: ref(false),
  fetchCurrentCounts: vi.fn().mockResolvedValue(mockCounts),
  generateBackup: vi.fn().mockResolvedValue({}),
  inspectBackupFile: vi.fn().mockResolvedValue({
    isValid: true,
    timestamp: '2026-10-19T10:00:00Z',
    generatedBy: 'Admin Test',
    version: '1.0',
    counts: mockCounts,
    payload: { data: {} },
  }),
  restoreBackup: vi.fn().mockResolvedValue({ success: true, counts: mockCounts }),
}))

describe('Backup Admin Page', () => {
  it('should render successfully and compute total records across all 28 tables', async () => {
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

    const vm = wrapper.vm as unknown as {
      totalCurrentRecords: number
      totalTablesCount: number
      currentCounts: typeof mockCounts | null
      BACKUP_CATEGORIES: Array<{ title: string; tables: Array<{ key: string; label: string }> }>
    }

    // Wait for onMounted loadCounts
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(vm.currentCounts).toEqual(mockCounts)
    const expectedSum = Object.values(mockCounts).reduce((a, b) => a + b, 0)
    expect(vm.totalCurrentRecords).toBe(expectedSum)
    expect(vm.totalCurrentRecords).toBe(590)
    expect(vm.totalTablesCount).toBe(28)

    // Check that all 28 tables are represented in categories
    const allTableKeys = vm.BACKUP_CATEGORIES.flatMap((c) => c.tables.map((t) => t.key))
    expect(allTableKeys).toHaveLength(28)
    expect(new Set(allTableKeys).size).toBe(28)
    for (const key of Object.keys(mockCounts)) {
      expect(allTableKeys).toContain(key)
    }
  })

  it('should compute inspection and restore totals accurately', async () => {
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

    const vm = wrapper.vm as unknown as {
      totalInspectionRecords: number
      totalRestoredRecords: number
      inspection: { isValid: boolean; counts: typeof mockCounts } | null
      restoreResult: { success: boolean; counts: typeof mockCounts } | null
    }

    expect(vm.totalInspectionRecords).toBe(0)
    expect(vm.totalRestoredRecords).toBe(0)

    vm.inspection = {
      isValid: true,
      counts: mockCounts,
    }

    expect(vm.totalInspectionRecords).toBe(590)

    vm.restoreResult = {
      success: true,
      counts: mockCounts,
    }

    expect(vm.totalRestoredRecords).toBe(590)
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
