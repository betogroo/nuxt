import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { ref } from 'vue'
import ElectionDetailPage from '~/pages/elections/[id].vue'

const routerPushMock = vi.fn()
mockNuxtImport('useRouter', () => () => ({
  push: routerPushMock,
}))

const routeMock = {
  params: { id: 'election-123' },
}
mockNuxtImport('useRoute', () => () => routeMock)

mockNuxtImport('useHead', () => vi.fn())
mockNuxtImport('definePageMeta', () => vi.fn())

const toastSuccessMock = vi.fn()
const toastErrorMock = vi.fn()
mockNuxtImport('useToast', () => () => ({
  success: toastSuccessMock,
  error: toastErrorMock,
  info: vi.fn(),
}))

const profileRef = ref<{ role: string; name: string } | null>({
  role: 'admin-election',
  name: 'Admin Eleição',
})

mockNuxtImport('useProfile', () => () => ({
  profile: profileRef,
}))

const mockElection = {
  id: 'election-123',
  name: 'Eleição Grêmio Estudantil 2026',
  election_date: '2026-10-30T10:00:00Z',
  digits_count: 2,
  is_uppercase: true,
  status: 'awaiting_release',
  description: 'Eleição anual para escolha dos representantes do Grêmio Estudantil.',
  creator_name: 'Diretoria Escolar',
  created_at: '2026-10-20T12:00:00Z',
  updated_at: '2026-10-20T12:00:00Z',
}

const fetchElectionByIdMock = vi.fn().mockResolvedValue(mockElection)
const updateElectionMock = vi.fn().mockResolvedValue({ ...mockElection, status: 'released' })
const deleteElectionMock = vi.fn().mockResolvedValue(undefined)

mockNuxtImport('useElections', () => () => ({
  loading: ref(false),
  error: ref(null),
  fetchElectionById: fetchElectionByIdMock,
  updateElection: updateElectionMock,
  deleteElection: deleteElectionMock,
}))

const mockCandidates = [
  {
    id: 'cand-1',
    election_id: 'election-123',
    name: 'Chapa Renovação',
    candidate_number: '10',
    photo_url: 'https://picsum.photos/300',
  },
  {
    id: 'cand-2',
    election_id: 'election-123',
    name: 'Chapa Esperança',
    candidate_number: '20',
    photo_url: 'https://picsum.photos/300',
  },
]

const fetchCandidatesMock = vi.fn().mockResolvedValue(mockCandidates)
const deleteCandidateApiMock = vi.fn().mockResolvedValue(undefined)

mockNuxtImport('useCandidates', () => () => ({
  loading: ref(false),
  error: ref(null),
  fetchCandidates: fetchCandidatesMock,
  deleteCandidate: deleteCandidateApiMock,
}))

mockNuxtImport('usePermissions', () => () => ({
  canManageElections: () => true,
  canDeleteElections: () =>
    profileRef.value?.role === 'admin' || profileRef.value?.role === 'admin-election',
}))

const electionDataRef = ref<typeof mockElection | null>(mockElection)
const candidatesDataRef = ref<typeof mockCandidates>(mockCandidates)
const pendingRef = ref(false)
const refreshMock = vi.fn()
const refreshCandidatesMock = vi.fn()

mockNuxtImport('useAsyncData', () => (key: string) => {
  if (key.startsWith('election-candidates')) {
    return {
      data: candidatesDataRef,
      pending: pendingRef,
      error: ref(null),
      refresh: refreshCandidatesMock,
    }
  }
  return {
    data: electionDataRef,
    pending: pendingRef,
    error: ref(null),
    refresh: refreshMock,
  }
})

describe('Election Detail Page (/elections/[id])', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    profileRef.value = { role: 'admin-election', name: 'Admin Eleição' }
    electionDataRef.value = { ...mockElection }
    pendingRef.value = false
  })

  const createWrapper = () => {
    return shallowMount(ElectionDetailPage, {
      global: {
        stubs: {
          UiContainer: true,
          UiRow: true,
          UiCol: true,
          UiCard: true,
          UiButton: true,
          UiIcon: true,
          UiChip: true,
          UiAvatar: true,
          UiDivider: true,
          UiTabs: true,
          UiTab: true,
          UiAlert: true,
          UiModal: true,
          UiProgressCircular: true,
          UiActionButton: true,
          ElectionFormModal: true,
          CandidateFormModal: true,
        },
      },
    })
  }

  it('renders election details page correctly with parameters and header', () => {
    const wrapper = createWrapper()
    expect(wrapper.exists()).toBe(true)

    const vm = wrapper.vm as unknown as {
      election: typeof mockElection
      formatDate: (d?: string | null) => string
    }

    expect(vm.election?.name).toBe('Eleição Grêmio Estudantil 2026')
    expect(vm.formatDate('2026-10-30T10:00:00Z')).toBe('30/10/2026')
  })

  it('navigates back to dashboard when goBack is triggered', () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as { goBack: () => void }

    vm.goBack()
    expect(routerPushMock).toHaveBeenCalledWith('/elections')
  })

  it('computes contextual next status action correctly', () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as {
      nextStatusAction: { status: string; label: string } | null
    }

    expect(vm.nextStatusAction?.status).toBe('released')
    expect(vm.nextStatusAction?.label).toBe('Liberar Eleição')
  })

  it('handles status transition confirmation and refreshes data', async () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as {
      openStatusModal: (s: string) => void
      handleConfirmStatusChange: () => Promise<void>
      isStatusModalOpen: boolean
      targetStatus: string | null
    }

    vm.openStatusModal('released')
    expect(vm.isStatusModalOpen).toBe(true)
    expect(vm.targetStatus).toBe('released')

    await vm.handleConfirmStatusChange()
    expect(updateElectionMock).toHaveBeenCalledWith('election-123', { status: 'released' })
    expect(toastSuccessMock).toHaveBeenCalled()
    expect(refreshMock).toHaveBeenCalled()
    expect(vm.isStatusModalOpen).toBe(false)
  })

  it('handles safe delete confirmation and navigates to /elections', async () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as {
      openDeleteModal: () => void
      handleConfirmDelete: () => Promise<void>
      isDeleteModalOpen: boolean
    }

    vm.openDeleteModal()
    expect(vm.isDeleteModalOpen).toBe(true)

    await vm.handleConfirmDelete()
    expect(deleteElectionMock).toHaveBeenCalledWith('election-123')
    expect(toastSuccessMock).toHaveBeenCalledWith('Eleição excluída com sucesso.')
    expect(routerPushMock).toHaveBeenCalledWith('/elections')
    expect(vm.isDeleteModalOpen).toBe(false)
  })

  it('opens edit modal with election data', () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as {
      openEditModal: () => void
      modalRef: { open: ReturnType<typeof vi.fn> } | null
    }

    const openSpy = vi.fn()
    vm.modalRef = { open: openSpy }
    vm.openEditModal()

    expect(openSpy).toHaveBeenCalledWith(mockElection, true)
  })

  it('renders not found card when election is null', () => {
    electionDataRef.value = null
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as { election: null }

    expect(vm.election).toBeNull()
  })

  it('handles candidate registration modal opening and editing', () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as {
      openCreateCandidateModal: () => void
      openEditCandidateModal: (c: (typeof mockCandidates)[0]) => void
      candidateModalRef: { open: ReturnType<typeof vi.fn> } | null
    }

    const openSpy = vi.fn()
    vm.candidateModalRef = { open: openSpy }

    vm.openCreateCandidateModal()
    expect(openSpy).toHaveBeenCalledWith()

    vm.openEditCandidateModal(mockCandidates[0])
    expect(openSpy).toHaveBeenCalledWith(mockCandidates[0])
  })

  it('handles candidate safe delete confirmation and refreshes list', async () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as {
      openDeleteCandidateModal: (c: (typeof mockCandidates)[0]) => void
      handleConfirmDeleteCandidate: () => Promise<void>
      isCandidateDeleteModalOpen: boolean
      candidateToDelete: (typeof mockCandidates)[0] | null
    }

    vm.openDeleteCandidateModal(mockCandidates[0])
    expect(vm.isCandidateDeleteModalOpen).toBe(true)
    expect(vm.candidateToDelete).toEqual(mockCandidates[0])

    await vm.handleConfirmDeleteCandidate()
    expect(deleteCandidateApiMock).toHaveBeenCalledWith('cand-1')
    expect(toastSuccessMock).toHaveBeenCalledWith('Candidato removido com sucesso.')
    expect(refreshCandidatesMock).toHaveBeenCalled()
    expect(vm.isCandidateDeleteModalOpen).toBe(false)
  })
})
