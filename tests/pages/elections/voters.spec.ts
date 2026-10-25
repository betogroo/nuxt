import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { ref } from 'vue'
import ElectionVotersPage from '~/pages/elections/voters.vue'

mockNuxtImport('useHead', () => vi.fn())
mockNuxtImport('definePageMeta', () => vi.fn())

const toastSuccessMock = vi.fn()
const toastErrorMock = vi.fn()
const toastWarningMock = vi.fn()
mockNuxtImport('useToast', () => () => ({
  success: toastSuccessMock,
  error: toastErrorMock,
  warning: toastWarningMock,
}))

const mockVoters = [
  {
    id: 'v1',
    name: 'Alice Santos',
    voter_registration_number: '100001',
    is_active: true,
    created_at: '2026-10-24T10:00:00Z',
    updated_at: '2026-10-24T10:00:00Z',
  },
  {
    id: 'v2',
    name: 'Bruno Lima',
    voter_registration_number: '100002',
    is_active: false,
    created_at: '2026-10-24T11:00:00Z',
    updated_at: '2026-10-24T11:00:00Z',
  },
]

const fetchVotersPagedMock = vi.fn().mockResolvedValue({
  data: mockVoters,
  count: 2,
})
const toggleVoterActiveMock = vi.fn().mockResolvedValue({
  id: 'v1',
  name: 'Alice Santos',
  voter_registration_number: '100001',
  is_active: false,
})
const deleteVoterMock = vi.fn().mockResolvedValue(undefined)

mockNuxtImport('useElectionVoters', () => () => ({
  fetchVotersPaged: fetchVotersPagedMock,
  toggleVoterActive: toggleVoterActiveMock,
  deleteVoter: deleteVoterMock,
}))

mockNuxtImport('usePermissions', () => () => ({
  canManageElections: () => true,
  canDeleteElections: () => true,
}))

mockNuxtImport('useAsyncData', () => () => {
  return {
    data: ref({ data: mockVoters, count: 2 }),
    pending: ref(false),
    refresh: vi.fn(),
  }
})

describe('Election Voters Management Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const createWrapper = () => {
    return shallowMount(ElectionVotersPage, {
      global: {
        stubs: {
          PageHeader: true,
          UiContainer: true,
          UiRow: true,
          UiCol: true,
          UiCard: true,
          UiAvatar: true,
          UiIcon: true,
          UiChip: true,
          UiSpacer: true,
          UiInput: true,
          UiSelect: true,
          UiActionButton: true,
          UiButton: true,
          UiTable: true,
          UiCheckbox: true,
          UiModal: true,
          UiAlert: true,
          ElectionVoterFormModal: true,
          ElectionVoterCardModal: true,
        },
      },
    })
  }

  it('renders page and displays voters list', () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as {
      voters: typeof mockVoters
      totalItems: number
    }

    expect(vm.voters).toHaveLength(2)
    expect(vm.totalItems).toBe(2)
  })

  it('toggles selection of a voter and all voters on page', () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as {
      voters: typeof mockVoters
      selectedVoterIds: Set<string>
      toggleSelectVoter: (v: (typeof mockVoters)[0]) => void
      toggleSelectAllPage: () => void
      isAllPageSelected: boolean
    }

    // Select single voter
    vm.toggleSelectVoter(mockVoters[0])
    expect(vm.selectedVoterIds.has('v1')).toBe(true)
    expect(vm.selectedVoterIds.size).toBe(1)

    // Select all on page
    vm.toggleSelectAllPage()
    expect(vm.selectedVoterIds.size).toBe(2)
    expect(vm.isAllPageSelected).toBe(true)

    // Deselect all
    vm.toggleSelectAllPage()
    expect(vm.selectedVoterIds.size).toBe(0)
  })

  it('opens batch card modal with selected voters', () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as {
      toggleSelectVoter: (v: (typeof mockVoters)[0]) => void
      openCardModalBatch: () => void
      cardModalRef: { open: ReturnType<typeof vi.fn> } | null
    }

    const openMock = vi.fn()
    vm.cardModalRef = { open: openMock }

    vm.toggleSelectVoter(mockVoters[0])
    vm.toggleSelectVoter(mockVoters[1])
    vm.openCardModalBatch()

    expect(openMock).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: 'v1' }),
        expect.objectContaining({ id: 'v2' }),
      ]),
    )
  })

  it('opens single card modal when emitting from a row', () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as {
      openCardModalSingle: (v: (typeof mockVoters)[0]) => void
      cardModalRef: { open: ReturnType<typeof vi.fn> } | null
    }

    const openMock = vi.fn()
    vm.cardModalRef = { open: openMock }

    vm.openCardModalSingle(mockVoters[0])

    expect(openMock).toHaveBeenCalledWith(mockVoters[0])
  })

  it('toggles active state of a voter', async () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as {
      handleToggleActive: (v: (typeof mockVoters)[0]) => Promise<void>
    }

    await vm.handleToggleActive(mockVoters[0])

    expect(toggleVoterActiveMock).toHaveBeenCalledWith('v1', true)
    expect(toastSuccessMock).toHaveBeenCalled()
  })

  it('confirms and executes voter deletion', async () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as {
      openDeleteModal: (v: (typeof mockVoters)[0]) => void
      handleConfirmDelete: () => Promise<void>
      isDeleteModalOpen: boolean
      voterToDelete: (typeof mockVoters)[0] | null
    }

    vm.openDeleteModal(mockVoters[0])
    expect(vm.isDeleteModalOpen).toBe(true)
    expect(vm.voterToDelete).toEqual(mockVoters[0])

    await vm.handleConfirmDelete()

    expect(deleteVoterMock).toHaveBeenCalledWith('v1')
    expect(toastSuccessMock).toHaveBeenCalled()
    expect(vm.isDeleteModalOpen).toBe(false)
  })
})
