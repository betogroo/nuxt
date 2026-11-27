import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import {
  useDemands,
  calculateDemandDashboardSummary,
  createEmptyDemandDashboardSummary,
} from '../../app/composables/useDemands'

const mockLogAction = vi.fn()
const mockSupabase = {
  from: vi.fn(),
}

mockNuxtImport('useSupabaseClient', () => vi.fn(() => mockSupabase))
mockNuxtImport('useSupabaseUser', () => vi.fn(() => ({ value: { id: 'user-123' } })))
mockNuxtImport('useLogger', () => () => ({ logAction: mockLogAction }))

describe('useDemands & Dashboard Summary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('createEmptyDemandDashboardSummary returns zeroed metrics', () => {
    const empty = createEmptyDemandDashboardSummary()
    expect(empty.totalActive).toBe(0)
    expect(empty.inPreparation).toBe(0)
    expect(empty.inExecution).toBe(0)
    expect(empty.completed).toBe(0)
    expect(empty.returnsCount).toBe(0)
    expect(empty.byType.consumption).toBe(0)
    expect(empty.byType.permanent).toBe(0)
    expect(empty.byModality.dispensation).toBe(0)
    expect(empty.byModality.bidding).toBe(0)
  })

  it('calculateDemandDashboardSummary aggregates counts by stage group, status, type, and return requests', () => {
    const summary = calculateDemandDashboardSummary([
      {
        status: 'planning',
        type: 'consumption',
        modality: 'dispensation',
        is_return_requested: false,
      },
      {
        status: 'bidding_notice',
        type: 'consumption',
        modality: 'bidding',
        is_return_requested: true,
      },
      {
        status: 'quotation',
        type: 'permanent',
        modality: 'dispensation',
        is_return_requested: false,
      },
      { status: 'dispute', type: 'consumption', modality: 'bidding', is_return_requested: false },
      {
        status: 'homologation',
        type: 'permanent',
        modality: 'dispensation',
        is_return_requested: true,
      },
      {
        status: 'completed',
        type: 'consumption',
        modality: 'dispensation',
        is_return_requested: false,
      },
      { status: 'cancelled', type: 'consumption', modality: 'bidding', is_return_requested: false },
    ])

    expect(summary.totalAll).toBe(7)
    expect(summary.totalActive).toBe(6) // excludes cancelled
    expect(summary.inPreparation).toBe(3) // planning + bidding_notice + quotation
    expect(summary.inExecution).toBe(2) // dispute + homologation
    expect(summary.completed).toBe(1)
    expect(summary.cancelled).toBe(1)
    expect(summary.returnsCount).toBe(2)
    expect(summary.byType.consumption).toBe(4) // active consumption only
    expect(summary.byType.permanent).toBe(2) // active permanent only
    expect(summary.byModality.dispensation).toBe(4) // active dispensation only
    expect(summary.byModality.bidding).toBe(2) // active bidding only
    expect(summary.byStatus.planning).toBe(1)
    expect(summary.byStatus.homologation).toBe(1)
  })

  it('fetchDemandDashboardSummary queries demands and returns aggregated summary', async () => {
    const mockIs = vi.fn().mockResolvedValue({
      data: [
        {
          status: 'planning',
          type: 'consumption',
          modality: 'dispensation',
          is_return_requested: false,
        },
        { status: 'dispute', type: 'permanent', modality: 'bidding', is_return_requested: true },
      ],
      error: null,
    })
    const mockSelect = vi.fn().mockReturnValue({ is: mockIs })
    mockSupabase.from.mockReturnValue({ select: mockSelect })

    const { fetchDemandDashboardSummary } = useDemands()
    const summary = await fetchDemandDashboardSummary()

    expect(mockSupabase.from).toHaveBeenCalledWith('demands')
    expect(mockSelect).toHaveBeenCalledWith('status, type, modality, is_return_requested')
    expect(summary.totalActive).toBe(2)
    expect(summary.inPreparation).toBe(1)
    expect(summary.inExecution).toBe(1)
    expect(summary.returnsCount).toBe(1)
    expect(summary.byModality.dispensation).toBe(1)
    expect(summary.byModality.bidding).toBe(1)
  })

  it('fetchDemands supports group filters (preparation, execution), typeFilter, and unified search', async () => {
    const queryChain = {
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      then: (resolve: (val: { data: unknown[]; count: number; error: null }) => void) =>
        resolve({ data: [], count: 0, error: null }),
    }
    const mockSelect = vi.fn().mockReturnValue(queryChain)
    mockSupabase.from.mockReturnValue({ select: mockSelect })

    const { fetchDemands } = useDemands()
    await fetchDemands(1, 10, 'preparation', '2026-0001', 'consumption')

    expect(queryChain.in).toHaveBeenCalledWith('status', [
      'planning',
      'bidding_notice',
      'quotation',
    ])
    expect(queryChain.eq).toHaveBeenCalledWith('type', 'consumption')
    expect(queryChain.or).toHaveBeenCalledWith(
      'name.ilike.%2026-0001%,process_number.ilike.%2026-0001%,internal_process_number.ilike.%2026-0001%',
    )
    expect(queryChain.order).toHaveBeenCalledWith('internal_process_number', {
      ascending: false,
      nullsFirst: false,
    })
    expect(queryChain.order).toHaveBeenCalledWith('created_at', { ascending: false })
  })

  it('fetchDemands applies yearFilter when provided', async () => {
    const queryChain = {
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      then: (resolve: (val: { data: unknown[]; count: number; error: null }) => void) =>
        resolve({ data: [], count: 0, error: null }),
    }
    const mockSelect = vi.fn().mockReturnValue(queryChain)
    mockSupabase.from.mockReturnValue({ select: mockSelect })

    const { fetchDemands } = useDemands()
    await fetchDemands(1, 10, null, null, null, false, 2026)

    expect(queryChain.or).toHaveBeenCalledWith(
      'internal_process_number.ilike.2026-%,and(internal_process_number.is.null,created_at.gte.2026-01-01T00:00:00.000Z,created_at.lte.2026-12-31T23:59:59.999Z)',
    )
  })

  it('fetchDemandYears queries distinct years and returns them sorted descending', async () => {
    const mockIs = vi.fn().mockResolvedValue({
      data: [
        {
          internal_process_number: '2026-0001',
          dispute_date: null,
          created_at: '2026-01-01T00:00:00Z',
        },
        {
          internal_process_number: null,
          dispute_date: '2025-05-10T12:00:00Z',
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          internal_process_number: '2024-0010',
          dispute_date: null,
          created_at: '2024-02-01T00:00:00Z',
        },
        {
          internal_process_number: '2026-0002',
          dispute_date: null,
          created_at: '2026-03-01T00:00:00Z',
        },
      ],
      error: null,
    })
    const mockSelect = vi.fn().mockReturnValue({ is: mockIs })
    mockSupabase.from.mockReturnValue({ select: mockSelect })

    const { fetchDemandYears } = useDemands()
    const years = await fetchDemandYears()

    expect(mockSupabase.from).toHaveBeenCalledWith('demands')
    expect(mockSelect).toHaveBeenCalledWith('internal_process_number, dispute_date, created_at')
    expect(mockIs).toHaveBeenCalledWith('deleted_at', null)
    expect(years).toEqual([2026, 2025, 2024])
  })

  it('fetchDemands applies neq status completed when hideCompleted is true', async () => {
    const queryChain = {
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      then: (resolve: (val: { data: unknown[]; count: number; error: null }) => void) =>
        resolve({ data: [], count: 0, error: null }),
    }
    const mockSelect = vi.fn().mockReturnValue(queryChain)
    mockSupabase.from.mockReturnValue({ select: mockSelect })

    const { fetchDemands } = useDemands()
    await fetchDemands(1, 10, null, null, null, true)

    expect(queryChain.neq).toHaveBeenCalledWith('status', 'completed')
  })

  it('fetchDemands does not apply neq completed when statusFilter is completed', async () => {
    const queryChain = {
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      then: (resolve: (val: { data: unknown[]; count: number; error: null }) => void) =>
        resolve({ data: [], count: 0, error: null }),
    }
    const mockSelect = vi.fn().mockReturnValue(queryChain)
    mockSupabase.from.mockReturnValue({ select: mockSelect })

    const { fetchDemands } = useDemands()
    await fetchDemands(1, 10, 'completed', null, null, true)

    expect(queryChain.eq).toHaveBeenCalledWith('status', 'completed')
    expect(queryChain.neq).not.toHaveBeenCalled()
  })

  it('createDemand supports is_historical flag and direct status/dispute_date', async () => {
    const singleMock = vi.fn().mockResolvedValue({
      data: {
        id: 'dem-hist-1',
        name: 'Demanda Legada 2025',
        type: 'consumption',
        status: 'completed',
        is_historical: true,
        dispute_date: '2025-08-14',
      },
      error: null,
    })
    const selectMock = vi.fn().mockReturnValue({ single: singleMock })
    const insertMock = vi.fn().mockReturnValue({ select: selectMock })
    mockSupabase.from.mockReturnValue({ insert: insertMock })

    const { createDemand } = useDemands()
    const result = await createDemand({
      name: 'Demanda Legada 2025',
      type: 'consumption',
      user_id: 'user-123',
      status: 'completed',
      is_historical: true,
      dispute_date: '2025-08-14',
    })

    expect(mockSupabase.from).toHaveBeenCalledWith('demands')
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        is_historical: true,
        status: 'completed',
        dispute_date: '2025-08-14',
      }),
    )
    expect(result.is_historical).toBe(true)
    expect(result.status).toBe('completed')
  })

  it('advanceDemandStatus throws an explicit error when 0 rows are updated by RLS', async () => {
    const selectMock = vi.fn().mockResolvedValue({ data: [], error: null })
    const eqMock = vi.fn().mockReturnValue({ select: selectMock })
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock })
    mockSupabase.from.mockReturnValue({ update: updateMock })

    const { advanceDemandStatus } = useDemands()
    await expect(advanceDemandStatus('dem-1', 'quotation', {})).rejects.toThrow(
      'Não foi possível atualizar a demanda. Verifique se você é um dos responsáveis por esta demanda.',
    )
  })
})
