import { formatCnpj, formatCurrency, formatDate } from './formatters'
import { formatCurrencyInWords } from './currencyInWords'
import { resolveProcurementNumberWithYear } from './demandConvocationEmail'
import type { DemandForConvocationEmail } from './demandConvocationEmail'
import type { CommitmentRow } from '~/composables/useCommitments'
import type { DemandProductRow } from '~/composables/useDemandProducts'
import { getItemDisputeResult, getItemSubtotal } from '~/utils/bids'
import { normalizeSiafemNumber } from '~/schemas/forms/commitment'
import { DEMAND_BUDGET_DEFAULTS, resolveDemandBudgetCodes } from '~/constants/demand-budget'

export const DEFAULT_EXTRACT_CONTRACTOR = 'Delegacia Seccional de Polícia de São Joaquim da Barra'
export const DEFAULT_EXTRACT_WORK_PROGRAM = DEMAND_BUDGET_DEFAULTS.consumption.workProgram
export const DEFAULT_EXTRACT_PTRES = DEMAND_BUDGET_DEFAULTS.consumption.ptres
export const EXTRACT_SEPARATOR = '\n\n--------------------------------------------------\n\n'

export interface CommitmentExtractDemandInfo extends DemandForConvocationEmail {
  name?: string | null
  process_number?: string | null
  internal_process_number?: string | null
  type?: string | null
  work_program?: string | null
  ptres?: string | null
}

export interface CommitmentExtractSupplierInfo {
  company_name?: string | null
  cnpj?: string | null
}

export interface CommitmentExtractExpenseNatureInfo {
  id?: string | null
  name?: string | null
}

export interface CommitmentExtractData {
  commitmentNumber: string
  issueDate?: string | null
  totalAmount: number
  demand?: CommitmentExtractDemandInfo | null
  supplier?: CommitmentExtractSupplierInfo | null
  expenseNature?: CommitmentExtractExpenseNatureInfo | null
  contractorName?: string | null
  workProgram?: string | null
  ptres?: string | null
}

/**
 * Normalizes a procurement number, stripping redundant prefixes like "Dispensa", "Aviso", "Edital".
 */
export function cleanProcurementNumber(rawNumber: string): string {
  return rawNumber
    .replace(
      /^(dispensa(\s+de\s+licita[çc][ãa]o)?|aviso(\s+de\s+contrata[çc][ãa]o)?|edital)\s*(n[ºo°.]?)?\s*/i,
      '',
    )
    .trim()
}

/**
 * Normalizes a SEI process number, stripping redundant "Processo SEI nº" prefixes.
 */
export function cleanSeiProcessNumber(rawProcess: string): string {
  return rawProcess.replace(/^(processo(\s+sei)?|sei)\s*(n[ºo°.]?)?\s*/i, '').trim()
}

/**
 * Resolves the procurement number for the extract:
 * 1. Checks contract_number and bidding_notice_number via resolveProcurementNumberWithYear.
 * 2. If it returns the default placeholder or empty, fallbacks to internal_process_number.
 */
export function resolveExtractProcurementNumber(
  demand?: CommitmentExtractDemandInfo | null,
): string {
  if (!demand) return '-'

  const resolved = resolveProcurementNumberWithYear(demand)
  if (resolved && !resolved.startsWith('[')) {
    return cleanProcurementNumber(resolved)
  }

  if (demand.internal_process_number?.trim()) {
    return cleanProcurementNumber(demand.internal_process_number.trim())
  }

  return '-'
}

/**
 * Resolves the expense nature code:
 * Priority: `id` (numeric code like 33903016) -> fallback to digits in `name` -> or `name`.
 */
export function resolveExpenseNatureCode(
  expenseNature?: CommitmentExtractExpenseNatureInfo | null,
): string {
  if (!expenseNature) return '-'
  if (expenseNature.id && expenseNature.id.trim()) {
    return expenseNature.id.trim()
  }
  if (expenseNature.name && expenseNature.name.trim()) {
    const match = expenseNature.name.match(/\b\d{6,8}\b/)
    if (match) return match[0]
    return expenseNature.name.trim()
  }
  return '-'
}

/**
 * Generates the standardized Commitment Extract text.
 */
export function generateCommitmentExtract(data: CommitmentExtractData): string {
  const procurementNumber = resolveExtractProcurementNumber(data.demand)
  const rawSei = data.demand?.process_number?.trim() || ''
  const seiNumber = rawSei ? cleanSeiProcessNumber(rawSei) : '-'

  const contractor = data.contractorName?.trim() || DEFAULT_EXTRACT_CONTRACTOR
  const objectDesc = data.demand?.name?.trim() || '-'
  const expenseNatureCode = resolveExpenseNatureCode(data.expenseNature)

  const budget = resolveDemandBudgetCodes(data.demand)
  const workProgram = data.workProgram?.trim() || budget.workProgram
  const ptres = data.ptres?.trim() || budget.ptres

  const supplierName = data.supplier?.company_name?.trim() || '-'
  const rawCnpj = data.supplier?.cnpj?.trim() || ''
  const formattedCnpj = rawCnpj ? formatCnpj(rawCnpj) : '-'

  const formattedTotal = formatCurrency(data.totalAmount).replace(/\u00A0/g, ' ')
  const totalInWords = formatCurrencyInWords(data.totalAmount)

  const commitmentNumber = data.commitmentNumber.trim().toUpperCase()
  const formattedDate = data.issueDate ? formatDate(data.issueDate) : '-'

  return [
    'EXTRATO NOTA DE EMPENHO',
    `Dispensa de Licitação nº ${procurementNumber}`,
    `Processo SEI nº ${seiNumber}`,
    `Contratante - ${contractor}`,
    `Objeto: ${objectDesc}`,
    `Natureza de despesa: ${expenseNatureCode}`,
    `Programa de trabalho: ${workProgram}`,
    `PTRES: ${ptres}`,
    `Contratada: ${supplierName}`,
    `CNPJ ${formattedCnpj}`,
    `Valor total: ${formattedTotal} (${totalInWords})`,
    `Nota de empenho: ${commitmentNumber}`,
    `Data de emissão: ${formattedDate}`,
  ].join('\n')
}

export interface DemandCommitmentExtractItem {
  commitmentNumber: string
  supplierName: string
  supplierCnpj?: string | null
  totalAmount: number
  extractText: string
  commitment: CommitmentRow
}

/**
 * Generates extracts for all active (non-cancelled) commitments of a demand.
 */
export function generateDemandCommitmentExtracts(params: {
  demand?: CommitmentExtractDemandInfo | null
  commitments?: CommitmentRow[] | null
  items?: DemandProductRow[] | null
}): DemandCommitmentExtractItem[] {
  const activeCommitments = (params.commitments || []).filter((c) => c.status !== 'cancelled')

  if (activeCommitments.length === 0) return []

  // 1. Group winning items by normalized commitment number
  const totalsByCommitment = new Map<string, number>()
  const itemsByCommitment = new Map<string, DemandProductRow[]>()

  for (const item of params.items || []) {
    if (!item.commitment_number) continue
    const norm = normalizeSiafemNumber(item.commitment_number)
    if (!norm) continue

    const dispute = getItemDisputeResult(item)
    if (dispute.outcome !== 'winner') continue

    const unitPrice = dispute.winningAmount ?? 0
    const itemTotal = dispute.totalFinal ?? getItemSubtotal(unitPrice, item.quantity)

    totalsByCommitment.set(norm, (totalsByCommitment.get(norm) || 0) + itemTotal)

    const list = itemsByCommitment.get(norm) || []
    list.push(item)
    itemsByCommitment.set(norm, list)
  }

  // 2. Generate extract for each non-cancelled commitment
  return activeCommitments.map((commitment) => {
    const normNum = normalizeSiafemNumber(commitment.commitment_number)
    const effectiveNum = commitment.cancels_commitment_number
      ? normalizeSiafemNumber(commitment.cancels_commitment_number)
      : normNum

    const totalAmount = totalsByCommitment.get(effectiveNum) || 0
    const commitmentItems = itemsByCommitment.get(effectiveNum) || []

    // Fallback expense nature from items if not directly attached to commitment
    let expenseNature = commitment.expense_natures
    if (!expenseNature) {
      const firstWithNature = commitmentItems.find(
        (i) => i.product?.expense_natures || i.product?.expense_nature_id,
      )
      if (firstWithNature?.product?.expense_natures) {
        expenseNature = firstWithNature.product.expense_natures
      } else if (firstWithNature?.product?.expense_nature_id) {
        expenseNature = { id: firstWithNature.product.expense_nature_id, name: '' }
      }
    }

    const extractText = generateCommitmentExtract({
      commitmentNumber: commitment.commitment_number,
      issueDate: commitment.issue_date,
      totalAmount,
      demand: commitment.demands || params.demand,
      supplier: commitment.suppliers,
      expenseNature,
    })

    return {
      commitmentNumber: commitment.commitment_number,
      supplierName: commitment.suppliers?.company_name || '-',
      supplierCnpj: commitment.suppliers?.cnpj,
      totalAmount,
      extractText,
      commitment,
    }
  })
}

/**
 * Combines multiple extract texts into a single batch publication document.
 */
export function buildCombinedExtractsText(extracts: DemandCommitmentExtractItem[]): string {
  return extracts.map((e) => e.extractText).join(EXTRACT_SEPARATOR)
}
