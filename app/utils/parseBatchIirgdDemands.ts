import { IIRGD_STATION_CODES, type IirgdStationCode } from '~/constants/iirgd-stations'
import {
  formatCitizenName,
  formatCpf,
  isValidCpf,
  isValidRgSP,
  padAndFormatRg,
} from '~/utils/formatters'

export type BatchIirgdDemandItemStatus =
  | 'ready'
  | 'invalid_station'
  | 'invalid_document'
  | 'missing_name'
  | 'missing_document_type'
  | 'duplicate_in_batch'
  | 'active_demand_exists'

export interface ParsedBatchIirgdDemandItem {
  station_code: string
  citizenDocumentType: 'rg' | 'cpf' | null
  formattedDocument: string
  rg: string | null
  cpf: string | null
  name: string
  document_type_name: string
  document_type_id?: string | null
  isNewDocumentType?: boolean
  existingCitizenId?: string | null
  hasActiveDemandWarning?: boolean
  originalLine: string
  lineNumber: number
  isValid: boolean
  status: BatchIirgdDemandItemStatus
  errorReason: string | null
}

export interface ParseBatchIirgdDemandsResult {
  items: ParsedBatchIirgdDemandItem[]
  readyCount: number
  ignoredCount: number
  ignoredLines: Array<{ lineNumber: number; line: string; reason: string }>
}

export function normalizeIirgdCatalogText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeHeaderToken(token: string): string {
  return token
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim()
}

function normalizeStationCode(raw: string): string {
  const trimmed = raw.trim()
  const cleanDigits = trimmed.replace(/\D/g, '')

  for (const code of IIRGD_STATION_CODES) {
    if (trimmed === code || cleanDigits === code.replace(/\D/g, '')) {
      return code
    }
  }

  return trimmed
}

function isValidStationCode(code: string): code is IirgdStationCode {
  return (IIRGD_STATION_CODES as readonly string[]).includes(code)
}

function isHeaderLine(tokens: string[]): boolean {
  if (tokens.length === 0) return false
  const normalized = tokens.map(normalizeHeaderToken)
  const headerKeywords = [
    'posto',
    'codigoposto',
    'codposto',
    'rg',
    'cpf',
    'documento',
    'rgcpf',
    'nome',
    'cidadao',
    'nomedocidadao',
    'tipo',
    'tipodocumento',
    'tipodedocumento',
    'servico',
  ]

  const matchCount = normalized.filter((t) => headerKeywords.includes(t)).length
  const firstNormalizedStation = normalizeStationCode(tokens[0] || '')
  const hasValidStation = isValidStationCode(firstNormalizedStation)

  return matchCount >= 2 && !hasValidStation
}

function splitBatchLineTokens(line: string): string[] {
  if (line.includes('\t')) {
    return line.split('\t').map((t) => t.trim())
  }
  if (line.includes(';')) {
    return line.split(';').map((t) => t.trim())
  }
  if (line.includes('|')) {
    return line.split('|').map((t) => t.trim())
  }

  const multiSpace = line.split(/\s{2,}/).map((t) => t.trim())
  if (multiSpace.length >= 4) {
    return multiSpace
  }

  return [line.trim()]
}

function parseCitizenDocument(rawDoc: string): {
  citizenDocumentType: 'rg' | 'cpf' | null
  formattedDocument: string
  rg: string | null
  cpf: string | null
  isValidDoc: boolean
  docError: string | null
} {
  const trimmed = rawDoc.trim()
  if (!trimmed) {
    return {
      citizenDocumentType: null,
      formattedDocument: '',
      rg: null,
      cpf: null,
      isValidDoc: false,
      docError: 'RG ou CPF não informado.',
    }
  }

  const hasLetterX = /[xX]/.test(trimmed)
  const cleanDigits = trimmed.replace(/\D/g, '')
  const cleanAlnum = trimmed.replace(/[^0-9xX]/g, '').toUpperCase()
  const looksLikeCpfMask = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(trimmed)

  // Detecção de CPF: formato 000.000.000-00 ou 11 dígitos numéricos sem letra X
  if (!hasLetterX && (looksLikeCpfMask || cleanDigits.length === 11)) {
    const formattedCpf = formatCpf(cleanDigits)
    if (!isValidCpf(formattedCpf)) {
      return {
        citizenDocumentType: 'cpf',
        formattedDocument: formattedCpf || trimmed,
        rg: null,
        cpf: null,
        isValidDoc: false,
        docError: 'CPF inválido (dígitos verificadores incorretos).',
      }
    }

    return {
      citizenDocumentType: 'cpf',
      formattedDocument: formattedCpf,
      rg: null,
      cpf: formattedCpf,
      isValidDoc: true,
      docError: null,
    }
  }

  // Se tiver mais de 9 caracteres alfanuméricos e não for CPF de 11 dígitos
  if (cleanAlnum.length > 9 || cleanAlnum.length === 0) {
    return {
      citizenDocumentType: null,
      formattedDocument: trimmed,
      rg: null,
      cpf: null,
      isValidDoc: false,
      docError: 'Documento inválido (informe um RG de SP ou CPF válido).',
    }
  }

  // Tratamento como RG de SP (com padding de zeros à esquerda até 9 caracteres)
  const formattedRg = padAndFormatRg(cleanAlnum, true)
  if (!isValidRgSP(formattedRg)) {
    return {
      citizenDocumentType: 'rg',
      formattedDocument: formattedRg || trimmed,
      rg: null,
      cpf: null,
      isValidDoc: false,
      docError: 'RG inválido ou dígito verificador incorreto.',
    }
  }

  return {
    citizenDocumentType: 'rg',
    formattedDocument: formattedRg,
    rg: formattedRg,
    cpf: null,
    isValidDoc: true,
    docError: null,
  }
}

export function parseBatchIirgdDemandsText(rawText: string): ParseBatchIirgdDemandsResult {
  if (!rawText || !rawText.trim()) {
    return {
      items: [],
      readyCount: 0,
      ignoredCount: 0,
      ignoredLines: [],
    }
  }

  const lines = rawText.split(/\r?\n/)
  const items: ParsedBatchIirgdDemandItem[] = []
  const ignoredLines: Array<{ lineNumber: number; line: string; reason: string }> = []
  const seenRgs = new Set<string>()
  const seenCpfs = new Set<string>()

  lines.forEach((line, index) => {
    const lineNumber = index + 1
    const trimmedLine = line.trim()

    if (!trimmedLine) {
      return
    }

    const rawTokens = splitBatchLineTokens(trimmedLine)

    if (isHeaderLine(rawTokens)) {
      ignoredLines.push({
        lineNumber,
        line: trimmedLine,
        reason: 'Linha de cabeçalho ignorada',
      })
      return
    }

    const rawStation = rawTokens[0] || ''
    const rawDoc = rawTokens[1] || ''
    const rawName = rawTokens[2] || ''
    const rawDocType = rawTokens.slice(3).join(' ').trim()

    const stationCode = normalizeStationCode(rawStation)
    const docResult = parseCitizenDocument(rawDoc)
    const citizenName = formatCitizenName(rawName).replace(/\s+/g, ' ')
    const docTypeName = rawDocType.replace(/\s+/g, ' ').trim()

    let isValid = true
    let status: BatchIirgdDemandItemStatus = 'ready'
    let errorReason: string | null = null

    if (!stationCode || !isValidStationCode(stationCode)) {
      isValid = false
      status = 'invalid_station'
      errorReason = `Código do posto inválido (${rawStation || 'vazio'}). Esperado: ${IIRGD_STATION_CODES.join(' ou ')}.`
    } else if (!docResult.isValidDoc) {
      isValid = false
      status = 'invalid_document'
      errorReason = docResult.docError || 'RG ou CPF inválido.'
    } else if (!citizenName) {
      isValid = false
      status = 'missing_name'
      errorReason = 'Nome do cidadão é obrigatório.'
    } else if (!docTypeName) {
      isValid = false
      status = 'missing_document_type'
      errorReason = 'Tipo de documento é obrigatório.'
    } else if (docResult.rg && seenRgs.has(docResult.rg)) {
      isValid = false
      status = 'duplicate_in_batch'
      errorReason = 'RG duplicado nas linhas do lote colado.'
    } else if (docResult.cpf && seenCpfs.has(docResult.cpf)) {
      isValid = false
      status = 'duplicate_in_batch'
      errorReason = 'CPF duplicado nas linhas do lote colado.'
    }

    if (isValid) {
      if (docResult.rg) seenRgs.add(docResult.rg)
      if (docResult.cpf) seenCpfs.add(docResult.cpf)
    }

    items.push({
      station_code: stationCode,
      citizenDocumentType: docResult.citizenDocumentType,
      formattedDocument: docResult.formattedDocument,
      rg: docResult.rg,
      cpf: docResult.cpf,
      name: citizenName,
      document_type_name: docTypeName,
      document_type_id: null,
      isNewDocumentType: false,
      existingCitizenId: null,
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
