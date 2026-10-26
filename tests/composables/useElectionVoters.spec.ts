import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useElectionVoters } from '~/composables/useElectionVoters'
import type { ElectionVoterRow } from '~/types/election-voter'

const fromMock = vi.fn()
const logActionMock = vi.fn()

const supabaseMock = {
  from: fromMock,
}

mockNuxtImport('useSupabaseClient', () => () => supabaseMock)
mockNuxtImport('useLogger', () => () => ({ logAction: logActionMock }))

describe('useElectionVoters Composable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockVoter: ElectionVoterRow = {
    id: 'e8bdca7a-7a26-4b64-b4cf-e799447e855a',
    voter_registration_number: '100599',
    name: 'Bruno Alves Alves',
    is_active: true,
    created_at: '2026-10-24T12:00:00Z',
    updated_at: '2026-10-24T12:00:00Z',
  }

  it('fetchVoters should query election_voters and return list', async () => {
    const orderMock = vi.fn().mockResolvedValue({ data: [mockVoter], error: null })
    const selectMock = vi.fn().mockReturnValue({ order: orderMock })
    fromMock.mockReturnValue({ select: selectMock })

    const { fetchVoters } = useElectionVoters()
    const result = await fetchVoters()

    expect(fromMock).toHaveBeenCalledWith('election_voters')
    expect(selectMock).toHaveBeenCalledWith('*')
    expect(orderMock).toHaveBeenCalledWith('name', { ascending: true })
    expect(result).toEqual([mockVoter])
  })

  it('fetchVoters should apply search filter when term provided', async () => {
    const orMock = vi.fn().mockResolvedValue({ data: [mockVoter], error: null })
    const orderMock = vi.fn().mockReturnValue({ or: orMock })
    const selectMock = vi.fn().mockReturnValue({ order: orderMock })
    fromMock.mockReturnValue({ select: selectMock })

    const { fetchVoters } = useElectionVoters()
    const result = await fetchVoters({ search: 'Bruno' })

    expect(fromMock).toHaveBeenCalledWith('election_voters')
    expect(orMock).toHaveBeenCalledWith(expect.stringContaining('name.ilike.%Bruno%'))
    expect(result).toEqual([mockVoter])
  })

  it('fetchVotersPaged should query paginated voters with count', async () => {
    const rangeMock = vi.fn().mockResolvedValue({ data: [mockVoter], error: null, count: 1 })
    const orderMock = vi.fn().mockReturnValue({ range: rangeMock })
    const selectMock = vi.fn().mockReturnValue({ order: orderMock })
    fromMock.mockReturnValue({ select: selectMock })

    const { fetchVotersPaged } = useElectionVoters()
    const result = await fetchVotersPaged({ page: 1, limit: 10 })

    expect(fromMock).toHaveBeenCalledWith('election_voters')
    expect(selectMock).toHaveBeenCalledWith('*', { count: 'exact' })
    expect(orderMock).toHaveBeenCalledWith('name', { ascending: true })
    expect(rangeMock).toHaveBeenCalledWith(0, 9)
    expect(result).toEqual({ data: [mockVoter], count: 1 })
  })

  it('fetchVoterByNumber should return voter when found', async () => {
    const maybeSingleMock = vi.fn().mockResolvedValue({ data: mockVoter, error: null })
    const eqMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock })
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock })
    fromMock.mockReturnValue({ select: selectMock })

    const { fetchVoterByNumber } = useElectionVoters()
    const result = await fetchVoterByNumber('100599')

    expect(fromMock).toHaveBeenCalledWith('election_voters')
    expect(eqMock).toHaveBeenCalledWith('voter_registration_number', '100599')
    expect(result).toEqual(mockVoter)
  })

  it('fetchVoterByNumber should return null when not found', async () => {
    const maybeSingleMock = vi.fn().mockResolvedValue({ data: null, error: null })
    const eqMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock })
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock })
    fromMock.mockReturnValue({ select: selectMock })

    const { fetchVoterByNumber } = useElectionVoters()
    const result = await fetchVoterByNumber('999999')

    expect(result).toBeNull()
  })

  it('generateNextVoterNumber should calculate next sequence from latest voter registration numbers', async () => {
    const limitMock = vi.fn().mockResolvedValue({
      data: [{ voter_registration_number: '100599' }, { voter_registration_number: '100600' }],
      error: null,
    })
    const orderMock = vi.fn().mockReturnValue({ limit: limitMock })
    const selectMock = vi.fn().mockReturnValue({ order: orderMock })
    fromMock.mockReturnValue({ select: selectMock })

    const { generateNextVoterNumber } = useElectionVoters()
    const nextNumber = await generateNextVoterNumber()

    expect(nextNumber).toBe('100601')
  })

  it('checkVoterElectionStatus should return voter status and attendance', async () => {
    // 1st call: fetch voter
    const voterMaybeSingle = vi.fn().mockResolvedValue({ data: mockVoter, error: null })
    const voterEq = vi.fn().mockReturnValue({ maybeSingle: voterMaybeSingle })
    const voterSelect = vi.fn().mockReturnValue({ eq: voterEq })

    // 2nd call: fetch attendance
    const attMaybeSingle = vi.fn().mockResolvedValue({
      data: { id: 'att-1', voted_at: '2026-10-24T13:00:00Z' },
      error: null,
    })
    const attEq2 = vi.fn().mockReturnValue({ maybeSingle: attMaybeSingle })
    const attEq1 = vi.fn().mockReturnValue({ eq: attEq2 })
    const attSelect = vi.fn().mockReturnValue({ eq: attEq1 })

    fromMock.mockImplementation((table: string) => {
      if (table === 'election_voters') return { select: voterSelect }
      if (table === 'election_voter_attendance') return { select: attSelect }
      return {}
    })

    const { checkVoterElectionStatus } = useElectionVoters()
    const status = await checkVoterElectionStatus('elec-1', '100599')

    expect(status.voter).toEqual(mockVoter)
    expect(status.hasVoted).toBe(true)
    expect(status.attendedAt).toBe('2026-10-24T13:00:00Z')
  })

  it('createVoter should insert record and log action', async () => {
    const singleMock = vi.fn().mockResolvedValue({ data: mockVoter, error: null })
    const selectMock = vi.fn().mockReturnValue({ single: singleMock })
    const insertMock = vi.fn().mockReturnValue({ select: selectMock })
    fromMock.mockReturnValue({ insert: insertMock })

    const { createVoter } = useElectionVoters()
    const created = await createVoter({
      voter_registration_number: '100599',
      name: 'Bruno Alves Alves',
      is_active: true,
    })

    expect(fromMock).toHaveBeenCalledWith('election_voters')
    expect(insertMock).toHaveBeenCalledWith({
      voter_registration_number: '100599',
      name: 'Bruno Alves Alves',
      is_active: true,
    })
    expect(logActionMock).toHaveBeenCalledWith(
      'ELECTION_VOTER_CREATE',
      expect.stringContaining('Bruno Alves Alves'),
    )
    expect(created).toEqual(mockVoter)
  })

  it('updateVoter should update record and log action', async () => {
    const updatedVoter = { ...mockVoter, name: 'Bruno Updated' }
    const singleMock = vi.fn().mockResolvedValue({ data: updatedVoter, error: null })
    const selectMock = vi.fn().mockReturnValue({ single: singleMock })
    const eqMock = vi.fn().mockReturnValue({ select: selectMock })
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock })
    fromMock.mockReturnValue({ update: updateMock })

    const { updateVoter } = useElectionVoters()
    const updated = await updateVoter(mockVoter.id, { name: 'Bruno Updated' })

    expect(fromMock).toHaveBeenCalledWith('election_voters')
    expect(eqMock).toHaveBeenCalledWith('id', mockVoter.id)
    expect(logActionMock).toHaveBeenCalledWith(
      'ELECTION_VOTER_UPDATE',
      expect.stringContaining('Bruno Updated'),
    )
    expect(updated.name).toBe('Bruno Updated')
  })

  it('toggleVoterActive should flip is_active status', async () => {
    const toggledVoter = { ...mockVoter, is_active: false }
    const singleMock = vi.fn().mockResolvedValue({ data: toggledVoter, error: null })
    const selectMock = vi.fn().mockReturnValue({ single: singleMock })
    const eqMock = vi.fn().mockReturnValue({ select: selectMock })
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock })
    fromMock.mockReturnValue({ update: updateMock })

    const { toggleVoterActive } = useElectionVoters()
    const result = await toggleVoterActive(mockVoter.id, true)

    expect(fromMock).toHaveBeenCalledWith('election_voters')
    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({ is_active: false }))
    expect(result.is_active).toBe(false)
  })

  it('deleteVoter should remove record and log action', async () => {
    const eqMock = vi.fn().mockResolvedValue({ error: null })
    const deleteMock = vi.fn().mockReturnValue({ eq: eqMock })
    fromMock.mockReturnValue({ delete: deleteMock })

    const { deleteVoter } = useElectionVoters()
    await deleteVoter(mockVoter.id)

    expect(fromMock).toHaveBeenCalledWith('election_voters')
    expect(deleteMock).toHaveBeenCalled()
    expect(eqMock).toHaveBeenCalledWith('id', mockVoter.id)
    expect(logActionMock).toHaveBeenCalledWith(
      'ELECTION_VOTER_DELETE',
      expect.stringContaining(mockVoter.id),
    )
  })
})
