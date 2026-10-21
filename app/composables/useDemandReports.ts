import type { DemandRow } from '~/composables/useDemands'
import type { DemandProductRow } from '~/composables/useDemandProducts'
import { getItemDisputeResult } from '~/utils/bids'
import { downloadBlob } from '~/utils/download'
import { formatCnpj, formatDate, formatDateTime, formatDemandType } from '~/utils/formatters'
import { formatDemandStatus } from '~/utils/demandStatus'

export interface DisputeReportDemandInfo {
  id: string
  name: string
  type: string
  typeLabel: string
  status: string
  statusLabel: string
  processNumber: string
  internalProcessNumber: string
  biddingNoticeNumber: string
  disputeNumber: string
  disputeDate: string
  offerOpeningDate: string
  idPca: string
}

export interface DisputeReportWinnerSupplier {
  id: string
  companyName: string
  cnpj: string
  cnpjFormatted: string
  email: string | null
  cellPhone: string | null
  landline: string | null
  address: string | null
  responsibleName: string | null
  isSimplesOptant: boolean
  hasBbAccount: string | null
}

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

export interface DisputeReportWinnerGroup {
  supplier: DisputeReportWinnerSupplier
  items: DisputeReportItem[]
  subtotalValorFinal: number
  totalItemsCount: number
}

export interface DisputeReportData {
  demandId: string
  demandName: string
  demand: DisputeReportDemandInfo
  winnerGroups: DisputeReportWinnerGroup[]
  nonWinnerItems: DisputeReportItem[]
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
 * Items are ordered and grouped by WINNING SUPPLIER.
 */
export function generateDisputeReportData(
  demand: DemandRow | null | undefined,
  items: DemandProductRow[] | null | undefined,
): DisputeReportData {
  const demandId = demand?.id || ''
  const demandName = demand?.name || 'Demanda'

  const demandInfo: DisputeReportDemandInfo = {
    id: demandId,
    name: demandName,
    type: demand?.type || '-',
    typeLabel: formatDemandType(demand?.type),
    status: demand?.status || '-',
    statusLabel: demand?.status ? formatDemandStatus(demand.status) : '-',
    processNumber: demand?.process_number || '-',
    internalProcessNumber: demand?.internal_process_number || '-',
    biddingNoticeNumber: demand?.bidding_notice_number || '-',
    disputeNumber: demand?.dispute_number || '-',
    disputeDate: formatDate(demand?.dispute_date),
    offerOpeningDate: formatDateTime(demand?.offer_opening_date),
    idPca: demand?.id_pca || '-',
  }

  if (!items || items.length === 0) {
    return {
      demandId,
      demandName,
      demand: demandInfo,
      winnerGroups: [],
      nonWinnerItems: [],
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

  const winnerGroupsMap = new Map<
    string,
    { supplier: DisputeReportWinnerSupplier; items: DisputeReportItem[] }
  >()
  const nonWinnerItems: DisputeReportItem[] = []

  for (const item of items) {
    // 1. NATUREZA: expense nature code only
    const rawNatureza = item.product?.expense_natures?.id || item.product?.expense_nature_id || '-'
    const natureza = String(rawNatureza).trim() || '-'

    // 2. ITEM BEC: cat_bec numeric string or '-'
    const rawCatBec = item.product?.cat_bec
    const itemBec = rawCatBec != null ? String(rawCatBec) : '-'

    // 3. ESPECIFICAÇÃO: snapshot or product name
    const rawName = item.product_name_snapshot || item.product?.name || '-'
    const especificacao = String(rawName).trim() || '-'

    // 4. Unidade BEC: {code} - {name} from alias snapshot/record, fallback to unit snapshot/name
    const rawAliasCode = item.alias_code_snapshot ?? item.measurement_unit_aliases?.code ?? null
    const rawAliasName =
      item.alias_name_snapshot ||
      item.measurement_unit_aliases?.name ||
      item.unit_name_snapshot ||
      item.measurement_units?.name ||
      '-'
    const aliasName = String(rawAliasName).trim() || '-'
    const unidadeBec =
      rawAliasCode != null && aliasName !== '-' ? `${rawAliasCode} - ${aliasName}` : aliasName

    // 5. QTD: quantity
    const qtd = Number(item.quantity) || 1

    // 6 & 7. Dispute calculation
    const disputeRes = getItemDisputeResult(item)

    if (disputeRes.outcome === 'winner') {
      winnersCount++
      const valorOfertado = disputeRes.winningAmount ?? null
      const valorFinal =
        disputeRes.totalFinal ?? (valorOfertado != null ? valorOfertado * qtd : null)

      const repItem: DisputeReportItem = {
        id: item.id,
        natureza,
        itemBec,
        especificacao,
        unidadeBec,
        qtd,
        valorOfertado,
        valorFinal,
        outcome: 'winner',
        outcomeLabel: disputeRes.label,
      }

      // Winning supplier details
      const rawSupp = disputeRes.winningBid?.suppliers
      const supplierId = rawSupp?.id || 'unknown'
      const companyName = rawSupp?.company_name || disputeRes.winnerSupplierName || 'Fornecedor'
      const cnpj = rawSupp?.cnpj || ''
      const cnpjFormatted = formatCnpj(cnpj)

      if (!winnerGroupsMap.has(supplierId)) {
        winnerGroupsMap.set(supplierId, {
          supplier: {
            id: supplierId,
            companyName,
            cnpj,
            cnpjFormatted,
            email: rawSupp?.email || null,
            cellPhone: rawSupp?.cell_phone || null,
            landline: rawSupp?.landline || null,
            address: rawSupp?.address || null,
            responsibleName: rawSupp?.responsible_name || null,
            isSimplesOptant: Boolean(rawSupp?.is_simples_optant),
            hasBbAccount: rawSupp?.has_bb_account || null,
          },
          items: [],
        })
      }

      winnerGroupsMap.get(supplierId)!.items.push(repItem)
    } else {
      if (disputeRes.outcome === 'failed') {
        failedCount++
      } else {
        desertedCount++
      }

      nonWinnerItems.push({
        id: item.id,
        natureza,
        itemBec,
        especificacao,
        unidadeBec,
        qtd,
        valorOfertado: null,
        valorFinal: null,
        outcome: disputeRes.outcome,
        outcomeLabel: disputeRes.label,
      })
    }
  }

  // Build sorted winner groups
  const winnerGroups: DisputeReportWinnerGroup[] = []
  let grandTotalValorFinal = 0

  const sortedGroups = Array.from(winnerGroupsMap.values()).sort((a, b) => {
    return a.supplier.companyName.localeCompare(b.supplier.companyName, undefined, {
      sensitivity: 'base',
    })
  })

  for (const group of sortedGroups) {
    // Sort items inside supplier group: by itemBec ascending, then specification
    group.items.sort((a, b) => {
      if (a.itemBec !== b.itemBec) {
        return a.itemBec.localeCompare(b.itemBec, undefined, { numeric: true })
      }
      return a.especificacao.localeCompare(b.especificacao)
    })

    const subtotal = group.items.reduce((acc, curr) => acc + (curr.valorFinal || 0), 0)
    grandTotalValorFinal += subtotal

    winnerGroups.push({
      supplier: group.supplier,
      items: group.items,
      subtotalValorFinal: Number(subtotal.toFixed(2)),
      totalItemsCount: group.items.length,
    })
  }

  return {
    demandId,
    demandName,
    demand: demandInfo,
    winnerGroups,
    nonWinnerItems,
    grandTotalValorFinal: Number(grandTotalValorFinal.toFixed(2)),
    totalItemsCount: items.length,
    winnersCount,
    failedCount,
    desertedCount,
  }
}

/**
 * Generates the CSV string with UTF-8 BOM, semicolon delimiter, formatted decimals,
 * demand header metadata, winner supplier data, and subtotals.
 */
export function buildDisputeReportCsv(reportData: DisputeReportData): string {
  const lines: string[] = []

  // 1. Demand Header Metadata
  lines.push(
    [
      escapeCsvField('RELATÓRIO DE HOMOLOGAÇÃO DA DISPUTA'),
      escapeCsvField(reportData.demand.name),
    ].join(';'),
  )
  lines.push(
    [escapeCsvField('Nº Processo:'), escapeCsvField(reportData.demand.processNumber)].join(';'),
  )
  lines.push(
    [
      escapeCsvField('Nº Processo Interno:'),
      escapeCsvField(reportData.demand.internalProcessNumber),
    ].join(';'),
  )
  lines.push(
    [
      escapeCsvField('Nº Aviso de Contratação:'),
      escapeCsvField(reportData.demand.biddingNoticeNumber),
    ].join(';'),
  )
  lines.push(
    [escapeCsvField('Nº Disputa:'), escapeCsvField(reportData.demand.disputeNumber)].join(';'),
  )
  lines.push(
    [escapeCsvField('Data da Disputa:'), escapeCsvField(reportData.demand.disputeDate)].join(';'),
  )
  lines.push(
    [
      escapeCsvField('Abertura de Ofertas:'),
      escapeCsvField(reportData.demand.offerOpeningDate),
    ].join(';'),
  )
  lines.push([escapeCsvField('PCA:'), escapeCsvField(reportData.demand.idPca)].join(';'))
  lines.push([escapeCsvField('Tipo:'), escapeCsvField(reportData.demand.typeLabel)].join(';'))
  lines.push([escapeCsvField('Status:'), escapeCsvField(reportData.demand.statusLabel)].join(';'))
  lines.push('') // Blank line

  // Summary row
  lines.push(
    [
      escapeCsvField(`Total de Itens: ${reportData.totalItemsCount}`),
      escapeCsvField(`Vencedores: ${reportData.winnersCount}`),
      escapeCsvField(`Fracassados: ${reportData.failedCount}`),
      escapeCsvField(`Desertos: ${reportData.desertedCount}`),
      escapeCsvField(`Total Homologado: R$ ${formatDecimalBr(reportData.grandTotalValorFinal)}`),
    ].join(';'),
  )
  lines.push('') // Blank line

  const tableHeaders = [
    'NATUREZA',
    'ITEM BEC',
    'ESPECIFICAÇÃO',
    'Unidade BEC',
    'QTD',
    'Valor Ofertado',
    'Valor Final',
  ]

  // 2. Winner groups
  for (const group of reportData.winnerGroups) {
    const supp = group.supplier

    // Supplier Info Header
    lines.push([escapeCsvField(`FORNECEDOR VENCEDOR: ${supp.companyName}`)].join(';'))
    lines.push(
      [
        escapeCsvField(`CNPJ: ${supp.cnpjFormatted || '-'}`),
        escapeCsvField(`Responsável: ${supp.responsibleName || '-'}`),
        escapeCsvField(`Optante Simples: ${supp.isSimplesOptant ? 'Sim' : 'Não'}`),
        escapeCsvField(`Conta BB: ${supp.hasBbAccount || '-'}`),
      ].join(';'),
    )
    lines.push(
      [
        escapeCsvField(`E-mail: ${supp.email || '-'}`),
        escapeCsvField(`Celular: ${supp.cellPhone || '-'}`),
        escapeCsvField(`Fixo: ${supp.landline || '-'}`),
        escapeCsvField(`Endereço: ${supp.address || '-'}`),
      ].join(';'),
    )

    // Table header
    lines.push(tableHeaders.map(escapeCsvField).join(';'))

    // Items
    for (const item of group.items) {
      const valorOfertadoStr =
        item.valorOfertado != null ? formatDecimalBr(item.valorOfertado) : item.outcomeLabel
      const valorFinalStr =
        item.valorFinal != null ? formatDecimalBr(item.valorFinal) : item.outcomeLabel

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

    // Subtotal row per supplier
    const subtotalRow = [
      escapeCsvField(`SUBTOTAL (${supp.companyName})`),
      escapeCsvField(''),
      escapeCsvField(''),
      escapeCsvField(''),
      escapeCsvField(''),
      escapeCsvField(''),
      escapeCsvField(formatDecimalBr(group.subtotalValorFinal)),
    ]
    lines.push(subtotalRow.join(';'))
    lines.push('') // Blank line between suppliers
  }

  // 3. Grand Total row
  const grandTotalRow = [
    escapeCsvField('TOTAL GERAL HOMOLOGADO DA DEMANDA'),
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
      'EXPORT_DEMAND_DISPUTE_REPORT_CSV',
      `Relatório de disputa da demanda "${reportData.demandName}" exportado para CSV.`,
    )
  }

  const logPdfExport = async (demandName: string): Promise<void> => {
    await logAction(
      'EXPORT_DEMAND_DISPUTE_REPORT_PDF',
      `Relatório de disputa da demanda "${demandName}" impresso/exportado para PDF.`,
    )
  }

  return {
    generateDisputeReportData,
    buildDisputeReportCsv,
    exportDisputeReportToCsv,
    logPdfExport,
  }
}
