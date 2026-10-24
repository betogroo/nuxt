import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useBallotBoxes } from '~/composables/useBallotBoxes'

const selectMock = vi.fn()
const insertMock = vi.fn()
const updateMock = vi.fn()
const fromMock = vi.fn()
const logActionMock = vi.fn()
const channelMock = vi.fn()
const removeChannelMock = vi.fn()
const getUserMock = vi.fn()

const supabaseMock = {
  from: fromMock,
  channel: channelMock,
  removeChannel: removeChannelMock,
  auth: {
    getUser: getUserMock,
  },
}

mockNuxtImport('useSupabaseClient', () => () => supabaseMock)
mockNuxtImport('useLogger', () => () => ({ logAction: logActionMock }))

describe('useBallotBoxes Composable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getUserMock.mockResolvedValue({ data: { user: { id: 'user-admin-1' } } })
  })

  it('fetchBallotBoxes queries active ballot boxes for given election ordered by created_at', async () => {
    const mockList = [
      { id: 'b1', name: 'Urna 01', is_active: false },
      { id: 'b2', name: 'Urna 02', is_active: true },
    ]

    const orderMock = vi.fn().mockResolvedValue({ data: mockList, error: null })
    const isMock = vi.fn().mockReturnValue({ order: orderMock })
    const eqMock = vi.fn().mockReturnValue({ is: isMock })
    selectMock.mockReturnValue({ eq: eqMock })
    fromMock.mockReturnValue({ select: selectMock })

    const { fetchBallotBoxes } = useBallotBoxes()
    const result = await fetchBallotBoxes('elec-1')

    expect(fromMock).toHaveBeenCalledWith('ballot_boxes')
    expect(eqMock).toHaveBeenCalledWith('election_id', 'elec-1')
    expect(isMock).toHaveBeenCalledWith('deleted_at', null)
    expect(orderMock).toHaveBeenCalledWith('created_at', { ascending: true })
    expect(result).toHaveLength(2)
    expect(result[0].name).toBe('Urna 01')
  })

  it('fetchBallotBoxById queries a specific ballot box', async () => {
    const mockBox = { id: 'b1', name: 'Urna 01', is_active: true }
    const maybeSingleMock = vi.fn().mockResolvedValue({ data: mockBox, error: null })
    const isMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock })
    const eqMock = vi.fn().mockReturnValue({ is: isMock })
    selectMock.mockReturnValue({ eq: eqMock })
    fromMock.mockReturnValue({ select: selectMock })

    const { fetchBallotBoxById } = useBallotBoxes()
    const result = await fetchBallotBoxById('b1')

    expect(fromMock).toHaveBeenCalledWith('ballot_boxes')
    expect(eqMock).toHaveBeenCalledWith('id', 'b1')
    expect(result).toEqual(mockBox)
  })

  it('createBallotBox inserts a new ballot box with is_active = false and logs action', async () => {
    const singleMock = vi.fn().mockResolvedValue({
      data: { id: 'b-new', name: 'Urna Nova', is_active: false },
      error: null,
    })
    const selectAfterInsert = vi.fn().mockReturnValue({ single: singleMock })
    insertMock.mockReturnValue({ select: selectAfterInsert })
    fromMock.mockReturnValue({ insert: insertMock })

    const { createBallotBox } = useBallotBoxes()
    const result = await createBallotBox({
      election_id: 'elec-1',
      name: 'Urna Nova',
      device_info: 'Tablet Samsung',
    })

    expect(fromMock).toHaveBeenCalledWith('ballot_boxes')
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        election_id: 'elec-1',
        name: 'Urna Nova',
        device_info: 'Tablet Samsung',
        is_active: false,
        created_by: 'user-admin-1',
      }),
    )
    expect(logActionMock).toHaveBeenCalledWith(
      'CREATE_BALLOT_BOX',
      expect.stringContaining('Urna Nova'),
    )
    expect(result.id).toBe('b-new')
    expect(result.is_active).toBe(false)
  })

  it('updateBallotBox updates ballot box details and logs action', async () => {
    const singleMock = vi.fn().mockResolvedValue({
      data: { id: 'b1', name: 'Urna Atualizada', device_info: 'PC Sala 2' },
      error: null,
    })
    const selectAfterUpdate = vi.fn().mockReturnValue({ single: singleMock })
    const eqMock = vi.fn().mockReturnValue({ select: selectAfterUpdate })
    updateMock.mockReturnValue({ eq: eqMock })
    fromMock.mockReturnValue({ update: updateMock })

    const { updateBallotBox } = useBallotBoxes()
    const result = await updateBallotBox('b1', {
      name: 'Urna Atualizada',
      device_info: 'PC Sala 2',
    })

    expect(fromMock).toHaveBeenCalledWith('ballot_boxes')
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Urna Atualizada',
        device_info: 'PC Sala 2',
      }),
    )
    expect(eqMock).toHaveBeenCalledWith('id', 'b1')
    expect(logActionMock).toHaveBeenCalledWith('UPDATE_BALLOT_BOX', expect.stringContaining('b1'))
    expect(result.name).toBe('Urna Atualizada')
  })

  it('toggleBallotBoxStatus activates or deactivates ballot box', async () => {
    const singleMock = vi.fn().mockResolvedValue({
      data: { id: 'b1', name: 'Urna 01', is_active: true },
      error: null,
    })
    const selectAfterUpdate = vi.fn().mockReturnValue({ single: singleMock })
    const eqMock = vi.fn().mockReturnValue({ select: selectAfterUpdate })
    updateMock.mockReturnValue({ eq: eqMock })
    fromMock.mockReturnValue({ update: updateMock })

    const { toggleBallotBoxStatus } = useBallotBoxes()
    const result = await toggleBallotBoxStatus('b1', true)

    expect(fromMock).toHaveBeenCalledWith('ballot_boxes')
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        is_active: true,
      }),
    )
    expect(logActionMock).toHaveBeenCalledWith(
      'ACTIVATE_BALLOT_BOX',
      expect.stringContaining('ativada'),
    )
    expect(result.is_active).toBe(true)
  })

  it('deleteBallotBox performs safe delete by setting deleted_at', async () => {
    const eqMock = vi.fn().mockResolvedValue({ error: null })
    updateMock.mockReturnValue({ eq: eqMock })
    fromMock.mockReturnValue({ update: updateMock })

    const { deleteBallotBox } = useBallotBoxes()
    await deleteBallotBox('b1')

    expect(fromMock).toHaveBeenCalledWith('ballot_boxes')
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        deleted_at: expect.any(String),
      }),
    )
    expect(eqMock).toHaveBeenCalledWith('id', 'b1')
    expect(logActionMock).toHaveBeenCalledWith(
      'DELETE_BALLOT_BOX',
      expect.stringContaining('safe delete'),
    )
  })

  it('subscribeToBallotBoxes sets up a Realtime channel on ballot_boxes', () => {
    const subscribeMock = vi.fn().mockReturnThis()
    const onMock = vi.fn().mockReturnValue({ subscribe: subscribeMock })
    channelMock.mockReturnValue({ on: onMock })

    const { subscribeToBallotBoxes } = useBallotBoxes()
    const callback = vi.fn()
    subscribeToBallotBoxes('elec-1', callback)

    expect(channelMock).toHaveBeenCalledWith(
      expect.stringContaining('ballot_boxes_election_elec-1'),
    )
    expect(onMock).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        table: 'ballot_boxes',
        filter: 'election_id=eq.elec-1',
      }),
      expect.any(Function),
    )
    expect(subscribeMock).toHaveBeenCalled()
  })

  it('checkVoterAlreadyVoted returns null if voter has not voted yet and attendance row if already voted', async () => {
    const maybeSingleMock = vi.fn().mockResolvedValueOnce({ data: null, error: null })
    const eqVoterMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock })
    const eqElectionMock = vi.fn().mockReturnValue({ eq: eqVoterMock })
    selectMock.mockReturnValue({ eq: eqElectionMock })
    fromMock.mockReturnValue({ select: selectMock })

    const { checkVoterAlreadyVoted } = useBallotBoxes()
    const notVoted = await checkVoterAlreadyVoted('elec-1', '123456')

    expect(fromMock).toHaveBeenCalledWith('election_voter_attendance')
    expect(eqElectionMock).toHaveBeenCalledWith('election_id', 'elec-1')
    expect(eqVoterMock).toHaveBeenCalledWith('voter_registration_number', '123456')
    expect(notVoted).toBeNull()
  })

  it('releaseBallotBoxForVoter throws error if voter already voted in the election', async () => {
    const maybeSingleMock = vi.fn().mockResolvedValue({
      data: {
        id: 'att-1',
        election_id: 'elec-1',
        voter_registration_number: '999888',
      },
      error: null,
    })
    const eqVoterMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock })
    const eqElectionMock = vi.fn().mockReturnValue({ eq: eqVoterMock })
    selectMock.mockReturnValue({ eq: eqElectionMock })
    fromMock.mockReturnValue({ select: selectMock })

    const { releaseBallotBoxForVoter } = useBallotBoxes()

    await expect(
      releaseBallotBoxForVoter({
        electionId: 'elec-1',
        ballotBoxId: 'box-1',
        voterRegistrationNumber: '999888',
      }),
    ).rejects.toThrow('já votou nesta eleição')
  })

  it('releaseBallotBoxForVoter records attendance and activates ballot box when voter has not voted yet', async () => {
    // 1. checkVoterAlreadyVoted returns null
    const maybeSingleMock = vi.fn().mockResolvedValue({ data: null, error: null })
    const eqVoterMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock })
    const eqElectionMock = vi.fn().mockReturnValue({ eq: eqVoterMock })
    const selectAttendanceMock = vi.fn().mockReturnValue({ eq: eqElectionMock })

    // 2. insert into election_voter_attendance
    const singleInsertMock = vi.fn().mockResolvedValue({
      data: {
        id: 'att-new',
        election_id: 'elec-1',
        ballot_box_id: 'box-1',
        voter_registration_number: '777111',
      },
      error: null,
    })
    const selectAfterInsertMock = vi.fn().mockReturnValue({ single: singleInsertMock })
    const insertAttendanceMock = vi.fn().mockReturnValue({ select: selectAfterInsertMock })

    // 3. toggleBallotBoxStatus update on ballot_boxes
    const singleBoxMock = vi.fn().mockResolvedValue({
      data: { id: 'box-1', is_active: true },
      error: null,
    })
    const selectAfterUpdateMock = vi.fn().mockReturnValue({ single: singleBoxMock })
    const eqBoxMock = vi.fn().mockReturnValue({ select: selectAfterUpdateMock })
    const updateBoxMock = vi.fn().mockReturnValue({ eq: eqBoxMock })

    fromMock.mockImplementation((table: string) => {
      if (table === 'election_voter_attendance') {
        return {
          select: selectAttendanceMock,
          insert: insertAttendanceMock,
        }
      }
      if (table === 'ballot_boxes') {
        return {
          update: updateBoxMock,
        }
      }
      return {}
    })

    const { releaseBallotBoxForVoter } = useBallotBoxes()
    const result = await releaseBallotBoxForVoter({
      electionId: 'elec-1',
      ballotBoxId: 'box-1',
      voterRegistrationNumber: '777111',
    })

    expect(insertAttendanceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        election_id: 'elec-1',
        ballot_box_id: 'box-1',
        voter_registration_number: '777111',
      }),
    )
    expect(updateBoxMock).toHaveBeenCalledWith(
      expect.objectContaining({
        is_active: true,
      }),
    )
    expect(logActionMock).toHaveBeenCalledWith(
      'RELEASE_BALLOT_BOX_FOR_VOTER',
      expect.stringContaining('777111'),
    )
    expect(result.voter_registration_number).toBe('777111')
  })
})
