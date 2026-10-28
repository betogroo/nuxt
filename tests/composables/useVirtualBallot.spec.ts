import { describe, it, expect, vi, afterEach } from 'vitest'
import { useVirtualBallot } from '~/composables/useVirtualBallot'
import { useUrnaSounds } from '~/composables/useUrnaSounds'
import type { ElectionRow } from '~/types/election'
import type { CandidateRow } from '~/types/candidate'

const mockElection: ElectionRow = {
  id: 'e-1',
  name: 'Diretor',
  election_date: '2026-11-15',
  digits_count: 2,
  is_uppercase: true,
  status: 'released',
  description: null,
  created_at: '2026-10-20T10:00:00Z',
  updated_at: '2026-10-20T10:00:00Z',
}

const mockCandidates: CandidateRow[] = [
  {
    id: 'c-10',
    election_id: 'e-1',
    name: 'Carlos',
    candidate_number: '10',
    photo_url: null,
    created_at: '2026-10-20T10:00:00Z',
    updated_at: '2026-10-20T10:00:00Z',
  },
]

describe('composables/useUrnaSounds', () => {
  it('playKeySound and playConfirmationSound do not throw when AudioContext is missing', () => {
    const { playKeySound, playConfirmationSound } = useUrnaSounds()
    expect(() => playKeySound()).not.toThrow()
    expect(() => playConfirmationSound()).not.toThrow()
  })
})

describe('composables/useVirtualBallot', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('matches candidate, confirms vote, and triggers cycle completion after countdown', () => {
    vi.useFakeTimers()
    const onVoteConfirmed = vi.fn()
    const onVoteCycleCompleted = vi.fn()

    const ballot = useVirtualBallot({
      election: () => mockElection,
      candidates: () => mockCandidates,
      onVoteConfirmed,
      onVoteCycleCompleted,
      resetDelayMs: 3000,
    })

    expect(ballot.cargoTitle.value).toBe('DIRETOR')
    ballot.pressDigit('1')
    ballot.pressDigit('0')

    expect(ballot.enteredNumber.value).toBe('10')
    expect(ballot.isDigitsComplete.value).toBe(true)
    expect(ballot.matchedCandidate.value?.id).toBe('c-10')
    expect(ballot.isNullVote.value).toBe(false)

    ballot.pressConfirma()
    expect(ballot.isVoteFinished.value).toBe(true)
    expect(onVoteConfirmed).toHaveBeenCalledWith({
      candidateId: 'c-10',
      candidateNumber: '10',
      isBlank: false,
      isNull: false,
    })

    vi.advanceTimersByTime(3000)
    expect(onVoteCycleCompleted).toHaveBeenCalledOnce()
    expect(ballot.isVoteFinished.value).toBe(false)
    expect(ballot.digits.value).toEqual([])
  })

  it('ignores actions when disabled is true', () => {
    const onVoteConfirmed = vi.fn()
    const ballot = useVirtualBallot({
      election: () => mockElection,
      candidates: () => mockCandidates,
      disabled: () => true,
      onVoteConfirmed,
      onVoteCycleCompleted: vi.fn(),
    })

    ballot.pressDigit('1')
    ballot.pressBranco()
    ballot.pressConfirma()

    expect(ballot.digits.value).toEqual([])
    expect(ballot.isBlankVote.value).toBe(false)
    expect(onVoteConfirmed).not.toHaveBeenCalled()
  })
})
