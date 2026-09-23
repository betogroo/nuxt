import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

import { useCategories } from '~/composables/useCategories'
import type { CategoryRow } from '~/composables/useCategories'

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

describe('useCategories', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: [], count: 0, error: null }),
      eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      not: vi.fn().mockResolvedValue({ data: [], error: null }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'new-id' }, error: null }),
        }),
      }),
      update: vi.fn().mockReturnThis(),
    })
  })

  it('fetchCategories should return data and count', async () => {
    const mockData = [{ id: '1', name: 'Alimentos' }]

    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: mockData, count: 1, error: null }),
    })

    const { fetchCategories } = useCategories()
    const result = await fetchCategories(1, 10)

    expect(mockSupabase.from).toHaveBeenCalledWith('product_categories')
    expect(result).toEqual({ data: mockData, count: 1 })
  })

  it('fetchAllActiveCategories should return only active categories', async () => {
    const mockData = [{ id: '1', name: 'Alimentos' }]
    const mockEq = vi.fn().mockReturnThis()
    const mockOrder = vi.fn().mockResolvedValue({ data: mockData, error: null })

    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: mockEq,
      order: mockOrder,
    })

    const { fetchAllActiveCategories } = useCategories()
    const result = await fetchAllActiveCategories()

    expect(mockEq).toHaveBeenCalledWith('is_active', true)
    expect(result).toEqual(mockData)
  })

  it('fetchPendingSuggestions should group suggestions correctly', async () => {
    const mockData = [
      { suggested_category: 'Papelaria' },
      { suggested_category: 'Papelaria' },
      { suggested_category: 'Limpeza' },
    ]

    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      not: vi.fn().mockResolvedValue({ data: mockData, error: null }),
    })

    const { fetchPendingSuggestions } = useCategories()
    const result = await fetchPendingSuggestions()

    expect(result).toEqual([
      { name: 'Papelaria', count: 2 },
      { name: 'Limpeza', count: 1 },
    ])
  })

  it('createCategory should insert and log', async () => {
    const mockInsert = vi.fn().mockResolvedValue({ error: null })
    mockSupabase.from.mockReturnValueOnce({
      insert: mockInsert,
    })

    const { createCategory } = useCategories()
    await createCategory('Bebidas', true)

    expect(mockInsert).toHaveBeenCalledWith({ name: 'Bebidas', is_active: true })
    expect(mockLogAction).toHaveBeenCalledWith(
      'CREATE_CATEGORY',
      'Nova categoria criada: Bebidas',
      'user-123',
    )
  })

  it('updateCategory should update and log', async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: null })
    mockSupabase.from.mockReturnValueOnce({
      update: vi.fn().mockReturnThis(),
      eq: mockEq,
    })

    const { updateCategory } = useCategories()
    await updateCategory('cat-1', 'Carnes', false)

    expect(mockEq).toHaveBeenCalledWith('id', 'cat-1')
    expect(mockLogAction).toHaveBeenCalledWith(
      'UPDATE_CATEGORY',
      'Categoria atualizada: Carnes',
      'user-123',
    )
  })

  it('resolveSuggestion with new mode should create category and update products', async () => {
    // We need to carefully mock two from() calls: product_categories and products
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'product_categories') {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: 'new-cat-id' }, error: null }),
            }),
          }),
        }
      }
      if (table === 'products') {
        return {
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ error: null }),
        }
      }
    })

    const { resolveSuggestion } = useCategories()
    await resolveSuggestion('Bebidas Geladas', 'new', 'Bebidas', null)

    expect(mockLogAction).toHaveBeenCalledWith(
      'RESOLVE_SUGGESTION',
      'Sugestão "Bebidas Geladas" resolvida',
      'user-123',
    )
  })

  it('toggleCategoryStatus should update status and log', async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: null })
    mockSupabase.from.mockReturnValueOnce({
      update: vi.fn().mockReturnThis(),
      eq: mockEq,
    })

    const { toggleCategoryStatus } = useCategories()
    await toggleCategoryStatus({ id: 'cat-2', name: 'Lanches', is_active: true } as CategoryRow)

    expect(mockEq).toHaveBeenCalledWith('id', 'cat-2')
    expect(mockLogAction).toHaveBeenCalledWith(
      'TOGGLE_CATEGORY_STATUS',
      'Categoria Lanches alterada para INATIVO',
      'user-123',
    )
  })
})
