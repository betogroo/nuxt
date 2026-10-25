import type { jsPDF } from 'jspdf'
import { useLogger } from '~/composables/useLogger'
import { printHtmlViaIframe, escapeHtml } from '~/composables/useDemandReports'
import { downloadBlob } from '~/utils/download'
import { formatDate } from '~/utils/formatters'
import type { VoterCardItem, VoterCardEmissionOptions } from '~/types/election-voter'

export function formatCardDate(dateStr?: string | Date | null): string {
  if (!dateStr) return '-'
  if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split('-')
    return `${day}/${month}/${year}`
  }
  const d = new Date(dateStr)
  return isNaN(d.getTime()) ? String(dateStr) : formatDate(d)
}

export function buildSingleVoterCardHtml(voter: VoterCardItem): string {
  const formattedDate = formatCardDate(voter.issueDate)
  const escapedName = escapeHtml(voter.name)
  const escapedNumber = escapeHtml(voter.voter_registration_number)
  const statusLabel = voter.is_active ? 'REGULAR / APTO' : 'INATIVO / SUSPENSO'
  const statusColor = voter.is_active ? '#15803d' : '#b91c1c'

  // Generate a mock verification hash code based on registration number
  const hashSuffix = Array.from(voter.voter_registration_number || '')
    .reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) % 10000, 7)
    .toString()
    .padStart(4, '0')
  const validationCode = `BR-${escapedNumber}-${hashSuffix}`

  return `
    <div class="voter-card">
      <div class="card-inner-border">
        <!-- Header -->
        <div class="card-header">
          <div class="card-coat-placeholder">
            <svg viewBox="0 0 24 24" class="civic-icon" fill="currentColor">
              <path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5zm0 2.18l7 3.89v4.93c0 4.54-3.14 8.79-7 9.88-3.86-1.09-7-5.34-7-9.88V8.07l7-3.89zM11 7h2v6h-2zm0 8h2v2h-2z"/>
            </svg>
          </div>
          <div class="card-title-group">
            <div class="card-institution">REPÚBLICA FEDERATIVA DO BRASIL</div>
            <div class="card-subinstitution">JUSTIÇA ELEITORAL &bull; SISTEMA ELEITORAL</div>
            <div class="card-main-title">TÍTULO ELEITORAL</div>
          </div>
        </div>

        <!-- Body -->
        <div class="card-body">
          <div class="card-field field-name">
            <div class="field-label">NOME DO ELEITOR</div>
            <div class="field-value voter-name">${escapedName}</div>
          </div>

          <div class="card-grid-row">
            <div class="card-field field-number">
              <div class="field-label">NÚMERO DA INSCRIÇÃO</div>
              <div class="field-value voter-number">${escapedNumber}</div>
            </div>

            <div class="card-field field-date">
              <div class="field-label">DATA DE EMISSÃO</div>
              <div class="field-value voter-date">${formattedDate}</div>
            </div>
          </div>

          <div class="card-grid-row">
            <div class="card-field field-status">
              <div class="field-label">SITUAÇÃO CADASTRAL</div>
              <div class="field-value voter-status" style="color: ${statusColor}; font-weight: 700;">
                ${statusLabel}
              </div>
            </div>

            <div class="card-field field-auth">
              <div class="field-label">CÓDIGO DE VALIDAÇÃO</div>
              <div class="field-value voter-auth">${validationCode}</div>
            </div>
          </div>
        </div>

        <!-- Barcode Line Simulation -->
        <div class="card-barcode-wrap">
          <div class="barcode-bars">
            <div class="bar bar-w2"></div><div class="bar bar-w1"></div><div class="bar bar-w3"></div>
            <div class="bar bar-w1"></div><div class="bar bar-w2"></div><div class="bar bar-w1"></div>
            <div class="bar bar-w4"></div><div class="bar bar-w2"></div><div class="bar bar-w1"></div>
            <div class="bar bar-w3"></div><div class="bar bar-w1"></div><div class="bar bar-w2"></div>
            <div class="bar bar-w2"></div><div class="bar bar-w3"></div><div class="bar bar-w1"></div>
            <div class="bar bar-w4"></div><div class="bar bar-w1"></div><div class="bar bar-w2"></div>
            <div class="bar bar-w1"></div><div class="bar bar-w3"></div><div class="bar bar-w2"></div>
            <div class="bar bar-w1"></div><div class="bar bar-w4"></div><div class="bar bar-w2"></div>
            <div class="bar bar-w1"></div><div class="bar bar-w3"></div><div class="bar bar-w2"></div>
          </div>
        </div>

        <!-- Footer -->
        <div class="card-footer">
          Documento oficial de identificação do eleitor para votação nas urnas eletrônicas do sistema.
        </div>
      </div>
    </div>
  `
}

export const VOTER_CARD_PRINT_STYLES = `
  @page {
    size: A4 portrait;
    margin: 8mm;
  }
  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  body {
    font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    color: #0f172a;
    margin: 0;
    padding: 0;
    background: #ffffff;
  }
  .page-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-gap: 6mm 8mm;
    page-break-inside: avoid;
    margin-bottom: 6mm;
  }
  .page-break {
    page-break-after: always;
  }
  .cut-guide {
    position: relative;
    border: 1px dashed #94a3b8;
    padding: 2mm;
    border-radius: 4px;
    background: #fafafa;
  }
  .cut-guide::before {
    content: '✂ Recorte aqui';
    position: absolute;
    top: -9px;
    right: 12px;
    font-size: 8px;
    color: #64748b;
    background: #ffffff;
    padding: 0 4px;
    font-weight: 600;
  }
  .voter-card {
    width: 92mm;
    height: 64mm;
    background: linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 50%, #fefce8 100%);
    border: 2px solid #059669;
    border-radius: 6px;
    padding: 2mm;
    box-shadow: none;
    position: relative;
    overflow: hidden;
    margin: 0 auto;
  }
  .card-inner-border {
    border: 1.5px solid #10b981;
    border-radius: 4px;
    padding: 2mm;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    background: rgba(255, 255, 255, 0.9);
  }
  .card-header {
    display: flex;
    align-items: center;
    border-bottom: 1.5px solid #059669;
    padding-bottom: 1.5mm;
    margin-bottom: 1.5mm;
  }
  .card-coat-placeholder {
    width: 24px;
    height: 24px;
    color: #047857;
    margin-right: 6px;
    flex-shrink: 0;
  }
  .civic-icon {
    width: 100%;
    height: 100%;
  }
  .card-title-group {
    flex: 1;
    text-align: center;
  }
  .card-institution {
    font-size: 7px;
    font-weight: 800;
    letter-spacing: 0.5px;
    color: #065f46;
    text-transform: uppercase;
  }
  .card-subinstitution {
    font-size: 6px;
    color: #047857;
    font-weight: 600;
    margin-top: 0.5px;
    text-transform: uppercase;
  }
  .card-main-title {
    font-size: 11px;
    font-weight: 900;
    color: #064e3b;
    letter-spacing: 1px;
    margin-top: 1px;
  }
  .card-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 1.5mm;
  }
  .card-field {
    background: #ffffff;
    border: 1px solid #a7f3d0;
    border-radius: 3px;
    padding: 1.2mm 2mm;
  }
  .field-label {
    font-size: 6px;
    font-weight: 700;
    color: #047857;
    letter-spacing: 0.3px;
    margin-bottom: 0.5px;
  }
  .field-value {
    font-size: 8.5px;
    color: #0f172a;
    font-weight: 600;
    line-height: 1.1;
  }
  .voter-name {
    font-size: 9px;
    font-weight: 700;
    color: #064e3b;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .card-grid-row {
    display: grid;
    grid-template-columns: 1.2fr 1fr;
    gap: 1.5mm;
  }
  .voter-number {
    font-family: 'Courier New', Courier, monospace;
    font-size: 10px;
    font-weight: 800;
    color: #047857;
    letter-spacing: 0.6px;
  }
  .voter-auth {
    font-family: 'Courier New', Courier, monospace;
    font-size: 7px;
    color: #475569;
    font-weight: 600;
  }
  .card-barcode-wrap {
    margin-top: 1.5mm;
    padding: 1mm 0;
    background: #ffffff;
    border: 1px dashed #a7f3d0;
    border-radius: 3px;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  .barcode-bars {
    display: flex;
    align-items: center;
    height: 14px;
    gap: 1.2px;
  }
  .bar {
    height: 100%;
    background-color: #0f172a;
  }
  .bar-w1 { width: 1.2px; }
  .bar-w2 { width: 2px; }
  .bar-w3 { width: 3px; }
  .bar-w4 { width: 4px; }
  .card-footer {
    margin-top: 1.5mm;
    font-size: 5.5px;
    color: #065f46;
    text-align: center;
    font-weight: 600;
    border-top: 1px solid #a7f3d0;
    padding-top: 1mm;
  }
`

export function buildBatchVoterCardsHtml(options: VoterCardEmissionOptions): string {
  const voters = options.voters || []
  if (voters.length === 0) {
    return `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><title>Títulos Eleitorais</title></head>
      <body><p style="text-align:center; padding: 20px;">Nenhum eleitor selecionado para emissão.</p></body>
      </html>
    `
  }

  // Chunk voters into groups of 6 (2x3 grid per A4 page)
  const chunks: Array<typeof voters> = []
  for (let i = 0; i < voters.length; i += 6) {
    chunks.push(voters.slice(i, i + 6))
  }

  const pagesHtml = chunks
    .map((chunk, pageIndex) => {
      const isLastPage = pageIndex === chunks.length - 1
      const cardsHtml = chunk
        .map((voter) => {
          const item: VoterCardItem = {
            id: voter.id,
            voter_registration_number: voter.voter_registration_number,
            name: voter.name,
            is_active: voter.is_active,
            issueDate: options.issueDate,
          }
          return `
            <div class="cut-guide">
              ${buildSingleVoterCardHtml(item)}
            </div>
          `
        })
        .join('')

      return `
        <div class="page-grid ${!isLastPage ? 'page-break' : ''}">
          ${cardsHtml}
        </div>
      `
    })
    .join('')

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="utf-8">
      <title>Emissão de Títulos Eleitorais (${voters.length} registros)</title>
      <style>${VOTER_CARD_PRINT_STYLES}</style>
    </head>
    <body>
      ${pagesHtml}
    </body>
    </html>
  `
}

export async function buildVoterCardsPdfDoc(options: VoterCardEmissionOptions): Promise<jsPDF> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const voters = options.voters || []
  if (voters.length === 0) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.text('Nenhum eleitor selecionado para emissão.', 20, 20)
    return doc
  }

  // A4 dimensions: 210 x 297 mm
  // Standard card proportion 92mm x 64mm (1.44:1)
  // Grid of 2 columns x 3 rows = 6 cards per A4 page
  const cardWidth = 92
  const cardHeight = 64
  const gapX = 8
  const gapY = 10
  const startX = (210 - (cardWidth * 2 + gapX)) / 2 // 9 mm
  const startY = (297 - (cardHeight * 3 + gapY * 2)) / 2 // 42.5 mm

  const formattedDate = formatCardDate(options.issueDate)

  voters.forEach((voter, index) => {
    const slotInPage = index % 6
    if (index > 0 && slotInPage === 0) {
      doc.addPage()
    }

    const col = slotInPage % 2
    const row = Math.floor(slotInPage / 2)
    const x = startX + col * (cardWidth + gapX)
    const y = startY + row * (cardHeight + gapY)

    // Cut guide (dashed outline)
    doc.setDrawColor(148, 163, 184)
    doc.setLineWidth(0.2)
    doc.setLineDashPattern([2, 2], 0)
    doc.roundedRect(x - 1.5, y - 1.5, cardWidth + 3, cardHeight + 3, 1, 1)
    doc.setLineDashPattern([], 0)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(5.5)
    doc.setTextColor(100, 116, 139)
    doc.text('✂ Recorte aqui', x + cardWidth - 16, y - 2.2)

    // Outer Card: soft gradient-like green background with solid emerald border
    doc.setFillColor(236, 253, 245)
    doc.setDrawColor(5, 150, 105)
    doc.setLineWidth(0.55)
    doc.roundedRect(x, y, cardWidth, cardHeight, 2.8, 2.8, 'FD')

    // Inner Card: clean white panel with emerald inner border
    const innerX = x + 1.8
    const innerY = y + 1.8
    const innerW = cardWidth - 3.6 // 88.4 mm
    const innerH = cardHeight - 3.6 // 60.4 mm

    doc.setFillColor(255, 255, 255)
    doc.setDrawColor(16, 185, 129)
    doc.setLineWidth(0.35)
    doc.roundedRect(innerX, innerY, innerW, innerH, 2, 2, 'FD')

    // Header Civic Shield Emblem (Vector)
    const sx = innerX + 2.5
    const sy = innerY + 2
    const sw = 6.5
    const sh = 8.5
    doc.setDrawColor(4, 120, 87)
    doc.setFillColor(240, 253, 244)
    doc.setLineWidth(0.35)
    doc.lines(
      [
        [sw, 0],
        [0, sh * 0.55],
        [-sw / 2, sh * 0.45],
        [-sw / 2, -sh * 0.45],
        [0, -sh * 0.55],
      ],
      sx,
      sy,
      [1, 1],
      'FD',
      true,
    )
    doc.setFillColor(4, 120, 87)
    doc.circle(sx + sw / 2, sy + 3.2, 1.1, 'F')
    doc.setLineWidth(0.4)
    doc.line(sx + sw / 2 - 1.5, sy + 6.2, sx + sw / 2 + 1.5, sy + 6.2)

    // Header Titles (centered across header area)
    const titleCenterX = innerX + 10 + (innerW - 12) / 2
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(5.6)
    doc.setTextColor(6, 95, 70)
    doc.text('REPÚBLICA FEDERATIVA DO BRASIL', titleCenterX, innerY + 3.4, { align: 'center' })

    doc.setFontSize(4.8)
    doc.setTextColor(4, 120, 87)
    doc.text('JUSTIÇA ELEITORAL • SISTEMA ELEITORAL', titleCenterX, innerY + 6.1, {
      align: 'center',
    })

    doc.setFontSize(8.5)
    doc.setTextColor(6, 78, 59)
    doc.text('TÍTULO ELEITORAL', titleCenterX, innerY + 10.2, { align: 'center' })

    // Header separator line
    doc.setDrawColor(5, 150, 105)
    doc.setLineWidth(0.45)
    doc.line(innerX + 2, innerY + 12, innerX + innerW - 2, innerY + 12)

    // Field: Nome do Eleitor (Full width box)
    doc.setFillColor(255, 255, 255)
    doc.setDrawColor(167, 243, 208)
    doc.setLineWidth(0.2)
    doc.roundedRect(innerX + 2, innerY + 13.5, innerW - 4, 7.8, 0.8, 0.8, 'FD')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(4.8)
    doc.setTextColor(4, 120, 87)
    doc.text('NOME DO ELEITOR', innerX + 3.5, innerY + 16.3)

    doc.setFontSize(7.5)
    doc.setTextColor(6, 78, 59)
    const truncatedName = doc.splitTextToSize(voter.name.toUpperCase(), innerW - 8)[0] || ''
    doc.text(truncatedName, innerX + 3.5, innerY + 19.8)

    // Row 1: Inscrição / Título & Data de Emissão
    // Col 1: Nº DA INSCRIÇÃO
    doc.roundedRect(innerX + 2, innerY + 22.5, 48, 7.8, 0.8, 0.8, 'FD')
    doc.setFontSize(4.8)
    doc.setTextColor(4, 120, 87)
    doc.text('Nº DA INSCRIÇÃO', innerX + 3.5, innerY + 25.3)

    doc.setFont('courier', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(5, 150, 105)
    doc.text(voter.voter_registration_number, innerX + 3.5, innerY + 28.8)

    // Col 2: DATA DE EMISSÃO
    doc.setFont('helvetica', 'bold')
    doc.roundedRect(innerX + 52, innerY + 22.5, innerW - 54, 7.8, 0.8, 0.8, 'FD')
    doc.setFontSize(4.8)
    doc.setTextColor(4, 120, 87)
    doc.text('DATA DE EMISSÃO', innerX + 53.5, innerY + 25.3)

    doc.setFontSize(7.2)
    doc.setTextColor(15, 23, 42)
    doc.text(formattedDate, innerX + 53.5, innerY + 28.8)

    // Row 2: Situação Cadastral & Código de Validação
    // Col 1: SITUAÇÃO CADASTRAL
    doc.roundedRect(innerX + 2, innerY + 31.5, 40, 7.8, 0.8, 0.8, 'FD')
    doc.setFontSize(4.8)
    doc.setTextColor(4, 120, 87)
    doc.text('SITUAÇÃO CADASTRAL', innerX + 3.5, innerY + 34.3)

    doc.setFontSize(7)
    if (voter.is_active) {
      doc.setTextColor(21, 128, 61)
      doc.text('REGULAR / APTO', innerX + 3.5, innerY + 37.8)
    } else {
      doc.setTextColor(185, 28, 28)
      doc.text('INATIVO / SUSPENSO', innerX + 3.5, innerY + 37.8)
    }

    // Col 2: CÓDIGO DE VALIDAÇÃO
    doc.roundedRect(innerX + 44, innerY + 31.5, innerW - 46, 7.8, 0.8, 0.8, 'FD')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(4.8)
    doc.setTextColor(4, 120, 87)
    doc.text('CÓDIGO DE VALIDAÇÃO', innerX + 45.5, innerY + 34.3)

    const hashSuffix = Array.from(voter.voter_registration_number || '')
      .reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) % 10000, 7)
      .toString()
      .padStart(4, '0')
    const validationCode = `BR-${voter.voter_registration_number}-${hashSuffix}`

    doc.setFont('courier', 'bold')
    doc.setFontSize(6)
    doc.setTextColor(71, 85, 105)
    doc.text(validationCode, innerX + 45.5, innerY + 37.8)

    // Simulated Barcode Box (24 bars matching HTML component)
    doc.setFillColor(255, 255, 255)
    doc.setDrawColor(167, 243, 208)
    doc.setLineWidth(0.2)
    doc.setLineDashPattern([1, 1], 0)
    doc.roundedRect(innerX + 2, innerY + 40.5, innerW - 4, 8.5, 0.8, 0.8, 'FD')
    doc.setLineDashPattern([], 0)

    doc.setFillColor(15, 23, 42)
    const barPatterns = [2, 1, 3, 1, 4, 2, 1, 3, 2, 1, 4, 2, 1, 3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 3]
    const unitW = 0.35
    const barGap = 0.45
    let totalBarcodeW = 0
    barPatterns.forEach((p) => {
      totalBarcodeW += p * unitW + barGap
    })
    totalBarcodeW -= barGap

    let barCursorX = innerX + 2 + (innerW - 4 - totalBarcodeW) / 2
    const barY = innerY + 42.2
    const barH = 5.2
    barPatterns.forEach((p) => {
      const w = p * unitW
      doc.rect(barCursorX, barY, w, barH, 'F')
      barCursorX += w + barGap
    })

    // Footer divider line and note
    doc.setDrawColor(167, 243, 208)
    doc.setLineWidth(0.25)
    doc.line(innerX + 2, innerY + 50.8, innerX + innerW - 2, innerY + 50.8)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(4.3)
    doc.setTextColor(6, 95, 70)
    const footerMsg =
      'Documento oficial de identificação do eleitor para votação nas urnas eletrônicas do sistema.'
    doc.text(footerMsg, innerX + innerW / 2, innerY + 54.2, {
      align: 'center',
      maxWidth: innerW - 6,
    })
  })

  return doc
}

export function useElectionVoterCards() {
  const { logAction } = useLogger()

  const printVoterCards = async (options: VoterCardEmissionOptions): Promise<void> => {
    const html = buildBatchVoterCardsHtml(options)
    await printHtmlViaIframe(html)
    await logAction(
      'ELECTION_VOTER_CARDS_ISSUE',
      `Emissão impressa de ${options.voters.length} título(s) eleitoral(is) com data de emissão ${formatCardDate(options.issueDate)}.`,
    )
  }

  const exportVoterCardsToPdf = async (
    options: VoterCardEmissionOptions,
    customFilename?: string,
  ): Promise<void> => {
    const doc = await buildVoterCardsPdfDoc(options)
    const blob = doc.output('blob')
    const count = options.voters.length
    const filename = customFilename || `titulos_eleitorais_${count}_eleitores.pdf`
    downloadBlob(blob, filename)
    await logAction(
      'ELECTION_VOTER_CARDS_ISSUE',
      `Exportação em PDF de ${count} título(s) eleitoral(is) com data de emissão ${formatCardDate(options.issueDate)}.`,
    )
  }

  return {
    printVoterCards,
    exportVoterCardsToPdf,
    buildBatchVoterCardsHtml,
    buildSingleVoterCardHtml,
  }
}
