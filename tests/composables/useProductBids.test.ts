import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useProductBids } from '../../app/composables/useProductBids'

const insertMock = vi.fn()
const deleteMock = vi.fn()
const selectMock = vi.fn()
const eqMock = vi.fn()
const orderMock = vi.fn()
const logActionMock = vi.fn()

const fromMock = vi.fn((table: string) => {
  if (table === 'demand_product_bids') {
    return {
      insert: insertMock,
      delete: deleteMock,
      select: selectMock,
    }
  }
  return {}
})

mockNuxtImport('useSupabaseClient', () => () => ({
  from: fromMock,
}))
mockNuxtImport('useSupabaseUser', () => () => ({ value: { id: 'user-admin' } }))
mockNuxtImport('useLogger', () => () => ({ logAction: logActionMock }))

describe('useProductBids', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    insertMock.mockResolvedValue({ error: null })
    deleteMock.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
    orderMock.mockResolvedValue({ data: [{ id: 'bid-1', amount: 100 }], error: null })
    eqMock.mockReturnValue({ order: orderMock })
    selectMock.mockReturnValue({ eq: eqMock })
  })

  it('fetchBidsByProduct should query demand_product_bids ordered by amount', async () => {
    const { fetchBidsByProduct } = useProductBids()
    const result = await fetchBidsByProduct('prod-1')

    expect(fromMock).toHaveBeenCalledWith('demand_product_bids')
    expect(selectMock).toHaveBeenCalledWith('*, suppliers(*)')
    expect(eqMock).toHaveBeenCalledWith('demand_product_id', 'prod-1')
    expect(orderMock).toHaveBeenCalledWith('amount', { ascending: true })
    expect(result).toEqual([{ id: 'bid-1', amount: 100 }])
  })

  it('addBid should support positional arguments (itemId, supplierId, amount)', async () => {
    const { addBid } = useProductBids()
    await addBid('item-123', 'supp-456', 405.5)

    expect(insertMock).toHaveBeenCalledWith({
      demand_product_id: 'item-123',
      supplier_id: 'supp-456',
      amount: 405.5,
    })
    expect(logActionMock).toHaveBeenCalledWith(
      'ADD_PRODUCT_BID',
      'Lance de R$ 405.5 adicionado para o produto da demanda (ID: item-123)',
      'user-admin',
    )
  })

  it('addBid should support object argument { supplier_id, amount } and parse numeric amount', async () => {
    const { addBid } = useProductBids()
    await addBid('item-123', {
      supplier_id: 'supp-456',
      amount: '405.50',
      is_winner: false,
    })

    expect(insertMock).toHaveBeenCalledWith({
      demand_product_id: 'item-123',
      supplier_id: 'supp-456',
      amount: 405.5,
    })
    expect(logActionMock).toHaveBeenCalledWith(
      'ADD_PRODUCT_BID',
      'Lance de R$ 405.5 adicionado para o produto da demanda (ID: item-123)',
      'user-admin',
    )
  })

  it('removeBid should delete bid and log action', async () => {
    const { removeBid } = useProductBids()
    await removeBid('bid-999')

    expect(fromMock).toHaveBeenCalledWith('demand_product_bids')
    expect(deleteMock).toHaveBeenCalled()
    expect(logActionMock).toHaveBeenCalledWith(
      'REMOVE_PRODUCT_BID',
      'Lance (ID: bid-999) removido',
      'user-admin',
    )
  })
})
