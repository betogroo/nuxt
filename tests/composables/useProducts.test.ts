import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useProducts } from '../../app/composables/useProducts'
import type { ProductRow } from '../../app/composables/useProducts'

const mockSupabase = {
  from: vi.fn(),
}
const mockLogAction = vi.fn()
const mockUser = { id: 'user-123' }
const mockEnsureBrand = vi.fn().mockResolvedValue({ id: 'brand-1', name: 'BIC' })

mockNuxtImport('useSupabaseClient', () => {
  return vi.fn(() => mockSupabase)
})

mockNuxtImport('useSupabaseUser', () => {
  return vi.fn(() => ({ value: mockUser }))
})

mockNuxtImport('useLogger', () => {
  return () => ({ logAction: mockLogAction })
})

mockNuxtImport('useBrands', () => () => ({
  ensureBrand: mockEnsureBrand,
}))

describe('useProducts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const mockBuilder: Record<string, unknown> = {}
    mockBuilder.select = vi.fn().mockReturnValue(mockBuilder)
    mockBuilder.order = vi.fn().mockReturnValue(mockBuilder)
    mockBuilder.range = vi.fn().mockResolvedValue({ data: [], count: 0, error: null })
    mockBuilder.eq = vi.fn().mockReturnValue(mockBuilder)
    mockBuilder.single = vi.fn().mockResolvedValue({ data: { id: 'prod-1' }, error: null })
    mockBuilder.insert = vi.fn().mockReturnValue(mockBuilder)
    mockBuilder.update = vi.fn().mockReturnValue(mockBuilder)
    mockBuilder.delete = vi.fn().mockReturnValue(mockBuilder)
    mockBuilder.not = vi.fn().mockResolvedValue({ data: [], error: null })
    mockBuilder.then = (resolve: (val: unknown) => void) => resolve({ data: [], error: null })

    mockSupabase.from.mockReturnValue(mockBuilder)
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
      '*, expense_natures(id, name), product_classes(id, name), product_keywords(id, keyword)',
      { count: 'exact' },
    )
    expect(result.count).toBe(1)
    expect(result.data).toHaveLength(1)
    expect(result.data[0]?.name).toBe('Caneta Azul')
  })

  it('fetchProducts should apply ilike filter when text searchQuery is provided', async () => {
    const ilikeMock = vi.fn().mockResolvedValue({
      data: [{ id: 'prod-1', name: 'Caneta Esferográfica', is_active: true }],
      count: 1,
      error: null,
    })
    const eqMock = vi.fn().mockReturnValue({
      ilike: ilikeMock,
    })
    const rangeMock = vi.fn().mockReturnValue({
      eq: eqMock,
    })
    const orderMock = vi.fn().mockReturnValue({
      range: rangeMock,
    })
    const selectMock = vi.fn().mockReturnValue({
      order: orderMock,
    })

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'product_keywords') {
        return {
          select: vi.fn().mockReturnValue({
            ilike: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }
      }
      return {
        select: selectMock,
      }
    })

    const { fetchProducts } = useProducts()
    const result = await fetchProducts(1, 10, null, 'active', 'Caneta')

    expect(eqMock).toHaveBeenCalledWith('is_active', true)
    expect(ilikeMock).toHaveBeenCalledWith('name', '%Caneta%')
    expect(result.data).toHaveLength(1)
  })

  it('fetchProducts should search by keyword and combine product IDs when matches found', async () => {
    const orMock = vi.fn().mockResolvedValue({
      data: [{ id: 'prod-2', name: 'Caneta Gel', is_active: true }],
      count: 1,
      error: null,
    })
    const eqMock = vi.fn().mockReturnValue({
      or: orMock,
    })
    const rangeMock = vi.fn().mockReturnValue({
      eq: eqMock,
    })
    const orderMock = vi.fn().mockReturnValue({
      range: rangeMock,
    })
    const selectMock = vi.fn().mockReturnValue({
      order: orderMock,
    })

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'product_keywords') {
        return {
          select: vi.fn().mockReturnValue({
            ilike: vi.fn().mockResolvedValue({
              data: [{ product_id: 'prod-2' }],
              error: null,
            }),
          }),
        }
      }
      return {
        select: selectMock,
      }
    })

    const { fetchProducts } = useProducts()
    const result = await fetchProducts(1, 10, null, 'active', 'Gel')

    expect(eqMock).toHaveBeenCalledWith('is_active', true)
    expect(orMock).toHaveBeenCalledWith('name.ilike.%Gel%,id.in.(prod-2)')
    expect(result.data).toHaveLength(1)
  })

  it('fetchProducts should apply or filter across name, cat_mat, and cat_bec when numeric searchQuery is provided', async () => {
    const orMock = vi.fn().mockResolvedValue({
      data: [{ id: 'prod-1', name: 'Papel A4', cat_mat: 12345, is_active: true }],
      count: 1,
      error: null,
    })
    const eqMock = vi.fn().mockReturnValue({
      or: orMock,
    })
    const rangeMock = vi.fn().mockReturnValue({
      eq: eqMock,
    })
    const orderMock = vi.fn().mockReturnValue({
      range: rangeMock,
    })
    const selectMock = vi.fn().mockReturnValue({
      order: orderMock,
    })

    mockSupabase.from.mockReturnValue({
      select: selectMock,
    })

    const { fetchProducts } = useProducts()
    const result = await fetchProducts(1, 10, null, 'active', '12345')

    expect(orMock).toHaveBeenCalledWith('name.ilike.%12345%,cat_mat.eq.12345,cat_bec.eq.12345')
    expect(result.data).toHaveLength(1)
  })

  it('fetchProductById should fetch product with relations', async () => {
    const mockProduct = { id: 'prod-1', name: 'Product A' }
    const builder: Record<string, unknown> = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockProduct, error: null }),
      then: (resolve: (val: unknown) => void) => resolve({ data: [], error: null }),
    }
    mockSupabase.from.mockReturnValue(builder)

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
      if (table === 'real_products') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }),
        }
      }
      if (table === 'product_keywords') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
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

  it('createProduct and updateProduct throw friendly error on CATMAT duplicates and allow shared CATBEC', async () => {
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
            message: 'duplicate key value violates unique constraint "products_cat_mat_key"',
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
      updateProduct('p1', { name: 'Prod Dup', cat_mat: 123, cat_bec: 456 } as unknown as Parameters<
        typeof updateProduct
      >[1]),
    ).rejects.toThrow('Já existe um produto cadastrado com este código CATMAT.')
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

  describe('duplicateProduct', () => {
    it('should throw an error if product name is empty or blank', async () => {
      const { duplicateProduct } = useProducts()
      await expect(
        duplicateProduct({
          sourceProductId: 'prod-source',
          name: '   ',
          expense_nature_id: '339030',
          product_class_id: '7510',
        }),
      ).rejects.toThrow('O nome do produto é obrigatório.')
    })

    it('should insert product, clone units, insert characteristics, and log DUPLICATE_PRODUCT', async () => {
      const insertedProduct = {
        id: 'prod-new-999',
        name: 'Colchete numero 9',
        expense_nature_id: '339030',
        product_class_id: '7510',
        cat_mat: null,
        cat_bec: null,
        is_active: true,
      }

      const insertProductMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: insertedProduct,
            error: null,
          }),
        }),
      })

      const deleteUnitsEqMock = vi.fn().mockResolvedValue({ error: null })
      const deleteUnitsMock = vi.fn().mockReturnValue({ eq: deleteUnitsEqMock })
      const insertUnitsMock = vi.fn().mockResolvedValue({ error: null })
      const insertKeyMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'key-tam', name: 'Tamanho' },
            error: null,
          }),
        }),
      })
      const insertCharMock = vi.fn().mockResolvedValue({ error: null })

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'products') {
          return { insert: insertProductMock }
        }
        if (table === 'product_units') {
          return {
            delete: deleteUnitsMock,
            insert: insertUnitsMock,
          }
        }
        if (table === 'product_characteristic_keys') {
          return {
            select: vi.fn().mockReturnValue({
              ilike: vi.fn().mockReturnValue({
                maybeSingle: vi
                  .fn()
                  .mockResolvedValue({ data: { id: 'key-tam', name: 'Tamanho' }, error: null }),
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

      const { duplicateProduct } = useProducts()
      const result = await duplicateProduct({
        sourceProductId: 'prod-source-4',
        name: 'Colchete numero 9',
        expense_nature_id: '339030',
        product_class_id: '7510',
        unitIds: ['unit-1', 'unit-2'],
        characteristics: [
          { key: 'Tamanho', value: '9' },
          { key: 'Material', value: 'Aço' },
        ],
      })

      expect(result.id).toBe('prod-new-999')
      expect(insertProductMock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Colchete numero 9',
          expense_nature_id: '339030',
          product_class_id: '7510',
          created_by: 'user-123',
        }),
      )
      expect(deleteUnitsMock).toHaveBeenCalled()
      expect(deleteUnitsEqMock).toHaveBeenCalledWith('product_id', 'prod-new-999')
      expect(insertUnitsMock).toHaveBeenCalledWith([
        { product_id: 'prod-new-999', unit_id: 'unit-1' },
        { product_id: 'prod-new-999', unit_id: 'unit-2' },
      ])
      expect(mockLogAction).toHaveBeenCalledWith(
        'DUPLICATE_PRODUCT',
        expect.stringContaining('Colchete numero 9'),
        'user-123',
      )
    })

    it('should throw error when inserting product units fails', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'products') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'prod-err-1', name: 'Prod Fail' },
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'product_units') {
          return {
            delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
            insert: vi.fn().mockResolvedValue({
              error: new Error('Failed to insert units'),
            }),
          }
        }
        return {}
      })

      const { duplicateProduct } = useProducts()
      await expect(
        duplicateProduct({
          sourceProductId: 'prod-source',
          name: 'Prod Fail',
          expense_nature_id: '339030',
          unitIds: ['unit-fail'],
        }),
      ).rejects.toThrow('Failed to insert units')
    })

    it('should handle duplicate CATMAT error code 23505', async () => {
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: {
                code: '23505',
                message: 'duplicate key value violates unique constraint "products_cat_mat_key"',
                details: 'cat_mat',
              },
            }),
          }),
        }),
      })

      const { duplicateProduct } = useProducts()
      await expect(
        duplicateProduct({
          sourceProductId: 'prod-source',
          name: 'Colchete 9',
          expense_nature_id: '339030',
          product_class_id: '7510',
          cat_mat: 12345,
        }),
      ).rejects.toThrow('Já existe um produto cadastrado com este código CATMAT.')
    })
  })

  describe('createProductsBatch', () => {
    it('returns empty array if payload is empty', async () => {
      const { createProductsBatch } = useProducts()
      const result = await createProductsBatch([])
      expect(result).toEqual([])
      expect(mockLogAction).not.toHaveBeenCalled()
    })

    it('inserts multiple products and logs action', async () => {
      const createdItems = [
        { id: 'p1', name: 'Prod 1', cat_mat: 111, expense_nature_id: 'nat-1' },
        { id: 'p2', name: 'Prod 2', cat_mat: 222, expense_nature_id: 'nat-1' },
      ]
      const selectMock = vi.fn().mockResolvedValue({ data: createdItems, error: null })
      const insertMock = vi.fn().mockReturnValue({ select: selectMock })
      mockSupabase.from.mockReturnValue({ insert: insertMock })

      const { createProductsBatch } = useProducts()
      const payloads = [
        { name: 'Prod 1', cat_mat: 111, expense_nature_id: 'nat-1' },
        { name: 'Prod 2', cat_mat: 222, expense_nature_id: 'nat-1' },
      ]
      const result = await createProductsBatch(payloads)

      expect(mockSupabase.from).toHaveBeenCalledWith('products')
      expect(insertMock).toHaveBeenCalledWith(payloads)
      expect(result).toEqual(createdItems)
      expect(mockLogAction).toHaveBeenCalledWith(
        'CREATE_PRODUCTS_BATCH',
        expect.stringContaining('2 produtos cadastrados em lote'),
        'user-123',
      )
    })

    it('throws friendly message when database violates unique CATMAT code 23505', async () => {
      const selectMock = vi.fn().mockResolvedValue({
        data: null,
        error: {
          code: '23505',
          message: 'duplicate key value violates unique constraint "products_cat_mat_key"',
          details: 'cat_mat',
        },
      })
      const insertMock = vi.fn().mockReturnValue({ select: selectMock })
      mockSupabase.from.mockReturnValue({ insert: insertMock })

      const { createProductsBatch } = useProducts()
      await expect(
        createProductsBatch([{ name: 'Prod Duplicado', cat_mat: 111, expense_nature_id: 'nat-1' }]),
      ).rejects.toThrow('Já existe um produto cadastrado com este código CATMAT.')
    })
  })

  describe('real_products', () => {
    it('fetchProductById should include real_products', async () => {
      const mockProduct = { id: 'prod-1', name: 'Papel A4' }
      const mockRealProducts = [
        {
          id: 'rp-1',
          product_id: 'prod-1',
          brand: 'Chamex',
          name: 'Chamex Office 75g',
          link: 'https://chamex.com',
        },
      ]

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'products') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockProduct, error: null }),
              }),
            }),
          }
        }
        if (table === 'real_products') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({ data: mockRealProducts, error: null }),
                }),
              }),
            }),
          }
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }
      })

      const { fetchProductById } = useProducts()
      const result = await fetchProductById('prod-1')

      expect(result.real_products).toEqual(mockRealProducts)
    })

    it('addRealProduct should validate required fields, insert real product and log action', async () => {
      const inserted = {
        id: 'rp-1',
        product_id: 'prod-1',
        brand: 'BIC',
        name: 'Cristal 1.0mm',
        link: 'https://bic.com',
      }
      const singleMock = vi.fn().mockResolvedValue({ data: inserted, error: null })
      const selectMock = vi.fn().mockReturnValue({ single: singleMock })
      const insertMock = vi.fn().mockReturnValue({ select: selectMock })
      mockSupabase.from.mockReturnValue({ insert: insertMock })

      const { addRealProduct } = useProducts()

      await expect(addRealProduct('prod-1', { brand: '', name: 'Cristal' })).rejects.toThrow(
        'A marca do produto real é obrigatória.',
      )
      await expect(addRealProduct('prod-1', { brand: 'BIC', name: '' })).rejects.toThrow(
        'O nome do produto real é obrigatório.',
      )

      const result = await addRealProduct('prod-1', {
        brand: 'BIC',
        name: 'Cristal 1.0mm',
        link: 'https://bic.com',
      })

      expect(mockSupabase.from).toHaveBeenCalledWith('real_products')
      expect(mockEnsureBrand).toHaveBeenCalledWith('BIC')
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          product_id: 'prod-1',
          brand: 'BIC',
          brand_id: 'brand-1',
          name: 'Cristal 1.0mm',
          link: 'https://bic.com',
          created_by: 'user-123',
        }),
      )
      expect(result).toEqual(inserted)
      expect(mockLogAction).toHaveBeenCalledWith(
        'ADD_REAL_PRODUCT',
        expect.stringContaining('BIC'),
        'user-123',
      )
    })

    it('updateRealProduct should update real product and log action', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: null })
      const updateMock = vi.fn().mockReturnValue({ eq: eqMock })
      mockSupabase.from.mockReturnValue({ update: updateMock })

      const { updateRealProduct } = useProducts()

      await expect(updateRealProduct('rp-1', { brand: '', name: 'Nome' })).rejects.toThrow(
        'A marca do produto real é obrigatória.',
      )
      await expect(updateRealProduct('rp-1', { brand: 'Marca', name: '' })).rejects.toThrow(
        'O nome do produto real é obrigatório.',
      )

      await updateRealProduct('rp-1', {
        brand: 'BIC Atualizada',
        name: 'Cristal Dura Mais',
        link: 'https://bic.com/novo',
      })

      expect(mockSupabase.from).toHaveBeenCalledWith('real_products')
      expect(mockEnsureBrand).toHaveBeenCalledWith('BIC Atualizada')
      expect(updateMock).toHaveBeenCalledWith({
        brand: 'BIC Atualizada',
        brand_id: 'brand-1',
        name: 'Cristal Dura Mais',
        link: 'https://bic.com/novo',
      })
      expect(eqMock).toHaveBeenCalledWith('id', 'rp-1')
      expect(mockLogAction).toHaveBeenCalledWith(
        'UPDATE_REAL_PRODUCT',
        expect.stringContaining('BIC Atualizada'),
        'user-123',
      )
    })

    it('removeRealProduct should delete real product and log action', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: null })
      const deleteMock = vi.fn().mockReturnValue({ eq: eqMock })
      mockSupabase.from.mockReturnValue({ delete: deleteMock })

      const { removeRealProduct } = useProducts()
      await removeRealProduct('rp-1', 'Caneta BIC')

      expect(mockSupabase.from).toHaveBeenCalledWith('real_products')
      expect(deleteMock).toHaveBeenCalled()
      expect(eqMock).toHaveBeenCalledWith('id', 'rp-1')
      expect(mockLogAction).toHaveBeenCalledWith(
        'REMOVE_REAL_PRODUCT',
        expect.stringContaining('Caneta BIC'),
        'user-123',
      )
    })
  })

  describe('Keywords', () => {
    it('addProductKeyword should validate inputs and insert keyword', async () => {
      const insertedKeyword = { id: 'kw-1', product_id: 'prod-1', keyword: 'esferográfica' }
      const insertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: insertedKeyword, error: null }),
        }),
      })
      mockSupabase.from.mockReturnValue({ insert: insertMock })

      const { addProductKeyword } = useProducts()

      await expect(addProductKeyword('', 'esferográfica')).rejects.toThrow(
        'ID do produto é obrigatório.',
      )
      await expect(addProductKeyword('prod-1', '   ')).rejects.toThrow(
        'A palavra-chave não pode ser vazia.',
      )

      const result = await addProductKeyword('prod-1', '  esferográfica  ')

      expect(mockSupabase.from).toHaveBeenCalledWith('product_keywords')
      expect(insertMock).toHaveBeenCalledWith({
        product_id: 'prod-1',
        keyword: 'esferográfica',
        created_by: 'user-123',
      })
      expect(mockLogAction).toHaveBeenCalledWith(
        'ADD_PRODUCT_KEYWORD',
        expect.stringContaining('esferográfica'),
        'user-123',
      )
      expect(result).toEqual(insertedKeyword)
    })

    it('addProductKeyword should throw friendly error on unique violation (23505)', async () => {
      const insertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: '23505', message: 'duplicate key' },
          }),
        }),
      })
      mockSupabase.from.mockReturnValue({ insert: insertMock })

      const { addProductKeyword } = useProducts()

      await expect(addProductKeyword('prod-1', 'esferográfica')).rejects.toThrow(
        'Esta palavra-chave já está cadastrada para este produto.',
      )
    })

    it('batchAddProductKeywords should split by comma, deduplicate and batch insert', async () => {
      const insertedKeywords = [
        { id: 'kw-1', product_id: 'prod-1', keyword: 'azul', created_by: 'user-123' },
        { id: 'kw-2', product_id: 'prod-1', keyword: 'ponta fina', created_by: 'user-123' },
      ]
      const insertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: insertedKeywords, error: null }),
      })
      mockSupabase.from.mockReturnValue({ insert: insertMock })

      const { batchAddProductKeywords } = useProducts()

      const result = await batchAddProductKeywords('prod-1', 'azul, ponta fina, Azul, , ')

      expect(mockSupabase.from).toHaveBeenCalledWith('product_keywords')
      expect(insertMock).toHaveBeenCalledWith([
        { product_id: 'prod-1', keyword: 'azul', created_by: 'user-123' },
        { product_id: 'prod-1', keyword: 'ponta fina', created_by: 'user-123' },
      ])
      expect(mockLogAction).toHaveBeenCalledWith(
        'BATCH_ADD_PRODUCT_KEYWORDS',
        expect.stringContaining('2 palavras-chave'),
        'user-123',
      )
      expect(result).toHaveLength(2)
    })

    it('batchAddProductKeywords should throw if no valid keywords', async () => {
      const { batchAddProductKeywords } = useProducts()
      await expect(batchAddProductKeywords('prod-1', ' , , ')).rejects.toThrow(
        'Nenhuma palavra-chave informada para inserção.',
      )
    })

    it('removeProductKeyword should delete keyword and log action', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: null })
      const deleteMock = vi.fn().mockReturnValue({ eq: eqMock })
      mockSupabase.from.mockReturnValue({ delete: deleteMock })

      const { removeProductKeyword } = useProducts()
      await removeProductKeyword('kw-1', 'esferográfica')

      expect(mockSupabase.from).toHaveBeenCalledWith('product_keywords')
      expect(deleteMock).toHaveBeenCalled()
      expect(eqMock).toHaveBeenCalledWith('id', 'kw-1')
      expect(mockLogAction).toHaveBeenCalledWith(
        'REMOVE_PRODUCT_KEYWORD',
        expect.stringContaining('esferográfica'),
        'user-123',
      )
    })

    it('fetchAllDistinctKeywords should return sorted unique list of keywords', async () => {
      const selectMock = vi.fn().mockResolvedValue({
        data: [
          { keyword: 'azul' },
          { keyword: 'Azul' },
          { keyword: 'caneta' },
          { keyword: 'ponta fina' },
        ],
        error: null,
      })
      mockSupabase.from.mockReturnValue({ select: selectMock })

      const { fetchAllDistinctKeywords } = useProducts()
      const distinct = await fetchAllDistinctKeywords()

      expect(mockSupabase.from).toHaveBeenCalledWith('product_keywords')
      expect(selectMock).toHaveBeenCalledWith('keyword')
      expect(distinct).toEqual(['azul', 'caneta', 'ponta fina'])
    })
  })
})
