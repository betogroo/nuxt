import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { ref } from 'vue'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import IncidentsPage from '~/pages/schools/incidents/index.vue'
import type { SchoolIncident } from '~/types/school'

mockNuxtImport('useHead', () => vi.fn())
mockNuxtImport('definePageMeta', () => vi.fn())

const mockRoute = ref<{ query: Record<string, string> }>({ query: {} })
mockNuxtImport('useRoute', () => () => mockRoute.value)

const canViewAllSchoolIncidentsMock = vi.fn().mockReturnValue(true)
mockNuxtImport('usePermissions', () => () => ({
  canViewAllSchoolIncidents: canViewAllSchoolIncidentsMock,
}))

const mockIncidentsList: SchoolIncident[] = [
  {
    id: 'inc-1',
    title: 'Desentendimento no recreio',
    description: 'Relato 1',
    status: 'new',
    terms_accepted: true,
    created_by: 'u1',
    created_at: '2026-11-20T10:00:00Z',
    updated_at: '2026-11-20T10:00:00Z',
    participants: [
      {
        id: 'p1',
        incident_id: 'inc-1',
        role: 'offender',
        name: 'Carlos',
        classroom: '3º B',
        created_at: '',
        updated_at: '',
      },
    ],
    author: { id: 'u1', name: 'Professora Ana', role: 'school-user' },
  },
  {
    id: 'inc-2',
    title: 'Uso indevido de celular em aula',
    description: 'Relato 2',
    status: 'in_progress',
    terms_accepted: true,
    created_by: 'u2',
    created_at: '2026-11-19T14:00:00Z',
    updated_at: '2026-11-19T14:00:00Z',
    participants: [
      {
        id: 'p2',
        incident_id: 'inc-2',
        role: 'offender',
        name: 'Lucas',
        classroom: '4º A',
        created_at: '',
        updated_at: '',
      },
    ],
    author: { id: 'u2', name: 'Professor Paulo', role: 'school-user' },
  },
]

const incidentsRef = ref<SchoolIncident[]>(mockIncidentsList)
const fetchIncidentsMock = vi.fn().mockResolvedValue(mockIncidentsList)

mockNuxtImport('useSchoolIncidents', () => () => ({
  incidents: incidentsRef,
  isLoading: ref(false),
  fetchIncidents: fetchIncidentsMock,
}))

const subscribeToPostgresChangesMock = vi.fn().mockReturnValue({ id: 'channel-1' })
const removeRealtimeChannelMock = vi.fn()

mockNuxtImport('useRealtimeChannel', () => () => ({
  subscribeToPostgresChanges: subscribeToPostgresChangesMock,
  removeRealtimeChannel: removeRealtimeChannelMock,
}))

describe('Schools Incidents Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRoute.value = { query: {} }
    incidentsRef.value = [...mockIncidentsList]
    canViewAllSchoolIncidentsMock.mockReturnValue(true)
  })

  it('renders correctly and fetches incidents on mount', async () => {
    const wrapper = shallowMount(IncidentsPage, {
      global: {
        stubs: {
          UiPageHeader: true,
          UiCard: true,
          UiTable: true,
          UiButton: true,
          SchoolIncidentFormModal: true,
          SchoolIncidentDetailsModal: true,
        },
      },
    })

    expect(wrapper.exists()).toBe(true)
    expect(fetchIncidentsMock).toHaveBeenCalled()
    expect(subscribeToPostgresChangesMock).toHaveBeenCalledWith(
      'school-incidents-realtime',
      expect.any(Array),
    )
  })

  it('filters incidents by search query across title, student name and author', () => {
    const wrapper = shallowMount(IncidentsPage, {
      global: {
        stubs: {
          UiPageHeader: true,
          UiCard: true,
          UiTable: true,
          UiButton: true,
        },
      },
    })

    const vm = wrapper.vm as unknown as {
      searchQuery: string
      filteredIncidents: SchoolIncident[]
    }

    expect(vm.filteredIncidents).toHaveLength(2)

    vm.searchQuery = 'celular'
    expect(vm.filteredIncidents).toHaveLength(1)
    expect(vm.filteredIncidents[0].id).toBe('inc-2')

    vm.searchQuery = 'Carlos'
    expect(vm.filteredIncidents).toHaveLength(1)
    expect(vm.filteredIncidents[0].id).toBe('inc-1')

    vm.searchQuery = 'Paulo'
    expect(vm.filteredIncidents).toHaveLength(1)
    expect(vm.filteredIncidents[0].id).toBe('inc-2')
  })

  it('filters incidents by status', () => {
    const wrapper = shallowMount(IncidentsPage, {
      global: {
        stubs: {
          UiPageHeader: true,
          UiCard: true,
          UiTable: true,
          UiButton: true,
        },
      },
    })

    const vm = wrapper.vm as unknown as {
      selectedStatusFilter: string
      filteredIncidents: SchoolIncident[]
    }

    vm.selectedStatusFilter = 'new'
    expect(vm.filteredIncidents).toHaveLength(1)
    expect(vm.filteredIncidents[0].id).toBe('inc-1')

    vm.selectedStatusFilter = 'in_progress'
    expect(vm.filteredIncidents).toHaveLength(1)
    expect(vm.filteredIncidents[0].id).toBe('inc-2')

    vm.selectedStatusFilter = 'resolved'
    expect(vm.filteredIncidents).toHaveLength(0)
  })

  it('opens and closes form and details modals', () => {
    const wrapper = shallowMount(IncidentsPage, {
      global: {
        stubs: {
          UiPageHeader: true,
          UiCard: true,
          UiTable: true,
          UiButton: true,
        },
      },
    })

    const vm = wrapper.vm as unknown as {
      isFormModalOpen: boolean
      isDetailsModalOpen: boolean
      selectedIncident: SchoolIncident | null
      openFormModal: () => void
      openDetailsModal: (incident: SchoolIncident) => void
    }

    expect(vm.isFormModalOpen).toBe(false)
    vm.openFormModal()
    expect(vm.isFormModalOpen).toBe(true)

    expect(vm.isDetailsModalOpen).toBe(false)
    vm.openDetailsModal(mockIncidentsList[0])
    expect(vm.isDetailsModalOpen).toBe(true)
    expect(vm.selectedIncident).toEqual(mockIncidentsList[0])
  })

  it('unsubscribes from realtime channel on unmount', () => {
    const wrapper = shallowMount(IncidentsPage, {
      global: {
        stubs: {
          UiPageHeader: true,
          UiCard: true,
          UiTable: true,
          UiButton: true,
        },
      },
    })

    wrapper.unmount()
    expect(removeRealtimeChannelMock).toHaveBeenCalledWith({ id: 'channel-1' })
  })

  it('automatically opens form modal if query param new is present', () => {
    mockRoute.value = { query: { new: '1' } }
    const wrapper = shallowMount(IncidentsPage, {
      global: {
        stubs: {
          UiPageHeader: true,
          UiCard: true,
          UiTable: true,
          UiButton: true,
          SchoolIncidentFormModal: true,
          SchoolIncidentDetailsModal: true,
        },
      },
    })

    const vm = wrapper.vm as unknown as { isFormModalOpen: boolean }
    expect(vm.isFormModalOpen).toBe(true)
  })

  it('toggles row selection using isRowSelected and toggleSelectRow', () => {
    const wrapper = shallowMount(IncidentsPage, {
      global: {
        stubs: {
          UiPageHeader: true,
          UiCard: true,
          UiTable: true,
          UiButton: true,
        },
      },
    })

    const vm = wrapper.vm as unknown as {
      isRowSelected: (id: string) => boolean
      toggleSelectRow: (id: string) => void
    }

    expect(vm.isRowSelected('inc-1')).toBe(false)
    vm.toggleSelectRow('inc-1')
    expect(vm.isRowSelected('inc-1')).toBe(true)
    vm.toggleSelectRow('inc-1')
    expect(vm.isRowSelected('inc-1')).toBe(false)
  })
})
