import { LIQUIDATION_NUMBER_REGEX } from '~/schemas/forms/commitment'

/**
 * Normaliza um token individual para o formato SIAFEM: YYYYNL00000.
 * Suporta:
 * - Apenas dígitos: "45" ou "00045" -> "2026NL00045"
 * - Prefixado por NL: "NL45" ou "NL00045" -> "2026NL00045"
 * - Já completo: "2026NL00045" -> "2026NL00045"
 */
export function normalizeNlToken(raw: string | number, year: string | number = '2026'): string {
  const cleanYear = String(year).trim().slice(0, 4) || '2026'
  const trimmed = String(raw).trim().toUpperCase()
  if (!trimmed) return ''

  // Caso já esteja no formato completo (ex: 2026NL00045)
  if (LIQUIDATION_NUMBER_REGEX.test(trimmed)) {
    return trimmed
  }

  // Caso contenha prefixo NL sem o ano (ex: NL00045 ou NL45)
  if (/^NL\d+$/i.test(trimmed)) {
    const digits = trimmed.replace(/\D/g, '')
    const padded = digits.slice(-5).padStart(5, '0')
    return `${cleanYear}NL${padded}`
  }

  // Caso seja apenas dígitos (ex: 45 ou 00045)
  if (/^\d+$/.test(trimmed)) {
    const padded = trimmed.slice(-5).padStart(5, '0')
    return `${cleanYear}NL${padded}`
  }

  // Caso tenha o ano no início sem o NL (ex: 202600045)
  if (/^\d{9}$/.test(trimmed)) {
    const yr = trimmed.slice(0, 4)
    const digits = trimmed.slice(4)
    return `${yr}NL${digits}`
  }

  return trimmed
}

/**
 * Interpreta texto livre contendo números de NLs separados por vírgula, ponto e vírgula,
 * espaços, tabulações ou quebras de linha, com suporte a faixas (ex: 45-46, 78-80 ou 45..46).
 */
export function parseLiquidationInput(text: string, year: string | number = '2026'): string[] {
  if (!text || typeof text !== 'string') return []

  const cleanYear = String(year).trim().slice(0, 4) || '2026'
  // Divide por vírgula, ponto e vírgula, espaços, tabs ou quebras de linha
  const rawTokens = text
    .split(/[\s,;\n\r\t]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0)

  const results: string[] = []

  for (const token of rawTokens) {
    // Verifica se é uma faixa: ex: 45-46, 00045-00046, 78-80 ou 78..80
    const rangeMatch = token.match(/^(\d+)(?:-|\.\.)(\d+)$/)
    if (rangeMatch) {
      const startNum = parseInt(rangeMatch[1], 10)
      const endNum = parseInt(rangeMatch[2], 10)

      if (!isNaN(startNum) && !isNaN(endNum) && startNum <= endNum && endNum - startNum <= 200) {
        for (let i = startNum; i <= endNum; i++) {
          const formatted = normalizeNlToken(i, cleanYear)
          if (formatted && !results.includes(formatted)) {
            results.push(formatted)
          }
        }
        continue
      }
    }

    const normalized = normalizeNlToken(token, cleanYear)
    if (normalized && !results.includes(normalized)) {
      results.push(normalized)
    }
  }

  return results
}

/**
 * Gera sequências de números de NLs contínuos.
 */
export function generateSequenceTokens(
  startNumber: number,
  count: number,
  year: string | number = '2026',
): string[] {
  const cleanYear = String(year).trim().slice(0, 4) || '2026'
  const list: string[] = []
  if (isNaN(startNumber) || isNaN(count) || count <= 0) return list

  const safeCount = Math.min(count, 50)
  for (let i = 0; i < safeCount; i++) {
    const num = startNumber + i
    list.push(normalizeNlToken(num, cleanYear))
  }
  return list
}

/**
 * Calcula o valor sugerido para a Nota de Liquidação (NL) de Retenção de IR.
 * Fórmula: Math.round(totalAmount * (ratePercent / 100) * 100) / 100
 */
export function calculateSuggestedIrRetention(
  totalAmount: number,
  ratePercent: number = 1.2,
): number {
  if (!Number.isFinite(totalAmount) || totalAmount <= 0) return 0
  if (!Number.isFinite(ratePercent) || ratePercent <= 0) return 0

  const calculated = totalAmount * (ratePercent / 100)
  return Math.round(calculated * 100) / 100
}
