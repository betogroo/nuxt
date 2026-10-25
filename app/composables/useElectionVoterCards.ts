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
    grid-gap: 8mm;
    page-break-inside: avoid;
    margin-bottom: 8mm;
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
    width: 100%;
    min-height: 120mm;
    background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 50%, #f7fee7 100%);
    border: 2px solid #059669;
    border-radius: 6px;
    padding: 4mm;
    box-shadow: none;
    position: relative;
    overflow: hidden;
  }
  .card-inner-border {
    border: 1.5px solid #10b981;
    border-radius: 4px;
    padding: 3mm;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    background: rgba(255, 255, 255, 0.85);
  }
  .card-header {
    display: flex;
    align-items: center;
    border-bottom: 2px solid #059669;
    padding-bottom: 3mm;
    margin-bottom: 3mm;
  }
  .card-coat-placeholder {
    width: 32px;
    height: 32px;
    color: #047857;
    margin-right: 8px;
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
    font-size: 8px;
    font-weight: 800;
    letter-spacing: 0.5px;
    color: #065f46;
    text-transform: uppercase;
  }
  .card-subinstitution {
    font-size: 7px;
    color: #047857;
    font-weight: 600;
    margin-top: 1px;
    text-transform: uppercase;
  }
  .card-main-title {
    font-size: 13px;
    font-weight: 900;
    color: #064e3b;
    letter-spacing: 1px;
    margin-top: 2px;
  }
  .card-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2.5mm;
  }
  .card-field {
    background: #ffffff;
    border: 1px solid #a7f3d0;
    border-radius: 4px;
    padding: 2mm 2.5mm;
  }
  .field-label {
    font-size: 7px;
    font-weight: 700;
    color: #047857;
    letter-spacing: 0.4px;
    margin-bottom: 1px;
  }
  .field-value {
    font-size: 10.5px;
    color: #0f172a;
    font-weight: 600;
  }
  .voter-name {
    font-size: 11px;
    font-weight: 700;
    color: #064e3b;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .card-grid-row {
    display: grid;
    grid-template-columns: 1.2fr 1fr;
    gap: 2mm;
  }
  .voter-number {
    font-family: 'Courier New', Courier, monospace;
    font-size: 12px;
    font-weight: 800;
    color: #047857;
    letter-spacing: 0.8px;
  }
  .voter-auth {
    font-family: 'Courier New', Courier, monospace;
    font-size: 8.5px;
    color: #475569;
    font-weight: 600;
  }
  .card-barcode-wrap {
    margin-top: 3mm;
    padding: 1.5mm 0;
    background: #ffffff;
    border: 1px dashed #a7f3d0;
    border-radius: 4px;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  .barcode-bars {
    display: flex;
    align-items: center;
    height: 18px;
    gap: 1.5px;
  }
  .bar {
    height: 100%;
    background-color: #0f172a;
  }
  .bar-w1 { width: 1.5px; }
  .bar-w2 { width: 2.5px; }
  .bar-w3 { width: 3.5px; }
  .bar-w4 { width: 5px; }
  .card-footer {
    margin-top: 2.5mm;
    font-size: 6.5px;
    color: #065f46;
    text-align: center;
    font-weight: 600;
    border-top: 1px solid #a7f3d0;
    padding-top: 1.5mm;
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

  // Chunk voters into groups of 4 (2x2 grid per A4 page)
  const chunks: Array<typeof voters> = []
  for (let i = 0; i < voters.length; i += 4) {
    chunks.push(voters.slice(i, i + 4))
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
  const cardWidth = 90
  const cardHeight = 130
  const gapX = 10
  const gapY = 10
  const startX = (210 - (cardWidth * 2 + gapX)) / 2 // ~5mm
  const startY = (297 - (cardHeight * 2 + gapY)) / 2 // ~8.5mm

  const formattedDate = formatCardDate(options.issueDate)

  voters.forEach((voter, index) => {
    const slotInPage = index % 4
    if (index > 0 && slotInPage === 0) {
      doc.addPage()
    }

    const col = slotInPage % 2
    const row = Math.floor(slotInPage / 2)
    const x = startX + col * (cardWidth + gapX)
    const y = startY + row * (cardHeight + gapY)

    // Cut guide (dashed outline)
    doc.setDrawColor(180, 190, 200)
    doc.setLineDashPattern([2, 2], 0)
    doc.rect(x - 2, y - 2, cardWidth + 4, cardHeight + 4)
    doc.setLineDashPattern([], 0)

    // Card background
    doc.setFillColor(240, 253, 244)
    doc.rect(x, y, cardWidth, cardHeight, 'F')

    // Card border
    doc.setDrawColor(5, 150, 105)
    doc.setLineWidth(0.6)
    doc.rect(x, y, cardWidth, cardHeight)

    // Inner border
    doc.setDrawColor(16, 185, 129)
    doc.setLineWidth(0.3)
    doc.rect(x + 2, y + 2, cardWidth - 4, cardHeight - 4)

    // Header Title
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.5)
    doc.setTextColor(6, 95, 70)
    doc.text('REPÚBLICA FEDERATIVA DO BRASIL', x + cardWidth / 2, y + 8, { align: 'center' })

    doc.setFontSize(5.5)
    doc.setTextColor(4, 120, 87)
    doc.text('JUSTIÇA ELEITORAL • SISTEMA ELEITORAL', x + cardWidth / 2, y + 12, {
      align: 'center',
    })

    doc.setFontSize(10)
    doc.setTextColor(6, 78, 59)
    doc.text('TÍTULO ELEITORAL', x + cardWidth / 2, y + 18, { align: 'center' })

    // Header separator line
    doc.setDrawColor(5, 150, 105)
    doc.setLineWidth(0.4)
    doc.line(x + 5, y + 21, x + cardWidth - 5, y + 21)

    // Field: Nome
    doc.setFillColor(255, 255, 255)
    doc.setDrawColor(167, 243, 208)
    doc.setLineWidth(0.2)
    doc.roundedRect(x + 5, y + 25, cardWidth - 10, 14, 1, 1, 'FD')

    doc.setFontSize(5.5)
    doc.setTextColor(4, 120, 87)
    doc.text('NOME DO ELEITOR', x + 7, y + 29)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(6, 78, 59)
    const truncatedName = doc.splitTextToSize(voter.name.toUpperCase(), cardWidth - 14)[0] || ''
    doc.text(truncatedName, x + 7, y + 35)

    // Field: Inscrição / Título
    doc.roundedRect(x + 5, y + 42, (cardWidth - 12) * 0.58, 14, 1, 1, 'FD')
    doc.setFontSize(5.5)
    doc.setTextColor(4, 120, 87)
    doc.text('NÚMERO DA INSCRIÇÃO', x + 7, y + 46)

    doc.setFont('courier', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(5, 150, 105)
    doc.text(voter.voter_registration_number, x + 7, y + 52)

    // Field: Data de Emissão
    const dateX = x + 5 + (cardWidth - 12) * 0.58 + 2
    const dateW = (cardWidth - 12) * 0.42
    doc.roundedRect(dateX, y + 42, dateW, 14, 1, 1, 'FD')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(5.5)
    doc.setTextColor(4, 120, 87)
    doc.text('DATA DE EMISSÃO', dateX + 2, y + 46)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(15, 23, 42)
    doc.text(formattedDate, dateX + 2, y + 52)

    // Field: Situação
    doc.roundedRect(x + 5, y + 59, (cardWidth - 12) * 0.5, 14, 1, 1, 'FD')
    doc.setFontSize(5.5)
    doc.setTextColor(4, 120, 87)
    doc.text('SITUAÇÃO CADASTRAL', x + 7, y + 63)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    if (voter.is_active) {
      doc.setTextColor(21, 128, 61)
      doc.text('REGULAR / APTO', x + 7, y + 69)
    } else {
      doc.setTextColor(185, 28, 28)
      doc.text('INATIVO / SUSPENSO', x + 7, y + 69)
    }

    // Field: Código de Validação
    const codeX = x + 5 + (cardWidth - 12) * 0.5 + 2
    const codeW = (cardWidth - 12) * 0.5
    doc.roundedRect(codeX, y + 59, codeW, 14, 1, 1, 'FD')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(5.5)
    doc.setTextColor(4, 120, 87)
    doc.text('CÓDIGO DE VALIDAÇÃO', codeX + 2, y + 63)

    const hashSuffix = Array.from(voter.voter_registration_number || '')
      .reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) % 10000, 7)
      .toString()
      .padStart(4, '0')
    const validationCode = `BR-${voter.voter_registration_number}-${hashSuffix}`

    doc.setFont('courier', 'bold')
    doc.setFontSize(6.5)
    doc.setTextColor(71, 85, 105)
    doc.text(validationCode, codeX + 2, y + 69)

    // Simulated Barcode Box
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(x + 5, y + 77, cardWidth - 10, 16, 1, 1, 'FD')
    doc.setFillColor(15, 23, 42)
    // Draw some stylized vertical bars
    let barCursorX = x + 9
    const barWidths = [1, 0.5, 1.5, 0.5, 1, 0.5, 2, 1, 0.5, 1.5, 0.5, 1, 1, 1.5, 0.5, 2, 0.5, 1]
    barWidths.forEach((w) => {
      doc.rect(barCursorX, y + 80, w, 10, 'F')
      barCursorX += w + 1.2
    })

    // Footer note
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(5)
    doc.setTextColor(6, 95, 70)
    const footerMsg =
      'Documento oficial de identificação do eleitor para votação nas urnas eletrônicas do sistema.'
    doc.text(footerMsg, x + cardWidth / 2, y + 100, {
      align: 'center',
      maxWidth: cardWidth - 10,
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
