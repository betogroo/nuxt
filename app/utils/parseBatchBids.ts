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
  supplierName?: string | null
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

const BRAZILIAN_UFS = new Set([
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
])

const COMPANY_SIZES = new Set([
  'ME/EPP',
  'ME',
  'EPP',
  'DEMAIS',
  'MICROEMPRESA',
  'EMPRESA DE PEQUENO PORTE',
  'SEM ME/EPP',
  'NAO SE APLICA',
  'N/A',
])

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

function isNoiseBlockLine(line: string): boolean {
  const trimmed = line.trim()
  if (!trimmed || /^[-—–\s]+$/.test(trimmed)) {
    return true
  }

  const upper = trimmed.toUpperCase()
  if (COMPANY_SIZES.has(upper) || BRAZILIAN_UFS.has(upper)) {
    return true
  }

  const normalized = normalizeHeaderToken(trimmed)
  const noiseKeywords = [
    'valorofertado',
    'valornegociado',
    'valorproposta',
    'valorlance',
    'valortotal',
    'unitario',
    'situacao',
    'disputa',
    'classificado',
    'desclassificado',
    'arrematante',
    'vencedor',
  ]

  return noiseKeywords.some((kw) => normalized.includes(kw))
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

const CNPJ_REGEX = /(?:\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}|\b\d{14}\b)/

/**
 * Detecta se o texto está no formato de blocos multilinhas do Compras.gov / pregão eletrônico.
 */
function isMultilineBidsFormat(lines: string[]): boolean {
  let hasMultilineKeywords = false
  let isolatedCnpjsCount = 0

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    if (/valor\s+ofertado|valor\s+negociado/i.test(trimmed)) {
      hasMultilineKeywords = true
    }

    const match = trimmed.match(CNPJ_REGEX)
    if (match && match.index !== undefined) {
      // Verifica o restante da linha removendo o CNPJ e delimitadores
      const restWithoutCnpj = (
        trimmed.slice(0, match.index) + trimmed.slice(match.index + match[0].length)
      )
        .replace(/[-—–;\t|\s]/g, '')
        .trim()

      // Se a linha contiver estritamente apenas o CNPJ (sem nome e sem valor)
      if (restWithoutCnpj.length === 0) {
        isolatedCnpjsCount++
      }
    }
  }

  return hasMultilineKeywords || isolatedCnpjsCount >= 1
}

interface RawBlock {
  startLineNumber: number
  lines: Array<{ lineNumber: number; text: string }>
}

function groupLinesIntoBlocks(lines: string[]): {
  blocks: RawBlock[]
  ignoredLines: Array<{ lineNumber: number; line: string; reason: string }>
} {
  const blocks: RawBlock[] = []
  const ignoredLines: Array<{ lineNumber: number; line: string; reason: string }> = []
  let currentBlock: RawBlock | null = null

  lines.forEach((line, index) => {
    const lineNumber = index + 1
    const trimmed = line.trim()
    if (!trimmed) return

    const hasCnpj = CNPJ_REGEX.test(trimmed)

    if (hasCnpj) {
      if (currentBlock) {
        blocks.push(currentBlock)
      }
      currentBlock = {
        startLineNumber: lineNumber,
        lines: [{ lineNumber, text: trimmed }],
      }
    } else if (currentBlock) {
      currentBlock.lines.push({ lineNumber, text: trimmed })
    } else {
      ignoredLines.push({
        lineNumber,
        line: trimmed,
        reason: 'Linha fora de bloco de fornecedor ignorada',
      })
    }
  })

  if (currentBlock) {
    blocks.push(currentBlock)
  }

  return { blocks, ignoredLines }
}

function parseMultilineBidsResult(lines: string[]): ParseBatchBidsResult {
  const { blocks, ignoredLines } = groupLinesIntoBlocks(lines)
  const items: ParsedBatchBidItem[] = []
  const seenCleanCnpjs = new Set<string>()

  for (const block of blocks) {
    const firstLineWithCnpj = block.lines.find((l) => CNPJ_REGEX.test(l.text))
    if (!firstLineWithCnpj) continue

    const cnpjMatch = firstLineWithCnpj.text.match(CNPJ_REGEX)!
    const rawCnpj = cnpjMatch[0]
    const cleanCnpj = rawCnpj.replace(/\D/g, '')
    const formattedCnpj = cleanCnpj.length === 14 ? formatCnpj(cleanCnpj) : rawCnpj

    let supplierName: string | null = null
    const candidateAmounts: Array<{ raw: string; value: number }> = []

    for (const lineObj of block.lines) {
      const lineText = lineObj.text.trim()
      // Se for a linha que contém o CNPJ
      if (lineText.includes(rawCnpj)) {
        const rest = lineText.replace(rawCnpj, '').trim()
        const amt = parseBidAmount(rest)
        if (amt !== null) {
          candidateAmounts.push({ raw: rest, value: amt })
        }
        continue
      }

      // Se for linha de ruído conhecida (porte, UF, rótulo de valor, etc.)
      if (isNoiseBlockLine(lineText)) {
        continue
      }

      // Verifica se a linha é um valor monetário
      const amt = parseBidAmount(lineText)
      if (amt !== null) {
        candidateAmounts.push({ raw: lineText, value: amt })
        continue
      }

      // Caso não seja ruído nem valor monetário, é candidato a Nome / Razão Social
      if (!supplierName && lineText.length >= 2 && !/^[-—–]+$/.test(lineText)) {
        supplierName = lineText
      }
    }

    // Definição do valor:
    // No Compras.gov, a ordem típica é [Valor Ofertado, Valor Negociado].
    // Se houver valor negociado preenchido como número válido, ele é o último candidato.
    // Se houver apenas um valor, ele é o valor ofertado.
    let finalAmount: number | null = null
    let rawAmountPart = ''

    if (candidateAmounts.length > 0) {
      const chosen = candidateAmounts[candidateAmounts.length - 1]
      finalAmount = chosen.value
      rawAmountPart = chosen.raw
    }

    let isValid = true
    let status: BatchBidItemStatus = 'ready'
    let errorReason: string | null = null
    let isDuplicate = false

    if (!isValidCnpj(cleanCnpj)) {
      isValid = false
      status = 'invalid_cnpj'
      errorReason = 'CNPJ inválido (dígitos verificadores incorretos).'
    } else if (finalAmount === null) {
      isValid = false
      status = 'invalid_amount'
      errorReason = 'Valor do lance inválido ou não localizado no bloco.'
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
      lineNumber: block.startLineNumber,
      originalLine: block.lines.map((l) => l.text).join(' | '),
      rawCnpj,
      cleanCnpj,
      formattedCnpj,
      amount: finalAmount,
      rawAmount: rawAmountPart,
      supplierName: supplierName || null,
      isValid,
      status,
      errorReason,
      isDuplicateInBatch: isDuplicate,
    })
  }

  const readyCount = items.filter((i) => i.isValid && i.status === 'ready').length
  const invalidCount = items.length - readyCount

  return {
    items,
    readyCount,
    invalidCount,
    ignoredLines,
  }
}

function parseSingleLineBatchBids(lines: string[]): ParseBatchBidsResult {
  const items: ParsedBatchBidItem[] = []
  const ignoredLines: Array<{ lineNumber: number; line: string; reason: string }> = []
  const seenCleanCnpjs = new Set<string>()

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

    const cnpjMatch = trimmedLine.match(CNPJ_REGEX)
    if (!cnpjMatch || cnpjMatch.index === undefined) {
      items.push({
        lineNumber,
        originalLine: trimmedLine,
        rawCnpj: '',
        cleanCnpj: '',
        formattedCnpj: '',
        amount: null,
        rawAmount: '',
        supplierName: null,
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

    let supplierName: string | null = null
    let rawAmountPart = ''

    // Se a linha for delimitada por ponto e vírgula, tabulação ou pipe
    const delimiter = [';', '\t', '|'].find((d) => trimmedLine.includes(d))

    if (delimiter) {
      const segments = trimmedLine
        .split(delimiter)
        .map((s) => s.trim())
        .filter((s) => s.length > 0)

      const cnpjSegmentIdx = segments.findIndex((s) => s.includes(rawCnpj))
      const segmentsWithoutCnpj = segments.filter((_, idx) => idx !== cnpjSegmentIdx)

      if (segmentsWithoutCnpj.length === 1) {
        // [CNPJ, VALOR]
        rawAmountPart = segmentsWithoutCnpj[0]
      } else if (segmentsWithoutCnpj.length >= 2) {
        // [CNPJ, NOME, VALOR] ou [NOME, CNPJ, VALOR]
        // O valor é o segmento com valor numérico válido
        const amountIdx = segmentsWithoutCnpj.findIndex((s) => parseBidAmount(s) !== null)
        if (amountIdx !== -1) {
          rawAmountPart = segmentsWithoutCnpj[amountIdx]
          const nameSegments = segmentsWithoutCnpj.filter((_, idx) => idx !== amountIdx)
          if (nameSegments.length > 0) {
            supplierName = nameSegments.join(' ').trim()
          }
        } else {
          rawAmountPart = segmentsWithoutCnpj[segmentsWithoutCnpj.length - 1]
          supplierName = segmentsWithoutCnpj.slice(0, -1).join(' ').trim()
        }
      }
    } else {
      // Formato clássico por espaço: "CNPJ VALOR"
      const beforeCnpj = trimmedLine.slice(0, cnpjMatch.index)
      const afterCnpj = trimmedLine.slice(cnpjMatch.index + rawCnpj.length)
      rawAmountPart = [beforeCnpj, afterCnpj]
        .filter((s) => s.trim().length > 0)
        .join(' ')
        .trim()
    }

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
      supplierName: supplierName || null,
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

/**
 * Processa um bloco de texto contendo lances (seja em blocos multilinhas do Compras.gov
 * ou em linhas simples separadas por espaço, tabulação ou ponto e vírgula)
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

  if (isMultilineBidsFormat(lines)) {
    return parseMultilineBidsResult(lines)
  }

  return parseSingleLineBatchBids(lines)
}

/**
 * Converte um número para string monetária brasileira sem R$ (ex: 20 -> "20,0000").
 */
export function formatBidDecimal(amount: number | null): string {
  if (amount === null || Number.isNaN(amount)) return ''
  return amount.toLocaleString('pt-BR', {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  })
}

/**
 * Converte qualquer texto de lote recebido para o formato padronizado:
 * `CNPJ; NOME_FORNECEDOR; VALOR` (ou `CNPJ; VALOR` se não houver nome)
 */
export function convertRawBidsTextToStandardFormat(rawText: string): string {
  if (!rawText || !rawText.trim()) return ''

  const result = parseBatchBidsText(rawText)
  if (result.items.length === 0) return rawText

  const lines: string[] = []

  for (const item of result.items) {
    if (!item.isValid || item.amount === null) {
      lines.push(item.originalLine)
      continue
    }

    const cnpj = item.formattedCnpj || item.rawCnpj
    const formattedAmount = formatBidDecimal(item.amount)

    if (item.supplierName && item.supplierName.trim()) {
      lines.push(`${cnpj}; ${item.supplierName.trim()}; ${formattedAmount}`)
    } else {
      lines.push(`${cnpj}; ${formattedAmount}`)
    }
  }

  return lines.join('\n')
}
