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
  })

  it('fetchProductById should map units with their aliases', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'products') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'prod-1', name: 'Papel', created_by: null },
                error: null,
              }),
            }),
          }),
        }
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [
              {
                id: 'pu-1',
                measurement_units: {
                  id: 'unit-1',
                  name: 'Pacote 100 Unidade',
                  is_pending: false,
                  is_active: true,
                  measurement_unit_alias_links: [
                    { alias: { id: 'a1', code: 36, name: 'Cento' } },
                    { alias: null },
                  ],
                },
              },
            ],
            error: null,
          }),
        }),
      }
    })

    const { fetchProductById } = useProducts()
    const result = await fetchProductById('prod-1')

    expect(result.units).toHaveLength(1)
    expect(result.units[0]!.name).toBe('Pacote 100 Unidade')
    expect(result.units[0]!.aliases).toEqual([{ id: 'a1', code: 36, name: 'Cento' }])
  })

  it('fetchProductDemands should return demands that use the product', async () => {
    const mockEq = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'dp-1',
          quantity: 5,
          unit_name_snapshot: 'Caixa',
          demands: {
            id: 'dem-1',
            name: 'Compra de Papel',
            status: 'completed',
            process_number: '042/2026',
            dispute_date: '2026-06-15T14:00:00Z',
          },
        },
        { id: 'dp-2', quantity: 1, unit_name_snapshot: null, demands: null },
      ],
      error: null,
    })
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({ eq: mockEq }),
    })

    const { fetchProductDemands } = useProducts()
    const result = await fetchProductDemands('prod-1')

    expect(mockSupabase.from).toHaveBeenCalledWith('demand_products')
    expect(mockEq).toHaveBeenCalledWith('product_id', 'prod-1')
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      item_id: 'dp-1',
      id: 'dem-1',
      name: 'Compra de Papel',
      quantity: 5,
      unit_name: 'Caixa',
    })
  })

  it('createProduct should insert product and log action', async () => {
    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
    })

    const { createProduct } = useProducts()
    await createProduct({ name: 'Prod B', is_active: true } as unknown as Parameters<
      typeof createProduct
    >[0])

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
