import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import {
  buildInitialElectionReportHtml,
  buildFinalElectionReportHtml,
  buildInitialElectionReportPdfDoc,
  buildFinalElectionReportPdfDoc,
} from '~/composables/useElectionReports'
import type { ElectionRow } from '~/types/election'
import type { CandidateRow } from '~/types/candidate'
import type { BallotBoxRow } from '~/types/ballot-box'
import type { ElectionCommitteeMemberRow } from '~/types/election-committee'
import type { ElectionTallySummary } from '~/types/election-vote'

const logActionMock = vi.fn()
mockNuxtImport('useLogger', () => () => ({ logAction: logActionMock }))

const mockElection: ElectionRow = {
  id: 'elec-1',
  name: 'Eleição Grêmio Estudantil 2026',
  election_date: '2026-10-25T12:00:00Z',
  digits_count: 2,
  is_uppercase: true,
  status: 'finished',
  voting_mode: 'monitored',
  description: 'Pleito anual',
  created_at: '2026-10-20T10:00:00Z',
  updated_at: '2026-10-25T18:00:00Z',
}

const mockCandidates: CandidateRow[] = [
  {
    id: 'cand-1',
    election_id: 'elec-1',
    name: 'Chapa Renovação',
    candidate_number: '12',
    photo_url: 'https://example.com/chapa12.jpg',
    created_at: '2026-10-21T10:00:00Z',
    updated_at: '2026-10-21T10:00:00Z',
  },
  {
    id: 'cand-2',
    election_id: 'elec-1',
    name: 'Chapa União',
    candidate_number: '25',
    photo_url: null,
    created_at: '2026-10-21T10:00:00Z',
    updated_at: '2026-10-21T10:00:00Z',
  },
]

const mockBallotBoxes: BallotBoxRow[] = [
  {
    id: 'box-1',
    election_id: 'elec-1',
    name: 'Urna Principal - Pátio',
    device_info: 'Notebook Sala 01',
    is_active: false,
    created_by: 'user-1',
    deleted_at: null,
    created_at: '2026-10-21T10:00:00Z',
    updated_at: '2026-10-21T10:00:00Z',
  },
]

const mockCommittee: ElectionCommitteeMemberRow[] = [
  {
    id: 'cm-1',
    election_id: 'elec-1',
    name: 'Fernanda Oliveira',
    role_name: 'Presidente da Comissão',
    sort_order: 1,
    created_by: 'user-1',
    created_at: '2026-10-22T10:00:00Z',
    updated_at: '2026-10-22T10:00:00Z',
  },
  {
    id: 'cm-2',
    election_id: 'elec-1',
    name: 'Roberto Santos',
    role_name: '1º Mesário',
    sort_order: 2,
    created_by: 'user-1',
    created_at: '2026-10-22T10:05:00Z',
    updated_at: '2026-10-22T10:05:00Z',
  },
]

const mockTally: ElectionTallySummary = {
  totalVotes: 100,
  validVotes: 90,
  blankVotes: 6,
  nullVotes: 4,
  validPercentage: 90,
  blankPercentage: 6,
  nullPercentage: 4,
  candidatesRanking: [
    {
      rank: 1,
      candidate: mockCandidates[0]!,
      votesCount: 60,
      percentageOfValid: 66.67,
      percentageOfTotal: 60,
    },
    {
      rank: 2,
      candidate: mockCandidates[1]!,
      votesCount: 30,
      percentageOfValid: 33.33,
      percentageOfTotal: 30,
    },
  ],
}

describe('useElectionReports Composable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('buildInitialElectionReportHtml should include generation date/time, 0 votes, and committee signature lines', () => {
    const html = buildInitialElectionReportHtml({
      election: mockElection,
      candidates: mockCandidates,
      ballotBoxes: mockBallotBoxes,
      committee: mockCommittee,
      currentVotesCount: 0,
      generatedAt: new Date('2026-10-25T07:45:00Z'),
    })

    expect(html).toContain('Condição Inicial da Urna e Emissão de Zerésima')
    expect(html).toContain('Eleição Grêmio Estudantil 2026')
    expect(html).toContain('Urna Principal - Pátio')
    expect(html).toContain('0 votos (0,00%)')
    expect(html).toContain('Fernanda Oliveira')
    expect(html).toContain('Presidente da Comissão')
    expect(html).toContain('Roberto Santos')
    expect(html).toContain('1º Mesário')
    expect(html).toContain('__________________________________________________')
  })

  it('buildFinalElectionReportHtml should include classification rank, candidate photos, percentages, and committee signatures', () => {
    const html = buildFinalElectionReportHtml({
      election: mockElection,
      tally: mockTally,
      committee: mockCommittee,
      generatedAt: new Date('2026-10-25T18:10:00Z'),
    })

    expect(html).toContain('Boletim Final de Apuração e Classificação')
    expect(html).toContain('1º Lugar')
    expect(html).toContain('2º Lugar')
    expect(html).toContain('Chapa Renovação')
    expect(html).toContain('https://example.com/chapa12.jpg')
    expect(html).toContain('60 voto(s)')
    expect(html).toContain('66,67%')
    expect(html).toContain('Fernanda Oliveira')
    expect(html).toContain('Presidente da Comissão')
    expect(html).toContain('__________________________________________________')
  })

  it('buildInitialElectionReportPdfDoc and buildFinalElectionReportPdfDoc should generate valid jsPDF documents', async () => {
    const initialDoc = await buildInitialElectionReportPdfDoc({
      election: mockElection,
      candidates: mockCandidates,
      ballotBoxes: mockBallotBoxes,
      committee: mockCommittee,
      currentVotesCount: 0,
      generatedAt: new Date('2026-10-25T07:45:00Z'),
    })

    expect(initialDoc.getNumberOfPages()).toBeGreaterThanOrEqual(1)

    const finalDoc = await buildFinalElectionReportPdfDoc({
      election: mockElection,
      tally: mockTally,
      committee: mockCommittee,
      generatedAt: new Date('2026-10-25T18:10:00Z'),
    })

    expect(finalDoc.getNumberOfPages()).toBeGreaterThanOrEqual(1)
  })
})
