import type { CommitmentRow } from '~/composables/useCommitments'
import { downloadFile } from '~/utils/download'
import { escapeCsvField } from '~/utils/reportCsv'
import { toSafeFilename } from '~/utils/reportFilename'
import { formatCnpj, formatDate, formatCurrency } from '~/utils/formatters'
import { normalizeSiafemNumber } from '~/schemas/forms/commitment'

export interface DemandFinancialDocsOptions {
  detailed?: boolean
}

export interface NeColumnGroup {
  neNumber: string
  documents: string[]
}

/**
 * Agrupa os documentos financeiros da demanda por Nota de Empenho (NE),
 * organizando cada NE com sua lista respectiva de NLs, PD e OB.
 */
export function groupDemandDocumentsByNe(commitments: CommitmentRow[]): NeColumnGroup[] {
  const groupsMap = new Map<string, { neNumber: string; documents: string[]; seen: Set<string> }>()

  for (const c of commitments || []) {
    if (!c.commitment_number) continue
    const neNumber = normalizeSiafemNumber(c.commitment_number)
    if (!neNumber) continue

    if (!groupsMap.has(neNumber)) {
      groupsMap.set(neNumber, {
        neNumber,
        documents: [],
        seen: new Set<string>(),
      })
    }

    const group = groupsMap.get(neNumber)!
    const addDoc = (docNumber: string | null | undefined) => {
      if (!docNumber) return
      const normalized = normalizeSiafemNumber(docNumber)
      if (normalized && !group.seen.has(normalized)) {
        group.seen.add(normalized)
        group.documents.push(normalized)
      }
    }

    // 1. Notas de Liquidação / Lançamento (NL) ordenadas crescentemente
    const liquidations = [...(c.demand_commitment_liquidations || [])].sort((a, b) =>
      (a.liquidation_number || '').localeCompare(b.liquidation_number || ''),
    )
    for (const nl of liquidations) {
      addDoc(nl.liquidation_number)
    }

    // 2. Programa de Desembolso (PD)
    addDoc(c.disbursement_program_number)

    // 3. Ordem Bancária (OB)
    addDoc(c.bank_order_number)
  }

  return Array.from(groupsMap.values())
    .map(({ neNumber, documents }) => ({ neNumber, documents }))
    .sort((a, b) => a.neNumber.localeCompare(b.neNumber))
}

/**
 * Extrai todos os números únicos de documentos financeiros (NE, NL, PD, OB)
 * vinculados aos empenhos de uma demanda, mantendo a ordem lógica de emissão.
 */
export function extractDemandFinancialDocumentNumbers(commitments: CommitmentRow[]): string[] {
  const result: string[] = []
  const seen = new Set<string>()

  const addDoc = (docNumber: string | null | undefined) => {
    if (!docNumber) return
    const normalized = normalizeSiafemNumber(docNumber)
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized)
      result.push(normalized)
    }
  }

  for (const c of commitments || []) {
    // 1. Nota de Empenho (NE)
    addDoc(c.commitment_number)

    // 2. Notas de Liquidação / Notas de Lançamento (NL)
    const liquidations = c.demand_commitment_liquidations || []
    for (const nl of liquidations) {
      addDoc(nl.liquidation_number)
    }

    // 3. Programa de Desembolso (PD)
    addDoc(c.disbursement_program_number)

    // 4. Ordem Bancária (OB)
    addDoc(c.bank_order_number)
  }

  return result
}

/**
 * Constrói o conteúdo CSV dos documentos financeiros de uma demanda.
 * Por padrão (detailed = false), cada Nota de Empenho (NE) da demanda
 * ocupa uma coluna própria, com seus respectivos documentos (NLs, PD e OB)
 * dispostos nas linhas abaixo, ideal para consulta e download no siafem.net.
 *
 * Quando detailed = true, gera a planilha completa com metadados do documento.
 */
export function buildDemandFinancialDocsCsv(
  commitments: CommitmentRow[],
  options?: DemandFinancialDocsOptions,
): string {
  if (!commitments || commitments.length === 0) {
    return ''
  }

  // Modo padrão: cada NE em uma coluna com seus respectivos documentos abaixo
  if (!options?.detailed) {
    const groups = groupDemandDocumentsByNe(commitments)
    if (groups.length === 0) return ''

    const header = groups.map((g) => g.neNumber).join(';')
    const maxRows = Math.max(...groups.map((g) => g.documents.length), 0)

    const rows: string[] = []
    for (let i = 0; i < maxRows; i++) {
      const row = groups.map((g) => g.documents[i] || '').join(';')
      rows.push(row)
    }

    return '\uFEFF' + [header, ...rows].join('\r\n')
  }

  // Modo detalhado: metadados completos
  const headers = [
    'Tipo de Documento',
    'Número do Documento',
    'Data de Emissão',
    'Data de Pagamento',
    'Nota de Empenho',
    'Processo',
    'Fornecedor',
    'CNPJ',
    'Status / Natureza',
    'Observações',
  ]

  const rows: string[][] = []

  for (const c of commitments) {
    const neNumber = c.commitment_number ? normalizeSiafemNumber(c.commitment_number) : '-'
    const processNumber = c.demands?.internal_process_number || c.demands?.process_number || '-'
    const supplierName = c.suppliers?.company_name || '-'
    const supplierCnpj = c.suppliers?.cnpj ? formatCnpj(c.suppliers.cnpj) : '-'
    const pdPaidFormatted = c.disbursement_program_paid_at
      ? formatDate(c.disbursement_program_paid_at)
      : '-'

    // 1. NE
    if (c.commitment_number) {
      rows.push([
        'Nota de Empenho (NE)',
        neNumber,
        c.issue_date ? formatDate(c.issue_date) : '-',
        '-',
        neNumber,
        processNumber,
        supplierName,
        supplierCnpj,
        c.status || 'Emitido',
        c.observation || '-',
      ])
    }

    // 2. NLs
    const liquidations = c.demand_commitment_liquidations || []
    for (const nl of liquidations) {
      const nlNature = nl.is_cancellation
        ? 'Cancelamento'
        : nl.is_ir_retention
          ? `Retenção de IR (${formatCurrency(nl.ir_retention_amount || 0)})`
          : 'Ordinária'

      rows.push([
        'Nota de Liquidação (NL)',
        normalizeSiafemNumber(nl.liquidation_number),
        nl.issue_date ? formatDate(nl.issue_date) : '-',
        nl.is_ir_retention ? pdPaidFormatted : '-',
        neNumber,
        processNumber,
        supplierName,
        supplierCnpj,
        nlNature,
        nl.observation || '-',
      ])
    }

    // 3. PD
    if (c.disbursement_program_number) {
      rows.push([
        'Programa de Desembolso (PD)',
        normalizeSiafemNumber(c.disbursement_program_number),
        c.disbursement_program_issued_at ? formatDate(c.disbursement_program_issued_at) : '-',
        pdPaidFormatted,
        neNumber,
        processNumber,
        supplierName,
        supplierCnpj,
        'Emitido',
        c.disbursement_program_observation || '-',
      ])
    }

    // 4. OB
    if (c.bank_order_number) {
      rows.push([
        'Ordem Bancária (OB)',
        normalizeSiafemNumber(c.bank_order_number),
        c.bank_order_issued_at ? formatDate(c.bank_order_issued_at) : '-',
        c.bank_order_paid_at ? formatDate(c.bank_order_paid_at) : pdPaidFormatted,
        neNumber,
        processNumber,
        supplierName,
        supplierCnpj,
        'Emitida',
        c.bank_order_observation || '-',
      ])
    }
  }

  if (rows.length === 0) return ''

  const csvRows = [
    headers.map((h) => escapeCsvField(h)).join(';'),
    ...rows.map((row) => row.map((field) => escapeCsvField(field)).join(';')),
  ]

  return '\uFEFF' + csvRows.join('\r\n')
}

/**
 * Dispara o download imediato do arquivo CSV com os documentos financeiros
 * no navegador. Retorna true se houver documentos e o download foi disparado,
 * ou false se a demanda não contiver documentos financeiros cadastrados.
 */
export function downloadDemandFinancialDocsCsv(params: {
  demand: {
    internal_process_number?: string | null
    name?: string | null
    process_number?: string | null
  }
  commitments: CommitmentRow[]
  options?: DemandFinancialDocsOptions
}): boolean {
  const csvContent = buildDemandFinancialDocsCsv(params.commitments, params.options)
  if (!csvContent) {
    return false
  }

  const baseName =
    params.demand.internal_process_number ||
    params.demand.process_number ||
    params.demand.name ||
    'demanda'
  const safeSlug = toSafeFilename(baseName, 'demanda')
  const dateStr = new Date().toISOString().slice(0, 10)
  const filename = `documentos-siafem-${safeSlug}-${dateStr}.csv`

  downloadFile(csvContent, filename, 'text/csv;charset=utf-8;')
  return true
}
