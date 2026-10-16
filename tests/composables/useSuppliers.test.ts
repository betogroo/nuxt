import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useSuppliers } from '../../app/composables/useSuppliers'

const { mockSupabaseClient, mockUser, mockLogAction } = vi.hoisted(() => {
  return {
    mockSupabaseClient: {
      from: vi.fn(),
      auth: { signInWithPassword: vi.fn(), signOut: vi.fn(), getSession: vi.fn() },
    },
    mockUser: { value: { id: 'user-1' } },
    mockLogAction: vi.fn(),
  }
})

mockNuxtImport('useSupabaseClient', () => vi.fn(() => mockSupabaseClient))
mockNuxtImport('useSupabaseUser', () => vi.fn(() => mockUser))
mockNuxtImport('useLogger', () => () => ({ logAction: mockLogAction }))

describe('useSuppliers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should define all composable methods', () => {
    const composable = useSuppliers()
    expect(composable.fetchSuppliers).toBeDefined()
    expect(composable.fetchAllActiveSuppliers).toBeDefined()
    expect(composable.fetchSupplierById).toBeDefined()
    expect(composable.fetchSupplierWonDemands).toBeDefined()
    expect(composable.createSupplier).toBeDefined()
    expect(composable.createSupplierFast).toBeDefined()
    expect(composable.updateSupplier).toBeDefined()
    expect(composable.toggleSupplierStatus).toBeDefined()
  })

  describe('fetchSupplierById', () => {
    it('should return a supplier by id', async () => {
      const mockSupplier = { id: 'sup-1', company_name: 'Empresa Teste', cnpj: '12345678000199' }
      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockReturnValueOnce({
            single: vi.fn().mockResolvedValueOnce({ data: mockSupplier, error: null }),
          }),
        }),
      })

      const { fetchSupplierById } = useSuppliers()
      const result = await fetchSupplierById('sup-1')

      expect(result).toEqual(mockSupplier)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('suppliers')
    })

    it('should throw an error if supabase returns an error', async () => {
      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockReturnValueOnce({
            single: vi
              .fn()
              .mockResolvedValueOnce({ data: null, error: new Error('Database error') }),
          }),
        }),
      })

      const { fetchSupplierById } = useSuppliers()
      await expect(fetchSupplierById('sup-1')).rejects.toThrow('Database error')
    })
  })

  describe('toggleSupplierStatus', () => {
    it('should toggle is_active status and log action', async () => {
      const supplier = {
        id: 'sup-1',
        company_name: 'Empresa Teste',
        cnpj: '12345678000199',
        is_active: true,
      }

      mockSupabaseClient.from.mockReturnValueOnce({
        update: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockResolvedValueOnce({ error: null }),
        }),
      })

      const { toggleSupplierStatus } = useSuppliers()
      await toggleSupplierStatus(
        supplier as unknown as import('../../app/composables/useSuppliers').SupplierRow,
      )

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('suppliers')
      expect(mockLogAction).toHaveBeenCalledWith(
        'TOGGLE_SUPPLIER_STATUS',
        'Fornecedor Empresa Teste alterado para INATIVO',
        'user-1',
      )
    })
  })

  describe('fetchSupplierWonDemands', () => {
    it('should return empty summary when supplier has no bids', async () => {
      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockResolvedValueOnce({ data: [], error: null }),
        }),
      })

      const { fetchSupplierWonDemands } = useSuppliers()
      const result = await fetchSupplierWonDemands('sup-1')

      expect(result).toEqual({
        totalDemandsWon: 0,
        totalItemsWon: 0,
        totalAmountWon: 0,
        averageDemandAmount: 0,
        demands: [],
      })
    })

    it('should return zero won demands when all bids by supplier were lost', async () => {
      // 1. Supplier placed a bid on prod-1
      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockResolvedValueOnce({
            data: [{ demand_product_id: 'prod-1', amount: 100 }],
            error: null,
          }),
        }),
      })

      // 2. Fetch product info: competitor had a lower bid (50 vs 100)
      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          in: vi.fn().mockResolvedValueOnce({
            data: [
              {
                id: 'prod-1',
                demand_id: 'demand-1',
                product_name_snapshot: 'Caneta',
                unit_name_snapshot: 'UN',
                quantity: 10,
                reference_price: 150,
                demands: {
                  id: 'demand-1',
                  name: 'Demanda de Escritório',
                  process_number: '123/2026',
                  status: 'completed',
                  type: 'consumption',
                  dispute_date: '2026-10-10',
                },
                demand_product_bids: [
                  { id: 'bid-1', supplier_id: 'sup-1', amount: 100 },
                  { id: 'bid-2', supplier_id: 'sup-competitor', amount: 50 },
                ],
              },
            ],
            error: null,
          }),
        }),
      })

      const { fetchSupplierWonDemands } = useSuppliers()
      const result = await fetchSupplierWonDemands('sup-1')

      expect(result.totalDemandsWon).toBe(0)
      expect(result.totalItemsWon).toBe(0)
      expect(result.totalAmountWon).toBe(0)
      expect(result.averageDemandAmount).toBe(0)
      expect(result.demands).toHaveLength(0)
    })

    it('should accurately calculate won items, group by demand, and compute summary', async () => {
      // 1. Supplier placed bids on prod-1 and prod-2 (both in demand-1) and prod-3 (in demand-2)
      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockResolvedValueOnce({
            data: [
              { demand_product_id: 'prod-1', amount: 20 },
              { demand_product_id: 'prod-2', amount: 50 },
              { demand_product_id: 'prod-3', amount: 200 },
            ],
            error: null,
          }),
        }),
      })

      // 2. Fetch products details
      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          in: vi.fn().mockResolvedValueOnce({
            data: [
              {
                id: 'prod-1',
                demand_id: 'demand-1',
                product_name_snapshot: 'Papel A4',
                unit_name_snapshot: 'CX',
                quantity: 5,
                reference_price: 30,
                demands: {
                  id: 'demand-1',
                  name: 'Demanda 1',
                  process_number: '001/2026',
                  status: 'completed',
                  type: 'consumption',
                  dispute_date: '2026-09-01',
                },
                demand_product_bids: [
                  { id: 'b-1', supplier_id: 'sup-1', amount: 20 }, // Won! Subtotal: 20 * 5 = 100
                  { id: 'b-2', supplier_id: 'sup-other', amount: 25 },
                ],
              },
              {
                id: 'prod-2',
                demand_id: 'demand-1',
                product_name_snapshot: 'Grampeador',
                unit_name_snapshot: 'UN',
                quantity: 2,
                reference_price: 60,
                demands: {
                  id: 'demand-1',
                  name: 'Demanda 1',
                  process_number: '001/2026',
                  status: 'completed',
                  type: 'consumption',
                  dispute_date: '2026-09-01',
                },
                demand_product_bids: [
                  { id: 'b-3', supplier_id: 'sup-1', amount: 50 }, // Won! Subtotal: 50 * 2 = 100
                  { id: 'b-4', supplier_id: 'sup-other', amount: 55 },
                ],
              },
              {
                id: 'prod-3',
                demand_id: 'demand-2',
                product_name_snapshot: 'Impressora Laser',
                unit_name_snapshot: 'UN',
                quantity: 1,
                reference_price: 250,
                demands: {
                  id: 'demand-2',
                  name: 'Demanda 2',
                  process_number: '002/2026',
                  status: 'dispute',
                  type: 'permanente',
                  dispute_date: '2026-10-01',
                },
                demand_product_bids: [
                  { id: 'b-5', supplier_id: 'sup-1', amount: 200 }, // Won! Subtotal: 200 * 1 = 200
                  { id: 'b-6', supplier_id: 'sup-other', amount: 220 },
                ],
              },
            ],
            error: null,
          }),
        }),
      })

      const { fetchSupplierWonDemands } = useSuppliers()
      const result = await fetchSupplierWonDemands('sup-1')

      // Total Demands Won: 2 (demand-1 and demand-2)
      expect(result.totalDemandsWon).toBe(2)
      // Total Items Won: 3
      expect(result.totalItemsWon).toBe(3)
      // Total Amount Won: 100 + 100 + 200 = 400
      expect(result.totalAmountWon).toBe(400)
      // Average Amount per Demand: 400 / 2 = 200
      expect(result.averageDemandAmount).toBe(200)

      // Demands list should be sorted by dispute_date descending (demand-2 '2026-10-01' first, then demand-1 '2026-09-01')
      expect(result.demands[0].demand_id).toBe('demand-2')
      expect(result.demands[0].total_amount).toBe(200)
      expect(result.demands[0].items_count).toBe(1)

      expect(result.demands[1].demand_id).toBe('demand-1')
      expect(result.demands[1].total_amount).toBe(200)
      expect(result.demands[1].items_count).toBe(2)
    })

    it('ignores disqualified bids when computing won items for a supplier', async () => {
      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockResolvedValueOnce({
            data: [{ demand_product_id: 'prod-1', amount: 25 }],
            error: null,
          }),
        }),
      })

      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          in: vi.fn().mockResolvedValueOnce({
            data: [
              {
                id: 'prod-1',
                demand_id: 'demand-1',
                product_name_snapshot: 'Papel A4',
                unit_name_snapshot: 'CX',
                quantity: 2,
                reference_price: 30,
                demands: {
                  id: 'demand-1',
                  name: 'Demanda 1',
                  process_number: '001/2026',
                  status: 'completed',
                  type: 'consumption',
                  dispute_date: '2026-09-01',
                },
                demand_product_bids: [
                  { id: 'b-other', supplier_id: 'sup-other', amount: 20, status: 'disqualified' },
                  { id: 'b-1', supplier_id: 'sup-1', amount: 25, status: 'classified' },
                ],
              },
            ],
            error: null,
          }),
        }),
      })

      const { fetchSupplierWonDemands } = useSuppliers()
      const result = await fetchSupplierWonDemands('sup-1')

      expect(result.totalDemandsWon).toBe(1)
      expect(result.totalItemsWon).toBe(1)
      expect(result.totalAmountWon).toBe(50)
    })
  })
})
