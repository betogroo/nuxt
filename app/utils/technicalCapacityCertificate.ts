import { formatCurrencyInWords } from './currencyInWords'
import { escapeHtml } from './reportHtml'

export interface TechnicalCertificateSupplier {
  id?: string
  company_name: string
  cnpj: string
  address?: string | null
  responsible_name?: string | null
  email?: string | null
}

export interface TechnicalCertificateItem {
  id: string
  product_name: string
  unit_name?: string | null
  quantity: number
  unit_price: number
  total_price: number
  demand_id?: string
  demand_name?: string | null
  process_number?: string | null
  internal_process_number?: string | null
  contract_number?: string | null
  bidding_notice_number?: string | null
  dispute_date?: string | null
}

export interface TechnicalCertificateOptions {
  issuerOrganization?: string
  issuerUge?: string
  issuerCity?: string
  issuerState?: string
  issueDate?: string | Date
  signatoryName?: string
  signatoryRole?: string
  customNotes?: string | null
}

const MONTHS_PT_BR = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
]

/**
 * Formats a date into Brazilian Portuguese long date format (e.g., "26 de novembro de 2026").
 */
export function formatDateLongPtBr(dateInput?: string | Date | null): string {
  let date: Date
  if (!dateInput) {
    date = new Date()
  } else if (typeof dateInput === 'string') {
    // If format is YYYY-MM-DD or ISO
    if (/^\d{4}-\d{2}-\d{2}/.test(dateInput)) {
      const parts = dateInput.substring(0, 10).split('-').map(Number)
      date = new Date(parts[0], parts[1] - 1, parts[2])
    } else {
      date = new Date(dateInput)
    }
  } else {
    date = dateInput
  }

  if (isNaN(date.getTime())) {
    date = new Date()
  }

  const day = date.getDate()
  const month = MONTHS_PT_BR[date.getMonth()]
  const year = date.getFullYear()

  return `${day} de ${month} de ${year}`
}

/**
 * Formats a number into BRL currency (e.g. "R$ 1.250,00").
 */
export function formatCurrencyBrl(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
    .format(value || 0)
    .replace(/\u00A0/g, ' ')
}

/**
 * Formats numeric quantity with Brazilian formatting.
 */
export function formatQuantityPtBr(qty: number): string {
  return new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 3,
  }).format(qty || 0)
}

/**
 * Calculates sum totals, counts and in-words description for certificate items.
 */
export function calculateTechnicalCertificateTotals(items: TechnicalCertificateItem[]) {
  const totalAmount = items.reduce((sum, item) => sum + (Number(item.total_price) || 0), 0)
  const totalQuantity = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
  const totalAmountInWords = formatCurrencyInWords(totalAmount)
  const formattedTotalAmount = formatCurrencyBrl(totalAmount)

  return {
    totalAmount,
    totalQuantity,
    itemCount: items.length,
    totalAmountInWords,
    formattedTotalAmount,
  }
}

/**
 * Generates the official printable HTML for the Technical Capacity Certificate.
 */
export function generateTechnicalCapacityCertificateHtml(
  supplier: TechnicalCertificateSupplier,
  items: TechnicalCertificateItem[],
  options: TechnicalCertificateOptions = {},
): string {
  const org = options.issuerOrganization || 'Delegacia Seccional de Polícia de São Joaquim da Barra'
  const uge = options.issuerUge || '180297'
  const city = options.issuerCity || 'São Joaquim da Barra'
  const state = options.issuerState || 'SP'
  const dateFormatted = formatDateLongPtBr(options.issueDate)
  const signatoryName = options.signatoryName || ''
  const signatoryRole =
    options.signatoryRole || 'Delegado de Polícia Seccional / Ordenador de Despesas'
  const totals = calculateTechnicalCertificateTotals(items)

  const addressText = supplier.address ? `, estabelecida à ${escapeHtml(supplier.address)}` : ''

  const rowsHtml = items
    .map((item, index) => {
      const processRef = item.process_number || item.demand_name || 'Processo de Compra'
      const unit = item.unit_name || 'UN'
      const unitPriceFormatted = formatCurrencyBrl(item.unit_price)
      const totalPriceFormatted = formatCurrencyBrl(item.total_price)
      const qtyFormatted = formatQuantityPtBr(item.quantity)

      return `
        <tr>
          <td style="text-align: center; font-weight: 600;">${index + 1}</td>
          <td>
            <strong>${escapeHtml(item.product_name)}</strong>
            ${item.contract_number ? `<br><small style="color: #555;">Contrato nº ${escapeHtml(item.contract_number)}</small>` : ''}
          </td>
          <td style="text-align: center;">${escapeHtml(unit)}</td>
          <td style="text-align: right;">${qtyFormatted}</td>
          <td style="text-align: right;">${unitPriceFormatted}</td>
          <td style="text-align: right; font-weight: 600;">${totalPriceFormatted}</td>
          <td style="font-size: 8.5pt;">${escapeHtml(processRef)}</td>
        </tr>
      `
    })
    .join('')

  const notesHtml = options.customNotes
    ? `
      <div style="margin-top: 14px; padding: 10px; background: #fdfdfd; border-left: 3px solid #666; font-size: 9pt;">
        <strong>Observações Complementares:</strong><br>
        ${escapeHtml(options.customNotes).replace(/\n/g, '<br>')}
      </div>
    `
    : ''

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Atestado de Capacidade Técnica - ${escapeHtml(supplier.company_name)}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 18mm 20mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      font-family: 'Times New Roman', Times, Georgia, serif;
      font-size: 11pt;
      line-height: 1.5;
      color: #111;
      margin: 0;
      padding: 0;
      background: #fff;
    }
    .header {
      text-align: center;
      margin-bottom: 24px;
      padding-bottom: 12px;
      border-bottom: 1.5px solid #222;
    }
    .header h1 {
      font-size: 12pt;
      margin: 0 0 2px 0;
      text-transform: uppercase;
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    .header h2 {
      font-size: 11pt;
      margin: 0 0 2px 0;
      font-weight: 600;
      text-transform: uppercase;
    }
    .header h3 {
      font-size: 10pt;
      margin: 0;
      font-weight: normal;
      color: #333;
    }
    .document-title {
      text-align: center;
      margin: 28px 0 22px 0;
    }
    .document-title h2 {
      font-size: 15pt;
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 1.2px;
      font-weight: 800;
      text-decoration: underline;
    }
    p {
      text-align: justify;
      text-indent: 30px;
      margin: 12px 0;
      line-height: 1.6;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin: 18px 0;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 9pt;
    }
    .items-table th {
      background-color: #f2f2f2;
      color: #111;
      border: 1px solid #777;
      padding: 6px 8px;
      font-weight: 700;
      text-align: left;
    }
    .items-table td {
      border: 1px solid #aaa;
      padding: 5px 8px;
      vertical-align: middle;
    }
    .items-table tr:nth-child(even) {
      background-color: #fafafa;
    }
    .table-total-row td {
      background-color: #e9e9e9 !important;
      font-weight: bold;
      border-top: 2px solid #555;
    }
    .date-location {
      text-align: right;
      margin: 32px 0 45px 0;
      font-style: italic;
    }
    .signature-section {
      text-align: center;
      margin-top: 50px;
      page-break-inside: avoid;
    }
    .signature-line {
      width: 320px;
      margin: 0 auto 6px auto;
      border-top: 1px solid #222;
    }
    .signature-name {
      font-weight: bold;
      font-size: 11pt;
      text-transform: uppercase;
    }
    .signature-role {
      font-size: 9.5pt;
      color: #333;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Governo do Estado de São Paulo</h1>
    <h2>Secretaria da Segurança Pública &bull; Polícia Civil</h2>
    <h3>${escapeHtml(org)} &bull; UGE ${escapeHtml(uge)}</h3>
  </div>

  <div class="document-title">
    <h2>Atestado de Capacidade Técnica</h2>
  </div>

  <p>
    Atestamos para os devidos fins, a pedido da parte interessada, que a empresa
    <strong>${escapeHtml(supplier.company_name)}</strong>, inscrita no CNPJ sob o nº
    <strong>${escapeHtml(supplier.cnpj)}</strong>${addressText}, forneceu a este Órgão da Administração Pública
    os materiais e/ou serviços abaixo discriminados, tendo cumprido integralmente as obrigações pactuadas,
    com pontualidade, rigor técnico e qualidade a contento:
  </p>

  <table class="items-table">
    <thead>
      <tr>
        <th style="width: 35px; text-align: center;">Item</th>
        <th>Descrição do Produto / Material</th>
        <th style="width: 45px; text-align: center;">Unid.</th>
        <th style="width: 65px; text-align: right;">Qtd.</th>
        <th style="width: 90px; text-align: right;">Unitário</th>
        <th style="width: 95px; text-align: right;">Total</th>
        <th style="width: 140px;">Processo / Demanda</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
      <tr class="table-total-row">
        <td colspan="3" style="text-align: right; text-transform: uppercase;">Total Geral do Fornecimento:</td>
        <td style="text-align: right;">${formatQuantityPtBr(totals.totalQuantity)}</td>
        <td></td>
        <td style="text-align: right;">${totals.formattedTotalAmount}</td>
        <td></td>
      </tr>
    </tbody>
  </table>

  <p>
    O valor global dos fornecimentos certificados no presente instrumento perfaz o montante de
    <strong>${totals.formattedTotalAmount} (${escapeHtml(totals.totalAmountInWords)})</strong>.
  </p>

  <p>
    Declaramos outrossim que até a presente data inexistem registros que desabonem a conduta técnica, comercial
    ou administrativa da referida empresa no cumprimento dos prazos, especificações e condições avençadas,
    não tendo sido aplicadas penalidades ou sanções decorrentes de inadimplemento contratual.
  </p>

  ${notesHtml}

  <div class="date-location">
    ${escapeHtml(city)} - ${escapeHtml(state)}, ${dateFormatted}.
  </div>

  <div class="signature-section">
    <div class="signature-line"></div>
    <div class="signature-name">${escapeHtml(signatoryName || 'Autoridade Competente')}</div>
    <div class="signature-role">${escapeHtml(signatoryRole)}</div>
    <div class="signature-role">${escapeHtml(org)}</div>
  </div>
</body>
</html>`
}

/**
 * Generates formatted plain text version of the Technical Capacity Certificate for clipboard copying.
 */
export function generateTechnicalCapacityCertificateText(
  supplier: TechnicalCertificateSupplier,
  items: TechnicalCertificateItem[],
  options: TechnicalCertificateOptions = {},
): string {
  const org = options.issuerOrganization || 'Delegacia Seccional de Polícia de São Joaquim da Barra'
  const uge = options.issuerUge || '180297'
  const city = options.issuerCity || 'São Joaquim da Barra'
  const state = options.issuerState || 'SP'
  const dateFormatted = formatDateLongPtBr(options.issueDate)
  const signatoryName = options.signatoryName || 'AUTORIDADE COMPETENTE'
  const signatoryRole =
    options.signatoryRole || 'Delegado de Polícia Seccional / Ordenador de Despesas'
  const totals = calculateTechnicalCertificateTotals(items)

  const addressText = supplier.address ? `, estabelecida à ${supplier.address}` : ''

  const itemsList = items
    .map((item, idx) => {
      const processRef = item.process_number || item.demand_name || 'Processo de Compra'
      const unit = item.unit_name || 'UN'
      const unitPriceFormatted = formatCurrencyBrl(item.unit_price)
      const totalPriceFormatted = formatCurrencyBrl(item.total_price)
      const qtyFormatted = formatQuantityPtBr(item.quantity)
      const contractRef = item.contract_number ? ` (Contrato: ${item.contract_number})` : ''

      return `Item ${idx + 1}: ${item.product_name}${contractRef}\n  Qtd: ${qtyFormatted} ${unit} | Unit: ${unitPriceFormatted} | Total: ${totalPriceFormatted} | Ref: ${processRef}`
    })
    .join('\n\n')

  const notesText = options.customNotes ? `\n\nObservações: ${options.customNotes}` : ''

  return `ESTADO DE SÃO PAULO
SECRETARIA DA SEGURANÇA PÚBLICA - POLÍCIA CIVIL
${org.toUpperCase()} - UGE ${uge}

ATESTADO DE CAPACIDADE TÉCNICA

Atestamos para os devidos fins, a pedido da parte interessada, que a empresa ${supplier.company_name}, inscrita no CNPJ sob nº ${supplier.cnpj}${addressText}, forneceu a este Órgão da Administração Pública os materiais e/ou serviços abaixo discriminados, tendo cumprido integralmente as obrigações pactuadas, com pontualidade, rigor técnico e qualidade a contento:

${itemsList}

VALOR TOTAL ATESTADO: ${totals.formattedTotalAmount} (${totals.totalAmountInWords})
QUANTIDADE TOTAL DE ITENS: ${totals.itemCount}

Declaramos outrossim que até a presente data inexistem registros que desabonem a conduta técnica, comercial ou operacional da referida contratada, não tendo sido aplicadas quaisquer penalidades ou sanções administrativas relativas aos fornecimentos acima discriminados.${notesText}

${city} - ${state}, ${dateFormatted}.

_____________________________________________________
${signatoryName}
${signatoryRole}
${org}`
}
