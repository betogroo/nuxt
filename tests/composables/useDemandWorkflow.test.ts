import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { ref } from 'vue'
import { useDemandWorkflow } from '../../app/composables/useDemandWorkflow'
import type { DemandRow } from '../../app/composables/useDemands'
import type { DemandProductRow } from '../../app/composables/useDemandProducts'

const mockAdvanceDemandStatus = vi.fn().mockResolvedValue({})
const mockRevertDemandStatus = vi.fn().mockResolvedValue({})
const mockRequestDemandReturn = vi.fn().mockResolvedValue({})
const mockFetchDemandById = vi.fn().mockResolvedValue(null)

mockNuxtImport('useDemands', () => () => ({
  advanceDemandStatus: mockAdvanceDemandStatus,
  revertDemandStatus: mockRevertDemandStatus,
  requestDemandReturn: mockRequestDemandReturn,
  fetchDemandById: mockFetchDemandById,
}))
const mockUpdateEq = vi.fn().mockResolvedValue({ error: null })
const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq })
const mockInsert = vi.fn().mockResolvedValue({ error: null })

mockNuxtImport('useSupabaseClient', () =>
  vi.fn(() => ({
    from: vi.fn(() => ({
      update: mockUpdate,
      insert: mockInsert,
    })),
  })),
)
mockNuxtImport('useSupabaseUser', () => vi.fn(() => ({ value: { id: 'user-1' } })))
mockNuxtImport('useLogger', () => () => ({ logAction: vi.fn() }))

describe('useDemandWorkflow', () => {
  let demandRef: ReturnType<typeof ref<DemandRow | null>>
  let itemsRef: ReturnType<typeof ref<DemandProductRow[] | null>>

  beforeEach(() => {
    vi.clearAllMocks()
    demandRef = ref<DemandRow | null>({
      id: 'demand-123',
      name: 'Demanda de Teste',
      status: 'quotation',
      type: 'consumption',
      process_number: '123/2026',
      internal_process_number: 'INT-123',
      id_pca: 'PCA-1',
      contract_number: null,
      bidding_notice_number: null,
      dispute_number: null,
      dispute_date: null,
      offer_opening_date: null,
    } as unknown as DemandRow)

    itemsRef = ref<DemandProductRow[]>([
      {
        id: 'item-1',
        quantity: 10,
        unit_id: 'unit-1',
        reference_price: 5.5,
        bid_interval: 3,
        bid_interval_type: 'percentage',
      } as unknown as DemandProductRow,
    ])
  })

  it('pre-populates advanceModal payload with existing demand data on openAdvanceModal', () => {
    demandRef.value!.bidding_notice_number = 'AV-2026/01'
    demandRef.value!.dispute_number = 'DISP-99'
    demandRef.value!.dispute_date = '2026-11-01'
    demandRef.value!.offer_opening_date = '2026-11-01T10:00:00.000Z'

    const workflow = useDemandWorkflow('demand-123', demandRef, itemsRef)
    workflow.openAdvanceModal()

    expect(workflow.targetStatus.value).toBe('bidding_notice')
    expect(workflow.advanceModal.payload.value.bidding_notice_number).toBe('AV-2026/01')
    expect(workflow.advanceModal.payload.value.dispute_number).toBe('DISP-99')
    expect(workflow.advanceModal.payload.value.dispute_date).toBe('2026-11-01')
    expect(workflow.advanceModal.isOpen.value).toBe(true)
  })

  it('advances to bidding_notice even when notice/dispute fields are not filled (optional)', async () => {
    const workflow = useDemandWorkflow('demand-123', demandRef, itemsRef)
    workflow.openAdvanceModal()

    // Ensure all notice fields in modal are empty
    workflow.advanceModal.payload.value.bidding_notice_number = ''
    workflow.advanceModal.payload.value.dispute_number = ''
    workflow.advanceModal.payload.value.dispute_date = ''
    workflow.advanceModal.payload.value.offer_opening_date = ''
    workflow.advanceModal.payload.value.offer_opening_time = ''

    await workflow.confirmAdvanceStatus()

    expect(workflow.advanceModal.error.value).toBe('')
    expect(mockAdvanceDemandStatus).toHaveBeenCalledWith('demand-123', 'bidding_notice', {})
    expect(workflow.advanceModal.isOpen.value).toBe(false)
  })

  it('saves notice/dispute fields when advancing to bidding_notice if provided', async () => {
    const workflow = useDemandWorkflow('demand-123', demandRef, itemsRef)
    workflow.openAdvanceModal()

    workflow.advanceModal.payload.value.bidding_notice_number = '001/2026'
    workflow.advanceModal.payload.value.dispute_number = '99/2026'
    workflow.advanceModal.payload.value.dispute_date = '2026-11-10'
    workflow.advanceModal.payload.value.offer_opening_date = '2026-11-05'
    workflow.advanceModal.payload.value.offer_opening_time = '09:00'

    await workflow.confirmAdvanceStatus()

    expect(workflow.advanceModal.error.value).toBe('')
    expect(mockAdvanceDemandStatus).toHaveBeenCalledWith(
      'demand-123',
      'bidding_notice',
      expect.objectContaining({
        bidding_notice_number: '001/2026',
        dispute_number: '99/2026',
        dispute_date: '2026-11-10',
      }),
    )
  })

  it('fails to advance to bidding_notice if items are invalid or missing', async () => {
    itemsRef.value = []
    const workflow = useDemandWorkflow('demand-123', demandRef, itemsRef)
    workflow.openAdvanceModal()

    await workflow.confirmAdvanceStatus()

    expect(workflow.advanceModal.error.value).toContain('adicionar pelo menos um produto')
    expect(mockAdvanceDemandStatus).not.toHaveBeenCalled()
  })

  it('blocks advancing to bidding_notice when an item has no bid interval', async () => {
    itemsRef.value = [
      {
        id: 'item-1',
        product_name_snapshot: 'Caneta Azul',
        quantity: 10,
        unit_id: 'unit-1',
        reference_price: 5.5,
        bid_interval: null,
        bid_interval_type: null,
      } as unknown as DemandProductRow,
      {
        id: 'item-2',
        product_name_snapshot: 'Papel A4',
        quantity: 2,
        unit_id: 'unit-1',
        reference_price: 20,
        bid_interval: 5,
        bid_interval_type: 'monetary',
      } as unknown as DemandProductRow,
    ]
    const workflow = useDemandWorkflow('demand-123', demandRef, itemsRef)
    workflow.openAdvanceModal()

    await workflow.confirmAdvanceStatus()

    expect(workflow.advanceModal.error.value).toContain('intervalo de lances')
    expect(workflow.advanceModal.error.value).toContain('Caneta Azul')
    expect(workflow.advanceModal.error.value).not.toContain('Papel A4')
    expect(mockAdvanceDemandStatus).not.toHaveBeenCalled()
  })

  it('blocks advancing to bidding_notice when bid interval type or value is missing or zero', async () => {
    itemsRef.value = [
      {
        id: 'item-1',
        quantity: 1,
        unit_id: 'unit-1',
        reference_price: 1,
        bid_interval: 3,
        bid_interval_type: null,
      } as unknown as DemandProductRow,
    ]
    const workflow = useDemandWorkflow('demand-123', demandRef, itemsRef)
    workflow.openAdvanceModal()
    await workflow.confirmAdvanceStatus()
    expect(workflow.advanceModal.error.value).toContain('intervalo de lances')

    itemsRef.value = [
      {
        id: 'item-1',
        quantity: 1,
        unit_id: 'unit-1',
        reference_price: 1,
        bid_interval: 0,
        bid_interval_type: 'percentage',
      } as unknown as DemandProductRow,
    ]
    await workflow.confirmAdvanceStatus()
    expect(workflow.advanceModal.error.value).toContain('intervalo de lances')
    expect(mockAdvanceDemandStatus).not.toHaveBeenCalled()
  })

  it('applies the bid interval requirement to historical demands as well', async () => {
    demandRef.value!.is_historical = true
    itemsRef.value![0]!.bid_interval = null
    const workflow = useDemandWorkflow('demand-123', demandRef, itemsRef)
    workflow.openAdvanceModal()

    await workflow.confirmAdvanceStatus()

    expect(workflow.advanceModal.error.value).toContain('intervalo de lances')
    expect(mockAdvanceDemandStatus).not.toHaveBeenCalled()
  })

  describe('Advancing to Dispute', () => {
    beforeEach(() => {
      demandRef.value!.status = 'bidding_notice'
    })

    it('strictly forbids advancing to dispute if bidding_notice_number is missing', async () => {
      const workflow = useDemandWorkflow('demand-123', demandRef, itemsRef)
      workflow.openAdvanceModal()
      workflow.advanceModal.payload.value = {
        bidding_notice_number: '',
        dispute_number: '123',
        dispute_date: '2026-11-10',
        offer_opening_date: '2026-11-05',
        offer_opening_time: '10:00',
        contract_number: '',
      }

      await workflow.confirmAdvanceStatus()

      expect(workflow.advanceModal.error.value).toContain('aviso de contratação é obrigatório')
      expect(mockAdvanceDemandStatus).not.toHaveBeenCalled()
    })

    it('strictly forbids advancing to dispute if dispute_number is missing', async () => {
      const workflow = useDemandWorkflow('demand-123', demandRef, itemsRef)
      workflow.openAdvanceModal()
      workflow.advanceModal.payload.value = {
        bidding_notice_number: '01/2026',
        dispute_number: '',
        dispute_date: '2026-11-10',
        offer_opening_date: '2026-11-05',
        offer_opening_time: '10:00',
        contract_number: '',
      }

      await workflow.confirmAdvanceStatus()

      expect(workflow.advanceModal.error.value).toContain('número da disputa é obrigatório')
      expect(mockAdvanceDemandStatus).not.toHaveBeenCalled()
    })

    it('strictly forbids advancing to dispute if dispute_date is missing', async () => {
      const workflow = useDemandWorkflow('demand-123', demandRef, itemsRef)
      workflow.openAdvanceModal()
      workflow.advanceModal.payload.value = {
        bidding_notice_number: '01/2026',
        dispute_number: '55/2026',
        dispute_date: '',
        offer_opening_date: '2026-11-05',
        offer_opening_time: '10:00',
        contract_number: '',
      }

      await workflow.confirmAdvanceStatus()

      expect(workflow.advanceModal.error.value).toContain('data da disputa é obrigatória')
      expect(mockAdvanceDemandStatus).not.toHaveBeenCalled()
    })

    it('strictly forbids advancing to dispute if offer_opening_date/time is missing', async () => {
      const workflow = useDemandWorkflow('demand-123', demandRef, itemsRef)
      workflow.openAdvanceModal()
      workflow.advanceModal.payload.value = {
        bidding_notice_number: '01/2026',
        dispute_number: '55/2026',
        dispute_date: '2026-11-10',
        offer_opening_date: '',
        offer_opening_time: '',
        contract_number: '',
      }

      await workflow.confirmAdvanceStatus()

      expect(workflow.advanceModal.error.value).toContain('abertura de ofertas são obrigatórias')
      expect(mockAdvanceDemandStatus).not.toHaveBeenCalled()
    })

    it('strictly forbids advancing to dispute if offer_opening_date violates interval rules', async () => {
      const workflow = useDemandWorkflow('demand-123', demandRef, itemsRef)
      workflow.openAdvanceModal()
      // Dispute on 2026-11-10, opening on 2026-11-09 (only 1 day before dispute, requires 3)
      workflow.advanceModal.payload.value = {
        bidding_notice_number: '01/2026',
        dispute_number: '55/2026',
        dispute_date: '2026-11-10',
        offer_opening_date: '2026-11-09',
        offer_opening_time: '10:00',
        contract_number: '',
      }

      await workflow.confirmAdvanceStatus()

      expect(workflow.advanceModal.error.value).toContain('3 dias antes da data da disputa')
      expect(mockAdvanceDemandStatus).not.toHaveBeenCalled()
    })

    it('strictly forbids advancing to dispute if offer_opening_time is outside commercial hours', async () => {
      const workflow = useDemandWorkflow('demand-123', demandRef, itemsRef)
      workflow.openAdvanceModal()
      workflow.advanceModal.payload.value = {
        bidding_notice_number: '01/2026',
        dispute_number: '55/2026',
        dispute_date: '2026-11-10',
        offer_opening_date: '2026-11-05',
        offer_opening_time: '07:30',
        contract_number: '',
      }

      await workflow.confirmAdvanceStatus()

      expect(workflow.advanceModal.error.value).toContain('entre 08:00 e 18:00')
      expect(mockAdvanceDemandStatus).not.toHaveBeenCalled()
    })

    it('successfully advances to dispute when all 4 fields are provided and valid', async () => {
      const workflow = useDemandWorkflow('demand-123', demandRef, itemsRef)
      workflow.openAdvanceModal()
      workflow.advanceModal.payload.value = {
        bidding_notice_number: '01/2026',
        dispute_number: '55/2026',
        dispute_date: '2026-11-10',
        offer_opening_date: '2026-11-05',
        offer_opening_time: '14:30',
        contract_number: '',
      }

      await workflow.confirmAdvanceStatus()

      expect(workflow.advanceModal.error.value).toBe('')
      expect(mockAdvanceDemandStatus).toHaveBeenCalledWith(
        'demand-123',
        'dispute',
        expect.objectContaining({
          bidding_notice_number: '01/2026',
          dispute_number: '55/2026',
          dispute_date: '2026-11-10',
        }),
      )
      expect(workflow.advanceModal.isOpen.value).toBe(false)
    })
  })

  describe('Advancing from Dispute to Homologation (Finalizing Dispute)', () => {
    beforeEach(() => {
      demandRef.value!.status = 'dispute'
    })

    it('sets targetStatus to homologation when opening advance modal in dispute status', () => {
      const workflow = useDemandWorkflow('demand-123', demandRef, itemsRef)
      workflow.openAdvanceModal()

      expect(workflow.targetStatus.value).toBe('homologation')
      expect(workflow.advanceModal.isOpen.value).toBe(true)
    })

    it('fails to finalize dispute if items are missing', async () => {
      itemsRef.value = []
      const workflow = useDemandWorkflow('demand-123', demandRef, itemsRef)
      workflow.openAdvanceModal()

      await workflow.confirmAdvanceStatus()

      expect(workflow.advanceModal.error.value).toContain(
        'Não é possível finalizar a disputa de uma demanda sem itens.',
      )
      expect(mockAdvanceDemandStatus).not.toHaveBeenCalled()
    })

    it('successfully finalizes dispute and advances to homologation', async () => {
      const mockRefreshItems = vi.fn().mockResolvedValue([])
      const workflow = useDemandWorkflow('demand-123', demandRef, itemsRef, mockRefreshItems)
      await workflow.openAdvanceModal()
      expect(mockRefreshItems).toHaveBeenCalledTimes(1)

      workflow.advanceModal.payload.value.contract_number = 'CTR-2026/01'

      await workflow.confirmAdvanceStatus()

      expect(workflow.advanceModal.error.value).toBe('')
      expect(mockAdvanceDemandStatus).toHaveBeenCalledWith(
        'demand-123',
        'homologation',
        expect.objectContaining({
          contract_number: 'CTR-2026/01',
        }),
      )
      expect(mockRefreshItems).toHaveBeenCalledTimes(3) // 1 in open, 1 before check, 1 after advance
      expect(workflow.advanceModal.isOpen.value).toBe(false)
    })

    it('initializes execution_status to homologated and logs history for winning items', async () => {
      itemsRef.value = [
        {
          id: 'item-winner-1',
          quantity: 10,
          demand_product_bids: [
            {
              id: 'bid-1',
              amount: 5.5,
              status: 'classified',
              supplier_id: 'supp-1',
            },
          ],
        } as unknown as DemandProductRow,
      ]

      const mockRefreshItems = vi.fn().mockResolvedValue([])
      const workflow = useDemandWorkflow('demand-123', demandRef, itemsRef, mockRefreshItems)
      await workflow.openAdvanceModal()
      await workflow.confirmAdvanceStatus()

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          execution_status: 'homologated',
        }),
      )
      expect(mockUpdateEq).toHaveBeenCalledWith('id', 'item-winner-1')
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          demand_product_id: 'item-winner-1',
          status: 'homologated',
        }),
      )
    })

    it('reverts status and calls refreshItems', async () => {
      const mockRefreshItems = vi.fn().mockResolvedValue([])
      const workflow = useDemandWorkflow('demand-123', demandRef, itemsRef, mockRefreshItems)
      workflow.openRevertModal()
      await workflow.confirmRevertStatus()

      expect(mockRevertDemandStatus).toHaveBeenCalledWith('demand-123', 'bidding_notice')
      expect(mockRefreshItems).toHaveBeenCalledTimes(1)
    })
  })

  describe('Advancing from planning to quotation', () => {
    beforeEach(() => {
      demandRef.value = {
        id: 'demand-123',
        name: 'Demanda Planejamento',
        status: 'planning',
        type: 'consumption',
        process_number: '123/2026',
        internal_process_number: 'INT-123',
        id_pca: 'PCA-1',
        contract_number: 'CTR-01',
        siafem_number: null,
      } as unknown as DemandRow
    })

    it('blocks advancing to quotation if siafem_number is missing', async () => {
      const workflow = useDemandWorkflow('demand-123', demandRef, itemsRef)
      workflow.openAdvanceModal()

      expect(workflow.targetStatus.value).toBe('quotation')
      await workflow.confirmAdvanceStatus()

      expect(workflow.advanceModal.error.value).toContain('Nº SIAFEM')
      expect(mockAdvanceDemandStatus).not.toHaveBeenCalled()
    })

    it('allows advancing to quotation when all planning fields including siafem_number are present', async () => {
      demandRef.value!.siafem_number = '2026NE000123'
      const workflow = useDemandWorkflow('demand-123', demandRef, itemsRef)
      workflow.openAdvanceModal()

      expect(workflow.targetStatus.value).toBe('quotation')
      await workflow.confirmAdvanceStatus()

      expect(workflow.advanceModal.error.value).toBe('')
      expect(mockAdvanceDemandStatus).toHaveBeenCalledWith('demand-123', 'quotation', {})
    })
  })
})
