import type { DemandRow } from '~/composables/useDemands'
import type { DemandProductRow } from '~/composables/useDemandProducts'
import { getItemDisputeResult } from '~/utils/bids'
import { downloadBlob } from '~/utils/download'

export interface DisputeReportItem {
  id: string
  natureza: string
  itemBec: string
  especificacao: string
  unidadeBec: string
  qtd: number
  valorOfertado: number | null
  valorFinal: number | null
  outcome: 'winner' | 'failed' | 'deserted'
  outcomeLabel: string
}

export interface DisputeReportGroup {
  natureza: string
  items: DisputeReportItem[]
  subtotalValorFinal: number
  hasDesertedOrFailed: boolean
}

export interface DisputeReportData {
  demandId: string
  demandName: string
  groups: DisputeReportGroup[]
  grandTotalValorFinal: number
  totalItemsCount: number
  winnersCount: number
  failedCount: number
  desertedCount: number
}

/**
 * Formats a numeric value into a Brazilian decimal string (e.g., "1234,56") for CSV.
 */
export function formatDecimalBr(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return '-'
  return Number(value).toFixed(2).replace('.', ',')
}

/**
 * Escapes a text string for CSV field compliance (RFC 4180).
 */
export function escapeCsvField(value: string | number | null | undefined): string {
  if (value == null) return '""'
  const stringValue = String(value)
  return `"${stringValue.replace(/"/g, '""')}"`
}

/**
 * Generates structured data for the dispute homologation report.
 * Items are ordered and grouped by NATUREZA (expense nature code).
 */
export function generateDisputeReportData(
  demand: DemandRow | null | undefined,
  items: DemandProductRow[] | null | undefined,
): DisputeReportData {
  const demandId = demand?.id || ''
  const demandName = demand?.name || 'Demanda'

  if (!items || items.length === 0) {
    return {
      demandId,
      demandName,
      groups: [],
      grandTotalValorFinal: 0,
      totalItemsCount: 0,
      winnersCount: 0,
      failedCount: 0,
      desertedCount: 0,
    }
  }

  let winnersCount = 0
  let failedCount = 0
  let desertedCount = 0

  const processedItems: DisputeReportItem[] = items.map((item) => {
    // 1. NATUREZA: expense nature code only
    const rawNatureza = item.product?.expense_natures?.id || item.product?.expense_nature_id || '-'
    const natureza = String(rawNatureza).trim() || '-'

    // 2. ITEM BEC: cat_bec numeric string or '-'
    const rawCatBec = item.product?.cat_bec
    const itemBec = rawCatBec != null ? String(rawCatBec) : '-'

    // 3. ESPECIFICAÇÃO: snapshot or product name
    const rawName = item.product_name_snapshot || item.product?.name || '-'
    const especificacao = String(rawName).trim() || '-'

    // 4. Unidade BEC: alias snapshot or alias name, fallback to unit snapshot/name
    const rawAlias =
      item.alias_name_snapshot ||
      item.measurement_unit_aliases?.name ||
      item.unit_name_snapshot ||
      item.measurement_units?.name ||
      '-'
    const unidadeBec = String(rawAlias).trim() || '-'

    // 5. QTD: quantity
    const qtd = Number(item.quantity) || 1

    // 6 & 7. Valor Ofertado & Valor Final
    const disputeRes = getItemDisputeResult(item)
    let valorOfertado: number | null = null
    let valorFinal: number | null = null

    if (disputeRes.outcome === 'winner') {
      winnersCount++
      valorOfertado = disputeRes.winningAmount ?? null
      valorFinal = disputeRes.totalFinal ?? (valorOfertado != null ? valorOfertado * qtd : null)
    } else if (disputeRes.outcome === 'failed') {
      failedCount++
    } else {
      desertedCount++
    }

    return {
      id: item.id,
      natureza,
      itemBec,
      especificacao,
      unidadeBec,
      qtd,
      valorOfertado,
      valorFinal,
      outcome: disputeRes.outcome,
      outcomeLabel: disputeRes.label,
    }
  })

  // Filter: only winner items are displayed in the report table & exported to CSV
  const winnerItems = processedItems.filter((item) => item.outcome === 'winner')

  // Group items by Natureza
  const groupsMap = new Map<string, DisputeReportItem[]>()
  for (const item of winnerItems) {
    if (!groupsMap.has(item.natureza)) {
      groupsMap.set(item.natureza, [])
    }
    groupsMap.get(item.natureza)!.push(item)
  }

  // Sort groups by Natureza ascending
  const sortedNaturezas = Array.from(groupsMap.keys()).sort((a, b) => {
    if (a === '-' && b !== '-') return 1
    if (b === '-' && a !== '-') return -1
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
  })

  let grandTotalValorFinal = 0
  const groups: DisputeReportGroup[] = []

  for (const natureza of sortedNaturezas) {
    const groupItems = groupsMap.get(natureza) || []

    // Sort items inside each group by Item BEC / Especificação
    groupItems.sort((a, b) => {
      if (a.itemBec !== b.itemBec) {
        return a.itemBec.localeCompare(b.itemBec, undefined, { numeric: true })
      }
      return a.especificacao.localeCompare(b.especificacao)
    })

    let subtotal = 0
    let hasDesertedOrFailed = false

    for (const gi of groupItems) {
      if (gi.outcome === 'winner' && gi.valorFinal != null) {
        subtotal += gi.valorFinal
      } else {
        hasDesertedOrFailed = true
      }
    }

    grandTotalValorFinal += subtotal

    groups.push({
      natureza,
      items: groupItems,
      subtotalValorFinal: Number(subtotal.toFixed(2)),
      hasDesertedOrFailed,
    })
  }

  return {
    demandId,
    demandName,
    groups,
    grandTotalValorFinal: Number(grandTotalValorFinal.toFixed(2)),
    totalItemsCount: processedItems.length,
    winnersCount,
    failedCount,
    desertedCount,
  }
}

/**
 * Generates the CSV string with UTF-8 BOM, semicolon delimiter, formatted decimals,
 * subtotals per Natureza, and Grand Total.
 */
export function buildDisputeReportCsv(reportData: DisputeReportData): string {
  const headers = [
    'NATUREZA',
    'ITEM BEC',
    'ESPECIFICAÇÃO',
    'Unidade BEC',
    'QTD',
    'Valor Ofertado',
    'Valor Final',
  ]

  const lines: string[] = []

  // Metadata Header
  lines.push(escapeCsvField(`Relatório de Homologação da Disputa - ${reportData.demandName}`))
  lines.push(
    [
      escapeCsvField(`Total de Itens: ${reportData.totalItemsCount}`),
      escapeCsvField(`Vencedores: ${reportData.winnersCount}`),
      escapeCsvField(`Fracassados: ${reportData.failedCount}`),
      escapeCsvField(`Desertos: ${reportData.desertedCount}`),
    ].join(';'),
  )
  lines.push('') // blank line before table

  // Table header
  lines.push(headers.map(escapeCsvField).join(';'))

  // Table body with groups, items, and subtotals
  for (const group of reportData.groups) {
    for (const item of group.items) {
      const valorOfertadoStr =
        item.outcome === 'winner' && item.valorOfertado != null
          ? formatDecimalBr(item.valorOfertado)
          : item.outcomeLabel

      const valorFinalStr =
        item.outcome === 'winner' && item.valorFinal != null
          ? formatDecimalBr(item.valorFinal)
          : item.outcomeLabel

      const row = [
        escapeCsvField(item.natureza),
        escapeCsvField(item.itemBec),
        escapeCsvField(item.especificacao),
        escapeCsvField(item.unidadeBec),
        escapeCsvField(item.qtd),
        escapeCsvField(valorOfertadoStr),
        escapeCsvField(valorFinalStr),
      ]
      lines.push(row.join(';'))
    }

    // Subtotal row per Natureza
    const subtotalRow = [
      escapeCsvField(`SUBTOTAL (Natureza ${group.natureza})`),
      escapeCsvField(''),
      escapeCsvField(''),
      escapeCsvField(''),
      escapeCsvField(''),
      escapeCsvField(''),
      escapeCsvField(formatDecimalBr(group.subtotalValorFinal)),
    ]
    lines.push(subtotalRow.join(';'))
  }

  // Grand Total row
  const grandTotalRow = [
    escapeCsvField('TOTAL GERAL'),
    escapeCsvField(''),
    escapeCsvField(''),
    escapeCsvField(''),
    escapeCsvField(''),
    escapeCsvField(''),
    escapeCsvField(formatDecimalBr(reportData.grandTotalValorFinal)),
  ]
  lines.push(grandTotalRow.join(';'))

  return '\uFEFF' + lines.join('\r\n')
}

export const useDemandReports = () => {
  const { logAction } = useLogger()

  const exportDisputeReportToCsv = async (
    reportData: DisputeReportData,
    customFilename?: string,
  ): Promise<void> => {
    const csvContent = buildDisputeReportCsv(reportData)
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })

    const safeName = (reportData.demandName || 'demanda').toLowerCase().replace(/[^a-z0-9_-]/g, '_')
    const filename = customFilename || `relatorio_disputa_${safeName}.csv`

    downloadBlob(blob, filename)

    await logAction(
      'EXPORT_DEMAND_DISPUTE_REPORT',
      `Relatório de disputa da demanda "${reportData.demandName}" exportado para CSV.`,
    )
  }

  return {
    generateDisputeReportData,
    buildDisputeReportCsv,
    exportDisputeReportToCsv,
  }
}
