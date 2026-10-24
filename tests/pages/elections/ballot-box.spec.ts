import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import BallotBoxKioskPage from '~/pages/elections/[id]/ballot-box/[boxId].vue'
import type { ElectionRow } from '~/types/election'
import type { BallotBoxRow } from '~/types/ballot-box'
import type { CandidateRow } from '~/types/candidate'

const mockElection: ElectionRow = {
  id: 'elec-1',
  name: 'Diretor Presidente',
  election_date: '2026-11-15',
  digits_count: 2,
  is_uppercase: true,
  status: 'released',
  description: 'Eleição Geral',
  created_at: '2026-10-20T10:00:00Z',
  updated_at: '2026-10-20T10:00:00Z',
}

const mockBallotBox: BallotBoxRow = {
  id: 'box-1',
  election_id: 'elec-1',
  name: 'Urna 01 - Auditório',
  device_info: 'Tablet 01',
  is_active: true,
  created_by: 'user-1',
  deleted_at: null,
  created_at: '2026-10-21T10:00:00Z',
  updated_at: '2026-10-21T10:00:00Z',
}

const mockCandidates: CandidateRow[] = [
  {
    id: 'cand-1',
    election_id: 'elec-1',
    name: 'Candidato A',
    candidate_number: '10',
    photo_url: null,
    created_at: '2026-10-21T10:00:00Z',
    updated_at: '2026-10-21T10:00:00Z',
  },
]

mockNuxtImport('definePageMeta', () => vi.fn())
mockNuxtImport('useHead', () => vi.fn())
mockNuxtImport('useRoute', () => () => ({
  params: { id: 'elec-1', boxId: 'box-1' },
}))
mockNuxtImport('useRouter', () => () => ({
  push: vi.fn(),
}))

const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnThis(),
}

mockNuxtImport('useSupabaseClient', () => () => ({
  channel: vi.fn().mockReturnValue(mockChannel),
  removeChannel: vi.fn(),
}))

const fetchElectionByIdMock = vi.fn().mockResolvedValue(mockElection)
mockNuxtImport('useElections', () => () => ({
  fetchElectionById: fetchElectionByIdMock,
}))

const fetchBallotBoxByIdMock = vi.fn().mockResolvedValue(mockBallotBox)
const toggleBallotBoxStatusMock = vi.fn().mockResolvedValue({ ...mockBallotBox, is_active: false })

mockNuxtImport('useBallotBoxes', () => () => ({
  fetchBallotBoxById: fetchBallotBoxByIdMock,
  toggleBallotBoxStatus: toggleBallotBoxStatusMock,
}))

mockNuxtImport('useCandidates', () => () => ({
  fetchCandidates: vi.fn().mockResolvedValue(mockCandidates),
}))

const castVoteMock = vi.fn().mockResolvedValue({
  id: 'vote-1',
  election_id: 'elec-1',
  ballot_box_id: 'box-1',
  candidate_id: 'cand-1',
  candidate_number: '10',
  is_blank: false,
  is_null: false,
  created_at: '2026-10-24T12:00:00Z',
})

mockNuxtImport('useElectionVotes', () => () => ({
  castVote: castVoteMock,
}))

describe('BallotBox Kiosk Terminal Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('mounts and renders VirtualBallotBox when ballot box is active and election is released', async () => {
    const wrapper = shallowMount(BallotBoxKioskPage, {
      global: {
        stubs: {
          UiApp: { template: '<div><slot /></div>' },
          UiMain: { template: '<div><slot /></div>' },
          UiProgressCircular: true,
          UiCard: true,
          UiAvatar: true,
          UiIcon: true,
          UiChip: true,
          UiButton: true,
          UiAlert: true,
          UiModal: true,
          VirtualBallotBox: {
            name: 'VirtualBallotBox',
            template: '<div class="virtual-ballot-box-stub" />',
            props: ['election', 'candidates'],
          },
        },
      },
    })

    // Wait for loadData to resolve
    await new Promise((resolve) => setTimeout(resolve, 50))
    await wrapper.vm.$nextTick()

    expect(wrapper.findComponent({ name: 'VirtualBallotBox' }).exists()).toBe(true)
  })

  it('deactivates ballot box when vote cycle completes in monitored mode', async () => {
    mockElection.voting_mode = 'monitored'

    const wrapper = shallowMount(BallotBoxKioskPage, {
      global: {
        stubs: {
          UiApp: { template: '<div><slot /></div>' },
          UiMain: { template: '<div><slot /></div>' },
          UiProgressCircular: true,
          UiCard: true,
          UiAvatar: true,
          UiIcon: true,
          UiChip: true,
          UiButton: true,
          UiAlert: true,
          UiModal: true,
          VirtualBallotBox: {
            name: 'VirtualBallotBox',
            template: '<div class="virtual-ballot-box-stub" />',
            props: ['election', 'candidates'],
          },
        },
      },
    })

    await new Promise((resolve) => setTimeout(resolve, 50))
    await wrapper.vm.$nextTick()

    const vbb = wrapper.findComponent({ name: 'VirtualBallotBox' })
    expect(vbb.exists()).toBe(true)

    await vbb.vm.$emit('vote-confirmed', {
      candidateId: 'cand-1',
      candidateNumber: '10',
      isBlank: false,
      isNull: false,
    })
    await vbb.vm.$emit('vote-cycle-completed')

    expect(castVoteMock).toHaveBeenCalledWith({
      election_id: 'elec-1',
      ballot_box_id: 'box-1',
      candidate_id: 'cand-1',
      candidate_number: '10',
      is_blank: false,
      is_null: false,
      voter_id: null,
      voter_registration_number: null,
      voter_name: null,
    })
    expect(toggleBallotBoxStatusMock).toHaveBeenCalledWith('box-1', false)
  })

  it('passes voter identification to castVote when election is not anonymous', async () => {
    const nonAnonElection = {
      ...mockElection,
      is_anonymous: false,
      voting_mode: 'monitored',
    }
    fetchElectionByIdMock.mockResolvedValueOnce(nonAnonElection)

    const ballotBoxWithVoter = {
      id: 'box-1',
      election_id: 'elec-1',
      name: 'Urna 01',
      device_info: 'PC',
      is_active: true,
      current_voter_id: 'v-1',
      current_voter_registration_number: '12345678',
      current_voter_name: 'Votante Nominal',
      created_by: 'u1',
      deleted_at: null,
      created_at: '2026-10-24T10:00:00Z',
      updated_at: '2026-10-24T10:00:00Z',
    }
    fetchBallotBoxByIdMock.mockResolvedValueOnce(ballotBoxWithVoter)

    const wrapper = shallowMount(BallotBoxKioskPage, {
      global: {
        stubs: {
          UiApp: { template: '<div><slot /></div>' },
          UiMain: { template: '<div><slot /></div>' },
          UiProgressCircular: true,
          UiCard: true,
          UiAvatar: true,
          UiIcon: true,
          UiChip: true,
          UiButton: true,
          UiAlert: true,
          UiModal: true,
          VirtualBallotBox: {
            name: 'VirtualBallotBox',
            template: '<div class="virtual-ballot-box-stub" />',
            props: ['election', 'candidates'],
          },
        },
      },
    })

    await new Promise((resolve) => setTimeout(resolve, 50))
    await wrapper.vm.$nextTick()

    const vbb = wrapper.findComponent({ name: 'VirtualBallotBox' })
    expect(vbb.exists()).toBe(true)

    await vbb.vm.$emit('vote-confirmed', {
      candidateId: 'cand-1',
      candidateNumber: '10',
      isBlank: false,
      isNull: false,
    })

    expect(castVoteMock).toHaveBeenCalledWith({
      election_id: 'elec-1',
      ballot_box_id: 'box-1',
      candidate_id: 'cand-1',
      candidate_number: '10',
      is_blank: false,
      is_null: false,
      voter_id: 'v-1',
      voter_registration_number: '12345678',
      voter_name: 'Votante Nominal',
    })
  })
})
