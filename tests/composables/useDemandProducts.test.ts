import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useDemandProducts } from '../../app/composables/useDemandProducts'

const mockLogAction = vi.fn()

const mockSupabase = {
  from: vi.fn(),
  auth: { signInWithPassword: vi.fn(), signOut: vi.fn(), getSession: vi.fn() },
}

mockNuxtImport('useSupabaseClient', () => vi.fn(() => mockSupabase))
mockNuxtImport('useSupabaseUser', () => vi.fn(() => ({ value: { id: 'user-1' } })))
mockNuxtImport('useLogger', () => () => ({ logAction: mockLogAction }))

describe('useDemandProducts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should be defined', () => {
    const composable = useDemandProducts()
    expect(composable).toBeDefined()
  })

  it('addDemandItemWithDependencies should create product with class and link Unidade and finalUnit', async () => {
    const { addDemandItemWithDependencies } = useDemandProducts()

    const mockInsertProduct = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'prod-100', name: 'Novo Produto Teste' },
          error: null,
        }),
      }),
    })

    const mockProductUnitsInsert = vi.fn().mockResolvedValue({ error: null })
    const mockDemandProductsInsert = vi.fn().mockResolvedValue({ error: null })

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'products') {
        return { insert: mockInsertProduct }
      }
      if (table === 'measurement_units') {
        return {
          select: vi.fn().mockReturnValue({
            ilike: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: 'unit-unidade-id' },
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === 'product_units') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          }),
          insert: mockProductUnitsInsert,
        }
      }
      if (table === 'demand_products') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
          insert: mockDemandProductsInsert,
        }
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }
    })

    await addDemandItemWithDependencies({
      demandId: 'demand-1',
      isNewProductMode: true,
      newProductName: 'Novo Produto Teste',
      newProductExpenseNatureId: '33903000',
      newProductClassId: '5915',
      finalUnitId: 'unit-cx-id',
      itemQuantity: 5,
      itemReferencePrice: 12.5,
    })

    // Verify product inserted with product_class_id and null cat_mat/cat_bec
    expect(mockInsertProduct).toHaveBeenCalledWith({
      name: 'Novo Produto Teste',
      expense_nature_id: '33903000',
      product_class_id: '5915',
      cat_mat: null,
      cat_bec: null,
    })

    // Verify logAction for product creation
    expect(mockLogAction).toHaveBeenCalledWith(
      'CREATE_PRODUCT',
      expect.stringContaining('Novo Produto Teste'),
      'user-1',
    )

    // Verify product_units links both default 'Unidade' and 'unit-cx-id'
    expect(mockProductUnitsInsert).toHaveBeenCalledWith({
      product_id: 'prod-100',
      unit_id: 'unit-unidade-id',
    })
    expect(mockProductUnitsInsert).toHaveBeenCalledWith({
      product_id: 'prod-100',
      unit_id: 'unit-cx-id',
    })

    // Verify demand_products inserted
    expect(mockDemandProductsInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        demand_id: 'demand-1',
        product_id: 'prod-100',
        unit_id: 'unit-cx-id',
        quantity: 5,
        reference_price: 12.5,
      }),
    )
  })

  it('addDemandItemWithDependencies should register pending class when isSuggestingClass is true', async () => {
    const { addDemandItemWithDependencies } = useDemandProducts()

    const mockInsertProductClass = vi.fn().mockResolvedValue({ error: null })
    const mockInsertProduct = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'prod-200', name: 'Outro Produto' },
          error: null,
        }),
      }),
    })

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'product_classes') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
          insert: mockInsertProductClass,
        }
      }
      if (table === 'products') {
        return { insert: mockInsertProduct }
      }
      if (table === 'measurement_units') {
        return {
          select: vi.fn().mockReturnValue({
            ilike: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'unit-unidade-id' } }),
            }),
          }),
        }
      }
      if (table === 'product_units') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null }),
              }),
            }),
          }),
          insert: vi.fn().mockResolvedValue({ error: null }),
        }
      }
      if (table === 'demand_products') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [] }),
            }),
          }),
          insert: vi.fn().mockResolvedValue({ error: null }),
        }
      }
      return {}
    })

    await addDemandItemWithDependencies({
      demandId: 'demand-2',
      isNewProductMode: true,
      newProductName: 'Outro Produto',
      newProductExpenseNatureId: '33903000',
      isSuggestingClass: true,
      suggestedClassId: '9999',
      suggestedClassName: 'Nova Classe Sugerida',
      finalUnitId: 'unit-unidade-id',
      itemQuantity: 1,
      itemReferencePrice: 10,
    })

    // Verify pending class registered
    expect(mockInsertProductClass).toHaveBeenCalledWith({
      id: '9999',
      name: 'Nova Classe Sugerida',
      is_pending: true,
      is_active: false,
    })

    // Verify logAction for pending class
    expect(mockLogAction).toHaveBeenCalledWith(
      'CREATE_PENDING_PRODUCT_CLASS',
      expect.stringContaining('Nova Classe Sugerida'),
      'user-1',
    )

    // Verify product inserted with suggested class id
    expect(mockInsertProduct).toHaveBeenCalledWith({
      name: 'Outro Produto',
      expense_nature_id: '33903000',
      product_class_id: '9999',
      cat_mat: null,
      cat_bec: null,
    })
  })

  it('addDemandItemWithDependencies should throw error when required fields are missing', async () => {
    const { addDemandItemWithDependencies } = useDemandProducts()

    // Missing class code/name when isSuggestingClass is true
    await expect(
      addDemandItemWithDependencies({
        demandId: 'demand-3',
        isNewProductMode: true,
        newProductName: 'Produto Incompleto',
        newProductExpenseNatureId: '33903000',
        isSuggestingClass: true,
        suggestedClassId: '',
        suggestedClassName: '',
        finalUnitId: 'unit-1',
        itemQuantity: 1,
        itemReferencePrice: 10,
      }),
    ).rejects.toThrow('Código e Nome da nova classe são obrigatórios.')

    // Missing unit
    await expect(
      addDemandItemWithDependencies({
        demandId: 'demand-3',
        isNewProductMode: false,
        selectedProductId: 'prod-1',
        finalUnitId: '',
        itemQuantity: 1,
        itemReferencePrice: 10,
      }),
    ).rejects.toThrow('Unidade de medida inválida.')
  })

  it('addDemandItemWithDependencies should pass cat_mat and cat_bec to product insert', async () => {
    const { addDemandItemWithDependencies } = useDemandProducts()

    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'prod-cat', name: 'Notebook' },
          error: null,
        }),
      }),
    })

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'products') {
        return { insert: mockInsert }
      }
      if (table === 'measurement_units') {
        return {
          select: vi.fn().mockReturnValue({
            ilike: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: 'unit-un' },
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === 'product_units' || table === 'demand_products') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          }),
          insert: vi.fn().mockResolvedValue({ error: null }),
        }
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }
    })

    await addDemandItemWithDependencies({
      demandId: 'demand-cat',
      isNewProductMode: true,
      newProductName: 'Notebook',
      newProductExpenseNatureId: '44905200',
      newProductClassId: '7020',
      newProductCatMat: 445566,
      newProductCatBec: 778899,
      finalUnitId: 'unit-un',
      itemQuantity: 10,
      itemReferencePrice: 3500,
    })

    expect(mockInsert).toHaveBeenCalledWith({
      name: 'Notebook',
      expense_nature_id: '44905200',
      product_class_id: '7020',
      cat_mat: 445566,
      cat_bec: 778899,
    })
  })

  it('addDemandItemWithDependencies should link existing selected alias to unit and demand item', async () => {
    const { addDemandItemWithDependencies } = useDemandProducts()

    const mockAliasLinkInsert = vi.fn().mockResolvedValue({ error: null })
    const mockDemandProductsInsert = vi.fn().mockResolvedValue({ error: null })

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'measurement_unit_alias_links') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          }),
          insert: mockAliasLinkInsert,
        }
      }
      if (table === 'product_units') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          }),
          insert: vi.fn().mockResolvedValue({ error: null }),
        }
      }
      if (table === 'demand_products') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
          insert: mockDemandProductsInsert,
        }
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
          ilike: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      }
    })

    await addDemandItemWithDependencies({
      demandId: 'demand-alias-1',
      isNewProductMode: false,
      selectedProductId: 'prod-alias',
      finalUnitId: 'unit-cx-1',
      selectedAliasId: 'alias-cento-1',
      itemQuantity: 2,
      itemReferencePrice: 50,
    })

    expect(mockAliasLinkInsert).toHaveBeenCalledWith({
      unit_id: 'unit-cx-1',
      alias_id: 'alias-cento-1',
    })

    expect(mockDemandProductsInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        demand_id: 'demand-alias-1',
        product_id: 'prod-alias',
        unit_id: 'unit-cx-1',
        alias_id: 'alias-cento-1',
        quantity: 2,
        reference_price: 50,
      }),
    )
  })

  it('addDemandItemWithDependencies should register pending alias when isSuggestingAlias is true', async () => {
    const { addDemandItemWithDependencies } = useDemandProducts()

    const mockInsertAlias = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'alias-new-99', code: 99, name: 'Fardo 20' },
          error: null,
        }),
      }),
    })
    const mockAliasLinkInsert = vi.fn().mockResolvedValue({ error: null })
    const mockDemandProductsInsert = vi.fn().mockResolvedValue({ error: null })

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'measurement_unit_aliases') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
          insert: mockInsertAlias,
        }
      }
      if (table === 'measurement_unit_alias_links') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          }),
          insert: mockAliasLinkInsert,
        }
      }
      if (table === 'product_units') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          }),
          insert: vi.fn().mockResolvedValue({ error: null }),
        }
      }
      if (table === 'demand_products') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
          insert: mockDemandProductsInsert,
        }
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
          ilike: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      }
    })

    await addDemandItemWithDependencies({
      demandId: 'demand-alias-2',
      isNewProductMode: false,
      selectedProductId: 'prod-alias',
      finalUnitId: 'unit-fardo',
      isSuggestingAlias: true,
      suggestedAliasCode: 99,
      suggestedAliasName: 'Fardo 20',
      itemQuantity: 3,
      itemReferencePrice: 100,
    })

    expect(mockInsertAlias).toHaveBeenCalledWith({
      code: 99,
      name: 'Fardo 20',
      is_pending: true,
    })

    expect(mockLogAction).toHaveBeenCalledWith(
      'CREATE_PENDING_ALIAS',
      expect.stringContaining('Fardo 20 (99)'),
      'user-1',
    )

    expect(mockAliasLinkInsert).toHaveBeenCalledWith({
      unit_id: 'unit-fardo',
      alias_id: 'alias-new-99',
    })

    expect(mockDemandProductsInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        alias_id: 'alias-new-99',
        demand_id: 'demand-alias-2',
      }),
    )
  })

  it('updateDemandItemWithDependencies should update alias_id and link to unit', async () => {
    const { updateDemandItemWithDependencies } = useDemandProducts()

    const mockAliasLinkInsert = vi.fn().mockResolvedValue({ error: null })
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    })

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'measurement_unit_alias_links') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          }),
          insert: mockAliasLinkInsert,
        }
      }
      if (table === 'demand_products') {
        return {
          update: mockUpdate,
        }
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      }
    })

    await updateDemandItemWithDependencies({
      itemId: 'item-update-1',
      demandId: 'demand-1',
      quantity: 15,
      referencePrice: 20,
      finalUnitId: 'unit-box',
      finalAliasId: 'alias-38',
    })

    expect(mockAliasLinkInsert).toHaveBeenCalledWith({
      unit_id: 'unit-box',
      alias_id: 'alias-38',
    })

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        quantity: 15,
        unit_id: 'unit-box',
        alias_id: 'alias-38',
        reference_price: 20,
      }),
    )
  })
})
