import { formatCnpj, isValidCnpj } from '~/utils/formatters'

export type BatchSupplierItemStatus =
  'ready' | 'already_registered' | 'invalid_cnpj' | 'missing_name' | 'duplicate_in_batch'

export interface ParsedBatchSupplierItem {
  cnpj: string
  cleanCnpj: string
  company_name: string
  originalLine: string
  lineNumber: number
  isValid: boolean
  status: BatchSupplierItemStatus
  errorReason: string | null
  existingSupplierId?: string | null
}

export interface ParseBatchSuppliersResult {
  items: ParsedBatchSupplierItem[]
  readyCount: number
  ignoredCount: number
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

function isHeaderLine(tokens: string[]): boolean {
  const normalized = tokens.map(normalizeHeaderToken)
  const headerKeywords = ['cnpj', 'empresa', 'razaosocial', 'razao', 'social', 'nome', 'fornecedor']
  const hasKeyword = normalized.some((t) => headerKeywords.includes(t))

  // Se tiver palavra-chave e nenhum token tiver 14 dígitos, é cabeçalho
  const hasValidCnpj = tokens.some((t) => t.replace(/\D/g, '').length === 14)
  return hasKeyword && !hasValidCnpj
}

function splitLineTokens(line: string): string[] {
  if (line.includes('\t')) return line.split('\t')
  if (line.includes(';')) return line.split(';')
  if (line.includes('|')) return line.split('|')
  if (line.includes(' - ')) return line.split(' - ')
  if (line.includes(',')) return line.split(',')

  // Tentativa de separar via regex procurando o padrão de CNPJ
  const cnpjMatch = line.match(/(?:\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}|\b\d{14}\b)/)
  if (cnpjMatch && cnpjMatch.index !== undefined) {
    const matchedCnpj = cnpjMatch[0]
    const before = line.slice(0, cnpjMatch.index).trim()
    const after = line.slice(cnpjMatch.index + matchedCnpj.length).trim()
    const name = [before, after].filter(Boolean).join(' ')
    return [matchedCnpj, name]
  }

  // Fallback: divide por 2 ou mais espaços
  const spaceParts = line.split(/\s{2,}/)
  if (spaceParts.length >= 2) return spaceParts

  return [line]
}

export function parseBatchSuppliersText(rawText: string): ParseBatchSuppliersResult {
  if (!rawText || !rawText.trim()) {
    return {
      items: [],
      readyCount: 0,
      ignoredCount: 0,
      ignoredLines: [],
    }
  }

  const lines = rawText.split(/\r?\n/)
  const items: ParsedBatchSupplierItem[] = []
  const ignoredLines: Array<{ lineNumber: number; line: string; reason: string }> = []
  const seenCleanCnpjs = new Set<string>()

  lines.forEach((line, index) => {
    const lineNumber = index + 1
    const trimmedLine = line.trim()

    if (!trimmedLine) {
      return
    }

    const tokens = splitLineTokens(trimmedLine)

    // Detecção de linha de cabeçalho
    if (isHeaderLine(tokens)) {
      ignoredLines.push({
        lineNumber,
        line: trimmedLine,
        reason: 'Linha de cabeçalho ignorada',
      })
      return
    }

    let rawCnpj: string
    let companyName: string

    if (tokens.length >= 2) {
      const clean0 = tokens[0].replace(/\D/g, '')
      const clean1 = tokens[1].replace(/\D/g, '')

      if (clean0.length === 14) {
        rawCnpj = tokens[0].trim()
        companyName = tokens.slice(1).join(' ').trim()
      } else if (clean1.length === 14) {
        rawCnpj = tokens[1].trim()
        companyName = tokens[0].trim()
      } else {
        // Se nenhum dos dois tem exatamente 14 dígitos, assume o primeiro como CNPJ se tiver mais dígitos
        if (clean0.length >= clean1.length) {
          rawCnpj = tokens[0].trim()
          companyName = tokens.slice(1).join(' ').trim()
        } else {
          rawCnpj = tokens[1].trim()
          companyName = tokens[0].trim()
        }
      }
    } else {
      rawCnpj = tokens[0].trim()
      companyName = ''
    }

    const cleanCnpj = rawCnpj.replace(/\D/g, '')
    const formattedCnpj = cleanCnpj.length === 14 ? formatCnpj(cleanCnpj) : rawCnpj

    let isValid = true
    let status: BatchSupplierItemStatus = 'ready'
    let errorReason: string | null = null

    if (!cleanCnpj) {
      isValid = false
      status = 'invalid_cnpj'
      errorReason = 'CNPJ não informado.'
    } else if (cleanCnpj.length !== 14) {
      isValid = false
      status = 'invalid_cnpj'
      errorReason = `CNPJ incompleto ou inválido (${cleanCnpj.length} dígitos encontrados, esperado 14 dígitos).`
    } else if (!isValidCnpj(cleanCnpj)) {
      isValid = false
      status = 'invalid_cnpj'
      errorReason = 'CNPJ inválido (dígitos verificadores incorretos).'
    } else if (!companyName) {
      isValid = false
      status = 'missing_name'
      errorReason = 'Nome da empresa é obrigatório.'
    } else if (seenCleanCnpjs.has(cleanCnpj)) {
      isValid = false
      status = 'duplicate_in_batch'
      errorReason = 'CNPJ duplicado nas linhas do lote colado.'
    }

    if (cleanCnpj && isValid) {
      seenCleanCnpjs.add(cleanCnpj)
    }

    items.push({
      cnpj: formattedCnpj,
      cleanCnpj,
      company_name: companyName,
      originalLine: trimmedLine,
      lineNumber,
      isValid,
      status,
      errorReason,
    })
  })

  const readyCount = items.filter((item) => item.isValid && item.status === 'ready').length
  const ignoredCount = items.length - readyCount

  return {
    items,
    readyCount,
    ignoredCount,
    ignoredLines,
  }
}
