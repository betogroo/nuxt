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

  it('fetchDemandItemDetails and fetchDemandProducts should include product_characteristics in select query', async () => {
    const selectMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'item-1',
            product: {
              id: 'prod-1',
              name: 'Caneta',
              product_characteristics: [
                {
                  id: 'pc-1',
                  value: '1.0mm',
                  key_id: 'k-1',
                  key: { id: 'k-1', name: 'Ponta', is_pending: false, is_active: true },
                },
              ],
            },
          },
          error: null,
        }),
        order: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      }),
    })

    mockSupabase.from.mockReturnValue({
      select: selectMock,
    })

    const { fetchDemandItemDetails, fetchDemandProducts } = useDemandProducts()
    const item = await fetchDemandItemDetails('item-1')
    await fetchDemandProducts('demand-1')

    expect(selectMock).toHaveBeenCalledWith(expect.stringContaining('product_characteristics'))
    expect(selectMock).toHaveBeenCalledWith(expect.stringContaining('product_classes(id, name)'))
    expect(item?.product?.product_characteristics).toHaveLength(1)
    expect(item?.product?.product_characteristics?.[0]?.value).toBe('1.0mm')
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

  it('updateDemandItemExecutionStatus should update execution_status and insert history', async () => {
    const { updateDemandItemExecutionStatus } = useDemandProducts()

    const mockUpdateEq = vi.fn().mockResolvedValue({ error: null })
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq })
    const mockHistoryInsert = vi.fn().mockResolvedValue({ error: null })

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'demand_products') {
        return { update: mockUpdate }
      }
      if (table === 'demand_item_status_history') {
        return { insert: mockHistoryInsert }
      }
      return {}
    })

    await updateDemandItemExecutionStatus({
      itemId: 'dp-1',
      status: 'commitment_sent',
      observation: 'Empenho enviado para o fornecedor',
      errorDetails: null,
    })

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        execution_status: 'commitment_sent',
        execution_error_details: null,
      }),
    )
    expect(mockUpdateEq).toHaveBeenCalledWith('id', 'dp-1')

    expect(mockHistoryInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        demand_product_id: 'dp-1',
        status: 'commitment_sent',
        observation: 'Empenho enviado para o fornecedor',
        created_by: 'user-1',
      }),
    )

    expect(mockLogAction).toHaveBeenCalledWith(
      'UPDATE_DEMAND_ITEM_EXECUTION_STATUS',
      expect.stringContaining('dp-1'),
      'user-1',
    )
  })

  it('fetchDemandItemStatusHistory should query history ordered by created_at desc', async () => {
    const { fetchDemandItemStatusHistory } = useDemandProducts()

    const mockOrder = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'hist-1',
          demand_product_id: 'dp-1',
          status: 'commitment_sent',
          observation: 'Empenho',
          created_at: '2026-10-20T10:00:00Z',
          profiles: { id: 'user-1', name: 'Admin' },
        },
      ],
      error: null,
    })
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder })
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'demand_item_status_history') {
        return { select: mockSelect }
      }
      return {}
    })

    const history = await fetchDemandItemStatusHistory('dp-1')
    expect(mockSelect).toHaveBeenCalledWith('*, profiles(id, name)')
    expect(mockEq).toHaveBeenCalledWith('demand_product_id', 'dp-1')
    expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(history).toHaveLength(1)
    expect(history[0].status).toBe('commitment_sent')
  })

  it('updateDemandItemExecutionStatus should save commitment_number when status is commitment_issued', async () => {
    const { updateDemandItemExecutionStatus } = useDemandProducts()

    const mockUpdateEq = vi.fn().mockResolvedValue({ error: null })
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq })
    const mockHistoryInsert = vi.fn().mockResolvedValue({ error: null })

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'demand_products') {
        return {
          update: mockUpdate,
          select: vi.fn().mockReturnValue({
            ilike: vi.fn().mockReturnValue({
              neq: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }
      }
      if (table === 'demand_item_status_history') {
        return { insert: mockHistoryInsert }
      }
      return {}
    })

    await updateDemandItemExecutionStatus({
      itemId: 'dp-1',
      status: 'commitment_issued',
      commitmentNumber: '2026-NE-00247',
      observation: 'Nota de empenho gerada',
      supplierId: 'sup-1',
    })

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        execution_status: 'commitment_issued',
        commitment_number: '2026-NE-00247',
      }),
    )
    expect(mockHistoryInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        demand_product_id: 'dp-1',
        status: 'commitment_issued',
        commitment_number: '2026-NE-00247',
        observation: 'Nota de empenho gerada',
      }),
    )
  })

  it('validateCommitmentNumberSupplier allows same commitment number for same supplier', async () => {
    const { validateCommitmentNumberSupplier } = useDemandProducts()
    let capturedSelect = ''

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'demand_products') {
        return {
          select: vi.fn().mockImplementation((query: string) => {
            capturedSelect = query
            return {
              ilike: vi.fn().mockReturnValue({
                neq: vi.fn().mockResolvedValue({
                  data: [
                    {
                      id: 'dp-2',
                      commitment_number: '2026-NE-00247',
                      demand_product_bids: [
                        {
                          id: 'bid-2',
                          supplier_id: 'sup-same',
                          amount: 10,
                          status: 'classified',
                          suppliers: { id: 'sup-same', company_name: 'Fornecedor Mesmo' },
                        },
                      ],
                    },
                  ],
                  error: null,
                }),
              }),
            }
          }),
        }
      }
      return {}
    })

    await expect(
      validateCommitmentNumberSupplier({
        itemId: 'dp-1',
        commitmentNumber: '2026-NE-00247',
        supplierId: 'sup-same',
      }),
    ).resolves.not.toThrow()

    expect(capturedSelect).toContain('suppliers(id, company_name, cnpj)')
    expect(capturedSelect).not.toContain('suppliers(id, name')
  })

  it('validateCommitmentNumberSupplier throws error when commitment number belongs to a different supplier', async () => {
    const { validateCommitmentNumberSupplier } = useDemandProducts()

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'demand_products') {
        return {
          select: vi.fn().mockReturnValue({
            ilike: vi.fn().mockReturnValue({
              neq: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: 'dp-2',
                    commitment_number: '2026-NE-00247',
                    demand_product_bids: [
                      {
                        id: 'bid-2',
                        supplier_id: 'sup-different',
                        amount: 15,
                        status: 'classified',
                        suppliers: {
                          id: 'sup-different',
                          company_name: 'Empresa Concorrente LTDA',
                        },
                      },
                    ],
                  },
                ],
                error: null,
              }),
            }),
          }),
        }
      }
      return {}
    })

    await expect(
      validateCommitmentNumberSupplier({
        itemId: 'dp-1',
        commitmentNumber: '2026-NE-00247',
        supplierId: 'sup-1',
      }),
    ).rejects.toThrow(/Empresa Concorrente LTDA/)
  })

  describe('batchUpdateCommitmentsByNature', () => {
    it('throws error when the same commitment number is used for multiple different expense natures', async () => {
      const { batchUpdateCommitmentsByNature } = useDemandProducts()

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'demand_products') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: 'dp-1',
                    commitment_number: null,
                    execution_status: 'homologated',
                    product_id: 'p-1',
                    product: { expense_nature_id: '33903016' },
                    demand_product_bids: [
                      { id: 'b-1', supplier_id: 'sup-1', amount: 10, status: 'classified' },
                    ],
                  },
                ],
                error: null,
              }),
            }),
          }
        }
        return {}
      })

      await expect(
        batchUpdateCommitmentsByNature({
          demandId: 'dem-1',
          supplierId: 'sup-1',
          updates: [
            { expenseNatureId: '33903016', commitmentNumber: '2026-NE-00500' },
            { expenseNatureId: '33903010', commitmentNumber: '2026-NE-00500' },
          ],
        }),
      ).rejects.toThrow(/Cada natureza deve possuir uma nota de empenho exclusiva/)
    })

    it('updates matching items to commitment_issued with commitment number and creates history', async () => {
      const { batchUpdateCommitmentsByNature } = useDemandProducts()

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })
      const mockInsertHistory = vi.fn().mockResolvedValue({ error: null })

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'demand_products') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: 'dp-1',
                    commitment_number: null,
                    execution_status: 'homologated',
                    product_id: 'p-1',
                    product: { expense_nature_id: '33903016' },
                    demand_product_bids: [
                      { id: 'b-1', supplier_id: 'sup-1', amount: 10, status: 'classified' },
                    ],
                  },
                  {
                    id: 'dp-2',
                    commitment_number: null,
                    execution_status: 'homologated',
                    product_id: 'p-2',
                    product: { expense_nature_id: '33903016' },
                    demand_product_bids: [
                      { id: 'b-2', supplier_id: 'sup-1', amount: 20, status: 'classified' },
                    ],
                  },
                ],
                error: null,
              }),
              ilike: vi.fn().mockReturnValue({
                neq: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
            update: mockUpdate,
          }
        }
        if (table === 'demand_item_status_history') {
          return {
            insert: mockInsertHistory,
          }
        }
        return {}
      })

      await batchUpdateCommitmentsByNature({
        demandId: 'dem-1',
        supplierId: 'sup-1',
        updates: [{ expenseNatureId: '33903016', commitmentNumber: '2026-NE-00999' }],
      })

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          commitment_number: '2026-NE-00999',
          execution_status: 'commitment_issued',
        }),
      )
      expect(mockInsertHistory).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            demand_product_id: 'dp-1',
            status: 'commitment_issued',
            commitment_number: '2026-NE-00999',
          }),
          expect.objectContaining({
            demand_product_id: 'dp-2',
            status: 'commitment_issued',
            commitment_number: '2026-NE-00999',
          }),
        ]),
      )
      expect(mockLogAction).toHaveBeenCalledWith(
        'BATCH_UPDATE_DEMAND_COMMITMENTS',
        expect.stringContaining('sup-1'),
        'user-1',
      )
    })
  })
})
