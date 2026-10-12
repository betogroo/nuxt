import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useIirgdReports } from '~/composables/useIirgdReports'

const supabaseFromMock: Record<string, unknown> = {}
Object.assign(supabaseFromMock, {
  select: vi.fn(() => supabaseFromMock),
  order: vi.fn(() => supabaseFromMock),
  eq: vi.fn(() => supabaseFromMock),
  gte: vi.fn(() => supabaseFromMock),
  lte: vi.fn(() => supabaseFromMock),
})

const supabaseMock = {
  from: vi.fn(() => supabaseFromMock),
}

mockNuxtImport('useSupabaseClient', () => () => supabaseMock)
mockNuxtImport('useSupabaseUser', () => () => ({ value: { id: 'test-user-id' } }))

const logActionMock = vi.fn()
mockNuxtImport('useLogger', () => () => ({
  logAction: logActionMock,
}))

const mockActiveTypes = [
  { id: 'type-1', name: 'Primeira Via' },
  { id: 'type-2', name: 'Segunda Via' },
  { id: 'type-3', name: 'Antecedentes' },
]

mockNuxtImport('useIirgdDocumentTypes', () => () => ({
  fetchAllActiveDocumentTypes: vi.fn().mockResolvedValue(mockActiveTypes),
}))

describe('useIirgdReports', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetchIssuedDemandsByDocumentType should aggregate demands and calculate metrics', async () => {
    const mockHistoryData = [
      {
        demand_id: 'd1',
        created_at: '2026-10-02T10:00:00Z',
        iirgd_demands: {
          id: 'd1',
          station_code: '1342-5',
          document_type_id: 'type-1',
          iirgd_document_types: { id: 'type-1', name: 'Primeira Via' },
        },
      },
      {
        demand_id: 'd2',
        created_at: '2026-10-03T11:00:00Z',
        iirgd_demands: {
          id: 'd2',
          station_code: '1342-5',
          document_type_id: 'type-1',
          iirgd_document_types: { id: 'type-1', name: 'Primeira Via' },
        },
      },
      {
        demand_id: 'd3',
        created_at: '2026-10-04T12:00:00Z',
        iirgd_demands: {
          id: 'd3',
          station_code: '1062-9',
          document_type_id: 'type-2',
          iirgd_document_types: { id: 'type-2', name: 'Segunda Via' },
        },
      },
    ]

    supabaseFromMock.order.mockResolvedValueOnce({
      data: mockHistoryData,
      error: null,
    })

    const { fetchIssuedDemandsByDocumentType } = useIirgdReports()
    const result = await fetchIssuedDemandsByDocumentType({
      startDate: '2026-10-01',
      endDate: '2026-10-05',
    })

    expect(supabaseMock.from).toHaveBeenCalledWith('iirgd_demand_status_history')
    expect(supabaseFromMock.eq).toHaveBeenCalledWith('status', 'issued')
    expect(result.totalIssued).toBe(3)
    expect(result.topDocumentType).toBe('Primeira Via')

    const pVia = result.items.find((i) => i.documentTypeName === 'Primeira Via')
    expect(pVia).toBeDefined()
    expect(pVia?.count).toBe(2)
    expect(pVia?.percentage).toBe(66.7)

    const sVia = result.items.find((i) => i.documentTypeName === 'Segunda Via')
    expect(sVia).toBeDefined()
    expect(sVia?.count).toBe(1)
    expect(sVia?.percentage).toBe(33.3)

    // Antecedentes should have 0 count and 0%
    const ant = result.items.find((i) => i.documentTypeName === 'Antecedentes')
    expect(ant).toBeDefined()
    expect(ant?.count).toBe(0)
    expect(ant?.percentage).toBe(0)

    expect(result.periodDays).toBe(5)
    expect(result.dailyAverage).toBe(0.6)
  })

  it('fetchIssuedDemandsByDocumentType should filter by station code if provided', async () => {
    const mockHistoryData = [
      {
        demand_id: 'd1',
        created_at: '2026-10-02T10:00:00Z',
        iirgd_demands: {
          id: 'd1',
          station_code: '1342-5',
          document_type_id: 'type-1',
          iirgd_document_types: { id: 'type-1', name: 'Primeira Via' },
        },
      },
      {
        demand_id: 'd2',
        created_at: '2026-10-03T11:00:00Z',
        iirgd_demands: {
          id: 'd2',
          station_code: '1062-9',
          document_type_id: 'type-1',
          iirgd_document_types: { id: 'type-1', name: 'Primeira Via' },
        },
      },
    ]

    supabaseFromMock.order.mockResolvedValueOnce({
      data: mockHistoryData,
      error: null,
    })

    const { fetchIssuedDemandsByDocumentType } = useIirgdReports()
    const result = await fetchIssuedDemandsByDocumentType({
      startDate: '2026-10-01',
      endDate: '2026-10-05',
      stationCode: '1342-5',
    })

    expect(supabaseFromMock.eq).toHaveBeenCalledWith('iirgd_demands.station_code', '1342-5')
    expect(result.totalIssued).toBe(1)
  })

  it('fetchIssuedDemandsByDocumentType should deduplicate same demand_id', async () => {
    const mockHistoryData = [
      {
        demand_id: 'd1',
        created_at: '2026-10-02T10:00:00Z',
        iirgd_demands: {
          id: 'd1',
          station_code: '1342-5',
          document_type_id: 'type-1',
          iirgd_document_types: { id: 'type-1', name: 'Primeira Via' },
        },
      },
      {
        demand_id: 'd1', // duplicate history entry for same demand
        created_at: '2026-10-02T15:00:00Z',
        iirgd_demands: {
          id: 'd1',
          station_code: '1342-5',
          document_type_id: 'type-1',
          iirgd_document_types: { id: 'type-1', name: 'Primeira Via' },
        },
      },
    ]

    supabaseFromMock.order.mockResolvedValueOnce({
      data: mockHistoryData,
      error: null,
    })

    const { fetchIssuedDemandsByDocumentType } = useIirgdReports()
    const result = await fetchIssuedDemandsByDocumentType({
      startDate: '2026-10-01',
      endDate: '2026-10-05',
    })

    expect(result.totalIssued).toBe(1)
  })

  it('fetchIssuedDemandsByDocumentType should handle empty results gracefully', async () => {
    supabaseFromMock.order.mockResolvedValueOnce({
      data: [],
      error: null,
    })

    const { fetchIssuedDemandsByDocumentType } = useIirgdReports()
    const result = await fetchIssuedDemandsByDocumentType({
      startDate: '2026-10-01',
      endDate: '2026-10-05',
    })

    expect(result.totalIssued).toBe(0)
    expect(result.topDocumentType).toBeNull()
    expect(result.dailyAverage).toBe(0)
  })

  it('fetchIssuedDemandsByDocumentType should handle demand with missing document type', async () => {
    const mockHistoryData = [
      {
        demand_id: 'd1',
        created_at: '2026-10-02T10:00:00Z',
        iirgd_demands: {
          id: 'd1',
          station_code: '1342-5',
          document_type_id: null,
          iirgd_document_types: null,
        },
      },
    ]

    supabaseFromMock.order.mockResolvedValueOnce({
      data: mockHistoryData,
      error: null,
    })

    const { fetchIssuedDemandsByDocumentType } = useIirgdReports()
    const result = await fetchIssuedDemandsByDocumentType({
      startDate: '2026-10-01',
      endDate: '2026-10-05',
    })

    expect(result.totalIssued).toBe(1)
    const unknownItem = result.items.find((i) => i.documentTypeName === 'Não informado')
    expect(unknownItem).toBeDefined()
    expect(unknownItem?.count).toBe(1)
    expect(unknownItem?.percentage).toBe(100)
  })

  it('exportIssuedDemandsToCsv should trigger logAction', async () => {
    const { exportIssuedDemandsToCsv } = useIirgdReports()
    const sampleData = {
      items: [{ documentTypeId: 't1', documentTypeName: '1ª Via', count: 10, percentage: 100 }],
      totalIssued: 10,
      topDocumentType: '1ª Via',
      dailyAverage: 2,
      periodDays: 5,
      startDate: '2026-10-01',
      endDate: '2026-10-05',
    }

    await exportIssuedDemandsToCsv(sampleData)

    expect(logActionMock).toHaveBeenCalledWith(
      'EXPORT_IIRGD_REPORT',
      expect.stringContaining('2026-10-01 a 2026-10-05'),
    )
  })
})
