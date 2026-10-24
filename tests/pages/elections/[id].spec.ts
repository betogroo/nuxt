import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { ref } from 'vue'
import ElectionDetailPage from '~/pages/elections/[id]/index.vue'

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
const toastWarningMock = vi.fn()
mockNuxtImport('useToast', () => () => ({
  success: toastSuccessMock,
  error: toastErrorMock,
  warning: toastWarningMock,
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
  voting_mode: 'simple',
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

const mockBallotBoxes = [
  {
    id: 'box-1',
    election_id: 'election-123',
    name: 'Urna 01 - Tablet Hall',
    device_info: 'Samsung Galaxy Tab A9',
    is_active: false,
    created_by: 'user-1',
    deleted_at: null,
    created_at: '2026-10-21T10:00:00Z',
    updated_at: '2026-10-21T10:00:00Z',
  },
  {
    id: 'box-2',
    election_id: 'election-123',
    name: 'Urna 02 - PC Principal',
    device_info: 'PC Dell',
    is_active: true,
    created_by: 'user-1',
    deleted_at: null,
    created_at: '2026-10-21T10:00:00Z',
    updated_at: '2026-10-21T10:00:00Z',
  },
]

const fetchBallotBoxesMock = vi.fn().mockResolvedValue(mockBallotBoxes)
const toggleBallotBoxStatusApiMock = vi
  .fn()
  .mockResolvedValue({ ...mockBallotBoxes[0], is_active: true })
const deleteBallotBoxApiMock = vi.fn().mockResolvedValue(undefined)
const subscribeToBallotBoxesMock = vi.fn().mockReturnValue('mock-channel')

mockNuxtImport('useBallotBoxes', () => () => ({
  loading: ref(false),
  error: ref(null),
  fetchBallotBoxes: fetchBallotBoxesMock,
  toggleBallotBoxStatus: toggleBallotBoxStatusApiMock,
  deleteBallotBox: deleteBallotBoxApiMock,
  subscribeToBallotBoxes: subscribeToBallotBoxesMock,
}))

const mockCommitteeMembers = [
  {
    id: 'cm-1',
    election_id: 'election-123',
    name: 'Maria Silva',
    role_name: 'Presidente da Comissão',
    sort_order: 1,
    created_by: 'user-1',
    created_at: '2026-10-21T10:00:00Z',
    updated_at: '2026-10-21T10:00:00Z',
  },
]

const fetchCommitteeMembersMock = vi.fn().mockResolvedValue(mockCommitteeMembers)
const addCommitteeMemberMock = vi.fn().mockResolvedValue(mockCommitteeMembers[0])
const updateCommitteeMemberMock = vi.fn().mockResolvedValue(mockCommitteeMembers[0])
const deleteCommitteeMemberMock = vi.fn().mockResolvedValue(undefined)

mockNuxtImport('useElectionCommittee', () => () => ({
  fetchCommitteeMembers: fetchCommitteeMembersMock,
  addCommitteeMember: addCommitteeMemberMock,
  updateCommitteeMember: updateCommitteeMemberMock,
  deleteCommitteeMember: deleteCommitteeMemberMock,
}))

const fetchElectionVotesMock = vi.fn().mockResolvedValue([])
const computeElectionTallyMock = vi.fn().mockReturnValue({
  totalVotes: 0,
  validVotes: 0,
  blankVotes: 0,
  nullVotes: 0,
  validPercentage: 0,
  blankPercentage: 0,
  nullPercentage: 0,
  candidatesRanking: [],
})

mockNuxtImport('useElectionVotes', () => () => ({
  fetchElectionVotes: fetchElectionVotesMock,
  computeElectionTally: computeElectionTallyMock,
}))

const mockVoters = [
  {
    id: 'voter-1',
    voter_registration_number: '100599',
    name: 'Bruno Alves Alves',
    is_active: true,
    created_at: '2026-10-24T12:00:00Z',
    updated_at: '2026-10-24T12:00:00Z',
  },
]
const fetchVotersMock = vi.fn().mockResolvedValue(mockVoters)
mockNuxtImport('useElectionVoters', () => () => ({
  fetchVoters: fetchVotersMock,
  fetchVoterByNumber: vi.fn(),
  checkVoterElectionStatus: vi.fn(),
  createVoter: vi.fn(),
  updateVoter: vi.fn(),
  deleteVoter: vi.fn(),
}))

const removeChannelMock = vi.fn()
const channelSubscribeMock = vi.fn().mockReturnValue({ unsubscribe: vi.fn() })
const channelOnMock = vi.fn().mockReturnValue({ subscribe: channelSubscribeMock })
const channelMock = vi.fn().mockReturnValue({ on: channelOnMock, subscribe: channelSubscribeMock })
const fromAttendanceSelectMock = vi.fn().mockReturnValue({
  eq: vi.fn().mockResolvedValue({ data: [], error: null }),
})
mockNuxtImport('useSupabaseClient', () => () => ({
  from: vi.fn().mockReturnValue({ select: fromAttendanceSelectMock }),
  channel: channelMock,
  removeChannel: removeChannelMock,
}))

mockNuxtImport('usePermissions', () => () => ({
  canManageElections: () => true,
  canDeleteElections: () =>
    profileRef.value?.role === 'admin' || profileRef.value?.role === 'admin-election',
}))

const electionDataRef = ref<typeof mockElection | null>(mockElection)
const candidatesDataRef = ref<typeof mockCandidates>(mockCandidates)
const ballotBoxesDataRef = ref<typeof mockBallotBoxes>(mockBallotBoxes)
const committeeDataRef = ref<typeof mockCommitteeMembers>(mockCommitteeMembers)
const votersDataRef = ref<typeof mockVoters>(mockVoters)
const attendanceDataRef = ref<unknown[]>([])
const votesDataRef = ref<unknown[]>([])
const pendingRef = ref(false)
const refreshMock = vi.fn()
const refreshCandidatesMock = vi.fn()
const refreshBallotBoxesMock = vi.fn()
const refreshCommitteeMock = vi.fn()
const refreshVotersMock = vi.fn()
const refreshAttendanceMock = vi.fn()
const refreshVotesMock = vi.fn()

mockNuxtImport('useAsyncData', () => (key: string) => {
  if (key.startsWith('election-candidates')) {
    return {
      data: candidatesDataRef,
      pending: pendingRef,
      error: ref(null),
      refresh: refreshCandidatesMock,
    }
  }
  if (key.startsWith('election-ballot-boxes')) {
    return {
      data: ballotBoxesDataRef,
      pending: pendingRef,
      error: ref(null),
      refresh: refreshBallotBoxesMock,
    }
  }
  if (key.startsWith('election-committee')) {
    return {
      data: committeeDataRef,
      pending: pendingRef,
      error: ref(null),
      refresh: refreshCommitteeMock,
    }
  }
  if (key.startsWith('election-voters')) {
    return {
      data: votersDataRef,
      pending: pendingRef,
      error: ref(null),
      refresh: refreshVotersMock,
    }
  }
  if (key.startsWith('election-attendance')) {
    return {
      data: attendanceDataRef,
      pending: pendingRef,
      error: ref(null),
      refresh: refreshAttendanceMock,
    }
  }
  if (key.startsWith('election-votes')) {
    return {
      data: votesDataRef,
      pending: pendingRef,
      error: ref(null),
      refresh: refreshVotesMock,
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
          UiInput: true,
          UiTable: true,
          ElectionFormModal: true,
          CandidateFormModal: true,
          BallotBoxFormModal: true,
          BallotBoxCard: true,
          ElectionReportModal: true,
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
    expect(refreshVotesMock).toHaveBeenCalled()
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

    vm.openEditCandidateModal(mockCandidates[0]!)
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

    vm.openDeleteCandidateModal(mockCandidates[0]!)
    expect(vm.isCandidateDeleteModalOpen).toBe(true)
    expect(vm.candidateToDelete).toEqual(mockCandidates[0])

    await vm.handleConfirmDeleteCandidate()
    expect(deleteCandidateApiMock).toHaveBeenCalledWith('cand-1')
    expect(toastSuccessMock).toHaveBeenCalledWith('Candidato removido com sucesso.')
    expect(refreshCandidatesMock).toHaveBeenCalled()
    expect(vm.isCandidateDeleteModalOpen).toBe(false)
  })

  it('handles ballot box registration modal opening and editing', () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as {
      openCreateBallotBoxModal: () => void
      openEditBallotBoxModal: (b: (typeof mockBallotBoxes)[0]) => void
      ballotBoxModalRef: { open: ReturnType<typeof vi.fn> } | null
    }

    const openSpy = vi.fn()
    vm.ballotBoxModalRef = { open: openSpy }

    vm.openCreateBallotBoxModal()
    expect(openSpy).toHaveBeenCalledWith()

    vm.openEditBallotBoxModal(mockBallotBoxes[0]!)
    expect(openSpy).toHaveBeenCalledWith(mockBallotBoxes[0])
  })

  it('handles ballot box status toggle and refreshes list', async () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as {
      handleToggleBallotBox: (b: (typeof mockBallotBoxes)[0], active: boolean) => Promise<void>
    }

    await vm.handleToggleBallotBox(mockBallotBoxes[0]!, true)
    expect(toggleBallotBoxStatusApiMock).toHaveBeenCalledWith('box-1', true)
    expect(toastSuccessMock).toHaveBeenCalledWith(expect.stringContaining('ativada'))
    expect(refreshBallotBoxesMock).toHaveBeenCalled()
  })

  it('handles ballot box safe delete confirmation and refreshes list', async () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as {
      openDeleteBallotBoxModal: (b: (typeof mockBallotBoxes)[0]) => void
      handleConfirmDeleteBallotBox: () => Promise<void>
      isBallotBoxDeleteModalOpen: boolean
      ballotBoxToDelete: (typeof mockBallotBoxes)[0] | null
    }

    vm.openDeleteBallotBoxModal(mockBallotBoxes[0]!)
    expect(vm.isBallotBoxDeleteModalOpen).toBe(true)
    expect(vm.ballotBoxToDelete).toEqual(mockBallotBoxes[0])

    await vm.handleConfirmDeleteBallotBox()
    expect(deleteBallotBoxApiMock).toHaveBeenCalledWith('box-1')
    expect(toastSuccessMock).toHaveBeenCalledWith('Urna virtual removida com sucesso.')
    expect(refreshBallotBoxesMock).toHaveBeenCalled()
    expect(vm.isBallotBoxDeleteModalOpen).toBe(false)
  })

  it('handles open terminal in new window and falls back to router push if popup blocked', () => {
    const fakeWindow = { closed: false } as Window
    const windowOpenSpy = vi.spyOn(window, 'open').mockReturnValue(fakeWindow)
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as {
      handleOpenBallotBoxTerminal: (b: (typeof mockBallotBoxes)[0]) => void
    }

    vm.handleOpenBallotBoxTerminal(mockBallotBoxes[0]!)
    expect(windowOpenSpy).toHaveBeenCalledWith(
      '/elections/election-123/ballot-box/box-1',
      'BallotBoxKiosk_box-1',
      expect.stringContaining('popup=yes'),
    )

    // Test fallback when popup is blocked
    windowOpenSpy.mockReturnValue(null)
    vm.handleOpenBallotBoxTerminal(mockBallotBoxes[0]!)
    expect(routerPushMock).toHaveBeenCalledWith('/elections/election-123/ballot-box/box-1')

    windowOpenSpy.mockRestore()
  })

  it('handles committee member creation, editing, and removal', async () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as {
      committeeFormName: string
      committeeFormRole: string
      handleSaveCommitteeMember: () => Promise<void>
      startEditCommitteeMember: (m: (typeof mockCommitteeMembers)[0]) => void
      handleDeleteCommitteeMember: (m: (typeof mockCommitteeMembers)[0]) => Promise<void>
    }

    vm.committeeFormName = 'José Alencar'
    vm.committeeFormRole = '1º Secretário'
    await vm.handleSaveCommitteeMember()

    expect(addCommitteeMemberMock).toHaveBeenCalledWith({
      election_id: 'election-123',
      name: 'José Alencar',
      role_name: '1º Secretário',
      sort_order: 2,
    })
    expect(refreshCommitteeMock).toHaveBeenCalled()

    vm.startEditCommitteeMember(mockCommitteeMembers[0]!)
    vm.committeeFormName = 'Maria Silva Atualizada'
    vm.committeeFormRole = 'Presidente'
    await vm.handleSaveCommitteeMember()

    expect(updateCommitteeMemberMock).toHaveBeenCalledWith('cm-1', {
      name: 'Maria Silva Atualizada',
      role_name: 'Presidente',
    })

    await vm.handleDeleteCommitteeMember(mockCommitteeMembers[0]!)
    expect(deleteCommitteeMemberMock).toHaveBeenCalledWith('cm-1', 'Maria Silva')
  })

  it('opens initial and final election reports modal', () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as {
      openReportModal: (type: 'initial' | 'final') => void
      reportModalRef: { open: ReturnType<typeof vi.fn> } | null
    }

    const openSpy = vi.fn()
    vm.reportModalRef = { open: openSpy }

    vm.openReportModal('initial')
    expect(openSpy).toHaveBeenCalledWith('initial')

    vm.openReportModal('final')
    expect(openSpy).toHaveBeenCalledWith('final')
  })

  it('renders registered voters tab, metrics, and filters voters by search term', async () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as {
      activeTab: string
      totalVotersCount: number
      votedVotersCount: number
      pendingVotersCount: number
      votersSearch: string
      votersFilter: string
      filteredVoters: Array<{ name: string; voter_registration_number: string; hasVoted: boolean }>
      refreshVoters: () => Promise<void>
      refreshAttendance: () => Promise<void>
    }

    vm.activeTab = 'voters'
    await wrapper.vm.$nextTick()

    expect(vm.totalVotersCount).toBe(1)
    expect(vm.votedVotersCount).toBe(0)
    expect(vm.pendingVotersCount).toBe(1)
    expect(vm.filteredVoters).toHaveLength(1)
    expect(vm.filteredVoters[0]?.name).toBe('Bruno Alves Alves')

    vm.votersSearch = 'NonExistent'
    expect(vm.filteredVoters).toHaveLength(0)

    vm.votersSearch = '100599'
    expect(vm.filteredVoters).toHaveLength(1)
  })
})
