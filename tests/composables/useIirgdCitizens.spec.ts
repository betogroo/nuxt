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
mockNuxtImport('useSupabaseUser', () => () => ({ value: { id: 'test-user-id' } }))

const logActionMock = vi.fn()
mockNuxtImport('useLogger', () => () => ({ logAction: logActionMock }))

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

    expect(supabaseMock.from).toHaveBeenCalledWith('iirgd_citizens')
    expect(supabaseFromMock.select).toHaveBeenCalledWith('*, iirgd_demands(*), profiles(name)')
    expect(supabaseFromMock.eq).toHaveBeenCalledWith('id', 'cit-1')
    expect(result.id).toBe('cit-1')
    // Demands should be sorted newest first
    expect(result.iirgd_demands[0].id).toBe('2')
    expect(result.iirgd_demands[1].id).toBe('1')
  })

  it('createCitizen should insert citizen with created_by and logAction', async () => {
    supabaseFromMock.insert = vi.fn().mockReturnValue(supabaseFromMock)
    supabaseFromMock.single = vi.fn().mockResolvedValue({
      data: { id: 'cit-new', name: 'Jane Doe' },
      error: null,
    })

    const { createCitizen } = useIirgdCitizens()
    const result = await createCitizen({ name: 'Jane Doe', rg: '12345678X', cpf: '00011122233' })

    expect(supabaseMock.from).toHaveBeenCalledWith('iirgd_citizens')
    expect(supabaseFromMock.insert).toHaveBeenCalledWith([
      {
        name: 'Jane Doe',
        rg: '12345678X',
        cpf: '00011122233',
        created_by: 'test-user-id',
      },
    ])
    expect(logActionMock).toHaveBeenCalledWith(
      'CREATE_IIRGD_CITIZEN',
      expect.stringContaining('Jane Doe'),
    )
    expect(result.id).toBe('cit-new')
  })

  it('updateCitizen should update name, cpf, rg and logAction', async () => {
    const updateMock = vi.fn().mockReturnValue(supabaseFromMock)
    supabaseFromMock.update = updateMock
    supabaseFromMock.single = vi.fn().mockResolvedValue({
      data: { id: 'cit-1', name: 'John Updated', cpf: '12345678901', rg: '12345678X' },
      error: null,
    })

    const { updateCitizen } = useIirgdCitizens()
    const result = await updateCitizen('cit-1', {
      name: 'John Updated',
      cpf: '12345678901',
      rg: '12345678X',
    })

    expect(supabaseMock.from).toHaveBeenCalledWith('iirgd_citizens')
    expect(updateMock).toHaveBeenCalledWith({
      name: 'John Updated',
      cpf: '12345678901',
      rg: '12345678X',
    })
    expect(supabaseFromMock.eq).toHaveBeenCalledWith('id', 'cit-1')
    expect(logActionMock).toHaveBeenCalledWith(
      'UPDATE_IIRGD_CITIZEN',
      expect.stringContaining('John Updated'),
    )
    expect(result.name).toBe('John Updated')
  })

  it('updateCitizen should throw customized error on duplicate 23505 code', async () => {
    supabaseFromMock.update = vi.fn().mockReturnValue(supabaseFromMock)
    supabaseFromMock.single = vi.fn().mockResolvedValue({
      data: null,
      error: { code: '23505', message: 'duplicate key' },
    })

    const { updateCitizen } = useIirgdCitizens()
    await expect(
      updateCitizen('cit-1', { name: 'John', cpf: '123', rg: '456' }),
    ).rejects.toThrow('Já existe um cidadão cadastrado com este RG ou CPF.')
  })
})
