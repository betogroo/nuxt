export interface ParsedBatchProductItem {
  id?: string
  name: string
  cat_mat: number | null
  cat_bec: number | null
  expense_nature_id: string | null
  product_class_id: string | null
  is_active: boolean
  isValid: boolean
  errors: string[]
  lineNumber: number
  originalLine: string
}

export interface ParseBatchProductsResult {
  items: ParsedBatchProductItem[]
  ignoredLines: Array<{ lineNumber: number; line: string; reason: string }>
  summary: {
    totalParsed: number
    validCount: number
    invalidCount: number
  }
}

interface ColumnMapping {
  nameIndex: number
  catMatIndex: number
  catBecIndex: number
  natureIndex: number
  classIndex: number
}

function normalizeHeaderToken(token: string): string {
  return token
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim()
}

function detectDelimiter(line: string): string {
  if (line.includes('\t')) return '\t'
  if (line.includes(';')) return ';'
  if (line.includes('|')) return '|'
  if (line.includes(',')) return ','
  return '\t'
}

function isHeaderLine(tokens: string[]): boolean {
  const normalized = tokens.map(normalizeHeaderToken)
  const headerKeywords = ['nome', 'produto', 'descricao', 'catmat', 'catbec', 'natureza', 'classe']
  return normalized.some((t) => headerKeywords.includes(t))
}

function resolveColumnMapping(tokens: string[]): ColumnMapping {
  let nameIndex = -1
  let catMatIndex = -1
  let catBecIndex = -1
  let natureIndex = -1
  let classIndex = -1

  tokens.forEach((rawToken, idx) => {
    const t = normalizeHeaderToken(rawToken)
    if (['nome', 'produto', 'descricao', 'item'].includes(t) && nameIndex === -1) {
      nameIndex = idx
    } else if (['catmat', 'siasg'].includes(t) && catMatIndex === -1) {
      catMatIndex = idx
    } else if (['catbec', 'bec'].includes(t) && catBecIndex === -1) {
      catBecIndex = idx
    } else if (['natureza', 'despesa', 'naturezadespesa'].includes(t) && natureIndex === -1) {
      natureIndex = idx
    } else if (['classe', 'classedeproduto', 'class'].includes(t) && classIndex === -1) {
      classIndex = idx
    }
  })

  // Fallback se não identificou explicitamente pelo nome
  if (nameIndex === -1) nameIndex = 0
  if (catMatIndex === -1 && tokens.length > 1) catMatIndex = 1
  if (catBecIndex === -1 && tokens.length > 2) catBecIndex = 2
  if (natureIndex === -1 && tokens.length > 3) natureIndex = 3
  if (classIndex === -1 && tokens.length > 4) classIndex = 4

  return { nameIndex, catMatIndex, catBecIndex, natureIndex, classIndex }
}

function parseCatalogNumber(val: string | undefined): {
  value: number | null
  error: string | null
} {
  if (!val) return { value: null, error: null }
  const trimmed = val.trim()
  if (!trimmed) return { value: null, error: null }

  // Se tiver caracteres não numéricos
  if (!/^\d+$/.test(trimmed)) {
    return { value: null, error: 'Deve conter apenas números inteiros positivos.' }
  }

  const parsed = Number(trimmed)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return { value: null, error: 'Deve ser um número inteiro positivo.' }
  }

  return { value: parsed, error: null }
}

/**
 * Faz o parsing de um texto colado (Excel/TSV, CSV, Pipe ou 1 produto por linha)
 * e gera uma lista validada de itens para cadastro em lote.
 */
export function parseBatchProductsText(
  text: string,
  defaultNatureId: string | null = null,
  defaultClassId: string | null = null,
  defaultIsActive: boolean = true,
): ParseBatchProductsResult {
  if (!text || typeof text !== 'string') {
    return {
      items: [],
      ignoredLines: [],
      summary: { totalParsed: 0, validCount: 0, invalidCount: 0 },
    }
  }

  const rawLines = text.split(/\r?\n/)
  const ignoredLines: Array<{ lineNumber: number; line: string; reason: string }> = []
  const validLines: Array<{ line: string; lineNumber: number }> = []

  rawLines.forEach((rawLine, idx) => {
    const cleanLine = rawLine.replace(/[\r\n]+$/, '')
    const lineNumber = idx + 1
    if (!cleanLine.trim()) {
      ignoredLines.push({ lineNumber, line: rawLine, reason: 'Linha em branco' })
      return
    }
    validLines.push({ line: cleanLine, lineNumber })
  })

  if (validLines.length === 0) {
    return {
      items: [],
      ignoredLines,
      summary: { totalParsed: 0, validCount: 0, invalidCount: 0 },
    }
  }

  // Detecta se a primeira linha é cabeçalho
  const firstLine = validLines[0].line
  const delimiter = detectDelimiter(firstLine)
  const firstTokens = firstLine.split(delimiter).map((t) => t.trim())

  let startIndex = 0
  let mapping: ColumnMapping

  if (isHeaderLine(firstTokens)) {
    mapping = resolveColumnMapping(firstTokens)
    startIndex = 1
  } else {
    mapping = {
      nameIndex: 0,
      catMatIndex: 1,
      catBecIndex: 2,
      natureIndex: 3,
      classIndex: 4,
    }
  }

  const parsedItems: ParsedBatchProductItem[] = []

  for (let i = startIndex; i < validLines.length; i++) {
    const { line, lineNumber } = validLines[i]
    const rowDelimiter = detectDelimiter(line)
    const tokens = line.split(rowDelimiter).map((t) => t.trim())

    const rawName = tokens[mapping.nameIndex] ?? ''
    const rawCatMat = tokens[mapping.catMatIndex] ?? ''
    const rawCatBec = tokens[mapping.catBecIndex] ?? ''
    const rawNature = tokens[mapping.natureIndex] ?? ''
    const rawClass = tokens[mapping.classIndex] ?? ''

    const errors: string[] = []

    if (!rawName) {
      errors.push('Nome do produto é obrigatório.')
    }

    const parsedCatMat = parseCatalogNumber(rawCatMat)
    if (parsedCatMat.error) {
      errors.push(`CATMAT inválido: ${parsedCatMat.error}`)
    }

    const parsedCatBec = parseCatalogNumber(rawCatBec)
    if (parsedCatBec.error) {
      errors.push(`CATBEC inválido: ${parsedCatBec.error}`)
    }

    const finalNatureId = rawNature || defaultNatureId || null
    if (!finalNatureId) {
      errors.push('Natureza de despesa é obrigatória.')
    }

    const finalClassId = rawClass || defaultClassId || null

    parsedItems.push({
      name: rawName,
      cat_mat: parsedCatMat.value,
      cat_bec: parsedCatBec.value,
      expense_nature_id: finalNatureId,
      product_class_id: finalClassId,
      is_active: defaultIsActive,
      isValid: errors.length === 0,
      errors,
      lineNumber,
      originalLine: line,
    })
  }

  // Validação de duplicidades dentro do lote para CATMAT e CATBEC
  const catMatOccurrences = new Map<number, number[]>()
  const catBecOccurrences = new Map<number, number[]>()

  parsedItems.forEach((item, index) => {
    if (item.cat_mat !== null) {
      const list = catMatOccurrences.get(item.cat_mat) || []
      list.push(index)
      catMatOccurrences.set(item.cat_mat, list)
    }
    if (item.cat_bec !== null) {
      const list = catBecOccurrences.get(item.cat_bec) || []
      list.push(index)
      catBecOccurrences.set(item.cat_bec, list)
    }
  })

  catMatOccurrences.forEach((indices, catMat) => {
    if (indices.length > 1) {
      indices.forEach((idx) => {
        parsedItems[idx].errors.push(`CATMAT ${catMat} duplicado nas linhas do lote.`)
        parsedItems[idx].isValid = false
      })
    }
  })

  catBecOccurrences.forEach((indices, catBec) => {
    if (indices.length > 1) {
      indices.forEach((idx) => {
        parsedItems[idx].errors.push(`CATBEC ${catBec} duplicado nas linhas do lote.`)
        parsedItems[idx].isValid = false
      })
    }
  })

  const validCount = parsedItems.filter((it) => it.isValid).length
  const invalidCount = parsedItems.length - validCount

  return {
    items: parsedItems,
    ignoredLines,
    summary: {
      totalParsed: parsedItems.length,
      validCount,
      invalidCount,
    },
  }
}
