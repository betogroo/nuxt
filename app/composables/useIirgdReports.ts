import type { Database } from '~/types/database.types'
import { IIRGD_STATION_CODES } from '~/constants/iirgd-stations'
import { IIRGD_STATUS_LABELS, type IirgdDemandStatus } from '~/constants/iirgd-status'
import type { IirgdDemand } from '~/composables/useIirgdDemands'
import { escapeCsvField } from '~/utils/reportCsv'
import { escapeHtml, printHtmlViaIframe } from '~/utils/reportHtml'
import { downloadBlob } from '~/utils/download'
import { toSafeFilename } from '~/utils/reportFilename'
import { formatCitizenName, formatCpf, formatDateTime, padAndFormatRg } from '~/utils/formatters'

export interface DocumentTypeReportItem {
  documentTypeId: string | null
  documentTypeName: string
  count: number
  percentage: number
  stationCounts?: Record<string, number>
}

export interface IssuedDemandsReportFilters {
  startDate: string // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
  stationCode?: string | null
}

export interface IssuedDemandsReportData {
  items: DocumentTypeReportItem[]
  totalIssued: number
  topDocumentType: string | null
  dailyAverage: number
  periodDays: number
  startDate: string
  endDate: string
  stations: string[]
  stationTotals: Record<string, number>
}

export interface IirgdErrorReportItem {
  id: string
  stationCode: string
  citizenName: string
  rg: string
  otherDocument: string
  cpf: string
  documentTypeName: string
  status: string
  statusLabel: string
  observation: string
  createdAt: string
  formattedDate: string
}

export interface IirgdErrorReportSummary {
  totalErrors: number
  byStatus: Record<string, number>
  byStation: Record<string, number>
  byDocumentType: Record<string, number>
}

export interface IirgdErrorReportData {
  items: IirgdErrorReportItem[]
  summary: IirgdErrorReportSummary
  generatedAt: string
  filters: {
    stationCode?: string | null
    searchQuery?: string
    isSelectionOnly?: boolean
  }
}

interface HistoryEntryWithDemand {
  demand_id: string
  created_at: string
  iirgd_demands: {
    id: string
    station_code: string
    document_type_id: string | null
    iirgd_document_types: {
      id: string
      name: string
    } | null
  } | null
}

export const useIirgdReports = () => {
  const supabase = useSupabaseClient<Database>()
  const { logAction } = useLogger()
  const { fetchAllActiveDocumentTypes } = useIirgdDocumentTypes()

  const buildErrorReportData = (
    demands: IirgdDemand[],
    options?: {
      stationCode?: string | null
      searchQuery?: string
      isSelectionOnly?: boolean
    },
  ): IirgdErrorReportData => {
    const byStatus: Record<string, number> = {}
    const byStation: Record<string, number> = {}
    const byDocumentType: Record<string, number> = {}

    const items: IirgdErrorReportItem[] = demands.map((demand) => {
      const stationCode = demand.station_code || 'Não informado'
      const citizenName = formatCitizenName(demand.iirgd_citizens?.name) || 'Não identificado'
      const rg = demand.iirgd_citizens?.rg ? padAndFormatRg(demand.iirgd_citizens.rg, true) : ''
      const otherDocument = demand.iirgd_citizens?.other_document || ''
      const cpf = demand.iirgd_citizens?.cpf ? formatCpf(demand.iirgd_citizens.cpf) : ''
      const documentTypeName = demand.iirgd_document_types?.name || 'Não informado'
      const rawStatus = (demand.status || 'unknown_error') as IirgdDemandStatus
      const statusLabel = IIRGD_STATUS_LABELS[rawStatus] || demand.status || 'Erro'
      const observation = demand.observation?.trim() || 'Nenhuma observação informada.'
      const createdAt = demand.created_at || ''
      const formattedDate = demand.created_at ? formatDateTime(demand.created_at) : '-'

      // Aggregate
      byStatus[statusLabel] = (byStatus[statusLabel] || 0) + 1
      byStation[stationCode] = (byStation[stationCode] || 0) + 1
      byDocumentType[documentTypeName] = (byDocumentType[documentTypeName] || 0) + 1

      return {
        id: demand.id || '',
        stationCode,
        citizenName,
        rg,
        otherDocument,
        cpf,
        documentTypeName,
        status: demand.status || 'unknown_error',
        statusLabel,
        observation,
        createdAt,
        formattedDate,
      }
    })

    return {
      items,
      summary: {
        totalErrors: items.length,
        byStatus,
        byStation,
        byDocumentType,
      },
      generatedAt: formatDateTime(new Date()),
      filters: {
        stationCode: options?.stationCode,
        searchQuery: options?.searchQuery,
        isSelectionOnly: options?.isSelectionOnly,
      },
    }
  }

  const generateErrorReportHtml = (reportData: IirgdErrorReportData): string => {
    const { items, summary, generatedAt, filters } = reportData

    // KPI status badges HTML
    const statusCardsHtml = Object.entries(summary.byStatus)
      .map(
        ([label, count]) => `
        <div class="kpi-card">
          <div class="kpi-count">${count}</div>
          <div class="kpi-label">${escapeHtml(label)}</div>
        </div>
      `,
      )
      .join('')

    // Station badges HTML
    const stationBadgesHtml = Object.entries(summary.byStation)
      .map(
        ([station, count]) => `
        <span class="station-chip">
          <strong>Posto ${escapeHtml(station)}:</strong> ${count}
        </span>
      `,
      )
      .join('')

    // Table rows HTML
    const tableRowsHtml =
      items.length > 0
        ? items
            .map((item, index) => {
              const docInfo = [
                item.rg ? `RG: ${escapeHtml(item.rg)}` : '',
                item.otherDocument ? `Outro Doc: ${escapeHtml(item.otherDocument)}` : '',
                item.cpf ? `CPF: ${escapeHtml(item.cpf)}` : '',
              ]
                .filter(Boolean)
                .join(' &bull; ')

              return `
              <tr>
                <td class="col-index">${index + 1}</td>
                <td class="col-station"><span class="badge-station">${escapeHtml(item.stationCode)}</span></td>
                <td class="col-citizen">
                  <div class="citizen-name">${escapeHtml(item.citizenName)}</div>
                  <div class="citizen-doc">${docInfo || '-'}</div>
                </td>
                <td class="col-doc">${escapeHtml(item.documentTypeName)}</td>
                <td class="col-status">
                  <span class="badge-error-status">${escapeHtml(item.statusLabel)}</span>
                </td>
                <td class="col-obs">
                  <div class="obs-box">${escapeHtml(item.observation)}</div>
                </td>
                <td class="col-date">${escapeHtml(item.formattedDate)}</td>
              </tr>
            `
            })
            .join('')
        : `
            <tr>
              <td colspan="7" class="empty-state">Nenhuma demanda com inconsistência registrada para os filtros selecionados.</td>
            </tr>
          `

    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Relatório de Inconsistências e Erros — IIRGD</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 10mm 12mm 10mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 10px;
      line-height: 1.4;
      color: #1e293b;
      margin: 0;
      padding: 0;
      background: #ffffff;
    }
    .report-header {
      border: 1px solid #cbd5e1;
      border-top: 4px solid #b91c1c;
      border-radius: 6px;
      padding: 14px 16px;
      background: #f8fafc;
      margin-bottom: 14px;
    }
    .gov-badge {
      display: inline-block;
      font-size: 8.5px;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      color: #991b1b;
      background: #fee2e2;
      padding: 2px 6px;
      border-radius: 4px;
      margin-bottom: 4px;
    }
    .inst-title {
      font-size: 11px;
      font-weight: 700;
      color: #334155;
      text-transform: uppercase;
      letter-spacing: 0.2px;
      margin-bottom: 2px;
    }
    .report-title {
      font-size: 17px;
      font-weight: 800;
      color: #0f172a;
      margin: 2px 0 10px 0;
      text-transform: uppercase;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      padding-top: 10px;
      border-top: 1px solid #e2e8f0;
    }
    .meta-item {
      font-size: 9px;
    }
    .meta-label {
      text-transform: uppercase;
      font-weight: 700;
      color: #64748b;
      font-size: 8px;
      margin-bottom: 1px;
    }
    .meta-val {
      font-weight: 700;
      color: #0f172a;
      font-size: 10px;
    }
    .kpi-section {
      margin-bottom: 14px;
    }
    .section-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: #334155;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
      gap: 8px;
      margin-bottom: 10px;
    }
    .kpi-card {
      border: 1px solid #fecaca;
      background: #fef2f2;
      border-radius: 6px;
      padding: 8px 10px;
      text-align: center;
    }
    .kpi-count {
      font-size: 18px;
      font-weight: 800;
      color: #b91c1c;
      line-height: 1.1;
    }
    .kpi-label {
      font-size: 8.5px;
      font-weight: 700;
      color: #7f1d1d;
      margin-top: 3px;
      text-transform: uppercase;
    }
    .stations-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      padding: 8px 10px;
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      font-size: 9px;
    }
    .station-chip {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      padding: 2px 7px;
      border-radius: 4px;
      color: #334155;
    }
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
      font-size: 9.5px;
    }
    table.data-table th {
      background: #1e293b;
      color: #ffffff;
      text-align: left;
      padding: 6px 8px;
      font-size: 8.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      border: 1px solid #1e293b;
    }
    table.data-table td {
      padding: 6px 8px;
      border: 1px solid #e2e8f0;
      vertical-align: top;
    }
    table.data-table tr:nth-child(even) td {
      background: #f8fafc;
    }
    .col-index {
      width: 24px;
      text-align: center;
      color: #64748b;
      font-weight: 600;
    }
    .col-station {
      width: 60px;
      text-align: center;
    }
    .badge-station {
      display: inline-block;
      font-size: 8.5px;
      font-weight: 700;
      background: #e2e8f0;
      color: #334155;
      padding: 2px 5px;
      border-radius: 3px;
    }
    .col-citizen {
      width: 180px;
    }
    .citizen-name {
      font-weight: 700;
      color: #0f172a;
      font-size: 10px;
      margin-bottom: 2px;
    }
    .citizen-doc {
      font-size: 8.5px;
      color: #64748b;
    }
    .col-doc {
      width: 90px;
      color: #334155;
    }
    .col-status {
      width: 130px;
    }
    .badge-error-status {
      display: inline-block;
      font-size: 8.5px;
      font-weight: 700;
      background: #fee2e2;
      color: #991b1b;
      border: 1px solid #fca5a5;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .col-obs {
      min-width: 170px;
    }
    .obs-box {
      font-size: 9px;
      color: #1e293b;
      background: #fffbeb;
      border: 1px solid #fef3c7;
      padding: 4px 6px;
      border-radius: 4px;
      word-break: break-word;
      white-space: normal;
    }
    .col-date {
      width: 75px;
      font-size: 8.5px;
      color: #64748b;
      white-space: nowrap;
    }
    .empty-state {
      text-align: center;
      padding: 24px;
      color: #64748b;
      font-style: italic;
    }
    .report-footer {
      border-top: 1px solid #cbd5e1;
      padding-top: 8px;
      font-size: 8.5px;
      color: #64748b;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
  </style>
</head>
<body>
  <div class="report-header">
    <div class="gov-badge">Governo do Estado de São Paulo &bull; Secretaria da Segurança Pública</div>
    <div class="inst-title">IIRGD — Instituto de Identificação Ricardo Gumbleton Daunt</div>
    <div class="report-title">Relatório de Inconsistências e Erros em Demandas</div>

    <div class="meta-grid">
      <div class="meta-item">
        <div class="meta-label">Data de Emissão</div>
        <div class="meta-val">${escapeHtml(generatedAt)}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Total de Demandas</div>
        <div class="meta-val">${summary.totalErrors} registro(s)</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Filtro de Posto</div>
        <div class="meta-val">${escapeHtml(filters.stationCode ? `Posto ${filters.stationCode}` : 'Todos os Postos')}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Escopo do Relatório</div>
        <div class="meta-val">${filters.isSelectionOnly ? 'Demandas Selecionadas' : 'Listagem Filtrada Completa'}</div>
      </div>
    </div>
  </div>

  <div class="kpi-section">
    <div class="section-title">Distribuição por Tipo de Inconsistência</div>
    <div class="kpi-grid">
      ${statusCardsHtml}
    </div>

    ${
      stationBadgesHtml
        ? `
      <div class="section-title" style="margin-top: 10px;">Postos de Coleta Afetados</div>
      <div class="stations-bar">
        ${stationBadgesHtml}
      </div>
    `
        : ''
    }
  </div>

  <div class="section-title">Detalhamento das Demandas com Inconsistência</div>
  <table class="data-table">
    <thead>
      <tr>
        <th class="col-index">#</th>
        <th class="col-station">Posto</th>
        <th class="col-citizen">Cidadão / Documentos</th>
        <th class="col-doc">Tipo Doc.</th>
        <th class="col-status">Inconsistência</th>
        <th class="col-obs">Observação / Motivo</th>
        <th class="col-date">Data Registro</th>
      </tr>
    </thead>
    <tbody>
      ${tableRowsHtml}
    </tbody>
  </table>

  <div class="report-footer">
    <div>Sistema de Gestão IIRGD — Documento emitido para controle e resolução de pendências operacionais</div>
    <div>Gerado eletronicamente em ${escapeHtml(generatedAt)}</div>
  </div>
</body>
</html>
`
  }

  const printErrorReport = async (reportData: IirgdErrorReportData): Promise<void> => {
    const html = generateErrorReportHtml(reportData)
    await printHtmlViaIframe(html)
    await logAction(
      'PRINT_IIRGD_REPORT',
      `Relatório amigável de erros do IIRGD impresso/visualizado (${reportData.summary.totalErrors} registros)`,
    )
  }

  const exportErrorReportToCsv = async (
    reportData: IirgdErrorReportData,
    filename?: string,
  ): Promise<void> => {
    const headers = [
      '#',
      'Posto',
      'Cidadão',
      'RG',
      'Outro Documento',
      'CPF',
      'Tipo de Documento',
      'Status da Inconsistência',
      'Observação / Motivo',
      'Data de Registro',
    ]

    const rows = reportData.items.map((item, index) => [
      escapeCsvField(index + 1),
      escapeCsvField(item.stationCode),
      escapeCsvField(item.citizenName),
      escapeCsvField(item.rg),
      escapeCsvField(item.otherDocument),
      escapeCsvField(item.cpf),
      escapeCsvField(item.documentTypeName),
      escapeCsvField(item.statusLabel),
      escapeCsvField(item.observation),
      escapeCsvField(item.formattedDate),
    ])

    const metadata = [
      escapeCsvField('Relatório: Inconsistências e Erros em Demandas — IIRGD'),
      escapeCsvField(`Data de Emissão: ${reportData.generatedAt}`),
      escapeCsvField(`Total de Inconsistências: ${reportData.summary.totalErrors}`),
      escapeCsvField(
        `Filtro de Posto: ${reportData.filters.stationCode ? `Posto ${reportData.filters.stationCode}` : 'Todos os Postos'}`,
      ),
      escapeCsvField(
        `Escopo: ${reportData.filters.isSelectionOnly ? 'Demandas Selecionadas' : 'Listagem Filtrada'}`,
      ),
      '',
    ]

    const csvContent =
      '\uFEFF' + [...metadata, headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const resolvedFilename =
      filename ||
      toSafeFilename(
        `relatorio_erros_iirgd_${new Date().toISOString().slice(0, 10)}`,
        'relatorio_erros_iirgd',
      ) + '.csv'

    downloadBlob(blob, resolvedFilename)

    await logAction(
      'EXPORT_IIRGD_REPORT',
      `Relatório de erros do IIRGD exportado para CSV (${reportData.summary.totalErrors} registros)`,
    )
  }

  const fetchIssuedDemandsByDocumentType = async (
    filters: IssuedDemandsReportFilters,
  ): Promise<IssuedDemandsReportData> => {
    const start = new Date(`${filters.startDate}T00:00:00`)
    const end = new Date(`${filters.endDate}T23:59:59.999`)

    const startIso = isNaN(start.getTime())
      ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      : start.toISOString()
    const endIso = isNaN(end.getTime()) ? new Date().toISOString() : end.toISOString()

    // Fetch active document types
    let activeTypes: { id: string; name: string }[] = []
    try {
      const types = await fetchAllActiveDocumentTypes()
      activeTypes = types.map((t) => ({ id: t.id, name: t.name }))
    } catch (err) {
      console.warn('Erro ao carregar tipos de documento ativos:', err)
    }

    // Query issued demand history in the period
    let query = supabase
      .from('iirgd_demand_status_history')
      .select(
        `
        demand_id,
        created_at,
        iirgd_demands!inner(
          id,
          station_code,
          document_type_id,
          iirgd_document_types(id, name)
        )
      `,
      )
      .eq('status', 'issued')
      .gte('created_at', startIso)
      .lte('created_at', endIso)

    if (filters.stationCode) {
      query = query.eq('iirgd_demands.station_code', filters.stationCode)
    }

    const { data, error } = await query.order('created_at', { ascending: true })

    if (error) {
      console.error(error)
      throw new Error('Erro ao buscar demandas emitidas para o relatório')
    }

    // Stations collection
    const stationsSet = new Set<string>(
      filters.stationCode ? [filters.stationCode] : IIRGD_STATION_CODES,
    )
    const stationTotals: Record<string, number> = {}

    // Map to hold aggregated counts
    const countsMap = new Map<
      string,
      {
        id: string | null
        name: string
        count: number
        stationCounts: Record<string, number>
      }
    >()

    // Pre-populate with all known active document types (count: 0)
    for (const dt of activeTypes) {
      countsMap.set(dt.name, {
        id: dt.id,
        name: dt.name,
        count: 0,
        stationCounts: {},
      })
    }

    const seenDemandIds = new Set<string>()

    if (data) {
      const entries = data as unknown as HistoryEntryWithDemand[]
      entries.forEach((entry) => {
        if (!entry.demand_id || seenDemandIds.has(entry.demand_id)) {
          return
        }
        seenDemandIds.add(entry.demand_id)

        const demand = entry.iirgd_demands
        if (filters.stationCode && demand?.station_code !== filters.stationCode) {
          return
        }

        const station = demand?.station_code || 'Outro'
        stationsSet.add(station)

        const docTypeName = demand?.iirgd_document_types?.name || 'Não informado'
        const docTypeId = demand?.document_type_id || null

        let existing = countsMap.get(docTypeName)
        if (!existing) {
          existing = {
            id: docTypeId,
            name: docTypeName,
            count: 0,
            stationCounts: {},
          }
          countsMap.set(docTypeName, existing)
        }

        existing.count += 1
        existing.stationCounts[station] = (existing.stationCounts[station] || 0) + 1
        stationTotals[station] = (stationTotals[station] || 0) + 1
      })
    }

    const stations = Array.from(stationsSet)
    stations.forEach((st) => {
      if (stationTotals[st] === undefined) {
        stationTotals[st] = 0
      }
    })

    const rawItems = Array.from(countsMap.values())
    const totalIssued = rawItems.reduce((acc, curr) => acc + curr.count, 0)

    const items: DocumentTypeReportItem[] = rawItems.map((item) => {
      const stationCounts: Record<string, number> = {}
      stations.forEach((st) => {
        stationCounts[st] = item.stationCounts[st] || 0
      })

      return {
        documentTypeId: item.id,
        documentTypeName: item.name,
        count: item.count,
        percentage: totalIssued > 0 ? Number(((item.count / totalIssued) * 100).toFixed(1)) : 0,
        stationCounts,
      }
    })

    // Sort by count descending, then name ascending
    items.sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count
      return a.documentTypeName.localeCompare(b.documentTypeName)
    })

    const topDocumentType =
      items.length > 0 && items[0].count > 0 ? items[0].documentTypeName : null

    const validStart = isNaN(start.getTime())
      ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      : start
    const validEnd = isNaN(end.getTime()) ? new Date() : end
    const diffTime = Math.max(0, validEnd.getTime() - validStart.getTime())
    const periodDays = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)))
    const dailyAverage = Number((totalIssued / periodDays).toFixed(1))

    return {
      items,
      totalIssued,
      topDocumentType,
      dailyAverage,
      periodDays,
      startDate: filters.startDate,
      endDate: filters.endDate,
      stations,
      stationTotals,
    }
  }

  const exportIssuedDemandsToCsv = async (
    data: IssuedDemandsReportData,
    filename?: string,
  ): Promise<void> => {
    const isMultiStation = data.stations && data.stations.length > 1

    let headers: string[]
    let rows: string[][]

    if (isMultiStation) {
      headers = [
        'Tipo de Documento',
        ...data.stations.map((st) => `Posto ${st}`),
        'Total Geral',
        'Percentual (%)',
      ]

      rows = data.items.map((item) => [
        `"${item.documentTypeName.replace(/"/g, '""')}"`,
        ...data.stations.map((st) => (item.stationCounts?.[st] ?? 0).toString()),
        item.count.toString(),
        `${item.percentage.toFixed(1)}%`,
      ])

      // Total summary row
      rows.push([
        '"TOTAL"',
        ...data.stations.map((st) => (data.stationTotals?.[st] ?? 0).toString()),
        data.totalIssued.toString(),
        '100.0%',
      ])
    } else {
      headers = ['Tipo de Documento', 'Quantidade Emitida', 'Percentual (%)']
      rows = data.items.map((item) => [
        `"${item.documentTypeName.replace(/"/g, '""')}"`,
        item.count.toString(),
        `${item.percentage.toFixed(1)}%`,
      ])

      // Total summary row
      rows.push(['"TOTAL"', data.totalIssued.toString(), '100.0%'])
    }

    const metadata = [
      `"Relatório: Demandas Emitidas por Tipo de Documento"`,
      `"Período: ${data.startDate} a ${data.endDate}"`,
      `"Total Emitido: ${data.totalIssued}"`,
      `"Média Diária: ${data.dailyAverage}"`,
      `"Gerado em: ${new Date().toLocaleString('pt-BR')}"`,
      '',
    ]

    const csvContent =
      '\uFEFF' + [...metadata, headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const resolvedFilename =
      filename || `relatorio_demandas_emitidas_${data.startDate}_a_${data.endDate}.csv`
    downloadBlob(blob, resolvedFilename)

    await logAction(
      'EXPORT_IIRGD_REPORT',
      `Relatório de demandas emitidas exportado para CSV (${data.startDate} a ${data.endDate})`,
    )
  }

  return {
    fetchIssuedDemandsByDocumentType,
    exportIssuedDemandsToCsv,
    buildErrorReportData,
    generateErrorReportHtml,
    printErrorReport,
    exportErrorReportToCsv,
  }
}
