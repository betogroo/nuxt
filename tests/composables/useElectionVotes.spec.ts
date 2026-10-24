import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useElectionVotes } from '~/composables/useElectionVotes'
import type { CandidateRow } from '~/types/candidate'
import type { ElectionVoteRow } from '~/types/election-vote'

const fromMock = vi.fn()
const logActionMock = vi.fn()

const supabaseMock = {
  from: fromMock,
}

mockNuxtImport('useSupabaseClient', () => () => supabaseMock)
mockNuxtImport('useLogger', () => () => ({ logAction: logActionMock }))

describe('useElectionVotes Composable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('castVote should insert an anonymous vote and log action without exposing candidate choice', async () => {
    const mockVote: ElectionVoteRow = {
      id: 'vote-1',
      election_id: 'elec-1',
      ballot_box_id: 'box-1',
      candidate_id: 'cand-1',
      candidate_number: '10',
      is_blank: false,
      is_null: false,
      created_at: '2026-10-24T11:00:00Z',
    }

    const singleMock = vi.fn().mockResolvedValue({ data: mockVote, error: null })
    const selectMock = vi.fn().mockReturnValue({ single: singleMock })
    const insertMock = vi.fn().mockReturnValue({ select: selectMock })
    fromMock.mockReturnValue({ insert: insertMock })

    const { castVote } = useElectionVotes()
    const result = await castVote({
      election_id: 'elec-1',
      ballot_box_id: 'box-1',
      candidate_id: 'cand-1',
      candidate_number: '10',
      is_blank: false,
      is_null: false,
    })

    expect(fromMock).toHaveBeenCalledWith('election_votes')
    expect(insertMock).toHaveBeenCalledWith({
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
    expect(logActionMock).toHaveBeenCalledWith(
      'CAST_ELECTION_VOTE',
      expect.stringContaining('Voto anônimo registrado na eleição'),
    )
    expect(result).toEqual(mockVote)
  })

  it('castVote should insert a nominal vote with voter identification in non-anonymous election', async () => {
    const mockVote: ElectionVoteRow = {
      id: 'vote-2',
      election_id: 'elec-1',
      ballot_box_id: 'box-1',
      candidate_id: 'cand-1',
      candidate_number: '10',
      is_blank: false,
      is_null: false,
      voter_id: 'voter-123',
      voter_registration_number: '99887766',
      voter_name: 'Carlos Silva',
      created_at: '2026-10-24T11:05:00Z',
    }

    const singleMock = vi.fn().mockResolvedValue({ data: mockVote, error: null })
    const selectMock = vi.fn().mockReturnValue({ single: singleMock })
    const insertMock = vi.fn().mockReturnValue({ select: selectMock })
    fromMock.mockReturnValue({ insert: insertMock })

    const { castVote } = useElectionVotes()
    const result = await castVote({
      election_id: 'elec-1',
      ballot_box_id: 'box-1',
      candidate_id: 'cand-1',
      candidate_number: '10',
      is_blank: false,
      is_null: false,
      voter_id: 'voter-123',
      voter_registration_number: '99887766',
      voter_name: 'Carlos Silva',
    })

    expect(insertMock).toHaveBeenCalledWith({
      election_id: 'elec-1',
      ballot_box_id: 'box-1',
      candidate_id: 'cand-1',
      candidate_number: '10',
      is_blank: false,
      is_null: false,
      voter_id: 'voter-123',
      voter_registration_number: '99887766',
      voter_name: 'Carlos Silva',
    })
    expect(logActionMock).toHaveBeenCalledWith(
      'CAST_ELECTION_VOTE',
      expect.stringContaining('Voto nominal registrado'),
    )
    expect(result).toEqual(mockVote)
  })

  it('computeElectionTally should accurately calculate votes, percentages, and classification rank', () => {
    const candidates: CandidateRow[] = [
      {
        id: 'cand-1',
        election_id: 'elec-1',
        name: 'Ana Beatriz',
        candidate_number: '10',
        photo_url: 'https://example.com/ana.jpg',
        created_at: '2026-10-20T10:00:00Z',
        updated_at: '2026-10-20T10:00:00Z',
      },
      {
        id: 'cand-2',
        election_id: 'elec-1',
        name: 'Bruno Henrique',
        candidate_number: '20',
        photo_url: null,
        created_at: '2026-10-20T10:00:00Z',
        updated_at: '2026-10-20T10:00:00Z',
      },
    ]

    const votes: ElectionVoteRow[] = [
      {
        id: 'v1',
        election_id: 'elec-1',
        ballot_box_id: 'b1',
        candidate_id: 'cand-2',
        candidate_number: '20',
        is_blank: false,
        is_null: false,
        created_at: '2026-10-24T10:00:00Z',
      },
      {
        id: 'v2',
        election_id: 'elec-1',
        ballot_box_id: 'b1',
        candidate_id: 'cand-2',
        candidate_number: '20',
        is_blank: false,
        is_null: false,
        created_at: '2026-10-24T10:01:00Z',
      },
      {
        id: 'v3',
        election_id: 'elec-1',
        ballot_box_id: 'b1',
        candidate_id: 'cand-2',
        candidate_number: '20',
        is_blank: false,
        is_null: false,
        created_at: '2026-10-24T10:02:00Z',
      },
      {
        id: 'v4',
        election_id: 'elec-1',
        ballot_box_id: 'b1',
        candidate_id: 'cand-1',
        candidate_number: '10',
        is_blank: false,
        is_null: false,
        created_at: '2026-10-24T10:03:00Z',
      },
      {
        id: 'v5',
        election_id: 'elec-1',
        ballot_box_id: 'b1',
        candidate_id: null,
        candidate_number: null,
        is_blank: true,
        is_null: false,
        created_at: '2026-10-24T10:04:00Z',
      },
      {
        id: 'v6',
        election_id: 'elec-1',
        ballot_box_id: 'b1',
        candidate_id: null,
        candidate_number: '99',
        is_blank: false,
        is_null: true,
        created_at: '2026-10-24T10:05:00Z',
      },
    ]

    const { computeElectionTally } = useElectionVotes()
    const tally = computeElectionTally(candidates, votes)

    expect(tally.totalVotes).toBe(6)
    expect(tally.validVotes).toBe(4)
    expect(tally.blankVotes).toBe(1)
    expect(tally.nullVotes).toBe(1)
    expect(tally.validPercentage).toBe(66.67)
    expect(tally.blankPercentage).toBe(16.67)
    expect(tally.nullPercentage).toBe(16.67)

    // Candidate 2 (Bruno Henrique) has 3 votes (1st place), Candidate 1 (Ana Beatriz) has 1 vote (2nd place)
    expect(tally.candidatesRanking).toHaveLength(2)
    expect(tally.candidatesRanking[0]?.rank).toBe(1)
    expect(tally.candidatesRanking[0]?.candidate.name).toBe('Bruno Henrique')
    expect(tally.candidatesRanking[0]?.votesCount).toBe(3)
    expect(tally.candidatesRanking[0]?.percentageOfValid).toBe(75)
    expect(tally.candidatesRanking[0]?.percentageOfTotal).toBe(50)

    expect(tally.candidatesRanking[1]?.rank).toBe(2)
    expect(tally.candidatesRanking[1]?.candidate.name).toBe('Ana Beatriz')
    expect(tally.candidatesRanking[1]?.votesCount).toBe(1)
    expect(tally.candidatesRanking[1]?.percentageOfValid).toBe(25)
    expect(tally.candidatesRanking[1]?.percentageOfTotal).toBe(16.67)
  })
})
