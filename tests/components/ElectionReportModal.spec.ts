import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import ElectionReportModal from '~/components/elections/ElectionReportModal.vue'
import type { ElectionRow } from '~/types/election'
import type { CandidateRow } from '~/types/candidate'
import type { BallotBoxRow } from '~/types/ballot-box'
import type { ElectionCommitteeMemberRow } from '~/types/election-committee'
import type { ElectionTallySummary } from '~/types/election-vote'

const printInitialReportMock = vi.fn().mockResolvedValue(undefined)
const exportInitialReportToPdfMock = vi.fn().mockResolvedValue(undefined)
const printFinalReportMock = vi.fn().mockResolvedValue(undefined)
const exportFinalReportToPdfMock = vi.fn().mockResolvedValue(undefined)

mockNuxtImport('useElectionReports', () => () => ({
  printInitialReport: printInitialReportMock,
  exportInitialReportToPdf: exportInitialReportToPdfMock,
  printFinalReport: printFinalReportMock,
  exportFinalReportToPdf: exportFinalReportToPdfMock,
}))

mockNuxtImport('useToast', () => () => ({
  success: vi.fn(),
  error: vi.fn(),
}))

const mockElection: ElectionRow = {
  id: 'elec-1',
  name: 'Eleição CIPA 2026',
  election_date: '2026-11-10T12:00:00Z',
  digits_count: 2,
  is_uppercase: false,
  status: 'finished',
  voting_mode: 'simple',
  description: 'Eleição oficial',
  created_at: '2026-10-20T10:00:00Z',
  updated_at: '2026-10-20T10:00:00Z',
}

const mockCandidates: CandidateRow[] = [
  {
    id: 'cand-1',
    election_id: 'elec-1',
    name: 'João Carlos',
    candidate_number: '11',
    photo_url: 'https://example.com/joao.jpg',
    created_at: '2026-10-20T10:00:00Z',
    updated_at: '2026-10-20T10:00:00Z',
  },
]

const mockBallotBoxes: BallotBoxRow[] = [
  {
    id: 'box-1',
    election_id: 'elec-1',
    name: 'Urna 01',
    device_info: 'PC Recepção',
    is_active: false,
    created_by: 'u1',
    deleted_at: null,
    created_at: '2026-10-20T10:00:00Z',
    updated_at: '2026-10-20T10:00:00Z',
  },
]

const mockCommittee: ElectionCommitteeMemberRow[] = [
  {
    id: 'cm-1',
    election_id: 'elec-1',
    name: 'Patrícia Lima',
    role_name: 'Presidente da Mesa',
    sort_order: 1,
    created_by: 'u1',
    created_at: '2026-10-20T10:00:00Z',
    updated_at: '2026-10-20T10:00:00Z',
  },
]

const mockTally: ElectionTallySummary = {
  totalVotes: 25,
  validVotes: 20,
  blankVotes: 3,
  nullVotes: 2,
  validPercentage: 80,
  blankPercentage: 12,
  nullPercentage: 8,
  candidatesRanking: [
    {
      rank: 1,
      candidate: mockCandidates[0]!,
      votesCount: 20,
      percentageOfValid: 100,
      percentageOfTotal: 80,
    },
  ],
}

const globalStubs = {
  UiModal: {
    props: ['modelValue', 'title'],
    template:
      '<div v-if="modelValue" class="ui-modal-stub"><h2>{{ title }}</h2><slot /><slot name="actions" /></div>',
  },
  UiCard: { template: '<div class="ui-card-stub"><slot /></div>' },
  UiRow: { template: '<div class="ui-row-stub"><slot /></div>' },
  UiCol: { template: '<div class="ui-col-stub"><slot /></div>' },
  UiChip: { template: '<span class="ui-chip-stub"><slot /></span>' },
  UiDivider: { template: '<hr />' },
  UiTable: { template: '<table><slot /></table>' },
  UiAvatar: { template: '<div class="ui-avatar-stub"><slot /></div>' },
  UiAlert: { template: '<div class="ui-alert-stub"><slot /></div>' },
  UiButton: {
    props: ['loading'],
    template: '<button><slot /></button>',
  },
}

describe('ElectionReportModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('opens in initial mode (Zerésima) and renders committee signatures and 0 votes', async () => {
    const wrapper = mount(ElectionReportModal, {
      props: {
        election: mockElection,
        candidates: mockCandidates,
        ballotBoxes: mockBallotBoxes,
        committee: mockCommittee,
        tally: { ...mockTally, totalVotes: 0 },
      },
      global: { stubs: globalStubs },
    })

    const vm = wrapper.vm as unknown as { open: (type: 'initial' | 'final') => void }
    vm.open('initial')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="initial-report-content"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Patrícia Lima')
    expect(wrapper.text()).toContain('Presidente da Mesa')
    expect(wrapper.text()).toContain('0 votos (0,00%)')

    await wrapper.find('[data-testid="btn-print-report"]').trigger('click')
    expect(printInitialReportMock).toHaveBeenCalledTimes(1)
  })

  it('opens in final mode and renders classification ranking, percentages, photos, and committee signatures', async () => {
    const wrapper = mount(ElectionReportModal, {
      props: {
        election: mockElection,
        candidates: mockCandidates,
        ballotBoxes: mockBallotBoxes,
        committee: mockCommittee,
        tally: mockTally,
      },
      global: { stubs: globalStubs },
    })

    const vm = wrapper.vm as unknown as { open: (type: 'initial' | 'final') => void }
    vm.open('final')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="final-report-content"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('1º Lugar')
    expect(wrapper.text()).toContain('João Carlos')
    expect(wrapper.text()).toContain('20 voto(s)')
    expect(wrapper.text()).toContain('100,00% dos válidos')
    expect(wrapper.text()).toContain('Patrícia Lima')
    expect(wrapper.text()).toContain('Presidente da Mesa')

    await wrapper.find('[data-testid="btn-download-report-pdf"]').trigger('click')
    expect(exportFinalReportToPdfMock).toHaveBeenCalledTimes(1)
  })
})
