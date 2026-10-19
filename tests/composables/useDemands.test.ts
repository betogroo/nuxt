import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useDemands } from '../../app/composables/useDemands'
import { useDemandProducts } from '../../app/composables/useDemandProducts'

const logActionMock = vi.fn()
mockNuxtImport('useLogger', () => () => ({ logAction: logActionMock }))

const updateMock = vi.fn()
const eqMock = vi.fn()
const deleteMock = vi.fn()
const selectMock = vi.fn()
const isMock = vi.fn()
const orderMock = vi.fn()
const rangeMock = vi.fn()
const singleMock = vi.fn()

const supabaseMock = {
  from: vi.fn((_table: string) => {
    return {
      select: selectMock.mockReturnThis(),
      is: isMock.mockReturnThis(),
      order: orderMock.mockReturnThis(),
      range: rangeMock.mockResolvedValue({ data: [], count: 0, error: null }),
      eq: eqMock.mockReturnThis(),
      single: singleMock.mockResolvedValue({ data: { id: 'demand-1' }, error: null }),
      update: updateMock.mockImplementation(() => ({
        eq: eqMock.mockResolvedValue({ error: null }),
      })),
      delete: deleteMock.mockImplementation(() => ({
        eq: eqMock.mockResolvedValue({ error: null }),
      })),
    }
  }),
}

mockNuxtImport('useSupabaseClient', () => {
  return vi.fn(() => supabaseMock)
})

mockNuxtImport('useSupabaseUser', () => {
  return vi.fn(() => ({ value: { id: 'user-1' } }))
})

describe('useDemands', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should be defined with all CRUD and safe-delete methods', () => {
    const composable = useDemands()
    expect(composable.fetchDemands).toBeDefined()
    expect(composable.fetchDemandById).toBeDefined()
    expect(composable.deleteDemand).toBeDefined()
    expect(composable.restoreDemand).toBeDefined()
  })

  it('fetchDemands should filter by deleted_at is null', async () => {
    const { fetchDemands } = useDemands()
    await fetchDemands(1, 10)

    expect(supabaseMock.from).toHaveBeenCalledWith('demands')
    expect(isMock).toHaveBeenCalledWith('deleted_at', null)
  })

  it('fetchDemandById should filter by deleted_at is null', async () => {
    const { fetchDemandById } = useDemands()
    await fetchDemandById('demand-123')

    expect(supabaseMock.from).toHaveBeenCalledWith('demands')
    expect(eqMock).toHaveBeenCalledWith('id', 'demand-123')
    expect(isMock).toHaveBeenCalledWith('deleted_at', null)
  })

  it('deleteDemand should perform safe delete by setting deleted_at and logging action', async () => {
    const { deleteDemand } = useDemands()
    await deleteDemand('demand-123')

    expect(supabaseMock.from).toHaveBeenCalledWith('demands')
    expect(updateMock).toHaveBeenCalledWith({
      deleted_at: expect.any(String),
    })
    expect(eqMock).toHaveBeenCalledWith('id', 'demand-123')
    expect(logActionMock).toHaveBeenCalledWith(
      'DELETE_DEMAND',
      expect.stringContaining('demand-123'),
      'user-1',
    )
  })

  it('restoreDemand should restore demand by setting deleted_at to null and logging action', async () => {
    const { restoreDemand } = useDemands()
    await restoreDemand('demand-123')

    expect(supabaseMock.from).toHaveBeenCalledWith('demands')
    expect(updateMock).toHaveBeenCalledWith({
      deleted_at: null,
    })
    expect(eqMock).toHaveBeenCalledWith('id', 'demand-123')
    expect(logActionMock).toHaveBeenCalledWith(
      'RESTORE_DEMAND',
      expect.stringContaining('demand-123'),
      'user-1',
    )
  })
})

describe('useDemandProducts', () => {
  it('should be defined', () => {
    const composable = useDemandProducts()
    expect(composable.fetchDemandProducts).toBeDefined()
    expect(composable.addDemandProduct).toBeDefined()
  })
})
