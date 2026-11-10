import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useProductBids } from '../../app/composables/useProductBids'

const insertMock = vi.fn()
const updateMock = vi.fn()
const deleteMock = vi.fn()
const selectMock = vi.fn()
const eqMock = vi.fn()
const orderMock = vi.fn()
const logActionMock = vi.fn()
const bidMaybeSingleMock = vi
  .fn()
  .mockResolvedValue({ data: { demand_product_id: 'item-123' }, error: null })
const productMaybeSingleMock = vi.fn().mockResolvedValue({ data: null })
const productEqMock = vi.fn(() => ({ maybeSingle: productMaybeSingleMock }))
const productSelectMock = vi.fn(() => ({ eq: productEqMock }))

const fromMock = vi.fn((table: string) => {
  if (table === 'demand_product_bids') {
    return {
      insert: insertMock,
      update: updateMock,
      delete: deleteMock,
      select: selectMock,
    }
  }
  if (table === 'demand_products') {
    return {
      select: productSelectMock,
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
    updateMock.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
    deleteMock.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
    orderMock.mockResolvedValue({ data: [{ id: 'bid-1', amount: 100 }], error: null })
    eqMock.mockReturnValue({ order: orderMock, maybeSingle: bidMaybeSingleMock })
    selectMock.mockReturnValue({ eq: eqMock })
  })

  it('fetchBidsByProduct should query demand_product_bids ordered by amount and break ties by created_at', async () => {
    orderMock.mockResolvedValueOnce({
      data: [
        { id: 'bid-newer', amount: 100, created_at: '2026-10-16T12:00:00Z' },
        { id: 'bid-older', amount: 100, created_at: '2026-10-16T11:00:00Z' },
      ],
      error: null,
    })

    const { fetchBidsByProduct } = useProductBids()
    const result = await fetchBidsByProduct('prod-1')

    expect(fromMock).toHaveBeenCalledWith('demand_product_bids')
    expect(selectMock).toHaveBeenCalledWith('*, suppliers(*)')
    expect(eqMock).toHaveBeenCalledWith('demand_product_id', 'prod-1')
    expect(orderMock).toHaveBeenCalledWith('amount', { ascending: true })
    expect(result.map((b) => b.id)).toEqual(['bid-older', 'bid-newer'])
  })

  it('fetchBidsByProduct should place disqualified bids at the end of the returned array', async () => {
    orderMock.mockResolvedValueOnce({
      data: [
        { id: 'bid-disq', amount: 40, status: 'disqualified', created_at: '2026-10-16T10:00:00Z' },
        { id: 'bid-valid-1', amount: 50, status: 'classified', created_at: '2026-10-16T11:00:00Z' },
        { id: 'bid-valid-2', amount: 80, status: 'classified', created_at: '2026-10-16T12:00:00Z' },
      ],
      error: null,
    })

    const { fetchBidsByProduct } = useProductBids()
    const result = await fetchBidsByProduct('prod-1')

    expect(result.map((b) => b.id)).toEqual(['bid-valid-1', 'bid-valid-2', 'bid-disq'])
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

  it('addBid should automatically disqualify bid with reason if amount > referencePrice', async () => {
    const { addBid } = useProductBids()
    await addBid('item-123', 'supp-456', 500, { referencePrice: 400 })

    expect(insertMock).toHaveBeenCalledWith({
      demand_product_id: 'item-123',
      supplier_id: 'supp-456',
      amount: 500,
      status: 'disqualified',
      disqualification_reason: 'Valor ofertado acima do valor referencial.',
    })
    expect(logActionMock).toHaveBeenCalledWith(
      'ADD_PRODUCT_BID',
      'Lance de R$ 500 adicionado para o produto da demanda (ID: item-123) (DESCLASSIFICADO: Valor ofertado acima do valor referencial.)',
      'user-admin',
    )
  })

  it('addBid should automatically fetch referencePrice from demand_products if not provided and disqualify if above', async () => {
    productMaybeSingleMock.mockResolvedValueOnce({ data: { reference_price: 350 } })
    const { addBid } = useProductBids()
    await addBid('item-123', 'supp-456', 360)

    expect(fromMock).toHaveBeenCalledWith('demand_products')
    expect(insertMock).toHaveBeenCalledWith({
      demand_product_id: 'item-123',
      supplier_id: 'supp-456',
      amount: 360,
      status: 'disqualified',
      disqualification_reason: 'Valor ofertado acima do valor referencial.',
    })
  })

  it('addBid should correctly classify bids with 4 decimal places when amount <= referencePrice', async () => {
    const { addBid } = useProductBids()
    await addBid('item-123', 'supp-456', 10.2545, { referencePrice: 10.2545 })

    expect(insertMock).toHaveBeenCalledWith({
      demand_product_id: 'item-123',
      supplier_id: 'supp-456',
      amount: 10.2545,
    })
    expect(logActionMock).toHaveBeenCalledWith(
      'ADD_PRODUCT_BID',
      'Lance de R$ 10.2545 adicionado para o produto da demanda (ID: item-123)',
      'user-admin',
    )
  })

  it('addBid should disqualify bids with 4 decimal places when amount > referencePrice', async () => {
    const { addBid } = useProductBids()
    await addBid('item-123', 'supp-456', 10.2546, { referencePrice: 10.2545 })

    expect(insertMock).toHaveBeenCalledWith({
      demand_product_id: 'item-123',
      supplier_id: 'supp-456',
      amount: 10.2546,
      status: 'disqualified',
      disqualification_reason: 'Valor ofertado acima do valor referencial.',
    })
  })

  it('updateBidStatus should disqualify a bid with reason and log action', async () => {
    const updateEqMock = vi.fn().mockResolvedValue({ error: null })
    updateMock.mockReturnValueOnce({ eq: updateEqMock })

    const { updateBidStatus } = useProductBids()
    await updateBidStatus('bid-123', 'disqualified', '  Especificação divergente do edital  ')

    expect(fromMock).toHaveBeenCalledWith('demand_product_bids')
    expect(updateMock).toHaveBeenCalledWith({
      status: 'disqualified',
      disqualification_reason: 'Especificação divergente do edital',
    })
    expect(updateEqMock).toHaveBeenCalledWith('id', 'bid-123')
    expect(logActionMock).toHaveBeenCalledWith(
      'UPDATE_PRODUCT_BID_STATUS',
      'Lance (ID: bid-123) alterado para DESCLASSIFICADO (Motivo: Especificação divergente do edital)',
      'user-admin',
    )
  })

  it('updateBidStatus should reclassify a bid, clear reason, and log action', async () => {
    const updateEqMock = vi.fn().mockResolvedValue({ error: null })
    updateMock.mockReturnValueOnce({ eq: updateEqMock })

    const { updateBidStatus } = useProductBids()
    await updateBidStatus('bid-123', 'classified', 'qualquer motivo antigo')

    expect(updateMock).toHaveBeenCalledWith({
      status: 'classified',
      disqualification_reason: null,
    })
    expect(updateEqMock).toHaveBeenCalledWith('id', 'bid-123')
    expect(logActionMock).toHaveBeenCalledWith(
      'UPDATE_PRODUCT_BID_STATUS',
      'Lance (ID: bid-123) alterado para CLASSIFICADO',
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
