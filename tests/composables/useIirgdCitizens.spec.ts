import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useIirgdCitizens } from '~/composables/useIirgdCitizens'

const supabaseFromMock: Record<string, unknown> = {}
Object.assign(supabaseFromMock, {
  select: vi.fn(() => supabaseFromMock),
  order: vi.fn(() => supabaseFromMock),
  eq: vi.fn(() => supabaseFromMock),
  single: vi.fn().mockResolvedValue({
    data: {
      id: 'cit-1',
      iirgd_demands: [
        { id: '1', created_at: '2026-01-01' },
        { id: '2', created_at: '2026-02-01' },
      ],
    },
    error: null,
  }),
})

const supabaseMock = {
  from: vi.fn(() => supabaseFromMock),
}

mockNuxtImport('useSupabaseClient', () => () => supabaseMock)

describe('useIirgdCitizens', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    supabaseFromMock.order.mockResolvedValue({ data: [{ id: 'cit-1', name: 'John' }], error: null })
  })

  it('fetchCitizens should return sorted data', async () => {
    const { fetchCitizens } = useIirgdCitizens()
    const result = await fetchCitizens()
    expect(supabaseMock.from).toHaveBeenCalledWith('iirgd_citizens')
    expect(result).toEqual([{ id: 'cit-1', name: 'John' }])
  })

  it('fetchCitizenById should return citizen and sort demands by newest', async () => {
    const { fetchCitizenById } = useIirgdCitizens()
    const result = await fetchCitizenById('cit-1')

    expect(supabaseFromMock.eq).toHaveBeenCalledWith('id', 'cit-1')
    expect(result.id).toBe('cit-1')
    // Demands should be sorted newest first (2026-02-01 before 2026-01-01)
    expect(result.iirgd_demands[0].id).toBe('2')
    expect(result.iirgd_demands[1].id).toBe('1')
  })
})
