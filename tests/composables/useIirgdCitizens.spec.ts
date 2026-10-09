import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useIirgdCitizens } from '~/composables/useIirgdCitizens'

const supabaseFromMock: Record<string, unknown> = {}

// Emulate a chainable object that resolves at the end
const resolveMock = {
  then: (resolve: (value: unknown) => void) =>
    resolve({
      data: [{ id: 'cit-1', name: 'John' }],
      count: 1,
      error: null,
    }),
}

Object.assign(supabaseFromMock, {
  select: vi.fn(() => supabaseFromMock),
  order: vi.fn(() => supabaseFromMock),
  eq: vi.fn(() => supabaseFromMock),
  or: vi.fn(() => supabaseFromMock),
  range: vi.fn(() => resolveMock),
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
  })

  it('fetchCitizens should return paginated and sorted data', async () => {
    const { fetchCitizens } = useIirgdCitizens()
    const result = await fetchCitizens({ page: 1, itemsPerPage: 10 })
    expect(supabaseMock.from).toHaveBeenCalledWith('iirgd_citizens')
    expect(supabaseFromMock.range).toHaveBeenCalledWith(0, 9)
    expect(result).toEqual({ data: [{ id: 'cit-1', name: 'John' }], count: 1 })
  })

  it('fetchCitizenById should return citizen and sort demands by newest', async () => {
    const { fetchCitizenById } = useIirgdCitizens()
    const result = await fetchCitizenById('cit-1')

    expect(supabaseFromMock.eq).toHaveBeenCalledWith('id', 'cit-1')
    expect(result.id).toBe('cit-1')
    // Demands should be sorted newest first
    expect(result.iirgd_demands[0].id).toBe('2')
    expect(result.iirgd_demands[1].id).toBe('1')
  })
})
