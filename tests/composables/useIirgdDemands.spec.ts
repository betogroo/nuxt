import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useIirgdDemands } from '~/composables/useIirgdDemands'

const supabaseFromMock = {
  select: vi.fn().mockReturnThis(),
  order: vi.fn().mockResolvedValue({ data: [{ id: '1', name: 'Test' }], error: null }),
  insert: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: { id: 'new-id' }, error: null }),
}

const supabaseMock = {
  from: vi.fn(() => supabaseFromMock),
}

mockNuxtImport('useSupabaseClient', () => () => supabaseMock)

const logActionMock = vi.fn()
mockNuxtImport('useLogger', () => () => ({
  logAction: logActionMock,
}))

describe('useIirgdDemands', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetchDemands should return data', async () => {
    const { fetchDemands } = useIirgdDemands()
    const result = await fetchDemands()
    expect(supabaseMock.from).toHaveBeenCalledWith('iirgd_demands')
    expect(result).toEqual([{ id: '1', name: 'Test' }])
  })

  it('createDemand should insert a new demand and log action', async () => {
    const { createDemand } = useIirgdDemands()
    const payload = {
      station_code: '1342-5',
      rg: '00012345-6',
      cpf: '000.000.000-00',
      name: 'John Doe',
    }

    const result = await createDemand(payload)
    expect(supabaseFromMock.insert).toHaveBeenCalledWith([{ ...payload, status: 'Novo' }])
    expect(logActionMock).toHaveBeenCalledWith('create', 'iirgd_demand', 'new-id', null, {
      name: payload.name,
      rg: payload.rg,
    })
    expect(result).toEqual({ id: 'new-id' })
  })
})
