import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { ref } from 'vue'
import ItemDetailPage from '~/pages/demands/[id]/items/[itemId].vue'

const {
  mockItemData,
  mockBidsData,
  mockUpdateBidStatus,
  mockAddBid,
  mockRemoveBid,
  mockRefreshBids,
} = vi.hoisted(() => ({
  mockItemData: {
    value: {
      id: 'item-1',
      product_id: 'prod-1',
      quantity: 2,
      reference_price: 100,
      bid_interval: 3,
      bid_interval_type: 'percentage',
      demand: { status: 'dispute' },
    },
  },
  mockBidsData: {
    value: [
      {
        id: 'bid-1',
        amount: 80,
        status: 'classified',
        disqualification_reason: null,
        created_at: '2026-10-16T09:00:00Z',
        suppliers: { company_name: 'Fornecedor A', cnpj: '11111111000111' },
      },
      {
        id: 'bid-2',
        amount: 90,
        status: 'classified',
        disqualification_reason: null,
        created_at: '2026-10-16T09:05:00Z',
        suppliers: { company_name: 'Fornecedor B', cnpj: '22222222000122' },
      },
    ],
  },
  mockUpdateBidStatus: vi.fn().mockResolvedValue(undefined),
  mockAddBid: vi.fn().mockResolvedValue(undefined),
  mockRemoveBid: vi.fn().mockResolvedValue(undefined),
  mockRefreshBids: vi.fn().mockResolvedValue(undefined),
}))

mockNuxtImport('definePageMeta', () => vi.fn())
mockNuxtImport('useRoute', () => () => ({
  params: { id: 'demand-1', itemId: 'item-1' },
}))
mockNuxtImport('useRouter', () => () => ({
  push: vi.fn(),
}))
mockNuxtImport('useAsyncData', () => (key: string) => {
  if (key.startsWith('demand-item-')) {
    return {
      data: ref(mockItemData.value),
      pending: ref(false),
      error: ref(null),
      refresh: vi.fn(),
    }
  }
  if (key.startsWith('item-bids-')) {
    return {
      data: ref(mockBidsData.value),
      pending: ref(false),
      error: ref(null),
      refresh: mockRefreshBids,
    }
  }
  return { data: ref([]), pending: ref(false), error: ref(null), refresh: vi.fn() }
})
mockNuxtImport('useDemandProducts', () => () => ({
  fetchDemandItemDetails: vi.fn().mockResolvedValue(mockItemData.value),
  updateDemandItemWithDependencies: vi.fn().mockResolvedValue({}),
}))
mockNuxtImport('useMeasurementUnits', () => () => ({
  fetchUnits: vi.fn().mockResolvedValue([]),
  resolveOrCreateUnit: vi.fn().mockResolvedValue('unit-1'),
}))
mockNuxtImport('useProductBids', () => () => ({
  fetchBidsByProduct: vi.fn().mockResolvedValue(mockBidsData.value),
  addBid: mockAddBid,
  updateBidStatus: mockUpdateBidStatus,
  removeBid: mockRemoveBid,
}))
mockNuxtImport('useSuppliers', () => () => ({
  fetchAllActiveSuppliers: vi.fn().mockResolvedValue([]),
  createSupplierFast: vi.fn(),
}))

describe('Demand Item Detail Page - Bid Classification & Disqualification', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockBidsData.value = [
      {
        id: 'bid-1',
        amount: 80,
        status: 'classified',
        disqualification_reason: null,
        created_at: '2026-10-16T09:00:00Z',
        suppliers: { company_name: 'Fornecedor A', cnpj: '11111111000111' },
      },
      {
        id: 'bid-2',
        amount: 90,
        status: 'classified',
        disqualification_reason: null,
        created_at: '2026-10-16T09:05:00Z',
        suppliers: { company_name: 'Fornecedor B', cnpj: '22222222000122' },
      },
    ]
  })

  it('computes winningBid and getBidPosition excluding disqualified bids', () => {
    mockBidsData.value[0].status = 'disqualified'
    const wrapper = shallowMount(ItemDetailPage)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vm = wrapper.vm as any

    expect(vm.winningBid?.id).toBe('bid-2')
    expect(vm.getBidPosition('bid-1')).toBeNull()
    expect(vm.getBidPosition('bid-2')).toBe(1)
  })

  it('opens disqualify modal, submits disqualification reason, and refreshes bids', async () => {
    const wrapper = shallowMount(ItemDetailPage)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vm = wrapper.vm as any

    vm.openDisqualifyModal(mockBidsData.value[0])
    expect(vm.isDisqualifyModalOpen).toBe(true)
    expect(vm.selectedBidForStatus?.id).toBe('bid-1')

    vm.disqualificationReason = 'Marca não atende ao termo de referência'
    await vm.confirmDisqualifyBid()

    expect(mockUpdateBidStatus).toHaveBeenCalledWith(
      'bid-1',
      'disqualified',
      'Marca não atende ao termo de referência',
    )
    expect(mockRefreshBids).toHaveBeenCalled()
    expect(vm.isDisqualifyModalOpen).toBe(false)
  })

  it('reclassifies a disqualified bid and refreshes bids', async () => {
    const wrapper = shallowMount(ItemDetailPage)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vm = wrapper.vm as any

    await vm.handleClassifyBid('bid-1')

    expect(mockUpdateBidStatus).toHaveBeenCalledWith('bid-1', 'classified', null)
    expect(mockRefreshBids).toHaveBeenCalled()
  })

  it('prevents bid registration when demand status is quotation but preserves existing bids', async () => {
    mockItemData.value.demand.status = 'quotation'
    const wrapper = shallowMount(ItemDetailPage)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vm = wrapper.vm as any

    expect(vm.canRegisterBids).toBe(false)

    // Existing bids must be preserved and accessible
    expect(vm.bids).toHaveLength(2)
    expect(vm.winningBid?.id).toBe('bid-1')

    // Attempting to open bid modal should be blocked
    vm.openBidModal()
    expect(vm.isBidModalOpen).toBe(false)
    expect(vm.bidError).toBe('O registro de lances é permitido apenas durante a fase de Disputa.')

    // Attempting to save bid should be blocked without calling addBid
    await vm.saveBid()
    expect(mockAddBid).not.toHaveBeenCalled()
  })

  it('allows bid registration when demand status is dispute', () => {
    mockItemData.value.demand.status = 'dispute'
    const wrapper = shallowMount(ItemDetailPage)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vm = wrapper.vm as any

    expect(vm.canRegisterBids).toBe(true)

    vm.openBidModal()
    expect(vm.isBidModalOpen).toBe(true)
    expect(vm.bidError).toBe('')
  })
})
