import type { Database } from '~/types/database.types'
import { IIRGD_STATION_CODES } from '~/constants/iirgd-stations'

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

    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute(
        'download',
        filename || `relatorio_demandas_emitidas_${data.startDate}_a_${data.endDate}.csv`,
      )
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    }

    await logAction(
      'EXPORT_IIRGD_REPORT',
      `Relatório de demandas emitidas exportado para CSV (${data.startDate} a ${data.endDate})`,
    )
  }

  return {
    fetchIssuedDemandsByDocumentType,
    exportIssuedDemandsToCsv,
  }
}
