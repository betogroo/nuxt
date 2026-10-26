import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { ref } from 'vue'
import ProductCharacteristicsAdminPage from '~/pages/admin/product-characteristics.vue'

const {
  mockOfficialKeys,
  mockPendingKeys,
  createKeyMock,
  updateKeyMock,
  toggleKeyStatusMock,
  deleteKeyMock,
  approvePendingKeyMock,
  mergeKeysMock,
} = vi.hoisted(() => ({
  mockOfficialKeys: [
    {
      id: 'k-cor',
      name: 'Cor',
      is_active: true,
      is_pending: false,
      created_at: '2026-10-25T10:00:00Z',
      updated_at: '2026-10-25T10:00:00Z',
      usage_count: 5,
    },
    {
      id: 'k-ponta',
      name: 'Ponta',
      is_active: true,
      is_pending: false,
      created_at: '2026-10-25T10:00:00Z',
      updated_at: '2026-10-25T10:00:00Z',
      usage_count: 3,
    },
  ],
  mockPendingKeys: [
    {
      id: 'k-tipo-ponta',
      name: 'Tipo de ponta',
      is_active: false,
      is_pending: true,
      created_at: '2026-10-25T11:00:00Z',
      updated_at: '2026-10-25T11:00:00Z',
      usage_count: 2,
    },
  ],
  createKeyMock: vi.fn().mockResolvedValue({}),
  updateKeyMock: vi.fn().mockResolvedValue({}),
  toggleKeyStatusMock: vi.fn().mockResolvedValue({}),
  deleteKeyMock: vi.fn().mockResolvedValue({}),
  approvePendingKeyMock: vi.fn().mockResolvedValue({}),
  mergeKeysMock: vi.fn().mockResolvedValue({}),
}))

mockNuxtImport('useHead', () => vi.fn())
mockNuxtImport('definePageMeta', () => vi.fn())
mockNuxtImport('useToast', () => () => ({
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
}))
mockNuxtImport('usePagination', () => () => ({
  currentPage: ref(1),
  itemsPerPage: ref(10),
  totalItems: ref(2),
  totalPages: ref(1),
  resetPage: vi.fn(),
}))

mockNuxtImport('useAsyncData', () => (key: string) => {
  if (key === 'characteristic-keys-admin-active') {
    return {
      data: ref(mockOfficialKeys),
      pending: ref(false),
      refresh: vi.fn().mockResolvedValue(undefined),
    }
  }
  if (key === 'characteristic-keys-admin-pending') {
    return {
      data: ref(mockPendingKeys),
      pending: ref(false),
      refresh: vi.fn().mockResolvedValue(undefined),
    }
  }
  return {
    data: ref(mockOfficialKeys),
    pending: ref(false),
    refresh: vi.fn().mockResolvedValue(undefined),
  }
})

mockNuxtImport('useProductCharacteristics', () => () => ({
  fetchCharacteristicKeys: vi
    .fn()
    .mockResolvedValue({ data: mockOfficialKeys, count: mockOfficialKeys.length }),
  fetchAllOfficialCharacteristicKeys: vi.fn().mockResolvedValue(mockOfficialKeys),
  fetchPendingCharacteristicKeys: vi.fn().mockResolvedValue(mockPendingKeys),
  createCharacteristicKey: createKeyMock,
  updateCharacteristicKey: updateKeyMock,
  toggleCharacteristicKeyStatus: toggleKeyStatusMock,
  deleteCharacteristicKey: deleteKeyMock,
  approvePendingCharacteristicKey: approvePendingKeyMock,
  mergeCharacteristicKeys: mergeKeysMock,
}))

describe('Product Characteristics Admin Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should mount and expose official and pending keys', () => {
    const wrapper = shallowMount(ProductCharacteristicsAdminPage, {
      global: {
        stubs: {
          PageHeader: true,
          UiTabs: true,
          UiTab: true,
          UiBadge: true,
          UiCard: true,
          UiIcon: true,
          UiChip: true,
          UiSpacer: true,
          UiInput: true,
          UiActionButton: true,
          UiButton: true,
          UiTable: true,
          UiSwitch: true,
          UiPagination: true,
          UiModal: true,
          UiAlert: true,
          UiForm: true,
          UiRadioGroup: true,
          UiRadio: true,
          UiAutocomplete: true,
        },
      },
    })

    expect(wrapper.exists()).toBe(true)
    const vm = wrapper.vm as unknown as {
      officialKeys: typeof mockOfficialKeys
      pendingKeys: typeof mockPendingKeys
      openAddModal: () => void
      openEditModal: (item: (typeof mockOfficialKeys)[0]) => void
      isModalOpen: boolean
      isEditing: boolean
    }

    expect(vm.officialKeys).toHaveLength(2)
    expect(vm.pendingKeys).toHaveLength(1)

    vm.openAddModal()
    expect(vm.isModalOpen).toBe(true)
    expect(vm.isEditing).toBe(false)

    vm.openEditModal(mockOfficialKeys[0]!)
    expect(vm.isModalOpen).toBe(true)
    expect(vm.isEditing).toBe(true)
  })

  it('should open resolve modal and mergemodal for unifying keys', async () => {
    const wrapper = shallowMount(ProductCharacteristicsAdminPage, {
      global: {
        stubs: {
          PageHeader: true,
          UiTabs: true,
          UiTab: true,
          UiBadge: true,
          UiCard: true,
          UiIcon: true,
          UiChip: true,
          UiSpacer: true,
          UiInput: true,
          UiActionButton: true,
          UiButton: true,
          UiTable: true,
          UiSwitch: true,
          UiPagination: true,
          UiModal: true,
          UiAlert: true,
          UiForm: true,
          UiRadioGroup: true,
          UiRadio: true,
          UiAutocomplete: true,
        },
      },
    })

    const vm = wrapper.vm as unknown as {
      openResolveModal: (item: (typeof mockPendingKeys)[0]) => Promise<void>
      isResolveModalOpen: boolean
      targetPendingKey: (typeof mockPendingKeys)[0] | null
      openMergeModal: (item: (typeof mockOfficialKeys)[0]) => Promise<void>
      isMergeModalOpen: boolean
      sourceMergeKey: (typeof mockOfficialKeys)[0] | null
      availableMergeTargets: typeof mockOfficialKeys
    }

    await vm.openResolveModal(mockPendingKeys[0]!)
    expect(vm.isResolveModalOpen).toBe(true)
    expect(vm.targetPendingKey?.name).toBe('Tipo de ponta')

    await vm.openMergeModal(mockOfficialKeys[0]!)
    expect(vm.isMergeModalOpen).toBe(true)
    expect(vm.sourceMergeKey?.name).toBe('Cor')
    expect(vm.availableMergeTargets).toHaveLength(1)
    expect(vm.availableMergeTargets[0]?.name).toBe('Ponta')
  })
})
