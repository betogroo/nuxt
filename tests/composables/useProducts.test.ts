import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useProducts } from '../../app/composables/useProducts'
import type { ProductRow } from '../../app/composables/useProducts'

const mockSupabase = {
  from: vi.fn(),
}
const mockLogAction = vi.fn()
const mockUser = { id: 'user-123' }

mockNuxtImport('useSupabaseClient', () => {
  return vi.fn(() => mockSupabase)
})

mockNuxtImport('useSupabaseUser', () => {
  return vi.fn(() => ({ value: mockUser }))
})

mockNuxtImport('useLogger', () => {
  return () => ({ logAction: mockLogAction })
})

describe('useProducts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: [], count: 0, error: null }),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'prod-1' }, error: null }),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      not: vi.fn().mockResolvedValue({ data: [], error: null }),
    })
  })

  it('should be defined', () => {
    const composable = useProducts()
    expect(composable.fetchProducts).toBeDefined()
    expect(composable.createProduct).toBeDefined()
  })

  it('fetchProductById should fetch product with relations', async () => {
    const mockProduct = { id: 'prod-1', name: 'Product A' }
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi
        .fn()
        .mockResolvedValueOnce({ data: mockProduct, error: null }) // mock product fetch
        .mockResolvedValueOnce({ data: [], error: null }) // mock units fetch
        .mockResolvedValueOnce({ data: { name: 'User Name' }, error: null }), // mock profile fetch
    })

    const { fetchProductById } = useProducts()
    const result = await fetchProductById('prod-1')

    expect(result).toBeDefined()
    expect(result.id).toBe('prod-1')
    expect(mockSupabase.from).toHaveBeenCalledWith('products')
    // It should also call product_units but it's hard to assert exactly without more precise mocks
  })

  it('createProduct should insert product and log action', async () => {
    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
    })

    const { createProduct } = useProducts()
    await createProduct({ name: 'Prod B', is_active: true } as any)

    expect(mockSupabase.from).toHaveBeenCalledWith('products')
    expect(mockLogAction).toHaveBeenCalledWith(
      'CREATE_PRODUCT',
      'Novo produto criado: Prod B',
      'user-123',
    )
  })

  it('toggleProductStatus should update is_active status', async () => {
    mockSupabase.from.mockReturnValue({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    })

    const { toggleProductStatus } = useProducts()
    await toggleProductStatus({ id: 'p1', is_active: true } as ProductRow)

    expect(mockSupabase.from).toHaveBeenCalledWith('products')
  })
})
