import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { ref } from 'vue'
import { useDemandDetail } from '../../app/composables/useDemandDetail'
import type { DemandRow } from '../../app/composables/useDemands'

const mockDemand = ref<Partial<DemandRow> | null>(null)
const mockItems = ref<unknown[] | null>(null)
const mockResponsibles = ref<unknown[]>([])
const mockUpdateDemandDb = vi.fn().mockResolvedValue(true)

mockNuxtImport('useDemands', () => () => ({
  fetchDemandById: vi.fn().mockImplementation(async () => mockDemand.value),
  fetchDemandResponsibles: vi.fn().mockResolvedValue([]),
  addResponsible: vi.fn().mockResolvedValue(true),
  removeResponsible: vi.fn().mockResolvedValue(true),
  updateDemand: mockUpdateDemandDb,
}))

mockNuxtImport('useDemandProducts', () => () => ({
  fetchDemandProducts: vi.fn().mockImplementation(async () => mockItems.value || []),
  removeDemandProduct: vi.fn().mockResolvedValue(true),
  reorderDemandItems: vi.fn().mockResolvedValue(true),
}))

mockNuxtImport('useToast', () => () => ({
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
}))

mockNuxtImport('useAsyncData', () => (key: string, fn: () => Promise<unknown>) => {
  let targetRef: unknown = mockDemand
  if (key.startsWith('demand-items-')) {
    targetRef = mockItems
  } else if (key.startsWith('demand-responsibles-')) {
    targetRef = mockResponsibles
  }
  return {
    data: targetRef,
    refresh: vi.fn().mockImplementation(fn),
  }
})

describe('useDemandDetail - isPlanningIncomplete', () => {
  beforeEach(() => {
    mockDemand.value = {
      id: 'demand-1',
      status: 'planning',
      process_number: '058.001/2026',
      internal_process_number: 'INT-01',
      id_pca: 'PCA-100',
      type: 'consumption',
      contract_number: '12345',
      siafem_number: '2026NE0001',
    }
  })

  it('returns false when all planning fields including siafem_number are present', () => {
    const { isPlanningIncomplete } = useDemandDetail('demand-1')
    expect(isPlanningIncomplete.value).toBe(false)
  })

  it('returns true when siafem_number is null', () => {
    mockDemand.value!.siafem_number = null
    const { isPlanningIncomplete } = useDemandDetail('demand-1')
    expect(isPlanningIncomplete.value).toBe(true)
  })

  it('returns true when siafem_number is empty string', () => {
    mockDemand.value!.siafem_number = ''
    const { isPlanningIncomplete } = useDemandDetail('demand-1')
    expect(isPlanningIncomplete.value).toBe(true)
  })

  it('returns true when any other planning field is missing', () => {
    mockDemand.value!.process_number = null
    const { isPlanningIncomplete } = useDemandDetail('demand-1')
    expect(isPlanningIncomplete.value).toBe(true)
  })

  it('returns false when demand status is not planning, even if fields are missing', () => {
    mockDemand.value!.status = 'quotation'
    mockDemand.value!.siafem_number = null
    const { isPlanningIncomplete } = useDemandDetail('demand-1')
    expect(isPlanningIncomplete.value).toBe(false)
  })

  describe('updateDemand', () => {
    it('accepts single argument payload and uses closured demandId', async () => {
      mockUpdateDemandDb.mockClear()
      const { updateDemand } = useDemandDetail('demand-1')

      await updateDemand({ process_number: '058.00100793/2026-21' })

      expect(mockUpdateDemandDb).toHaveBeenCalledWith('demand-1', {
        process_number: '058.00100793/2026-21',
      })
    })

    it('accepts two arguments (demandId, payload) and updates target demand properly', async () => {
      mockUpdateDemandDb.mockClear()
      const { updateDemand } = useDemandDetail('demand-1')

      await updateDemand('demand-1', { process_number: '058.00100793/2026-99' })

      expect(mockUpdateDemandDb).toHaveBeenCalledWith('demand-1', {
        process_number: '058.00100793/2026-99',
      })
    })
  })

  describe('winningSuppliersSummary', () => {
    const mockSupplierA = {
      id: 'sup-a',
      company_name: 'Fornecedor A LTDA',
      cnpj: '11111111000111',
      email: 'contato@fornecedora.com',
      is_simples_optant: true,
      simples_optant_verified_at: '2026-03-01T10:00:00Z',
    }
    const mockSupplierB = {
      id: 'sup-b',
      company_name: 'Fornecedor B LTDA',
      cnpj: '22222222000122',
      is_simples_optant: false,
    }

    it('returns empty array when items are null or empty', () => {
      mockItems.value = null
      const { winningSuppliersSummary } = useDemandDetail('demand-1')
      expect(winningSuppliersSummary.value).toEqual([])
    })

    it('calculates commitments and sums amounts when a supplier has multiple items with the same commitment number', () => {
      mockItems.value = [
        {
          id: 'item-1',
          quantity: 10,
          commitment_number: '2026-NE-00100',
          product_name_snapshot: 'Papel A4',
          demand_product_bids: [
            {
              id: 'bid-1',
              supplier_id: 'sup-a',
              amount: 25.0,
              status: 'classified',
              suppliers: mockSupplierA,
            },
          ],
        },
        {
          id: 'item-2',
          quantity: 5,
          commitment_number: '2026-NE-00100',
          product_name_snapshot: 'Caneta Azul',
          demand_product_bids: [
            {
              id: 'bid-2',
              supplier_id: 'sup-a',
              amount: 10.0,
              status: 'classified',
              suppliers: mockSupplierA,
            },
          ],
        },
      ]

      const { winningSuppliersSummary } = useDemandDetail('demand-1')
      expect(winningSuppliersSummary.value).toHaveLength(1)

      const winnerA = winningSuppliersSummary.value[0]
      expect(winnerA.id).toBe('sup-a')
      expect(winnerA.wonCount).toBe(2)
      expect(winnerA.is_simples_optant).toBe(true)
      expect(winnerA.simples_optant_verified_at).toBe('2026-03-01T10:00:00Z')
      // item-1: 10 * 25 = 250; item-2: 5 * 10 = 50 => Total 300
      expect(winnerA.totalAmountWon).toBe(300)
      expect(winnerA.allPendingCommitments).toBe(false)
      expect(winnerA.hasPendingCommitments).toBe(false)
      expect(winnerA.commitments).toHaveLength(1)
      expect(winnerA.commitments[0]).toEqual({
        commitmentNumber: '2026-NE-00100',
        itemsCount: 2,
        totalAmount: 300,
        itemNames: ['Papel A4', 'Caneta Azul'],
        status: 'homologated',
        statuses: ['homologated'],
      })
    })

    it('flags allPendingCommitments as true when winner has no commitment notes', () => {
      mockItems.value = [
        {
          id: 'item-1',
          quantity: 4,
          commitment_number: null,
          product_name_snapshot: 'Mesa',
          demand_product_bids: [
            {
              id: 'bid-1',
              supplier_id: 'sup-b',
              amount: 500.0,
              status: 'classified',
              suppliers: mockSupplierB,
            },
          ],
        },
      ]

      const { winningSuppliersSummary } = useDemandDetail('demand-1')
      expect(winningSuppliersSummary.value).toHaveLength(1)

      const winnerB = winningSuppliersSummary.value[0]
      expect(winnerB.id).toBe('sup-b')
      expect(winnerB.is_simples_optant).toBe(false)
      expect(winnerB.simples_optant_verified_at).toBeNull()
      expect(winnerB.totalAmountWon).toBe(2000)
      expect(winnerB.allPendingCommitments).toBe(true)
      expect(winnerB.hasPendingCommitments).toBe(true)
      expect(winnerB.pendingCommitmentsCount).toBe(1)
      expect(winnerB.pendingCommitmentsAmount).toBe(2000)
      expect(winnerB.commitments).toHaveLength(0)
    })

    it('separates different commitment numbers and handles partial commitments', () => {
      mockItems.value = [
        {
          id: 'item-1',
          quantity: 2,
          commitment_number: '2026-NE-00001',
          product_name_snapshot: 'Notebook',
          demand_product_bids: [
            {
              id: 'bid-1',
              supplier_id: 'sup-a',
              amount: 3000.0,
              status: 'classified',
              suppliers: mockSupplierA,
            },
          ],
        },
        {
          id: 'item-2',
          quantity: 1,
          commitment_number: '2026-NE-00002',
          product_name_snapshot: 'Monitor',
          demand_product_bids: [
            {
              id: 'bid-2',
              supplier_id: 'sup-a',
              amount: 1200.0,
              status: 'classified',
              suppliers: mockSupplierA,
            },
          ],
        },
        {
          id: 'item-3',
          quantity: 3,
          commitment_number: '',
          product_name_snapshot: 'Mouse',
          demand_product_bids: [
            {
              id: 'bid-3',
              supplier_id: 'sup-a',
              amount: 50.0,
              status: 'classified',
              suppliers: mockSupplierA,
            },
          ],
        },
      ]

      const { winningSuppliersSummary } = useDemandDetail('demand-1')
      const winnerA = winningSuppliersSummary.value[0]

      expect(winnerA.wonCount).toBe(3)
      expect(winnerA.email).toBe('contato@fornecedora.com')
      // 6000 + 1200 + 150 = 7350
      expect(winnerA.totalAmountWon).toBe(7350)
      expect(winnerA.allPendingCommitments).toBe(false)
      expect(winnerA.hasPendingCommitments).toBe(true)
      expect(winnerA.pendingCommitmentsCount).toBe(1)
      expect(winnerA.pendingCommitmentsAmount).toBe(150)
      expect(winnerA.commitments).toHaveLength(2)
      expect(winnerA.commitments[0]).toEqual({
        commitmentNumber: '2026-NE-00001',
        itemsCount: 1,
        totalAmount: 6000,
        itemNames: ['Notebook'],
        status: 'homologated',
        statuses: ['homologated'],
      })
      expect(winnerA.commitments[1]).toEqual({
        commitmentNumber: '2026-NE-00002',
        itemsCount: 1,
        totalAmount: 1200,
        itemNames: ['Monitor'],
        status: 'homologated',
        statuses: ['homologated'],
      })
    })

    it('excludes failed items (cancelled execution status or all bids disqualified) from wonCount and totalAmountWon', () => {
      mockItems.value = [
        {
          id: 'item-valid',
          quantity: 2,
          commitment_number: '2026-NE-00010',
          execution_status: 'homologated',
          product_name_snapshot: 'Cadeira Ergonômica',
          demand_product_bids: [
            {
              id: 'bid-1',
              supplier_id: 'sup-a',
              amount: 500.0,
              status: 'classified',
              suppliers: mockSupplierA,
            },
          ],
        },
        {
          // Item fracassado por cancelamento de empenho
          id: 'item-failed-cancelled',
          quantity: 1,
          commitment_number: '2026-NE-00011',
          execution_status: 'cancelled',
          product_name_snapshot: 'Mesa de Reunião',
          demand_product_bids: [
            {
              id: 'bid-2',
              supplier_id: 'sup-a',
              amount: 2000.0,
              status: 'classified',
              suppliers: mockSupplierA,
            },
          ],
        },
        {
          // Item fracassado por lances desclassificados
          id: 'item-failed-disqualified',
          quantity: 4,
          commitment_number: null,
          execution_status: null,
          product_name_snapshot: 'Armário de Aço',
          demand_product_bids: [
            {
              id: 'bid-3',
              supplier_id: 'sup-a',
              amount: 800.0,
              status: 'disqualified',
              suppliers: mockSupplierA,
            },
          ],
        },
      ]

      const { winningSuppliersSummary } = useDemandDetail('demand-1')
      expect(winningSuppliersSummary.value).toHaveLength(1)

      const winnerA = winningSuppliersSummary.value[0]
      // Participated in all 3 items
      expect(winnerA.participatedCount).toBe(3)
      // Won ONLY the valid item (not the 2 failed ones)
      expect(winnerA.wonCount).toBe(1)
      // Only item-valid: 2 * 500 = 1000. The 2000 and 3200 must NOT be counted.
      expect(winnerA.totalAmountWon).toBe(1000)
      // Only 1 commitment group with 1 item
      expect(winnerA.commitments).toHaveLength(1)
      expect(winnerA.commitments[0]).toEqual({
        commitmentNumber: '2026-NE-00010',
        itemsCount: 1,
        totalAmount: 1000,
        itemNames: ['Cadeira Ergonômica'],
        status: 'homologated',
        statuses: ['homologated'],
      })
    })

    it('returns empty winning suppliers if all items in the demand are failed or cancelled', () => {
      mockItems.value = [
        {
          id: 'item-cancelled',
          quantity: 1,
          execution_status: 'cancelled',
          product_name_snapshot: 'Item Cancelado',
          demand_product_bids: [
            {
              id: 'bid-1',
              supplier_id: 'sup-a',
              amount: 1500.0,
              status: 'classified',
              suppliers: mockSupplierA,
            },
          ],
        },
      ]

      const { winningSuppliersSummary } = useDemandDetail('demand-1')
      expect(winningSuppliersSummary.value).toEqual([])
    })

    it('captures custom execution status in commitment groups', () => {
      mockItems.value = [
        {
          id: 'item-1',
          quantity: 2,
          commitment_number: '2026-NE-00050',
          execution_status: 'shipped',
          product_name_snapshot: 'Teclado Mecânico',
          demand_product_bids: [
            {
              id: 'bid-1',
              supplier_id: 'sup-a',
              amount: 250.0,
              status: 'classified',
              suppliers: mockSupplierA,
            },
          ],
        },
      ]

      const { winningSuppliersSummary } = useDemandDetail('demand-1')
      expect(winningSuppliersSummary.value[0].commitments[0].status).toBe('shipped')
      expect(winningSuppliersSummary.value[0].commitments[0].statuses).toEqual(['shipped'])
    })
  })
})
