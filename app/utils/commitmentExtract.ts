import { formatCnpj, formatCurrency, formatDate } from './formatters'
import { formatCurrencyInWords } from './currencyInWords'
import { resolveProcurementNumberWithYear } from './demandConvocationEmail'
import type { DemandForConvocationEmail } from './demandConvocationEmail'

export const DEFAULT_EXTRACT_CONTRACTOR = 'Delegacia Seccional de Polícia de São Joaquim da Barra'
export const DEFAULT_EXTRACT_WORK_PROGRAM = '06181180149890000'
export const DEFAULT_EXTRACT_PTRES = '180205'

export interface CommitmentExtractDemandInfo extends DemandForConvocationEmail {
  name?: string | null
  process_number?: string | null
  internal_process_number?: string | null
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
  const workProgram = data.workProgram?.trim() || DEFAULT_EXTRACT_WORK_PROGRAM
  const ptres = data.ptres?.trim() || DEFAULT_EXTRACT_PTRES

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
