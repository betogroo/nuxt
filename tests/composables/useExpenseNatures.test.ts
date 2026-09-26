import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useExpenseNatures } from '~/composables/useExpenseNatures'
import type { ExpenseNatureRow } from '~/composables/useExpenseNatures'

const mockSupabase = {
  from: vi.fn(),
}

const mockLogAction = vi.fn()
const mockUser = { id: 'user-123' }

mockNuxtImport('useSupabaseClient', () => {
  return () => mockSupabase
})

mockNuxtImport('useSupabaseUser', () => {
  return () => ({ value: mockUser })
})

mockNuxtImport('useLogger', () => {
  return () => ({ logAction: mockLogAction })
})

describe('useExpenseNatures', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'new-id' }, error: null }),
      range: vi.fn().mockResolvedValue({ data: [], count: 0, error: null }),
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockResolvedValue({ data: [], error: null }),
      insert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
    })
  })

  it('fetchExpenseNatures should return data', async () => {
    const fakeData = [{ id: '1', name: 'Natureza 1' }]
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: fakeData, error: null }),
    })

    const { fetchExpenseNatures } = useExpenseNatures()
    const result = await fetchExpenseNatures()
    expect(result).toEqual(fakeData)
    expect(mockSupabase.from).toHaveBeenCalledWith('expense_natures')
  })

  it('createExpenseNature should call insert and log action', async () => {
    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: '1', name: 'Natureza 1' }, error: null }),
    })

    const { createExpenseNature } = useExpenseNatures()
    await createExpenseNature({ id: '1', name: 'Natureza 1', is_active: true } as any)

    expect(mockSupabase.from).toHaveBeenCalledWith('expense_natures')
    expect(mockLogAction).toHaveBeenCalledWith(
      'CREATE_EXPENSE_NATURE',
      'Nova natureza de despesa cadastrada: Natureza 1',
      'user-123'
    )
  })

  it('deleteExpenseNature should delete', async () => {
    const fakeNature = { id: '1', is_active: true } as ExpenseNatureRow
    mockSupabase.from.mockReturnValue({
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    })

    const { deleteExpenseNature } = useExpenseNatures()
    await deleteExpenseNature('1')

    expect(mockSupabase.from).toHaveBeenCalledWith('expense_natures')
    // We can't easily assert chained calls without better mock setup, but the function should succeed without throwing
  })
})
