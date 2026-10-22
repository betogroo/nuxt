import type { DemandRow } from '~/composables/useDemands'
import type { DemandProductRow } from '~/composables/useDemandProducts'
import type { jsPDF } from 'jspdf'
import { getItemDisputeResult } from '~/utils/bids'
import { downloadBlob } from '~/utils/download'
import {
  formatCnpj,
  formatDate,
  formatDateTime,
  formatCurrency,
  formatDemandType,
} from '~/utils/formatters'
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
  siafemNumber: string
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
 * Escapes special characters for safe HTML injection.
 */
export function escapeHtml(str: string | number | null | undefined): string {
  if (str == null) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
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
    typeLabel: formatDemandType(demand?.type || ''),
    status: demand?.status || '-',
    statusLabel: demand?.status ? formatDemandStatus(demand.status) : '-',
    processNumber: demand?.process_number || '-',
    internalProcessNumber: demand?.internal_process_number || '-',
    biddingNoticeNumber: demand?.bidding_notice_number || '-',
    disputeNumber: demand?.dispute_number || '-',
    disputeDate: formatDate(demand?.dispute_date),
    offerOpeningDate: formatDateTime(demand?.offer_opening_date),
    idPca: demand?.id_pca || '-',
    siafemNumber: demand?.siafem_number || '-',
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
  lines.push(
    [escapeCsvField('Nº SIAFEM:'), escapeCsvField(reportData.demand.siafemNumber)].join(';'),
  )
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

/**
 * Builds a standalone, clean HTML document tailored for multi-page A4 PDF printing.
 */
export function buildDisputeReportHtml(reportData: DisputeReportData): string {
  const demand = reportData.demand
  const now = new Date().toLocaleString('pt-BR')

  const winnerGroupsHtml =
    reportData.winnerGroups.length === 0
      ? `<div style="padding: 24px; text-align: center; color: #64748b; font-style: italic;">Nenhum item vencedor homologado nesta demanda.</div>`
      : reportData.winnerGroups
          .map((group) => {
            const supp = group.supplier
            const contactDetails =
              [supp.cellPhone, supp.landline].filter(Boolean).join(' / ') || '-'
            const badgesHtml = [
              supp.isSimplesOptant
                ? `<span class="badge badge-success">Simples Nacional</span>`
                : '',
              supp.hasBbAccount
                ? `<span class="badge badge-info">Conta BB: ${escapeHtml(supp.hasBbAccount)}</span>`
                : '',
            ]
              .filter(Boolean)
              .join(' ')

            const rowsHtml = group.items
              .map(
                (item) => `
          <tr>
            <td>${escapeHtml(item.natureza)}</td>
            <td style="font-weight: 600;">${escapeHtml(item.itemBec)}</td>
            <td>${escapeHtml(item.especificacao)}</td>
            <td>${escapeHtml(item.unidadeBec)}</td>
            <td class="text-right" style="font-weight: 600;">${item.qtd}</td>
            <td class="text-right">${item.valorOfertado != null ? formatCurrency(item.valorOfertado) : '-'}</td>
            <td class="text-right" style="font-weight: 600;">${item.valorFinal != null ? formatCurrency(item.valorFinal) : '-'}</td>
          </tr>
        `,
              )
              .join('')

            return `
          <div class="supplier-block">
            <div class="supplier-header">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <div style="font-size: 13px; font-weight: 700; color: #1e3a8a;">
                  ${escapeHtml(supp.companyName)}
                </div>
                <div>${badgesHtml}</div>
              </div>
              <div class="supplier-info-grid">
                <div><span class="label">CNPJ:</span> ${escapeHtml(supp.cnpjFormatted || '-')}</div>
                <div><span class="label">Responsável:</span> ${escapeHtml(supp.responsibleName || '-')}</div>
                <div><span class="label">E-mail:</span> ${escapeHtml(supp.email || '-')}</div>
                <div><span class="label">Telefone:</span> ${escapeHtml(contactDetails)}</div>
                ${supp.address ? `<div style="grid-column: span 4;"><span class="label">Endereço:</span> ${escapeHtml(supp.address)}</div>` : ''}
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th style="width: 90px;">Natureza</th>
                  <th style="width: 80px;">Item BEC</th>
                  <th>Especificação</th>
                  <th style="width: 110px;">Unidade BEC</th>
                  <th class="text-right" style="width: 60px;">Qtd</th>
                  <th class="text-right" style="width: 100px;">Valor Ofertado</th>
                  <th class="text-right" style="width: 110px;">Valor Final</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
              <tfoot>
                <tr class="subtotal-row">
                  <td colspan="6" class="text-right">SUBTOTAL (${escapeHtml(supp.companyName)}):</td>
                  <td class="text-right text-primary">${formatCurrency(group.subtotalValorFinal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        `
          })
          .join('')

  const nonWinnersHtml =
    reportData.nonWinnerItems.length > 0
      ? `
    <div style="margin-top: 14px; page-break-inside: avoid;">
      <div style="font-size: 10.5px; font-weight: 700; color: #475569; margin-bottom: 6px;">
        Itens Não Homologados (Desertos / Fracassados) - ${reportData.nonWinnerItems.length} item(ns)
      </div>
      <table>
        <thead>
          <tr>
            <th style="width: 80px;">Item BEC</th>
            <th>Especificação</th>
            <th style="width: 90px;">Natureza</th>
            <th class="text-right" style="width: 60px;">Qtd</th>
            <th class="text-center" style="width: 100px;">Situação</th>
          </tr>
        </thead>
        <tbody>
          ${reportData.nonWinnerItems
            .map(
              (item) => `
            <tr>
              <td>${escapeHtml(item.itemBec)}</td>
              <td>${escapeHtml(item.especificacao)}</td>
              <td>${escapeHtml(item.natureza)}</td>
              <td class="text-right">${item.qtd}</td>
              <td class="text-center" style="font-weight: 600; color: ${item.outcome === 'failed' ? '#dc2626' : '#d97706'};">
                ${escapeHtml(item.outcomeLabel)}
              </td>
            </tr>
          `,
            )
            .join('')}
        </tbody>
      </table>
    </div>
  `
      : ''

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Relatório de Homologação da Disputa - ${escapeHtml(demand.name)}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 10mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      font-size: 10px;
      line-height: 1.35;
      color: #0f172a;
      margin: 0;
      padding: 0;
      background: #fff;
    }
    .header-card {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 10px 14px;
      margin-bottom: 12px;
      background: #f8fafc;
    }
    .demand-title {
      font-size: 15px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 4px 0;
    }
    .demand-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 6px 12px;
      margin-top: 8px;
    }
    .label {
      font-size: 9px;
      color: #64748b;
      font-weight: 600;
      text-transform: uppercase;
    }
    .value {
      font-size: 10.5px;
      font-weight: 500;
      color: #0f172a;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 14px;
    }
    .summary-card {
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 6px 8px;
      text-align: center;
      background: #f8fafc;
    }
    .summary-label {
      font-size: 9px;
      color: #64748b;
      font-weight: 600;
      text-transform: uppercase;
    }
    .summary-value {
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
    }
    .supplier-block {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      margin-bottom: 14px;
      page-break-inside: avoid;
      break-inside: avoid;
      overflow: hidden;
    }
    .supplier-header {
      background: #f1f5f9;
      padding: 8px 10px;
      border-bottom: 1px solid #cbd5e1;
    }
    .supplier-info-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 4px 8px;
      font-size: 9.5px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9.5px;
    }
    thead {
      display: table-header-group;
    }
    th {
      background: #f8fafc;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 8.5px;
      color: #475569;
      padding: 5px 8px;
      border-bottom: 1px solid #cbd5e1;
      text-align: left;
    }
    td {
      padding: 5px 8px;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: middle;
    }
    tr {
      page-break-inside: avoid;
    }
    .subtotal-row td {
      background: #f8fafc;
      font-weight: 700;
      border-top: 1px solid #cbd5e1;
      font-size: 10px;
    }
    .text-primary {
      color: #1e3a8a;
    }
    .text-success {
      color: #15803d;
    }
    .text-right {
      text-align: right;
    }
    .text-center {
      text-align: center;
    }
    .badge {
      display: inline-block;
      font-size: 8px;
      font-weight: 600;
      padding: 1px 5px;
      border-radius: 4px;
      text-transform: uppercase;
    }
    .badge-success {
      background: #dcfce7;
      color: #166534;
      border: 1px solid #bbf7d0;
    }
    .badge-info {
      background: #e0f2fe;
      color: #075985;
      border: 1px solid #bae6fd;
    }
    .grand-total-card {
      border: 2px solid #1e3a8a;
      background: #eff6ff;
      border-radius: 6px;
      padding: 8px 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      font-weight: 700;
      color: #1e3a8a;
      margin-top: 10px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .footer {
      margin-top: 16px;
      font-size: 8.5px;
      color: #94a3b8;
      display: flex;
      justify-content: space-between;
      border-top: 1px solid #e2e8f0;
      padding-top: 6px;
    }
  </style>
</head>
<body>
  <div class="header-card">
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <div>
        <div class="label">Relatório de Homologação da Disputa</div>
        <h1 class="demand-title">${escapeHtml(demand.name)}</h1>
      </div>
      <div>
        <span class="badge badge-info">${escapeHtml(demand.typeLabel)}</span>
        <span class="badge badge-success">${escapeHtml(demand.statusLabel)}</span>
      </div>
    </div>
    <div class="demand-grid">
      <div><div class="label">Nº Processo</div><div class="value">${escapeHtml(demand.processNumber)}</div></div>
      <div><div class="label">Processo Interno</div><div class="value">${escapeHtml(demand.internalProcessNumber)}</div></div>
      <div><div class="label">Aviso Contratação</div><div class="value">${escapeHtml(demand.biddingNoticeNumber)}</div></div>
      <div><div class="label">Nº Disputa</div><div class="value">${escapeHtml(demand.disputeNumber)}</div></div>
      <div><div class="label">Data Disputa</div><div class="value">${escapeHtml(demand.disputeDate)}</div></div>
      <div><div class="label">Abertura Ofertas</div><div class="value">${escapeHtml(demand.offerOpeningDate)}</div></div>
      <div><div class="label">PCA</div><div class="value">${escapeHtml(demand.idPca)}</div></div>
      <div><div class="label">Nº SIAFEM</div><div class="value">${escapeHtml(demand.siafemNumber)}</div></div>
      <div><div class="label">Total Homologado</div><div class="value text-success" style="font-weight: 700;">${formatCurrency(reportData.grandTotalValorFinal)}</div></div>
    </div>
  </div>

  <div class="summary-grid">
    <div class="summary-card">
      <div class="summary-label">Total de Itens</div>
      <div class="summary-value">${reportData.totalItemsCount}</div>
    </div>
    <div class="summary-card">
      <div class="summary-label" style="color: #15803d;">Vencedores</div>
      <div class="summary-value" style="color: #15803d;">${reportData.winnersCount}</div>
    </div>
    <div class="summary-card">
      <div class="summary-label" style="color: #dc2626;">Fracassados</div>
      <div class="summary-value" style="color: #dc2626;">${reportData.failedCount}</div>
    </div>
    <div class="summary-card">
      <div class="summary-label" style="color: #d97706;">Desertos</div>
      <div class="summary-value" style="color: #d97706;">${reportData.desertedCount}</div>
    </div>
  </div>

  ${winnerGroupsHtml}

  <div class="grand-total-card">
    <span>TOTAL GERAL HOMOLOGADO DA DISPUTA:</span>
    <span style="font-size: 15px;">${formatCurrency(reportData.grandTotalValorFinal)}</span>
  </div>

  ${nonWinnersHtml}

  <div class="footer">
    <span>Sistema de Gestão de Contratações - Relatório Oficial de Homologação</span>
    <span>Emissão: ${now}</span>
  </div>
</body>
</html>`
}

/**
 * Triggers native printing using an invisible iframe to prevent any dialog/modal scroll clipping.
 */
export function printHtmlViaIframe(html: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') {
      resolve()
      return
    }

    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'
    iframe.setAttribute('aria-hidden', 'true')
    iframe.setAttribute('tabindex', '-1')

    document.body.appendChild(iframe)

    const doc = iframe.contentWindow?.document || iframe.contentDocument
    if (!doc) {
      document.body.removeChild(iframe)
      resolve()
      return
    }

    doc.open()
    doc.write(html)
    doc.close()

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus?.()
        if (typeof iframe.contentWindow?.print === 'function') {
          iframe.contentWindow.print()
        }
      } catch {
        // Safe fallback in test environments
      } finally {
        setTimeout(() => {
          if (iframe.parentNode) {
            document.body.removeChild(iframe)
          }
          resolve()
        }, 500)
      }
    }, 150)
  })
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

  const printDisputeReport = async (reportData: DisputeReportData): Promise<void> => {
    const html = buildDisputeReportHtml(reportData)
    await printHtmlViaIframe(html)
    await logAction(
      'EXPORT_DEMAND_DISPUTE_REPORT_PDF',
      `Relatório de disputa da demanda "${reportData.demandName}" impresso/exportado para PDF.`,
    )
  }

  const exportDisputeReportToPdf = async (
    reportData: DisputeReportData,
    customFilename?: string,
  ): Promise<void> => {
    const doc = await buildDisputeReportPdfDoc(reportData)
    const blob = doc.output('blob')
    const safeName = (reportData.demandName || 'demanda').toLowerCase().replace(/[^a-z0-9_-]/g, '_')
    const filename = customFilename || `relatorio_disputa_${safeName}.pdf`

    downloadBlob(blob, filename)

    await logAction(
      'EXPORT_DEMAND_DISPUTE_REPORT_PDF',
      `Relatório de disputa da demanda "${reportData.demandName}" exportado para PDF vetorial pesquisável.`,
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
    buildDisputeReportHtml,
    buildDisputeReportPdfDoc,
    exportDisputeReportToCsv,
    exportDisputeReportToPdf,
    printDisputeReport,
    logPdfExport,
  }
}

/**
 * Generates a vector PDF document using jsPDF & jspdf-autotable.
 * Every piece of text is rendered as selectable/searchable native PDF text vectors.
 */
export async function buildDisputeReportPdfDoc(reportData: DisputeReportData): Promise<jsPDF> {
  const { jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = 210
  const marginX = 14
  const usableWidth = pageWidth - marginX * 2

  // 1. Accent header bar
  doc.setFillColor(30, 58, 138)
  doc.rect(marginX, 12, usableWidth, 2.5, 'F')

  // 2. Title & demand name
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(30, 58, 138)
  doc.text('RELATÓRIO DE HOMOLOGAÇÃO DA DISPUTA', marginX, 20)

  doc.setFontSize(10)
  doc.setTextColor(31, 41, 55)
  doc.text(reportData.demand.name || 'Demanda', marginX, 25.5)

  // Status & Type labels on right
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(100, 116, 139)
  const metaText = `Tipo: ${reportData.demand.typeLabel}   |   Situação: ${reportData.demand.statusLabel}`
  doc.text(metaText, pageWidth - marginX, 20, { align: 'right' })

  // 3. Metadata Table
  autoTable(doc, {
    startY: 28,
    margin: { left: marginX, right: marginX },
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 1.8,
      textColor: [31, 41, 55],
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 26, fillColor: [248, 250, 252] },
      1: { cellWidth: 65 },
      2: { fontStyle: 'bold', cellWidth: 26, fillColor: [248, 250, 252] },
      3: { cellWidth: 65 },
    },
    body: [
      [
        'Nº Processo:',
        reportData.demand.processNumber || '-',
        'Processo Interno:',
        reportData.demand.internalProcessNumber || '-',
      ],
      [
        'Aviso Licitação:',
        reportData.demand.biddingNoticeNumber || '-',
        'Nº da Disputa:',
        reportData.demand.disputeNumber || '-',
      ],
      [
        'Data da Disputa:',
        reportData.demand.disputeDate || '-',
        'Abertura Propostas:',
        reportData.demand.offerOpeningDate || '-',
      ],
      [
        'ID PCA:',
        reportData.demand.idPca || '-',
        'Nº SIAFEM:',
        reportData.demand.siafemNumber || '-',
      ],
      ['Total de Itens:', String(reportData.totalItemsCount), '', ''],
    ],
  })

  // 4. Summary metrics strip
  const summaryY =
    (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 2.5
  autoTable(doc, {
    startY: summaryY,
    margin: { left: marginX, right: marginX },
    theme: 'plain',
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    columnStyles: {
      0: { halign: 'center', fillColor: [241, 245, 249], textColor: [15, 23, 42] },
      1: {
        halign: 'center',
        fillColor: [236, 253, 245],
        textColor: [4, 120, 87],
        fontStyle: 'bold',
      },
      2: { halign: 'center', fillColor: [254, 242, 242], textColor: [185, 28, 28] },
      3: { halign: 'center', fillColor: [254, 242, 242], textColor: [185, 28, 28] },
      4: {
        halign: 'right',
        fillColor: [240, 253, 244],
        textColor: [21, 128, 61],
        fontStyle: 'bold',
      },
    },
    body: [
      [
        `Total de Itens: ${reportData.totalItemsCount}`,
        `Homologados: ${reportData.winnersCount}`,
        `Fracassados: ${reportData.failedCount}`,
        `Desertos: ${reportData.desertedCount}`,
        `Total Homologado: ${formatCurrency(reportData.grandTotalValorFinal)}`,
      ],
    ],
  })

  let currentY =
    (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 3.5

  // 5. Winner Groups
  if (reportData.winnerGroups.length > 0) {
    for (let i = 0; i < reportData.winnerGroups.length; i++) {
      const group = reportData.winnerGroups[i]
      const supp = group.supplier
      const telStr =
        [
          supp.cellPhone ? `Cel: ${supp.cellPhone}` : '',
          supp.landline ? `Fixo: ${supp.landline}` : '',
        ]
          .filter(Boolean)
          .join(' / ') || '-'

      if (currentY > 235) {
        doc.addPage()
        currentY = 16
      }

      // Supplier Info Card
      autoTable(doc, {
        startY: currentY,
        margin: { left: marginX, right: marginX },
        theme: 'grid',
        styles: {
          fontSize: 7.5,
          cellPadding: 1.8,
          textColor: [31, 41, 55],
          lineColor: [191, 219, 254],
          lineWidth: 0.2,
        },
        head: [
          [
            {
              content: `FORNECEDOR VENCEDOR #${i + 1}: ${supp.companyName.toUpperCase()} — CNPJ: ${supp.cnpjFormatted}`,
              colSpan: 4,
              styles: {
                fillColor: [30, 58, 138],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 8,
                cellPadding: 2,
              },
            },
          ],
        ],
        body: [
          [
            {
              content: 'Responsável:',
              styles: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 24 },
            },
            { content: supp.responsibleName || '-', styles: { cellWidth: 67 } },
            {
              content: 'E-mail:',
              styles: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 20 },
            },
            { content: supp.email || '-', styles: { cellWidth: 71 } },
          ],
          [
            {
              content: 'Telefones:',
              styles: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 24 },
            },
            { content: telStr, styles: { cellWidth: 67 } },
            {
              content: 'Endereço:',
              styles: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 20 },
            },
            { content: supp.address || '-', styles: { cellWidth: 71 } },
          ],
          [
            {
              content: 'Optante Simples:',
              styles: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 24 },
            },
            { content: supp.isSimplesOptant ? 'Sim' : 'Não', styles: { cellWidth: 67 } },
            {
              content: 'Conta BB:',
              styles: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 20 },
            },
            { content: supp.hasBbAccount || '-', styles: { cellWidth: 71 } },
          ],
        ],
      })

      currentY =
        (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 1.2

      // Items Won Table
      const itemsBody = group.items.map((item) => [
        item.itemBec || '-',
        item.natureza || '-',
        item.especificacao || '-',
        item.unidadeBec || '-',
        String(item.qtd),
        formatCurrency(item.valorOfertado),
        formatCurrency(item.valorFinal),
      ])

      autoTable(doc, {
        startY: currentY,
        margin: { left: marginX, right: marginX },
        theme: 'striped',
        styles: {
          fontSize: 7.5,
          cellPadding: 1.8,
          textColor: [31, 41, 55],
          lineColor: [226, 232, 240],
          lineWidth: 0.15,
          overflow: 'linebreak',
        },
        headStyles: {
          fillColor: [51, 65, 85],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 7.5,
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        columnStyles: {
          0: { cellWidth: 16, fontStyle: 'bold' },
          1: { cellWidth: 18 },
          2: { cellWidth: 72 },
          3: { cellWidth: 26 },
          4: { cellWidth: 12, halign: 'right' },
          5: { cellWidth: 19, halign: 'right' },
          6: { cellWidth: 19, halign: 'right', fontStyle: 'bold' },
        },
        head: [
          [
            'Item BEC',
            'Natureza',
            'Especificação do Item',
            'Unidade',
            'Qtd',
            'Unitário',
            'Valor Total',
          ],
        ],
        body: itemsBody,
        foot: [
          [
            {
              content: `SUBTOTAL (${supp.companyName}):`,
              colSpan: 6,
              styles: {
                halign: 'right',
                fontStyle: 'bold',
                fillColor: [241, 245, 249],
                textColor: [15, 23, 42],
              },
            },
            {
              content: formatCurrency(group.subtotalValorFinal),
              styles: {
                halign: 'right',
                fontStyle: 'bold',
                fillColor: [241, 245, 249],
                textColor: [15, 23, 42],
              },
            },
          ],
        ],
      })

      currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4
    }

    // Grand Total Box
    if (currentY > 260) {
      doc.addPage()
      currentY = 16
    }

    autoTable(doc, {
      startY: currentY,
      margin: { left: marginX, right: marginX },
      theme: 'plain',
      styles: {
        cellPadding: 2.5,
      },
      body: [
        [
          {
            content: 'TOTAL GERAL HOMOLOGADO DA DISPUTA:',
            styles: {
              fillColor: [240, 253, 244],
              textColor: [21, 128, 61],
              fontStyle: 'bold',
              fontSize: 9,
              halign: 'right',
              cellWidth: 140,
            },
          },
          {
            content: formatCurrency(reportData.grandTotalValorFinal),
            styles: {
              fillColor: [240, 253, 244],
              textColor: [21, 128, 61],
              fontStyle: 'bold',
              fontSize: 10,
              halign: 'right',
              cellWidth: 42,
            },
          },
        ],
      ],
    })

    currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4
  }

  // 6. Non-Winner Items
  if (reportData.nonWinnerItems.length > 0) {
    if (currentY > 240) {
      doc.addPage()
      currentY = 16
    }

    autoTable(doc, {
      startY: currentY,
      margin: { left: marginX, right: marginX },
      theme: 'grid',
      styles: {
        fontSize: 7.5,
        cellPadding: 1.8,
        textColor: [71, 85, 105],
        lineColor: [226, 232, 240],
        lineWidth: 0.15,
      },
      headStyles: {
        fillColor: [100, 116, 139],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5,
      },
      columnStyles: {
        0: { cellWidth: 18, fontStyle: 'bold' },
        1: { cellWidth: 20 },
        2: { cellWidth: 84 },
        3: { cellWidth: 30 },
        4: { cellWidth: 12, halign: 'right' },
        5: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
      },
      head: [['Item BEC', 'Natureza', 'Especificação', 'Unidade', 'Qtd', 'Situação']],
      body: reportData.nonWinnerItems.map((item) => [
        item.itemBec || '-',
        item.natureza || '-',
        item.especificacao || '-',
        item.unidadeBec || '-',
        String(item.qtd),
        item.outcomeLabel,
      ]),
    })
  }

  // 7. Footers on every page
  const totalPages = doc.getNumberOfPages()
  const nowFormatted = formatDateTime(new Date())
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(148, 163, 184)
    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(0.3)
    doc.line(marginX, 287, pageWidth - marginX, 287)
    doc.text('Sistema de Gestão de Contratações - Relatório Oficial de Homologação', marginX, 291)
    doc.text(`Emissão: ${nowFormatted}`, 105, 291, { align: 'center' })
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - marginX, 291, { align: 'right' })
  }

  return doc
}
