import type { jsPDF } from 'jspdf'
import { useLogger } from '~/composables/useLogger'
import { printHtmlViaIframe, escapeHtml } from '~/utils/reportHtml'
import { toSafeFilename } from '~/utils/reportFilename'
import {
  PDF_MARGIN_X_MM,
  PDF_PAGE_WIDTH_MM,
  appendPageFooters,
  createA4Doc,
} from '~/utils/reportPdf'
import { downloadBlob } from '~/utils/download'
import { formatDateTime } from '~/utils/formatters'
import { ELECTION_STATUS_LABELS, ELECTION_VOTING_MODE_LABELS } from '~/constants/elections'
import type { ElectionRow } from '~/types/election'
import type { CandidateRow } from '~/types/candidate'
import type { BallotBoxRow } from '~/types/ballot-box'
import type { ElectionCommitteeMemberRow } from '~/types/election-committee'
import type { ElectionTallySummary } from '~/types/election-vote'

export interface InitialElectionReportParams {
  election: ElectionRow
  candidates: CandidateRow[]
  ballotBoxes: BallotBoxRow[]
  committee: ElectionCommitteeMemberRow[]
  currentVotesCount: number
  generatedAt?: Date | string
}

export interface FinalNominalVoteItem {
  voterRegistrationNumber: string
  voterName: string
  voteDescription: string
  votedAt: string
}

export interface FinalElectionReportParams {
  election: ElectionRow
  tally: ElectionTallySummary
  committee: ElectionCommitteeMemberRow[]
  generatedAt?: Date | string
  nominalVotes?: FinalNominalVoteItem[]
}

export function formatPercentageBr(value: number): string {
  const num = Number.isFinite(value) ? value : 0
  return `${num.toFixed(2).replace('.', ',')}%`
}

function buildCommitteeSignaturesHtml(committee: ElectionCommitteeMemberRow[]): string {
  if (!committee || committee.length === 0) {
    return `
      <div class="signatures-section">
        <div class="section-title">Comissão Eleitoral — Assinaturas</div>
        <div class="empty-committee">
          Nenhum membro da comissão eleitoral cadastrado. Configure a equipe na aba "Comissão Eleitoral".
        </div>
        <div class="signatures-grid">
          <div class="signature-block">
            <div class="signature-line">__________________________________________________</div>
            <div class="signature-name">Responsável pela Eleição</div>
            <div class="signature-role">Presidente / Mesário</div>
          </div>
        </div>
      </div>
    `
  }

  const blocks = committee
    .map(
      (member) => `
      <div class="signature-block">
        <div class="signature-line">__________________________________________________</div>
        <div class="signature-name">${escapeHtml(member.name)}</div>
        <div class="signature-role">${escapeHtml(member.role_name)}</div>
      </div>
    `,
    )
    .join('')

  return `
    <div class="signatures-section">
      <div class="section-title">Comissão Eleitoral — Assinaturas</div>
      <p class="signatures-intro">
        Os membros da Comissão Eleitoral abaixo identificados conferiram e atestam a veracidade das informações registradas neste relatório oficial:
      </p>
      <div class="signatures-grid">
        ${blocks}
      </div>
    </div>
  `
}

const COMMON_REPORT_STYLES = `
  @page {
    size: A4 portrait;
    margin: 14mm;
  }
  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  body {
    font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    color: #1e293b;
    margin: 0;
    padding: 0;
    font-size: 11px;
    line-height: 1.45;
  }
  .header-card {
    border: 1px solid #cbd5e1;
    border-top: 4px solid #1e3a8a;
    border-radius: 6px;
    padding: 14px 16px;
    background: #f8fafc;
    margin-bottom: 16px;
  }
  .report-badge {
    display: inline-block;
    padding: 3px 8px;
    border-radius: 4px;
    font-size: 9.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    background: #dbeafe;
    color: #1e40af;
  }
  .report-title {
    margin: 4px 0 2px 0;
    font-size: 16px;
    font-weight: 800;
    color: #0f172a;
    text-transform: uppercase;
  }
  .election-subtitle {
    margin: 0;
    font-size: 13px;
    font-weight: 700;
    color: #1e3a8a;
  }
  .meta-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    margin-top: 12px;
    padding-top: 10px;
    border-top: 1px solid #e2e8f0;
  }
  .meta-label {
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    color: #64748b;
  }
  .meta-value {
    font-size: 11px;
    font-weight: 600;
    color: #0f172a;
  }
  .section-title {
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    color: #1e3a8a;
    margin: 16px 0 8px 0;
    padding-bottom: 4px;
    border-bottom: 2px solid #e2e8f0;
  }
  .summary-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    margin-bottom: 14px;
  }
  .summary-card {
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    padding: 10px 12px;
    background: #ffffff;
    text-align: center;
  }
  .summary-label {
    font-size: 9.5px;
    font-weight: 700;
    text-transform: uppercase;
    color: #64748b;
  }
  .summary-value {
    font-size: 16px;
    font-weight: 800;
    color: #0f172a;
    margin-top: 2px;
  }
  .summary-sub {
    font-size: 9.5px;
    color: #475569;
    font-weight: 600;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 14px;
  }
  th, td {
    border: 1px solid #cbd5e1;
    padding: 7px 9px;
    text-align: left;
    vertical-align: middle;
  }
  th {
    background: #1e293b;
    color: #ffffff;
    font-size: 9.5px;
    font-weight: 700;
    text-transform: uppercase;
  }
  tr:nth-child(even) td {
    background: #f8fafc;
  }
  .text-center { text-align: center; }
  .text-right { text-align: right; }
  .candidate-photo {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    object-fit: cover;
    border: 1px solid #cbd5e1;
    display: inline-block;
    vertical-align: middle;
  }
  .candidate-avatar-placeholder {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    background: #e2e8f0;
    color: #334155;
    font-weight: 700;
    font-size: 12px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid #cbd5e1;
  }
  .rank-badge {
    display: inline-block;
    padding: 3px 8px;
    border-radius: 999px;
    font-weight: 800;
    font-size: 10px;
    background: #f1f5f9;
    color: #0f172a;
  }
  .rank-badge-first {
    background: #fef3c7;
    color: #92400e;
    border: 1px solid #f59e0b;
  }
  .signatures-section {
    margin-top: 24px;
    page-break-inside: avoid;
  }
  .signatures-intro {
    font-size: 10.5px;
    color: #334155;
    margin: 0 0 18px 0;
  }
  .signatures-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 28px 24px;
    margin-top: 18px;
  }
  .signature-block {
    text-align: center;
    padding-top: 18px;
    page-break-inside: avoid;
  }
  .signature-line {
    color: #334155;
    letter-spacing: -0.5px;
    margin-bottom: 4px;
  }
  .signature-name {
    font-weight: 700;
    font-size: 11px;
    color: #0f172a;
  }
  .signature-role {
    font-size: 10px;
    color: #475569;
    font-weight: 600;
  }
  .empty-committee {
    padding: 10px;
    background: #fffbeb;
    border: 1px solid #fde68a;
    border-radius: 4px;
    color: #92400e;
    font-size: 10px;
    margin-bottom: 12px;
  }
  .footer {
    margin-top: 24px;
    padding-top: 8px;
    border-top: 1px solid #cbd5e1;
    display: flex;
    justify-content: space-between;
    font-size: 9px;
    color: #64748b;
  }
`

export function buildInitialElectionReportHtml(params: InitialElectionReportParams): string {
  const { election, candidates, ballotBoxes, committee, currentVotesCount } = params
  const generatedAtStr = formatDateTime(params.generatedAt || new Date())
  const electionDateStr = formatDateTime(election.election_date)
  const statusLabel = ELECTION_STATUS_LABELS[election.status] || election.status
  const modeLabel = ELECTION_VOTING_MODE_LABELS[election.voting_mode] || election.voting_mode

  const ballotBoxesRows =
    ballotBoxes.length === 0
      ? `<tr><td colspan="3" class="text-center">Nenhuma urna virtual cadastrada.</td></tr>`
      : ballotBoxes
          .map(
            (box) => `
          <tr>
            <td style="font-weight: 700;">${escapeHtml(box.name)}</td>
            <td>${escapeHtml(box.device_info || 'Dispositivo padrão')}</td>
            <td class="text-center">${box.is_active ? 'Liberada' : 'Pronta / Aguardando Liberação'}</td>
          </tr>
        `,
          )
          .join('')

  const candidatesRows =
    candidates.length === 0
      ? `<tr><td colspan="3" class="text-center">Nenhum candidato cadastrado.</td></tr>`
      : candidates
          .map(
            (cand) => `
          <tr>
            <td class="text-center" style="font-weight: 700; font-family: monospace; font-size: 12px;">${escapeHtml(cand.candidate_number)}</td>
            <td>${escapeHtml(cand.name)}</td>
            <td class="text-right" style="font-weight: 700;">0 votos (0,00%)</td>
          </tr>
        `,
          )
          .join('')

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Relatório Inicial (Zerésima) - ${escapeHtml(election.name)}</title>
  <style>${COMMON_REPORT_STYLES}</style>
</head>
<body>
  <div class="header-card">
    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
      <div>
        <span class="report-badge">Relatório Inicial — Zerésima da Urna</span>
        <h1 class="report-title">Condição Inicial da Urna e Emissão de Zerésima</h1>
        <p class="election-subtitle">${escapeHtml(election.name)}</p>
      </div>
      <div style="text-align: right;">
        <div class="meta-label">Data/Hora de Geração</div>
        <div class="meta-value" style="font-size: 12px; color: #1e3a8a;">${escapeHtml(generatedAtStr)}</div>
      </div>
    </div>

    <div class="meta-grid">
      <div>
        <div class="meta-label">Data da Eleição</div>
        <div class="meta-value">${escapeHtml(electionDateStr)}</div>
      </div>
      <div>
        <div class="meta-label">Modalidade de Votação</div>
        <div class="meta-value">${escapeHtml(modeLabel)}</div>
      </div>
      <div>
        <div class="meta-label">Sigilo do Voto</div>
        <div class="meta-value">${election.is_anonymous !== false ? 'Voto Anônimo' : 'Voto Nominal (Não Anônimo)'}</div>
      </div>
      <div>
        <div class="meta-label">Dígitos na Urna</div>
        <div class="meta-value">${election.digits_count} dígito(s)</div>
      </div>
      <div>
        <div class="meta-label">Status no Momento</div>
        <div class="meta-value">${escapeHtml(statusLabel)}</div>
      </div>
    </div>
  </div>

  <div class="summary-grid">
    <div class="summary-card">
      <div class="summary-label">Votos Computados</div>
      <div class="summary-value" style="color: #15803d;">${currentVotesCount}</div>
      <div class="summary-sub">Urna Zerada</div>
    </div>
    <div class="summary-card">
      <div class="summary-label">Candidatos Habilitados</div>
      <div class="summary-value">${candidates.length}</div>
      <div class="summary-sub">0 votos atribuídos</div>
    </div>
    <div class="summary-card">
      <div class="summary-label">Urnas Vinculadas</div>
      <div class="summary-value">${ballotBoxes.length}</div>
      <div class="summary-sub">Verificadas</div>
    </div>
    <div class="summary-card">
      <div class="summary-label">Comissão Eleitoral</div>
      <div class="summary-value">${committee.length}</div>
      <div class="summary-sub">Membro(s)</div>
    </div>
  </div>

  <div class="section-title">1. Condição Inicial das Urnas Virtuais</div>
  <table>
    <thead>
      <tr>
        <th>Identificação da Urna</th>
        <th>Dispositivo / Localização</th>
        <th class="text-center" style="width: 180px;">Condição Inicial</th>
      </tr>
    </thead>
    <tbody>
      ${ballotBoxesRows}
    </tbody>
  </table>

  <div class="section-title">2. Relação de Candidatos e Contagem Inicial (Zerésima)</div>
  <table>
    <thead>
      <tr>
        <th class="text-center" style="width: 110px;">Número</th>
        <th>Nome do Candidato</th>
        <th class="text-right" style="width: 150px;">Votos Computados</th>
      </tr>
    </thead>
    <tbody>
      ${candidatesRows}
      <tr>
        <td class="text-center" style="font-weight: 700;">—</td>
        <td>VOTOS EM BRANCO</td>
        <td class="text-right" style="font-weight: 700;">0 votos (0,00%)</td>
      </tr>
      <tr>
        <td class="text-center" style="font-weight: 700;">—</td>
        <td>VOTOS NULOS</td>
        <td class="text-right" style="font-weight: 700;">0 votos (0,00%)</td>
      </tr>
    </tbody>
  </table>

  ${buildCommitteeSignaturesHtml(committee)}

  <div class="footer">
    <span>Módulo Oficial de Eleições — Relatório Inicial (Zerésima)</span>
    <span>Gerado em: ${escapeHtml(generatedAtStr)}</span>
  </div>
</body>
</html>`
}

export function buildFinalElectionReportHtml(params: FinalElectionReportParams): string {
  const { election, tally, committee } = params
  const generatedAtStr = formatDateTime(params.generatedAt || new Date())
  const electionDateStr = formatDateTime(election.election_date)
  const statusLabel = ELECTION_STATUS_LABELS[election.status] || election.status
  const modeLabel = ELECTION_VOTING_MODE_LABELS[election.voting_mode] || election.voting_mode

  const rankingRows =
    tally.candidatesRanking.length === 0
      ? `<tr><td colspan="6" class="text-center">Nenhum candidato registrado nesta eleição.</td></tr>`
      : tally.candidatesRanking
          .map((item) => {
            const initials = item.candidate.name
              .trim()
              .split(/\s+/)
              .slice(0, 2)
              .map((part) => part[0]?.toUpperCase() || '')
              .join('')

            const photoHtml = item.candidate.photo_url
              ? `<img src="${escapeHtml(item.candidate.photo_url)}" alt="${escapeHtml(item.candidate.name)}" class="candidate-photo" />`
              : `<div class="candidate-avatar-placeholder">${escapeHtml(initials || '#')}</div>`

            const badgeClass = item.rank === 1 ? 'rank-badge rank-badge-first' : 'rank-badge'

            return `
          <tr>
            <td class="text-center">
              <span class="${badgeClass}">${item.rank}º Lugar</span>
            </td>
            <td class="text-center">${photoHtml}</td>
            <td class="text-center" style="font-weight: 700; font-family: monospace; font-size: 12px;">
              ${escapeHtml(item.candidate.candidate_number)}
            </td>
            <td style="font-weight: 700;">${escapeHtml(item.candidate.name)}</td>
            <td class="text-right" style="font-weight: 800; font-size: 12px;">
              ${item.votesCount} voto(s)
            </td>
            <td class="text-right" style="font-weight: 700; color: #1e3a8a;">
              ${formatPercentageBr(item.percentageOfValid)} <span style="font-weight: 400; color: #64748b;">(${formatPercentageBr(item.percentageOfTotal)} do total)</span>
            </td>
          </tr>
        `
          })
          .join('')

  const nominalVotesSection =
    election.is_anonymous === false && params.nominalVotes && params.nominalVotes.length > 0
      ? `
    <div class="section-title">Registro Nominal de Votos (Eleição Não Anônima)</div>
    <table>
      <thead>
        <tr>
          <th style="width: 140px;">Nº do Título / Matrícula</th>
          <th>Nome do Eleitor</th>
          <th style="width: 220px;">Voto Registrado</th>
          <th class="text-center" style="width: 140px;">Data / Horário</th>
        </tr>
      </thead>
      <tbody>
        ${params.nominalVotes
          .map(
            (nv) => `
          <tr>
            <td style="font-family: monospace; font-weight: 700;">${escapeHtml(nv.voterRegistrationNumber)}</td>
            <td>${escapeHtml(nv.voterName)}</td>
            <td style="font-weight: 600;">${escapeHtml(nv.voteDescription)}</td>
            <td class="text-center">${escapeHtml(nv.votedAt)}</td>
          </tr>
        `,
          )
          .join('')}
      </tbody>
    </table>
  `
      : ''

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Relatório Final de Apuração - ${escapeHtml(election.name)}</title>
  <style>${COMMON_REPORT_STYLES}</style>
</head>
<body>
  <div class="header-card">
    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
      <div>
        <span class="report-badge">Relatório Final — Ata de Apuração</span>
        <h1 class="report-title">Boletim Final de Apuração e Classificação</h1>
        <p class="election-subtitle">${escapeHtml(election.name)}</p>
      </div>
      <div style="text-align: right;">
        <div class="meta-label">Data/Hora de Geração</div>
        <div class="meta-value" style="font-size: 12px; color: #1e3a8a;">${escapeHtml(generatedAtStr)}</div>
      </div>
    </div>

    <div class="meta-grid">
      <div>
        <div class="meta-label">Data da Eleição</div>
        <div class="meta-value">${escapeHtml(electionDateStr)}</div>
      </div>
      <div>
        <div class="meta-label">Modalidade de Votação</div>
        <div class="meta-value">${escapeHtml(modeLabel)}</div>
      </div>
      <div>
        <div class="meta-label">Sigilo do Voto</div>
        <div class="meta-value">${election.is_anonymous !== false ? 'Voto Anônimo' : 'Voto Nominal (Não Anônimo)'}</div>
      </div>
      <div>
        <div class="meta-label">Dígitos na Urna</div>
        <div class="meta-value">${election.digits_count} dígito(s)</div>
      </div>
      <div>
        <div class="meta-label">Status da Eleição</div>
        <div class="meta-value">${escapeHtml(statusLabel)}</div>
      </div>
    </div>
  </div>

  <div class="summary-grid">
    <div class="summary-card">
      <div class="summary-label">Total de Votos</div>
      <div class="summary-value" style="color: #1e3a8a;">${tally.totalVotes}</div>
      <div class="summary-sub">100,00% dos votos</div>
    </div>
    <div class="summary-card">
      <div class="summary-label">Votos Válidos</div>
      <div class="summary-value" style="color: #15803d;">${tally.validVotes}</div>
      <div class="summary-sub">${formatPercentageBr(tally.validPercentage)} do total</div>
    </div>
    <div class="summary-card">
      <div class="summary-label">Votos em Branco</div>
      <div class="summary-value" style="color: #475569;">${tally.blankVotes}</div>
      <div class="summary-sub">${formatPercentageBr(tally.blankPercentage)} do total</div>
    </div>
    <div class="summary-card">
      <div class="summary-label">Votos Nulos</div>
      <div class="summary-value" style="color: #dc2626;">${tally.nullVotes}</div>
      <div class="summary-sub">${formatPercentageBr(tally.nullPercentage)} do total</div>
    </div>
  </div>

  <div class="section-title">Classificação Final dos Candidatos</div>
  <table>
    <thead>
      <tr>
        <th class="text-center" style="width: 90px;">Classificação</th>
        <th class="text-center" style="width: 60px;">Foto</th>
        <th class="text-center" style="width: 85px;">Número</th>
        <th>Nome do Candidato</th>
        <th class="text-right" style="width: 110px;">Votos</th>
        <th class="text-right" style="width: 170px;">% Válidos (% Total)</th>
      </tr>
    </thead>
    <tbody>
      ${rankingRows}
    </tbody>
  </table>

  ${nominalVotesSection}

  ${buildCommitteeSignaturesHtml(committee)}

  <div class="footer">
    <span>Módulo Oficial de Eleições — Relatório Final de Apuração</span>
    <span>Gerado em: ${escapeHtml(generatedAtStr)}</span>
  </div>
</body>
</html>`
}

function appendCommitteeSignaturesToPdf(
  doc: jsPDF,
  committee: ElectionCommitteeMemberRow[],
  startY: number,
  marginX: number,
  pageWidth: number,
): number {
  let currentY = startY + 8

  if (currentY > 230) {
    doc.addPage()
    currentY = 20
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(30, 58, 138)
  doc.text('COMISSÃO ELEITORAL — ASSINATURAS', marginX, currentY)

  currentY += 5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(51, 65, 85)
  doc.text(
    'Os membros da Comissão Eleitoral abaixo identificados conferiram e atestam a veracidade deste relatório:',
    marginX,
    currentY,
  )

  currentY += 16

  const membersToRender: Array<{ name: string; role_name: string }> =
    committee.length > 0
      ? committee
      : [{ name: 'Responsável pela Eleição', role_name: 'Presidente / Mesário' }]

  const colWidth = (pageWidth - marginX * 2 - 14) / 2
  const leftColCenterX = marginX + colWidth / 2
  const rightColCenterX = pageWidth - marginX - colWidth / 2

  for (let i = 0; i < membersToRender.length; i += 2) {
    if (currentY > 265) {
      doc.addPage()
      currentY = 28
    }

    const leftMember = membersToRender[i]
    const rightMember = membersToRender[i + 1]

    if (leftMember) {
      doc.setDrawColor(71, 85, 105)
      doc.setLineWidth(0.3)
      doc.line(marginX + 4, currentY, marginX + colWidth - 4, currentY)

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(15, 23, 42)
      doc.text(leftMember.name, leftColCenterX, currentY + 4.5, { align: 'center' })

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(71, 85, 105)
      doc.text(leftMember.role_name, leftColCenterX, currentY + 8.5, { align: 'center' })
    }

    if (rightMember) {
      const rightStartX = pageWidth - marginX - colWidth
      doc.setDrawColor(71, 85, 105)
      doc.setLineWidth(0.3)
      doc.line(rightStartX + 4, currentY, pageWidth - marginX - 4, currentY)

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(15, 23, 42)
      doc.text(rightMember.name, rightColCenterX, currentY + 4.5, { align: 'center' })

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(71, 85, 105)
      doc.text(rightMember.role_name, rightColCenterX, currentY + 8.5, { align: 'center' })
    }

    currentY += 22
  }

  return currentY
}

function appendPdfFooters(doc: jsPDF, reportTitle: string, generatedAtStr: string): void {
  appendPageFooters(doc, reportTitle, `Gerado em: ${generatedAtStr}`)
}

export async function buildInitialElectionReportPdfDoc(
  params: InitialElectionReportParams,
): Promise<jsPDF> {
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = await createA4Doc()

  const pageWidth = PDF_PAGE_WIDTH_MM
  const marginX = PDF_MARGIN_X_MM
  const usableWidth = pageWidth - marginX * 2
  const generatedAtStr = formatDateTime(params.generatedAt || new Date())
  const electionDateStr = formatDateTime(params.election.election_date)
  const statusLabel = ELECTION_STATUS_LABELS[params.election.status] || params.election.status
  const modeLabel =
    ELECTION_VOTING_MODE_LABELS[params.election.voting_mode] || params.election.voting_mode

  doc.setFillColor(30, 58, 138)
  doc.rect(marginX, 12, usableWidth, 2.5, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(30, 58, 138)
  doc.text('RELATÓRIO INICIAL — CONDIÇÃO DA URNA (ZERÉSIMA)', marginX, 20)

  doc.setFontSize(10)
  doc.setTextColor(15, 23, 42)
  doc.text(params.election.name, marginX, 25.5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(71, 85, 105)
  doc.text(`Gerado em: ${generatedAtStr}`, pageWidth - marginX, 20, { align: 'right' })

  autoTable(doc, {
    startY: 29,
    margin: { left: marginX, right: marginX },
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2,
      textColor: [31, 41, 55],
      lineColor: [203, 213, 225],
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 32, fillColor: [248, 250, 252] },
      1: { cellWidth: 59 },
      2: { fontStyle: 'bold', cellWidth: 32, fillColor: [248, 250, 252] },
      3: { cellWidth: 59 },
    },
    body: [
      ['Data da Eleição:', electionDateStr, 'Modalidade:', modeLabel],
      [
        'Dígitos na Urna:',
        `${params.election.digits_count} dígito(s)`,
        'Sigilo do Voto:',
        params.election.is_anonymous !== false ? 'Voto Anônimo' : 'Voto Nominal (Não Anônimo)',
      ],
      ['Votos Computados:', `${params.currentVotesCount} voto(s)`, 'Status Atual:', statusLabel],
      ['Comissão Eleitoral:', `${params.committee.length} membro(s)`, '', ''],
    ],
  })

  let currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(30, 58, 138)
  doc.text('1. CONDIÇÃO INICIAL DAS URNAS VIRTUAIS', marginX, currentY)

  autoTable(doc, {
    startY: currentY + 2,
    margin: { left: marginX, right: marginX },
    theme: 'striped',
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    head: [['Identificação da Urna', 'Dispositivo / Localização', 'Condição Inicial']],
    body:
      params.ballotBoxes.length === 0
        ? [['Nenhuma urna cadastrada', '-', '-']]
        : params.ballotBoxes.map((box) => [
            box.name,
            box.device_info || 'Dispositivo padrão',
            box.is_active ? 'Liberada' : 'Pronta / Aguardando Liberação',
          ]),
  })

  currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(30, 58, 138)
  doc.text('2. RELAÇÃO DE CANDIDATOS E CONTAGEM INICIAL (ZERÉSIMA)', marginX, currentY)

  const candidateRows = params.candidates.map((cand) => [
    cand.candidate_number,
    cand.name,
    '0 votos (0,00%)',
  ])

  autoTable(doc, {
    startY: currentY + 2,
    margin: { left: marginX, right: marginX },
    theme: 'striped',
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 28, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 114 },
      2: { cellWidth: 40, halign: 'right', fontStyle: 'bold' },
    },
    head: [['Número', 'Nome do Candidato', 'Votos Computados']],
    body: [
      ...candidateRows,
      ['—', 'VOTOS EM BRANCO', '0 votos (0,00%)'],
      ['—', 'VOTOS NULOS', '0 votos (0,00%)'],
    ],
  })

  currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY

  appendCommitteeSignaturesToPdf(doc, params.committee, currentY, marginX, pageWidth)
  appendPdfFooters(doc, 'Módulo Oficial de Eleições — Relatório Inicial (Zerésima)', generatedAtStr)

  return doc
}

export async function buildFinalElectionReportPdfDoc(
  params: FinalElectionReportParams,
): Promise<jsPDF> {
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = await createA4Doc()

  const pageWidth = PDF_PAGE_WIDTH_MM
  const marginX = PDF_MARGIN_X_MM
  const usableWidth = pageWidth - marginX * 2
  const generatedAtStr = formatDateTime(params.generatedAt || new Date())
  const electionDateStr = formatDateTime(params.election.election_date)
  const statusLabel = ELECTION_STATUS_LABELS[params.election.status] || params.election.status
  const modeLabel =
    ELECTION_VOTING_MODE_LABELS[params.election.voting_mode] || params.election.voting_mode
  const { tally } = params

  doc.setFillColor(30, 58, 138)
  doc.rect(marginX, 12, usableWidth, 2.5, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(30, 58, 138)
  doc.text('RELATÓRIO FINAL — ATA DE APURAÇÃO E CLASSIFICAÇÃO', marginX, 20)

  doc.setFontSize(10)
  doc.setTextColor(15, 23, 42)
  doc.text(params.election.name, marginX, 25.5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(71, 85, 105)
  doc.text(`Gerado em: ${generatedAtStr}`, pageWidth - marginX, 20, { align: 'right' })

  autoTable(doc, {
    startY: 29,
    margin: { left: marginX, right: marginX },
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2,
      textColor: [31, 41, 55],
      lineColor: [203, 213, 225],
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 32, fillColor: [248, 250, 252] },
      1: { cellWidth: 59 },
      2: { fontStyle: 'bold', cellWidth: 32, fillColor: [248, 250, 252] },
      3: { cellWidth: 59 },
    },
    body: [
      ['Data da Eleição:', electionDateStr, 'Modalidade:', modeLabel],
      [
        'Dígitos na Urna:',
        `${params.election.digits_count} dígito(s)`,
        'Sigilo do Voto:',
        params.election.is_anonymous !== false ? 'Voto Anônimo' : 'Voto Nominal (Não Anônimo)',
      ],
      [
        'Total de Votos:',
        `${tally.totalVotes} voto(s) (100,00%)`,
        'Votos Válidos:',
        `${tally.validVotes} (${formatPercentageBr(tally.validPercentage)})`,
      ],
      [
        'Votos em Branco:',
        `${tally.blankVotes} (${formatPercentageBr(tally.blankPercentage)})`,
        'Votos Nulos:',
        `${tally.nullVotes} (${formatPercentageBr(tally.nullPercentage)})`,
      ],
      ['Status:', statusLabel, '', ''],
    ],
  })

  let currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(30, 58, 138)
  doc.text('CLASSIFICAÇÃO FINAL DOS CANDIDATOS', marginX, currentY)

  const rankingBody =
    tally.candidatesRanking.length === 0
      ? [['-', '-', 'Nenhum candidato registrado', '0', '0,00%']]
      : tally.candidatesRanking.map((item) => [
          `${item.rank}º Lugar`,
          item.candidate.candidate_number,
          item.candidate.name,
          `${item.votesCount} voto(s)`,
          `${formatPercentageBr(item.percentageOfValid)} (${formatPercentageBr(item.percentageOfTotal)} total)`,
        ])

  autoTable(doc, {
    startY: currentY + 2,
    margin: { left: marginX, right: marginX },
    theme: 'striped',
    styles: {
      fontSize: 8.5,
      cellPadding: 2.2,
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 26, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 24, halign: 'center', fontStyle: 'bold' },
      2: { cellWidth: 68, fontStyle: 'bold' },
      3: { cellWidth: 26, halign: 'right', fontStyle: 'bold' },
      4: { cellWidth: 38, halign: 'right' },
    },
    head: [['Classificação', 'Número', 'Candidato', 'Votos', '% Válidos (% Total)']],
    body: rankingBody,
  })

  currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY

  if (
    params.election.is_anonymous === false &&
    params.nominalVotes &&
    params.nominalVotes.length > 0
  ) {
    if (currentY > 220) {
      doc.addPage()
      currentY = 20
    } else {
      currentY += 6
    }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.setTextColor(30, 58, 138)
    doc.text('REGISTRO NOMINAL DE VOTOS (ELEIÇÃO NÃO ANÔNIMA)', marginX, currentY)

    const nominalBody = params.nominalVotes.map((item) => [
      item.voterRegistrationNumber,
      item.voterName,
      item.voteDescription,
      item.votedAt,
    ])

    autoTable(doc, {
      startY: currentY + 2,
      margin: { left: marginX, right: marginX },
      theme: 'striped',
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 32, fontStyle: 'bold' },
        1: { cellWidth: 70 },
        2: { cellWidth: 46, fontStyle: 'bold' },
        3: { cellWidth: 34, halign: 'center' },
      },
      head: [['Nº Título', 'Eleitor', 'Voto Registrado', 'Horário']],
      body: nominalBody,
    })

    currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY
  }

  appendCommitteeSignaturesToPdf(doc, params.committee, currentY, marginX, pageWidth)
  appendPdfFooters(doc, 'Módulo Oficial de Eleições — Relatório Final de Apuração', generatedAtStr)

  return doc
}

export const useElectionReports = () => {
  const { logAction } = useLogger()

  const printInitialReport = async (params: InitialElectionReportParams): Promise<void> => {
    const html = buildInitialElectionReportHtml(params)
    await printHtmlViaIframe(html)
    await logAction(
      'EXPORT_ELECTION_INITIAL_REPORT',
      `Relatório Inicial (Zerésima) da eleição "${params.election.name}" impresso.`,
    )
  }

  const exportInitialReportToPdf = async (
    params: InitialElectionReportParams,
    customFilename?: string,
  ): Promise<void> => {
    const doc = await buildInitialElectionReportPdfDoc(params)
    const blob = doc.output('blob')
    const safeName = toSafeFilename(params.election.name, 'eleicao')
    const filename = customFilename || `relatorio_inicial_zeresima_${safeName}.pdf`
    downloadBlob(blob, filename)
    await logAction(
      'EXPORT_ELECTION_INITIAL_REPORT',
      `Relatório Inicial (Zerésima) da eleição "${params.election.name}" exportado para PDF.`,
    )
  }

  const printFinalReport = async (params: FinalElectionReportParams): Promise<void> => {
    const html = buildFinalElectionReportHtml(params)
    await printHtmlViaIframe(html)
    await logAction(
      'EXPORT_ELECTION_FINAL_REPORT',
      `Relatório Final de Apuração da eleição "${params.election.name}" impresso.`,
    )
  }

  const exportFinalReportToPdf = async (
    params: FinalElectionReportParams,
    customFilename?: string,
  ): Promise<void> => {
    const doc = await buildFinalElectionReportPdfDoc(params)
    const blob = doc.output('blob')
    const safeName = toSafeFilename(params.election.name, 'eleicao')
    const filename = customFilename || `relatorio_final_apuracao_${safeName}.pdf`
    downloadBlob(blob, filename)
    await logAction(
      'EXPORT_ELECTION_FINAL_REPORT',
      `Relatório Final de Apuração da eleição "${params.election.name}" exportado para PDF.`,
    )
  }

  return {
    printInitialReport,
    exportInitialReportToPdf,
    printFinalReport,
    exportFinalReportToPdf,
  }
}
