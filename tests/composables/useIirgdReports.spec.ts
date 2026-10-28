import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useIirgdReports } from '~/composables/useIirgdReports'
import type { IirgdDemand } from '~/composables/useIirgdDemands'

const { logActionMock, printHtmlViaIframeMock, downloadBlobMock } = vi.hoisted(() => ({
  logActionMock: vi.fn(),
  printHtmlViaIframeMock: vi.fn().mockResolvedValue(undefined),
  downloadBlobMock: vi.fn(),
}))

vi.mock('~/utils/download', () => ({
  downloadBlob: (...args: unknown[]) => downloadBlobMock(...args),
}))

vi.mock('~/utils/reportHtml', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~/utils/reportHtml')>()
  return {
    ...actual,
    printHtmlViaIframe: (...args: unknown[]) => printHtmlViaIframeMock(...args),
  }
})

mockNuxtImport('downloadBlob', () => downloadBlobMock)
mockNuxtImport('printHtmlViaIframe', () => printHtmlViaIframeMock)

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

  it('fetchIssuedDemandsByDocumentType should aggregate demands, stations and calculate metrics', async () => {
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

    // Stations
    expect(result.stations).toContain('1342-5')
    expect(result.stations).toContain('1062-9')
    expect(result.stationTotals['1342-5']).toBe(2)
    expect(result.stationTotals['1062-9']).toBe(1)

    const pVia = result.items.find((i) => i.documentTypeName === 'Primeira Via')
    expect(pVia).toBeDefined()
    expect(pVia?.count).toBe(2)
    expect(pVia?.percentage).toBe(66.7)
    expect(pVia?.stationCounts?.['1342-5']).toBe(2)
    expect(pVia?.stationCounts?.['1062-9']).toBe(0)

    const sVia = result.items.find((i) => i.documentTypeName === 'Segunda Via')
    expect(sVia).toBeDefined()
    expect(sVia?.count).toBe(1)
    expect(sVia?.percentage).toBe(33.3)
    expect(sVia?.stationCounts?.['1342-5']).toBe(0)
    expect(sVia?.stationCounts?.['1062-9']).toBe(1)

    // Antecedentes should have 0 count and 0%
    const ant = result.items.find((i) => i.documentTypeName === 'Antecedentes')
    expect(ant).toBeDefined()
    expect(ant?.count).toBe(0)
    expect(ant?.percentage).toBe(0)
    expect(ant?.stationCounts?.['1342-5']).toBe(0)
    expect(ant?.stationCounts?.['1062-9']).toBe(0)

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
    expect(result.stations).toEqual(['1342-5'])
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
        demand_id: 'd1',
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
    expect(unknownItem?.stationCounts?.['1342-5']).toBe(1)
  })

  it('exportIssuedDemandsToCsv should trigger logAction and support multi-station CSV', async () => {
    const { exportIssuedDemandsToCsv } = useIirgdReports()
    const sampleData = {
      items: [
        {
          documentTypeId: 't1',
          documentTypeName: '1ª Via',
          count: 10,
          percentage: 100,
          stationCounts: { '1342-5': 6, '1062-9': 4 },
        },
      ],
      totalIssued: 10,
      topDocumentType: '1ª Via',
      dailyAverage: 2,
      periodDays: 5,
      startDate: '2026-10-01',
      endDate: '2026-10-05',
      stations: ['1342-5', '1062-9'],
      stationTotals: { '1342-5': 6, '1062-9': 4 },
    }

    await exportIssuedDemandsToCsv(sampleData)

    expect(logActionMock).toHaveBeenCalledWith(
      'EXPORT_IIRGD_REPORT',
      expect.stringContaining('2026-10-01 a 2026-10-05'),
    )
  })

  describe('Error Reports functionality', () => {
    const mockErrorDemands: IirgdDemand[] = [
      {
        id: 'err-1',
        station_code: '1342-5',
        citizen_id: 'cit-1',
        status: 'confrontation_failed',
        observation: 'Digitais com baixa nitidez no polegar direito.',
        created_at: '2026-10-15T14:30:00Z',
        iirgd_citizens: {
          name: 'JOAO DA SILVA',
          rg: '123456789',
          cpf: '12345678900',
        },
        iirgd_document_types: {
          name: 'Segunda Via',
        },
      },
      {
        id: 'err-2',
        station_code: '1062-9',
        citizen_id: 'cit-2',
        status: 'protocol_cancelled',
        observation: 'Solicitação cancelada a pedido do cidadão.',
        created_at: '2026-10-16T09:15:00Z',
        iirgd_citizens: {
          name: 'MARIA APARECIDA SOUZA',
          other_document: 'RG RJ 987654',
          cpf: null,
          rg: null,
        },
        iirgd_document_types: {
          name: 'Primeira Via',
        },
      },
      {
        id: 'err-3',
        station_code: '1342-5',
        citizen_id: 'cit-3',
        status: 'awaiting_collection',
        observation: 'Necessária nova coleta biométrica.',
        created_at: '2026-10-17T11:00:00Z',
        iirgd_citizens: {
          name: 'CARLOS ALBERTO PEREIRA',
          rg: '445556667',
          cpf: '98765432100',
        },
        iirgd_document_types: {
          name: 'Segunda Via',
        },
      },
    ]

    it('buildErrorReportData should correctly aggregate error items, summaries and filters', () => {
      const { buildErrorReportData } = useIirgdReports()
      const report = buildErrorReportData(mockErrorDemands, {
        stationCode: '1342-5',
        searchQuery: 'Silva',
        isSelectionOnly: true,
      })

      expect(report.summary.totalErrors).toBe(3)
      expect(report.filters.stationCode).toBe('1342-5')
      expect(report.filters.searchQuery).toBe('Silva')
      expect(report.filters.isSelectionOnly).toBe(true)

      // Check status aggregation
      expect(report.summary.byStatus['Confronto Fracassado']).toBe(1)
      expect(report.summary.byStatus['Protocolo Cancelado']).toBe(1)
      expect(report.summary.byStatus['Aguardando Nova Coleta']).toBe(1)

      // Check station aggregation
      expect(report.summary.byStation['1342-5']).toBe(2)
      expect(report.summary.byStation['1062-9']).toBe(1)

      // Check document type aggregation
      expect(report.summary.byDocumentType['Segunda Via']).toBe(2)
      expect(report.summary.byDocumentType['Primeira Via']).toBe(1)

      // Check item properties
      const item1 = report.items[0]
      expect(item1.citizenName).toBe('JOAO DA SILVA')
      expect(item1.stationCode).toBe('1342-5')
      expect(item1.statusLabel).toBe('Confronto Fracassado')
      expect(item1.observation).toBe('Digitais com baixa nitidez no polegar direito.')

      const item2 = report.items[1]
      expect(item2.citizenName).toBe('MARIA APARECIDA SOUZA')
      expect(item2.otherDocument).toBe('RG RJ 987654')
      expect(item2.statusLabel).toBe('Protocolo Cancelado')
    })

    it('generateErrorReportHtml should produce valid HTML with header, KPIs, table and escaped text', () => {
      const { buildErrorReportData, generateErrorReportHtml } = useIirgdReports()
      const report = buildErrorReportData(mockErrorDemands, {
        stationCode: null,
        isSelectionOnly: false,
      })

      const html = generateErrorReportHtml(report)

      expect(html).toContain('<!DOCTYPE html>')
      expect(html).toContain('Governo do Estado de São Paulo')
      expect(html).toContain('IIRGD — Instituto de Identificação Ricardo Gumbleton Daunt')
      expect(html).toContain('Relatório de Inconsistências e Erros em Demandas')
      expect(html).toContain('JOAO DA SILVA')
      expect(html).toContain('Digitais com baixa nitidez no polegar direito.')
      expect(html).toContain('MARIA APARECIDA SOUZA')
      expect(html).toContain('RG RJ 987654')
      expect(html).toContain('Confronto Fracassado')
      expect(html).toContain('Protocolo Cancelado')
      expect(html).toContain('Aguardando Nova Coleta')
    })

    it('generateErrorReportHtml should handle empty report data gracefully', () => {
      const { buildErrorReportData, generateErrorReportHtml } = useIirgdReports()
      const report = buildErrorReportData([])
      const html = generateErrorReportHtml(report)

      expect(html).toContain('Nenhuma demanda com inconsistência registrada')
      expect(html).toContain('0 registro(s)')
    })

    it('printErrorReport should call printHtmlViaIframe and logAction', async () => {
      const { buildErrorReportData, printErrorReport } = useIirgdReports()
      const report = buildErrorReportData(mockErrorDemands)

      await printErrorReport(report)

      expect(printHtmlViaIframeMock).toHaveBeenCalledTimes(1)
      expect(printHtmlViaIframeMock).toHaveBeenCalledWith(
        expect.stringContaining('<!DOCTYPE html>'),
      )
      expect(logActionMock).toHaveBeenCalledWith(
        'PRINT_IIRGD_REPORT',
        expect.stringContaining('3 registros'),
      )
    })

    it('exportErrorReportToCsv should call downloadBlob and logAction', async () => {
      const { buildErrorReportData, exportErrorReportToCsv } = useIirgdReports()
      const report = buildErrorReportData(mockErrorDemands)

      await exportErrorReportToCsv(report)

      expect(downloadBlobMock).toHaveBeenCalledTimes(1)
      expect(downloadBlobMock).toHaveBeenCalledWith(
        expect.any(Blob),
        expect.stringContaining('relatorio_erros_iirgd'),
      )
      expect(logActionMock).toHaveBeenCalledWith(
        'EXPORT_IIRGD_REPORT',
        expect.stringContaining('3 registros'),
      )
    })
  })
})
