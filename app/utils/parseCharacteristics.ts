export interface ParsedCharacteristic {
  key: string
  value: string
  originalLine: string
  lineNumber: number
}

export interface ParseCharacteristicsResult {
  items: ParsedCharacteristic[]
  ignoredLines: Array<{ lineNumber: number; line: string; reason: string }>
}

/**
 * Faz o parsing de um bloco de texto com linhas no formato "Chave: Valor".
 * Remove marcadores comuns (- , * , • , 1. ) e ignora linhas vazias.
 * Deduplica chaves duplicadas no lote (mantendo a última ocorrência).
 */
export function parseCharacteristicsText(text: string): ParseCharacteristicsResult {
  if (!text || typeof text !== 'string') {
    return { items: [], ignoredLines: [] }
  }

  const lines = text.split(/\r?\n/)
  const rawItems: ParsedCharacteristic[] = []
  const ignoredLines: Array<{ lineNumber: number; line: string; reason: string }> = []

  lines.forEach((rawLine, index) => {
    const lineNumber = index + 1
    const trimmed = rawLine.trim()

    // Ignora linhas em branco
    if (!trimmed) return

    // Remove marcadores iniciais de tópicos como -, *, •, ou numeração como 1., 2)
    const cleanedLine = trimmed.replace(/^([-*•]|\d+[.)])\s*/, '').trim()

    const colonIndex = cleanedLine.indexOf(':')
    if (colonIndex === -1) {
      ignoredLines.push({
        lineNumber,
        line: trimmed,
        reason: 'Não contém o separador ":" entre chave e valor',
      })
      return
    }

    const key = cleanedLine.slice(0, colonIndex).trim()
    const value = cleanedLine.slice(colonIndex + 1).trim()

    if (!key) {
      ignoredLines.push({
        lineNumber,
        line: trimmed,
        reason: 'Nome da chave está vazio antes do ":"',
      })
      return
    }

    if (!value) {
      ignoredLines.push({
        lineNumber,
        line: trimmed,
        reason: 'Valor da característica está vazio após o ":"',
      })
      return
    }

    rawItems.push({
      key,
      value,
      originalLine: trimmed,
      lineNumber,
    })
  })

  // Deduplicação (chave insensível a maiúsculas/minúsculas): mantém a última ocorrência informada
  const uniqueMap = new Map<string, ParsedCharacteristic>()
  for (const item of rawItems) {
    uniqueMap.set(item.key.toLowerCase(), item)
  }

  return {
    items: Array.from(uniqueMap.values()),
    ignoredLines,
  }
}
