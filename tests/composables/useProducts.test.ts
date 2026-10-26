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

  it('fetchProducts should fetch paginated products with expense_natures and product_classes', async () => {
    const selectMock = vi.fn().mockReturnValue({
      order: vi.fn().mockReturnValue({
        range: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [{ id: 'prod-1', name: 'Caneta Azul', is_active: true }],
            count: 1,
            error: null,
          }),
        }),
      }),
    })

    mockSupabase.from.mockReturnValue({
      select: selectMock,
    })

    const { fetchProducts } = useProducts()
    const result = await fetchProducts(1, 10, null, 'active')

    expect(selectMock).toHaveBeenCalledWith(
      '*, expense_natures(id, name), product_classes(id, name)',
      { count: 'exact' },
    )
    expect(result.count).toBe(1)
    expect(result.data).toHaveLength(1)
    expect(result.data[0]?.name).toBe('Caneta Azul')
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

  it('updateProduct should update product and log action', async () => {
    mockSupabase.from.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    })

    const { updateProduct } = useProducts()
    await updateProduct('prod-1', { name: 'Prod Atualizado' } as unknown as Parameters<
      typeof updateProduct
    >[1])

    expect(mockSupabase.from).toHaveBeenCalledWith('products')
    expect(mockLogAction).toHaveBeenCalledWith(
      'UPDATE_PRODUCT',
      'Produto atualizado: Prod Atualizado',
      'user-123',
    )
  })

  it('createProduct and updateProduct throw friendly error on CATMAT or CATBEC duplicates', async () => {
    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockResolvedValue({
        error: {
          code: '23505',
          message: 'duplicate key value violates unique constraint "products_cat_mat_key"',
        },
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          error: {
            code: '23505',
            message: 'duplicate key value violates unique constraint "products_cat_bec_key"',
          },
        }),
      }),
    })

    const { createProduct, updateProduct } = useProducts()

    await expect(
      createProduct({ name: 'Prod Dup', cat_mat: 123 } as unknown as Parameters<
        typeof createProduct
      >[0]),
    ).rejects.toThrow('Já existe um produto cadastrado com este código CATMAT.')

    await expect(
      updateProduct('p1', { name: 'Prod Dup', cat_bec: 456 } as unknown as Parameters<
        typeof updateProduct
      >[1]),
    ).rejects.toThrow('Já existe um produto cadastrado com este código CATBEC.')
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

  it('upsertProductCharacteristic should create pending key when key does not exist and insert characteristic', async () => {
    const insertCharMock = vi.fn().mockResolvedValue({ error: null })
    const insertKeyMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'key-pending-1', name: 'Tipo de Ponta' },
          error: null,
        }),
      }),
    })

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'product_characteristic_keys') {
        return {
          select: vi.fn().mockReturnValue({
            ilike: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
          insert: insertKeyMock,
        }
      }
      if (table === 'product_characteristics') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          }),
          insert: insertCharMock,
        }
      }
      return {}
    })

    const { upsertProductCharacteristic } = useProducts()
    await upsertProductCharacteristic('prod-1', 'Tipo de Ponta', '1.0mm')

    expect(insertKeyMock).toHaveBeenCalledWith({
      name: 'Tipo de Ponta',
      is_active: false,
      is_pending: true,
    })
    expect(insertCharMock).toHaveBeenCalledWith({
      product_id: 'prod-1',
      key_id: 'key-pending-1',
      value: '1.0mm',
    })
    expect(mockLogAction).toHaveBeenCalledWith(
      'CREATE_PENDING_CHARACTERISTIC_KEY',
      expect.stringContaining('Tipo de Ponta'),
      'user-123',
    )
    expect(mockLogAction).toHaveBeenCalledWith(
      'ADD_PRODUCT_CHARACTERISTIC',
      expect.stringContaining('Tipo de Ponta: 1.0mm'),
      'user-123',
    )
  })

  it('upsertProductCharacteristic should update existing characteristic value when key already linked', async () => {
    const updateEqMock = vi.fn().mockResolvedValue({ error: null })
    const updateMock = vi.fn().mockReturnValue({ eq: updateEqMock })

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'product_characteristic_keys') {
        return {
          select: vi.fn().mockReturnValue({
            ilike: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: 'key-cor', name: 'Cor' },
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === 'product_characteristics') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: 'char-existing-1' },
                  error: null,
                }),
              }),
            }),
          }),
          update: updateMock,
        }
      }
      return {}
    })

    const { upsertProductCharacteristic } = useProducts()
    await upsertProductCharacteristic('prod-1', 'Cor', 'Branca')

    expect(updateMock).toHaveBeenCalledWith({ value: 'Branca' })
    expect(updateEqMock).toHaveBeenCalledWith('id', 'char-existing-1')
    expect(mockLogAction).toHaveBeenCalledWith(
      'UPDATE_PRODUCT_CHARACTERISTIC',
      expect.stringContaining('Branca'),
      'user-123',
    )
  })

  it('removeProductCharacteristic should delete characteristic and log action', async () => {
    const deleteEqMock = vi.fn().mockResolvedValue({ error: null })
    mockSupabase.from.mockReturnValue({
      delete: vi.fn().mockReturnValue({ eq: deleteEqMock }),
    })

    const { removeProductCharacteristic } = useProducts()
    await removeProductCharacteristic('char-1', 'Cor: Branca')

    expect(mockSupabase.from).toHaveBeenCalledWith('product_characteristics')
    expect(deleteEqMock).toHaveBeenCalledWith('id', 'char-1')
    expect(mockLogAction).toHaveBeenCalledWith(
      'REMOVE_PRODUCT_CHARACTERISTIC',
      expect.stringContaining('Cor: Branca'),
      'user-123',
    )
  })

  it('batchUpsertProductCharacteristics should throw if items array is empty', async () => {
    const { batchUpsertProductCharacteristics } = useProducts()
    await expect(batchUpsertProductCharacteristics('prod-1', [])).rejects.toThrow(
      'Nenhuma característica informada para inserção em lote.',
    )
  })

  it('batchUpsertProductCharacteristics should upsert all items and record a summary log', async () => {
    const insertKeyMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'key-pending-batch', name: 'Material Corpo' },
          error: null,
        }),
      }),
    })
    const insertCharMock = vi.fn().mockResolvedValue({ error: null })

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'product_characteristic_keys') {
        return {
          select: vi.fn().mockReturnValue({
            ilike: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
          insert: insertKeyMock,
        }
      }
      if (table === 'product_characteristics') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          }),
          insert: insertCharMock,
        }
      }
      return {}
    })

    const { batchUpsertProductCharacteristics } = useProducts()
    const result = await batchUpsertProductCharacteristics('prod-1', [
      { key: 'Tipo de escrita', value: 'média' },
      { key: 'Material Corpo', value: 'Poliestireno' },
    ])

    expect(result.count).toBe(2)
    expect(mockLogAction).toHaveBeenCalledWith(
      'BATCH_UPSERT_PRODUCT_CHARACTERISTICS',
      expect.stringContaining('2 características'),
      'user-123',
    )
  })
})
