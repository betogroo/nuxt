import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { ref } from 'vue'
import ElectionsIndexPage from '~/pages/elections/index.vue'

mockNuxtImport('useHead', () => vi.fn())
mockNuxtImport('definePageMeta', () => vi.fn())
mockNuxtImport('useToast', () => () => ({
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
}))

const profileRef = ref<{ role: string; name: string } | null>({
  role: 'admin-election',
  name: 'Admin Eleição',
})

mockNuxtImport('useProfile', () => () => ({
  profile: profileRef,
}))

const mockElections = [
  {
    id: 'e1',
    name: 'Eleição Grêmio 2026',
    election_date: '2026-10-25T12:00:00Z',
    digits_count: 2,
    is_uppercase: true,
    status: 'released',
  },
  {
    id: 'e2',
    name: 'Conselho Escolar 2027',
    election_date: '2026-11-20T12:00:00Z',
    digits_count: 3,
    is_uppercase: false,
    status: 'awaiting_release',
  },
]

const mockMetrics = {
  total: 2,
  active: 1,
  upcoming: 1,
  past: 0,
}

const deleteElectionMock = vi.fn().mockResolvedValue(undefined)
const fetchElectionsMock = vi.fn().mockResolvedValue({ data: mockElections, count: 2 })
const fetchMetricsMock = vi.fn().mockResolvedValue(mockMetrics)

mockNuxtImport('useElections', () => () => ({
  loading: ref(false),
  error: ref(null),
  fetchElections: fetchElectionsMock,
  fetchElectionMetrics: fetchMetricsMock,
  deleteElection: deleteElectionMock,
}))

mockNuxtImport('usePermissions', () => () => ({
  canManageElections: () =>
    ['admin', 'admin-election', 'manager-election', 'user-election'].includes(
      profileRef.value?.role || '',
    ),
  canDeleteElections: () =>
    profileRef.value?.role === 'admin' || profileRef.value?.role === 'admin-election',
}))

mockNuxtImport('useAsyncData', () => (key: string) => {
  if (key === 'election-metrics') {
    return {
      data: ref(mockMetrics),
      pending: ref(false),
      refresh: vi.fn(),
    }
  }
  return {
    data: ref(mockElections),
    pending: ref(false),
    refresh: vi.fn(),
  }
})

describe('Elections Dashboard Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    profileRef.value = {
      role: 'admin-election',
      name: 'Admin Eleição',
    }
  })

  const createWrapper = () => {
    return shallowMount(ElectionsIndexPage, {
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
          UiAvatar: true,
          UiTable: true,
          UiInput: true,
          UiSelect: true,
          UiActionButton: true,
          UiSpacer: true,
          UiModal: true,
          ElectionFormModal: true,
        },
      },
    })
  }

  it('renders dashboard with KPI cards and table', () => {
    const wrapper = createWrapper()
    expect(wrapper.exists()).toBe(true)
  })

  it('initializes with default timelineFilter "all" and allows toggling timeline filter', () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as {
      timelineFilter: string
      setTimelineFilter: (f: string) => void
    }

    expect(vm.timelineFilter).toBe('all')
    vm.setTimelineFilter('active')
    expect(vm.timelineFilter).toBe('active')

    // Clicking same filter toggles back to 'all'
    vm.setTimelineFilter('active')
    expect(vm.timelineFilter).toBe('all')
  })

  it('allows manager and admin roles to see manage actions', () => {
    profileRef.value = { role: 'admin-election', name: 'Admin Eleição' }
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as {
      canManageElections: () => boolean
      canDeleteElections: () => boolean
    }

    expect(vm.canManageElections()).toBe(true)
    expect(vm.canDeleteElections()).toBe(true)
  })

  it('restricts delete permissions for manager-election and user-election, but allows managing', () => {
    profileRef.value = { role: 'manager-election', name: 'Gestor' }
    let wrapper = createWrapper()
    let vm = wrapper.vm as unknown as {
      canManageElections: () => boolean
      canDeleteElections: () => boolean
    }

    expect(vm.canManageElections()).toBe(true)
    expect(vm.canDeleteElections()).toBe(false)

    profileRef.value = { role: 'user-election', name: 'Votante' }
    wrapper = createWrapper()
    vm = wrapper.vm as unknown as {
      canManageElections: () => boolean
      canDeleteElections: () => boolean
    }

    expect(vm.canManageElections()).toBe(true)
    expect(vm.canDeleteElections()).toBe(false)
  })

  it('triggers create modal opening from toolbar action', () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as {
      openCreateModal: () => void
      modalRef: { open: ReturnType<typeof vi.fn> } | null
    }

    const openSpy = vi.fn()
    vm.modalRef = { open: openSpy }
    vm.openCreateModal()

    expect(openSpy).toHaveBeenCalled()
  })

  it('handles safe delete confirmation properly', async () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as {
      openDeleteModal: (e: (typeof mockElections)[0]) => void
      handleConfirmDelete: () => Promise<void>
      isDeleteModalOpen: boolean
      electionToDelete: (typeof mockElections)[0] | null
    }

    vm.openDeleteModal(mockElections[0])
    expect(vm.isDeleteModalOpen).toBe(true)
    expect(vm.electionToDelete).toEqual(mockElections[0])

    await vm.handleConfirmDelete()
    expect(deleteElectionMock).toHaveBeenCalledWith('e1')
    expect(vm.isDeleteModalOpen).toBe(false)
  })
})
