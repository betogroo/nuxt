/* eslint-disable */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { ref } from 'vue'
import GroupPage from '~/pages/iirgd/status/[group].vue'

mockNuxtImport('useHead', () => vi.fn())
mockNuxtImport('definePageMeta', () => vi.fn())

const mockRoute = ref({ params: { group: 'in-progress' } })
mockNuxtImport('useRoute', () => () => mockRoute.value)
mockNuxtImport('useRouter', () => () => ({ push: vi.fn() }))
mockNuxtImport('useSupabaseClient', () => () => ({}))
mockNuxtImport('useSupabaseUser', () => () => ({ value: { id: 'test-user' } }))

const mockProfile = ref<{ role: string }>({ role: 'admin' })
mockNuxtImport('useProfile', () => () => ({ profile: mockProfile }))

const updateDemandsBatchMock = vi.fn().mockResolvedValue([])
const updateDemandMock = vi.fn().mockResolvedValue({})
const fetchDemandsMock = vi.fn()
mockNuxtImport('useIirgdDemands', () => {
  return () => ({
    fetchDemands: fetchDemandsMock,
    updateDemand: updateDemandMock,
    updateDemandsBatch: updateDemandsBatchMock,
  })
})

const toastSuccessMock = vi.fn()
const toastErrorMock = vi.fn()
mockNuxtImport('useToast', () => () => ({
  success: toastSuccessMock,
  error: toastErrorMock,
}))

mockNuxtImport('useIirgdSettings', () => {
  return () => ({
    fetchSettings: vi.fn(),
    computePriority: vi.fn(() => 'none'),
  })
})

const mockDemandsList = [
  { id: '1', status: 'new', iirgd_citizens: { name: 'JOAO SILVA', rg: '11.111.111-1' } },
  { id: '2', status: 'new', iirgd_citizens: { name: 'MARIA SANTOS', rg: '22.222.222-2' } },
  { id: '3', status: 'new', iirgd_citizens: { name: 'PEDRO SOUZA', rg: '33.333.333-3' } },
]

mockNuxtImport('useAsyncData', () => {
  return () => ({
    data: ref(mockDemandsList),
    pending: ref(false),
    refresh: vi.fn(),
  })
})

mockNuxtImport('usePagination', () => {
  return () => ({
    currentPage: ref(1),
    itemsPerPage: ref(10),
    totalItems: ref(3),
    totalPages: ref(1),
    resetPage: vi.fn(),
  })
})

const defaultStubs = {
  NuxtLink: true,
  UiContainer: { template: '<div><slot /></div>' },
  UiCard: { template: '<div><slot name="header" /><slot /></div>' },
  UiTabs: { template: '<div><slot /></div>' },
  UiTab: { template: '<div><slot /></div>' },
  UiInput: true,
  UiTable: {
    name: 'UiTable',
    props: ['headers', 'items', 'loading'],
    template: '<div class="mock-table"><slot name="header-select" /><slot /></div>',
  },
  UiPagination: true,
  UiModal: {
    props: ['modelValue', 'title'],
    template: `
      <div v-if="modelValue" class="mock-modal">
        <slot />
        <slot name="actions" />
      </div>
    `,
  },
  UiSelect: true,
  UiTextarea: true,
  UiButton: {
    template: '<button @click="$emit(\'click\')"><slot /></button>',
  },
  UiIcon: true,
  UiChip: true,
  UiList: true,
  UiListItem: true,
  UiAlert: true,
  UiRow: { template: '<div><slot /></div>' },
  UiCol: { template: '<div><slot /></div>' },
  UiCheckbox: {
    props: ['modelValue', 'indeterminate'],
    template: '<input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" />',
  },
}

describe('IIRGD Group Status Page - Batch Status Update', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRoute.value = { params: { group: 'in-progress' } }
    mockProfile.value = { role: 'admin' }
  })

  it('should include select column in tableHeaders when user is admin', async () => {
    mockProfile.value = { role: 'admin' }
    const wrapper = mount(GroupPage, {
      global: {
        stubs: defaultStubs,
      },
    })
    await flushPromises()

    const vm = wrapper.vm as any
    expect(vm.canBatchEdit).toBe(true)
    expect(vm.tableHeaders.some((h: { value: string }) => h.value === 'select')).toBe(true)
  })

  it('should include select column in tableHeaders when user is iirgd_manager', async () => {
    mockProfile.value = { role: 'iirgd_manager' }
    const wrapper = mount(GroupPage, {
      global: {
        stubs: defaultStubs,
      },
    })
    await flushPromises()

    const vm = wrapper.vm as any
    expect(vm.canBatchEdit).toBe(true)
    expect(vm.tableHeaders.some((h: { value: string }) => h.value === 'select')).toBe(true)
  })

  it('should NOT include select column in tableHeaders when user is iirgd_user', async () => {
    mockProfile.value = { role: 'iirgd_user' }
    const wrapper = mount(GroupPage, {
      global: {
        stubs: defaultStubs,
      },
    })
    await flushPromises()

    const vm = wrapper.vm as any
    expect(vm.canBatchEdit).toBe(false)
    expect(vm.tableHeaders.some((h: { value: string }) => h.value === 'select')).toBe(false)
  })

  it('should toggle selection for page items and execute updateDemandsBatch on confirmation', async () => {
    mockProfile.value = { role: 'admin' }
    const wrapper = mount(GroupPage, {
      global: {
        stubs: defaultStubs,
      },
    })
    await flushPromises()

    const vm = wrapper.vm as any

    // Initial state
    expect(vm.selectedDemandIds).toEqual([])
    expect(vm.isAllPageSelected).toBe(false)
    expect(vm.isSomePageSelected).toBe(false)

    // Select row 1
    vm.toggleSelectRow('1')
    expect(vm.selectedDemandIds).toEqual(['1'])
    expect(vm.isRowSelected('1')).toBe(true)
    expect(vm.isSomePageSelected).toBe(true)
    expect(vm.isAllPageSelected).toBe(false)

    // Select all items
    vm.toggleSelectAllPage(true)
    expect(vm.selectedDemandIds).toEqual(['1', '2', '3'])
    expect(vm.isAllPageSelected).toBe(true)
    expect(vm.isSomePageSelected).toBe(false)

    // Open batch modal
    vm.openBatchModal()
    expect(vm.batchModal.isOpen).toBe(true)

    // Set target status and optional observation
    vm.batchModal.newStatus = 'released'
    vm.batchModal.observation = 'Lote liberado pela supervisão'

    // Confirm batch status change
    await vm.confirmBatchStatusChange()

    expect(updateDemandsBatchMock).toHaveBeenCalledWith(['1', '2', '3'], {
      status: 'released',
      observation: 'Lote liberado pela supervisão',
    })
    expect(toastSuccessMock).toHaveBeenCalledWith('3 demandas atualizadas com sucesso!')
    expect(vm.selectedDemandIds).toEqual([])
    expect(vm.batchModal.isOpen).toBe(false)
  })

  it('should clear selection when clearSelection is called', async () => {
    mockProfile.value = { role: 'admin' }
    const wrapper = mount(GroupPage, {
      global: {
        stubs: defaultStubs,
      },
    })
    await flushPromises()

    const vm = wrapper.vm as any
    vm.toggleSelectAllPage(true)
    expect(vm.selectedDemandIds.length).toBe(3)

    vm.clearSelection()
    expect(vm.selectedDemandIds).toEqual([])
  })

  it('should support issued-antecedents group for iirgd_user', async () => {
    mockRoute.value = { params: { group: 'issued-antecedents' } }
    mockProfile.value = { role: 'iirgd_user' }
    const wrapper = mount(GroupPage, {
      global: {
        stubs: defaultStubs,
      },
    })
    await flushPromises()

    const vm = wrapper.vm as any
    expect(vm.titles['issued-antecedents']).toBe('Antecedentes Emitidos')
    expect(vm.titles['issued']).toBe('RGs Emitidos')
    expect(vm.currentTab).toBe('issued-antecedents')
  })
})
