import { formatCnpj, isValidCnpj } from '~/utils/formatters'

export type BatchBidItemStatus =
  'ready' | 'invalid_cnpj' | 'invalid_amount' | 'duplicate_in_batch' | 'format_error'

export interface ParsedBatchBidItem {
  lineNumber: number
  originalLine: string
  rawCnpj: string
  cleanCnpj: string
  formattedCnpj: string
  amount: number | null
  rawAmount: string
  isValid: boolean
  status: BatchBidItemStatus
  errorReason: string | null
  isDuplicateInBatch: boolean
}

export interface ParseBatchBidsResult {
  items: ParsedBatchBidItem[]
  readyCount: number
  invalidCount: number
  ignoredLines: Array<{ lineNumber: number; line: string; reason: string }>
}

function normalizeHeaderToken(token: string): string {
  return token
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim()
}

function isHeaderLine(line: string): boolean {
  const normalized = normalizeHeaderToken(line)
  const headerKeywords = ['cnpj', 'valor', 'lance', 'proposta', 'preco', 'unitario']
  const hasKeyword = headerKeywords.some((kw) => normalized.includes(kw))
  const hasDigits14 = /\d{14}/.test(line.replace(/\D/g, ''))
  return hasKeyword && !hasDigits14
}

/**
 * Converte uma representação textual de valor em número (float).
 * Desconsidera "R$", espaços, e trata tanto decimais por vírgula ("18,0000")
 * quanto por ponto ("18.0000"), além de separadores de milhar ("1.250,50").
 */
export function parseBidAmount(raw: string): number | null {
  if (!raw || !raw.trim()) return null

  const trimmed = raw.trim()

  // Se começar explicitamente como número negativo (ex: "-10", "- 10.00")
  if (/^-\s*\d/.test(trimmed)) {
    return null
  }

  // Remove "R$", "r$", aspas e espaços
  let cleaned = trimmed
    .replace(/r\$\s*/gi, '')
    .replace(/^["']|["']$/g, '')
    .trim()

  if (!cleaned) return null

  // Se for negativo após remoção de R$ (ex: "R$ -10")
  if (/^-\s*\d/.test(cleaned)) {
    return null
  }

  // Remove caracteres residuais de separação no início ou fim (hífen isolado de separador, vírgula, ponto e vírgula, pipe)
  cleaned = cleaned.replace(/^[\s,;|-]+|[\s,;|-]+$/g, '').trim()

  if (!cleaned) return null

  let numeric: number
  if (cleaned.includes(',')) {
    // Padrão brasileiro: pontos são milhares e vírgula é decimal
    const sanitized = cleaned.replace(/\./g, '').replace(',', '.')
    numeric = Number(sanitized)
  } else {
    // Padrão internacional ou número inteiro
    numeric = Number(cleaned)
  }

  if (Number.isNaN(numeric) || numeric <= 0) {
    return null
  }

  return numeric
}

/**
 * Processa um bloco de texto com linhas no formato CNPJ Valor (com ou sem R$)
 * e retorna os itens classificados e validados.
 */
export function parseBatchBidsText(rawText: string): ParseBatchBidsResult {
  if (!rawText || !rawText.trim()) {
    return {
      items: [],
      readyCount: 0,
      invalidCount: 0,
      ignoredLines: [],
    }
  }

  const lines = rawText.split(/\r?\n/)
  const items: ParsedBatchBidItem[] = []
  const ignoredLines: Array<{ lineNumber: number; line: string; reason: string }> = []
  const seenCleanCnpjs = new Set<string>()

  // Expressão regular para identificar CNPJ com máscara ou 14 dígitos consecutivos
  const cnpjRegex = /(?:\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}|\b\d{14}\b)/

  lines.forEach((line, index) => {
    const lineNumber = index + 1
    const trimmedLine = line.trim()

    if (!trimmedLine) {
      return
    }

    if (isHeaderLine(trimmedLine)) {
      ignoredLines.push({
        lineNumber,
        line: trimmedLine,
        reason: 'Linha de cabeçalho ignorada',
      })
      return
    }

    const cnpjMatch = trimmedLine.match(cnpjRegex)
    if (!cnpjMatch || cnpjMatch.index === undefined) {
      items.push({
        lineNumber,
        originalLine: trimmedLine,
        rawCnpj: '',
        cleanCnpj: '',
        formattedCnpj: '',
        amount: null,
        rawAmount: '',
        isValid: false,
        status: 'format_error',
        errorReason: 'CNPJ não encontrado na linha.',
        isDuplicateInBatch: false,
      })
      return
    }

    const rawCnpj = cnpjMatch[0]
    const cleanCnpj = rawCnpj.replace(/\D/g, '')
    const formattedCnpj = cleanCnpj.length === 14 ? formatCnpj(cleanCnpj) : rawCnpj

    // Extrai o restante da linha para obter o valor
    const beforeCnpj = trimmedLine.slice(0, cnpjMatch.index)
    const afterCnpj = trimmedLine.slice(cnpjMatch.index + rawCnpj.length)
    const rawAmountPart = [beforeCnpj, afterCnpj]
      .filter((s) => s.trim().length > 0)
      .join(' ')
      .trim()

    const parsedAmount = parseBidAmount(rawAmountPart)

    let isValid = true
    let status: BatchBidItemStatus = 'ready'
    let errorReason: string | null = null
    let isDuplicate = false

    if (!isValidCnpj(cleanCnpj)) {
      isValid = false
      status = 'invalid_cnpj'
      errorReason = 'CNPJ inválido (dígitos verificadores incorretos).'
    } else if (parsedAmount === null) {
      isValid = false
      status = 'invalid_amount'
      errorReason = 'Valor do lance inválido ou não numérico.'
    } else if (seenCleanCnpjs.has(cleanCnpj)) {
      isValid = false
      status = 'duplicate_in_batch'
      errorReason = 'CNPJ duplicado nas linhas do lote colado.'
      isDuplicate = true
    }

    if (isValid) {
      seenCleanCnpjs.add(cleanCnpj)
    }

    items.push({
      lineNumber,
      originalLine: trimmedLine,
      rawCnpj,
      cleanCnpj,
      formattedCnpj,
      amount: parsedAmount,
      rawAmount: rawAmountPart,
      isValid,
      status,
      errorReason,
      isDuplicateInBatch: isDuplicate,
    })
  })

  const readyCount = items.filter((i) => i.isValid && i.status === 'ready').length
  const invalidCount = items.length - readyCount

  return {
    items,
    readyCount,
    invalidCount,
    ignoredLines,
  }
}
