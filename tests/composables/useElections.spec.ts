import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useElections } from '~/composables/useElections'

const selectMock = vi.fn()
const insertMock = vi.fn()
const updateMock = vi.fn()
const fromMock = vi.fn()
const logActionMock = vi.fn()
const getUserMock = vi.fn()

const supabaseMock = {
  from: fromMock,
  auth: {
    getUser: getUserMock,
  },
}

mockNuxtImport('useSupabaseClient', () => () => supabaseMock)
mockNuxtImport('useLogger', () => () => ({ logAction: logActionMock }))

describe('useElections Composable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getUserMock.mockResolvedValue({ data: { user: { id: 'admin-id' } } })
  })

  it('fetchElections queries non-deleted elections with pagination and filters', async () => {
    const mockData = [
      {
        id: 'e1',
        name: 'Eleição 2026',
        election_date: '2026-10-25T12:00:00Z',
        digits_count: 2,
        is_uppercase: true,
        status: 'released',
        profiles: { name: 'Admin' },
      },
    ]

    const rangeMock = vi.fn().mockResolvedValue({ data: mockData, count: 1, error: null })
    const orderMock = vi.fn().mockReturnValue({ range: rangeMock })
    const inMock = vi.fn().mockReturnValue({ order: orderMock })
    const ilikeMock = vi.fn().mockReturnValue({ in: inMock })
    const isMock = vi.fn().mockReturnValue({ ilike: ilikeMock, order: orderMock })

    selectMock.mockReturnValue({ is: isMock })
    fromMock.mockReturnValue({ select: selectMock })

    const { fetchElections } = useElections()
    const result = await fetchElections({
      page: 1,
      limit: 10,
      search: '2026',
      timeline: 'active',
    })

    expect(fromMock).toHaveBeenCalledWith('elections')
    expect(isMock).toHaveBeenCalledWith('deleted_at', null)
    expect(ilikeMock).toHaveBeenCalledWith('name', '%2026%')
    expect(inMock).toHaveBeenCalledWith('status', ['released', 'tallying'])
    expect(result.data).toHaveLength(1)
    expect(result.data[0].creator_name).toBe('Admin')
    expect(result.count).toBe(1)
  })

  it('fetchElectionMetrics calculates counts for total, active, upcoming and past', async () => {
    selectMock
      .mockReturnValueOnce({ is: vi.fn().mockResolvedValue({ count: 10, error: null }) })
      .mockReturnValueOnce({
        is: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ count: 3, error: null }),
        }),
      })
      .mockReturnValueOnce({
        is: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ count: 1, error: null }),
        }),
      })
      .mockReturnValueOnce({
        is: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ count: 4, error: null }),
        }),
      })
      .mockReturnValueOnce({
        is: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ count: 2, error: null }),
        }),
      })

    fromMock.mockReturnValue({ select: selectMock })

    const { fetchElectionMetrics } = useElections()
    const metrics = await fetchElectionMetrics()

    expect(metrics.total).toBe(10)
    expect(metrics.active).toBe(4) // 3 released + 1 tallying
    expect(metrics.upcoming).toBe(4) // 4 awaiting_release
    expect(metrics.past).toBe(2) // 2 finished
  })

  it('createElection inserts election and logs action', async () => {
    const singleMock = vi.fn().mockResolvedValue({
      data: { id: 'e-new', name: 'Nova Eleição' },
      error: null,
    })
    const selectAfterInsert = vi.fn().mockReturnValue({ single: singleMock })
    insertMock.mockReturnValue({ select: selectAfterInsert })
    fromMock.mockReturnValue({ insert: insertMock })

    const { createElection } = useElections()
    const result = await createElection({
      name: 'Nova Eleição',
      election_date: '2026-11-15T08:00:00Z',
      digits_count: 2,
      is_uppercase: true,
      status: 'awaiting_release',
    })

    expect(fromMock).toHaveBeenCalledWith('elections')
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Nova Eleição',
        digits_count: 2,
        is_uppercase: true,
        status: 'awaiting_release',
        created_by: 'admin-id',
      }),
    )
    expect(logActionMock).toHaveBeenCalledWith(
      'CREATE_ELECTION',
      expect.stringContaining('Nova Eleição'),
    )
    expect(result.id).toBe('e-new')
  })

  it('updateElection updates election and logs action', async () => {
    const singleMock = vi.fn().mockResolvedValue({
      data: { id: 'e-upd', name: 'Eleição Atualizada' },
      error: null,
    })
    const selectAfterUpdate = vi.fn().mockReturnValue({ single: singleMock })
    const eqMock = vi.fn().mockReturnValue({ select: selectAfterUpdate })
    updateMock.mockReturnValue({ eq: eqMock })
    fromMock.mockReturnValue({ update: updateMock })

    const { updateElection } = useElections()
    const result = await updateElection('e-upd', {
      name: 'Eleição Atualizada',
      is_uppercase: false,
    })

    expect(fromMock).toHaveBeenCalledWith('elections')
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Eleição Atualizada',
        is_uppercase: false,
      }),
    )
    expect(eqMock).toHaveBeenCalledWith('id', 'e-upd')
    expect(logActionMock).toHaveBeenCalledWith('UPDATE_ELECTION', expect.stringContaining('e-upd'))
    expect(result.id).toBe('e-upd')
  })

  it('deleteElection performs safe delete by setting deleted_at', async () => {
    const eqMock = vi.fn().mockResolvedValue({ error: null })
    updateMock.mockReturnValue({ eq: eqMock })
    fromMock.mockReturnValue({ update: updateMock })

    const { deleteElection } = useElections()
    await deleteElection('e-del')

    expect(fromMock).toHaveBeenCalledWith('elections')
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        deleted_at: expect.any(String),
      }),
    )
    expect(eqMock).toHaveBeenCalledWith('id', 'e-del')
    expect(logActionMock).toHaveBeenCalledWith(
      'DELETE_ELECTION',
      expect.stringContaining('safe delete'),
    )
  })
})
