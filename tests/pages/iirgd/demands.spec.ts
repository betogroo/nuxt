/* eslint-disable */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { ref } from 'vue'
import DemandsPage from '~/pages/iirgd/demands.vue'

mockNuxtImport('useHead', () => vi.fn())
mockNuxtImport('definePageMeta', () => vi.fn())
mockNuxtImport('useSupabaseClient', () => () => ({}))
mockNuxtImport('useSupabaseUser', () => () => ({ value: { id: 'test-user' } }))

const mockProfile = ref<{ role: string }>({ role: 'admin' })
mockNuxtImport('useProfile', () => () => ({ profile: mockProfile }))

const fetchDemandsMock = vi.fn()
mockNuxtImport('useIirgdDemands', () => {
  return () => ({
    fetchDemands: fetchDemandsMock,
  })
})

const fetchAllActiveDocumentTypesMock = vi.fn().mockResolvedValue([
  { id: 'doc-1', name: '1ª Via RG' },
  { id: 'doc-2', name: 'Atestado de Antecedentes' },
])
mockNuxtImport('useIirgdDocumentTypes', () => {
  return () => ({
    fetchAllActiveDocumentTypes: fetchAllActiveDocumentTypesMock,
  })
})

mockNuxtImport('useIirgdSettings', () => {
  return () => ({
    fetchSettings: vi.fn().mockResolvedValue({}),
    computePriority: vi.fn(() => 'none'),
  })
})

const mockDemandsList = [
  {
    id: 'dem-1',
    status: 'new',
    station_code: '1062-9',
    created_at: '2026-11-10T10:00:00Z',
    iirgd_citizens: { name: 'MARIA SILVA', rg: '12.345.678-9', cpf: '123.456.789-00' },
    iirgd_document_types: { name: '1ª Via RG' },
  },
  {
    id: 'dem-2',
    status: 'issued',
    station_code: '1060-0',
    created_at: '2026-11-09T10:00:00Z',
    iirgd_citizens: { name: 'JOAO PEREIRA', rg: '98.765.432-1', cpf: '987.654.321-99' },
    iirgd_document_types: { name: '2ª Via RG' },
  },
]

mockNuxtImport('useAsyncData', () => {
  return (key: string) => {
    if (key === 'iirgd-doc-types-filter') {
      return {
        data: ref([
          { id: 'doc-1', name: '1ª Via RG' },
          { id: 'doc-2', name: 'Atestado de Antecedentes' },
        ]),
        pending: ref(false),
        refresh: vi.fn(),
      }
    }
    if (key === 'iirgd-settings') {
      return {
        data: ref({}),
        pending: ref(false),
        refresh: vi.fn(),
      }
    }
    return {
      data: ref(mockDemandsList),
      pending: ref(false),
      refresh: vi.fn(),
    }
  }
})

const resetPageMock = vi.fn()
mockNuxtImport('usePagination', () => {
  return () => ({
    currentPage: ref(1),
    itemsPerPage: ref(10),
    totalItems: ref(2),
    totalPages: ref(1),
    resetPage: resetPageMock,
  })
})

const defaultStubs = {
  NuxtLink: true,
  UiContainer: { template: '<div><slot /></div>' },
  UiCard: { template: '<div><slot name="header" /><slot /></div>' },
  UiPageHeader: { template: '<div><slot /><slot name="actions" /></div>' },
  UiRow: { template: '<div><slot /></div>' },
  UiCol: { template: '<div><slot /></div>' },
  UiInput: true,
  UiSelect: true,
  UiTable: {
    name: 'UiTable',
    props: ['headers', 'items', 'loading'],
    template: '<div class="mock-table"><slot /><slot name="no-data" /></div>',
  },
  UiPagination: true,
  UiButton: {
    template: '<button @click="$emit(\'click\')"><slot /></button>',
  },
  UiActionButton: true,
  UiIcon: true,
  UiChip: true,
  UiCopyButton: true,
}

describe('IIRGD All Demands Page (/iirgd/demands)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders correctly with title and list of demands', () => {
    const wrapper = mount(DemandsPage, {
      global: {
        stubs: defaultStubs,
      },
    })

    expect(wrapper.exists()).toBe(true)
    const vm = wrapper.vm as any
    expect(vm.demands).toHaveLength(2)
    expect(vm.demands[0].id).toBe('dem-1')
    expect(vm.tableHeaders).toBeDefined()
    expect(vm.tableHeaders.length).toBeGreaterThan(5)
  })

  it('detects when active filters are present and allows clearing them', async () => {
    const wrapper = mount(DemandsPage, {
      global: {
        stubs: defaultStubs,
      },
    })

    const vm = wrapper.vm as any
    expect(vm.hasActiveFilters).toBe(false)

    vm.searchQuery = 'Silva'
    expect(vm.hasActiveFilters).toBe(true)

    vm.clearFilters()
    expect(vm.searchQuery).toBe('')
    expect(vm.stationCode).toBe('Todos')
    expect(vm.selectedStatus).toBe('all')
    expect(vm.selectedDocumentTypeId).toBe('all')
    expect(vm.hasActiveFilters).toBe(false)
    expect(resetPageMock).toHaveBeenCalled()
  })

  it('includes all document types in select options', () => {
    const wrapper = mount(DemandsPage, {
      global: {
        stubs: defaultStubs,
      },
    })

    const vm = wrapper.vm as any
    expect(vm.documentTypeOptions).toContainEqual({
      title: 'Todos os tipos',
      value: 'all',
    })
    expect(vm.documentTypeOptions).toContainEqual({
      title: '1ª Via RG',
      value: 'doc-1',
    })
  })
})
