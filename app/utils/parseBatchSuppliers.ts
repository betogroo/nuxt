import { formatCnpj, isValidCnpj } from '~/utils/formatters'
import { cleanSupplierName } from '~/utils/parseBatchBids'

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

const CNPJ_REGEX = /(?:\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}|\b\d{14}\b)/

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
  'NÃO SE APLICA',
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

function isHeaderLine(tokens: string[]): boolean {
  const normalized = tokens.map(normalizeHeaderToken)
  const headerKeywords = ['cnpj', 'empresa', 'razaosocial', 'razao', 'social', 'nome', 'fornecedor']
  const hasKeyword = normalized.some((t) => headerKeywords.includes(t))

  // Se tiver palavra-chave e nenhum token tiver 14 dígitos, é cabeçalho
  const hasValidCnpj = tokens.some((t) => t.replace(/\D/g, '').length === 14)
  return hasKeyword && !hasValidCnpj
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

  // Padrão de contagem de itens julgados/propostas (ex: "1 de 1", "0 de 0", "2 de 10")
  if (/^\d+\s*de\s*\d+$/i.test(trimmed)) {
    return true
  }

  const normalized = normalizeHeaderToken(trimmed)
  const noiseKeywords = [
    'itensjulgados',
    'itemjulgado',
    'itenscomproposta',
    'itenscomlance',
    'itensadjudicados',
    'itenshomologados',
    'portedaempresa',
    'situacao',
    'disputa',
    'classificad',
    'desclassificad',
    'fracassad',
    'adjudicad',
    'homologad',
    'desert',
    'negociad',
    'inabilitad',
    'habilitad',
    'cancelad',
    'recusad',
    'aceit',
    'arrematante',
    'vencedor',
    'enviodeanexos',
    'anexos',
    'anexo',
    'encerrado',
    'encerrada',
    'emandamento',
    'aberto',
    'aberta',
    'aguardando',
    'pendente',
    'faserecursal',
    'recursal',
    'recurso',
    'motivorecusa',
    'motivo',
    'observacao',
    'prazo',
    'valorofertado',
    'valornegociado',
    'valorproposta',
    'valorlance',
    'valortotal',
    'unitario',
  ]

  return noiseKeywords.some((kw) => normalized.includes(kw))
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

interface RawSupplierBlock {
  startLineNumber: number
  lines: Array<{ lineNumber: number; text: string }>
}

function isMultilineSuppliersFormat(lines: string[]): boolean {
  let hasMultilineKeywords = false
  let isolatedCnpjsCount = 0

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    if (/itens\s+julgados|itens\s+com\s+proposta|itens\s+com\s+lance/i.test(trimmed)) {
      hasMultilineKeywords = true
    }

    const match = trimmed.match(CNPJ_REGEX)
    if (match && match.index !== undefined) {
      const restWithoutCnpj = (
        trimmed.slice(0, match.index) + trimmed.slice(match.index + match[0].length)
      )
        .replace(/[-—–;\t|\s]/g, '')
        .trim()

      if (restWithoutCnpj.length === 0) {
        isolatedCnpjsCount++
      }
    }
  }

  return hasMultilineKeywords || isolatedCnpjsCount >= 1
}

function groupLinesIntoBlocks(lines: string[]): {
  blocks: RawSupplierBlock[]
  ignoredLines: Array<{ lineNumber: number; line: string; reason: string }>
} {
  const blocks: RawSupplierBlock[] = []
  const ignoredLines: Array<{ lineNumber: number; line: string; reason: string }> = []
  let currentBlock: RawSupplierBlock | null = null

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

function parseMultilineSuppliersResult(lines: string[]): ParseBatchSuppliersResult {
  const { blocks, ignoredLines } = groupLinesIntoBlocks(lines)
  const items: ParsedBatchSupplierItem[] = []
  const seenCleanCnpjs = new Set<string>()

  for (const block of blocks) {
    const firstLineWithCnpj = block.lines.find((l) => CNPJ_REGEX.test(l.text))
    if (!firstLineWithCnpj) continue

    const cnpjMatch = firstLineWithCnpj.text.match(CNPJ_REGEX)!
    const rawCnpj = cnpjMatch[0]
    const cleanCnpj = rawCnpj.replace(/\D/g, '')
    const formattedCnpj = cleanCnpj.length === 14 ? formatCnpj(cleanCnpj) : rawCnpj

    let candidateName: string | null = null

    // Verifica se a própria linha que contém o CNPJ traz um nome associado
    const restOfCnpjLine = firstLineWithCnpj.text
      .replace(rawCnpj, '')
      .replace(/^[\s\-–—:;./]+|[\s\-–—:;./]+$/g, '')
      .trim()

    if (restOfCnpjLine.length >= 2 && !isNoiseBlockLine(restOfCnpjLine)) {
      candidateName = restOfCnpjLine
    }

    // Varre as demais linhas do bloco em busca da Razão Social
    for (const lineObj of block.lines) {
      const lineText = lineObj.text.trim()

      if (lineText.includes(rawCnpj)) {
        continue
      }

      if (isNoiseBlockLine(lineText)) {
        continue
      }

      if (lineText.length >= 2 && !/^[-—–]+$/.test(lineText)) {
        candidateName = lineText
        break // A primeira linha não-ruído abaixo do CNPJ/porte é a Razão Social no Compras.gov
      }
    }

    const companyName = cleanSupplierName(candidateName, cleanCnpj)

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
      originalLine: block.lines.map((l) => l.text).join(' | '),
      lineNumber: block.startLineNumber,
      isValid,
      status,
      errorReason,
    })
  }

  const readyCount = items.filter((item) => item.isValid && item.status === 'ready').length
  const ignoredCount = items.length - readyCount

  return {
    items,
    readyCount,
    ignoredCount,
    ignoredLines,
  }
}

function parseSingleLineBatchSuppliers(lines: string[]): ParseBatchSuppliersResult {
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
    const sanitizedCompanyName = cleanSupplierName(companyName, cleanCnpj)

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
    } else if (!sanitizedCompanyName) {
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
      company_name: sanitizedCompanyName,
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

  if (isMultilineSuppliersFormat(lines)) {
    return parseMultilineSuppliersResult(lines)
  }

  return parseSingleLineBatchSuppliers(lines)
}
