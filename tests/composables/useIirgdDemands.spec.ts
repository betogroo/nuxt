import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useIirgdDemands } from '~/composables/useIirgdDemands'

const supabaseFromMock: Record<string, unknown> = {}
Object.assign(supabaseFromMock, {
  select: vi.fn(() => supabaseFromMock),
  order: vi.fn(() => supabaseFromMock),
  insert: vi.fn(() => supabaseFromMock),
  update: vi.fn(() => supabaseFromMock),
  eq: vi.fn(() => supabaseFromMock),
  not: vi.fn(() => supabaseFromMock),
  or: vi.fn(() => supabaseFromMock),
  single: vi.fn().mockResolvedValue({ data: { id: 'new-id' }, error: null }),
})

const supabaseMock = {
  from: vi.fn(() => supabaseFromMock),
}

mockNuxtImport('useSupabaseClient', () => () => supabaseMock)
mockNuxtImport('useSupabaseUser', () => () => ({ value: { id: 'test-user-id' } }))

const logActionMock = vi.fn()
mockNuxtImport('useLogger', () => () => ({
  logAction: logActionMock,
}))

describe('useIirgdDemands', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    supabaseFromMock.order.mockResolvedValue({ data: [{ id: '1', name: 'Test' }], error: null })
  })

  it('fetchDemands should return data', async () => {
    const { fetchDemands } = useIirgdDemands()
    const result = await fetchDemands()
    expect(supabaseMock.from).toHaveBeenCalledWith('iirgd_demands')
    expect(result).toEqual([{ id: '1', name: 'Test' }])
  })

  it('createDemand should check citizen, create citizen if not exists, create demand and log action', async () => {
    // Mock the `or` call for checking existing citizen to return empty
    supabaseFromMock.or.mockResolvedValueOnce({ data: [], error: null })
    // Mock the insert for citizen
    supabaseFromMock.single.mockResolvedValueOnce({ data: { id: 'cit-123' }, error: null })
    // Mock the insert for demand
    supabaseFromMock.single.mockResolvedValueOnce({ data: { id: 'dem-123' }, error: null })

    const { createDemand } = useIirgdDemands()
    const payload = {
      station_code: '1342-5',
      rg: '00012345-6',
      cpf: '000.000.000-00',
      name: 'John Doe',
      observation: 'Obs',
    }

    const result = await createDemand(payload)

    // Checked if citizen exists
    expect(supabaseMock.from).toHaveBeenCalledWith('iirgd_citizens')
    expect(supabaseFromMock.or).toHaveBeenCalledWith('rg.eq.00012345-6,cpf.eq.000.000.000-00')

    // Inserted citizen
    expect(supabaseFromMock.insert).toHaveBeenCalledWith([
      { name: 'John Doe', rg: '00012345-6', cpf: '000.000.000-00' },
    ])

    // Inserted demand
    expect(supabaseMock.from).toHaveBeenCalledWith('iirgd_demands')
    expect(supabaseFromMock.insert).toHaveBeenCalledWith([
      {
        citizen_id: 'cit-123',
        station_code: '1342-5',
        observation: 'Obs',
        status: 'new',
      },
    ])

    expect(logActionMock).toHaveBeenCalledWith(
      'CREATE_IIRGD_DEMAND',
      `Nova demanda IIRGD criada para John Doe (Posto: 1342-5)`,
    )
    expect(result).toEqual({ id: 'dem-123' })
  })

  it('fetchDemandById should return a single demand', async () => {
    supabaseFromMock.single.mockResolvedValueOnce({ data: { id: 'new-id' }, error: null })
    const { fetchDemandById } = useIirgdDemands()
    const result = await fetchDemandById('123')

    expect(supabaseMock.from).toHaveBeenCalledWith('iirgd_demands')
    expect(supabaseFromMock.eq).toHaveBeenCalledWith('id', '123')
    expect(result).toEqual({ id: 'new-id' })
  })

  it('updateDemand should update a demand and log action', async () => {
    supabaseFromMock.single.mockResolvedValueOnce({ data: { id: '123' }, error: null })

    const { updateDemand } = useIirgdDemands()
    const result = await updateDemand('123', { status: 'Concluído' })

    expect(supabaseFromMock.update).toHaveBeenCalledWith({ status: 'Concluído' })
    expect(supabaseFromMock.eq).toHaveBeenCalledWith('id', '123')
    expect(logActionMock).toHaveBeenCalledWith(
      'UPDATE_IIRGD_DEMAND',
      'Demanda IIRGD atualizada: ID 123',
    )
    expect(result).toEqual({ id: '123' })
  })
})
