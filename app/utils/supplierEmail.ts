/**
 * Utilitários para tratamento, validação e formatação de e-mails de fornecedores.
 * Suporta múltiplos e-mails separados por vírgula, ponto e vírgula, espaço ou quebra de linha.
 */

// Regex para validação de formato de e-mail compatível com o padrão padrão HTML5/RFC 5322 simplificado
const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/

/**
 * Valida se uma string é um único e-mail válido.
 */
export function isValidEmail(email: string | null | undefined): boolean {
  if (!email) return false
  const trimmed = email.trim()
  if (!trimmed || trimmed.length > 254) return false
  return EMAIL_REGEX.test(trimmed)
}

/**
 * Converte qualquer texto de entrada (separado por vírgulas, ponto e vírgulas, espaços ou quebras de linha)
 * ou um array em uma lista limpa e deduplicada de e-mails em minúsculas.
 */
export function parseSupplierEmails(value: unknown): string[] {
  if (!value) return []

  let rawList: string[] = []

  if (Array.isArray(value)) {
    rawList = value.map((v) => (typeof v === 'string' ? v : String(v)))
  } else if (typeof value === 'string') {
    // Quebra por vírgula, ponto e vírgula, quebra de linha ou espaço em branco múltiplo
    rawList = value.split(/[\s,;]+/)
  }

  const seen = new Set<string>()
  const result: string[] = []

  for (const item of rawList) {
    const clean = item.trim().toLowerCase()
    if (clean && !seen.has(clean)) {
      seen.add(clean)
      result.push(clean)
    }
  }

  return result
}

/**
 * Valida uma lista ou string contendo e-mails de fornecedores.
 * Retorna os e-mails válidos, os inválidos e o status geral.
 */
export function validateSupplierEmails(value: unknown): {
  isValid: boolean
  validEmails: string[]
  invalidEmails: string[]
} {
  const emails = parseSupplierEmails(value)
  if (emails.length === 0) {
    return { isValid: true, validEmails: [], invalidEmails: [] }
  }

  const validEmails: string[] = []
  const invalidEmails: string[] = []

  for (const email of emails) {
    if (isValidEmail(email)) {
      validEmails.push(email)
    } else {
      invalidEmails.push(email)
    }
  }

  return {
    isValid: invalidEmails.length === 0,
    validEmails,
    invalidEmails,
  }
}

/**
 * Formata um array de e-mails ou string para armazenamento padronizado no banco de dados.
 * Separa os e-mails por vírgula e espaço (ex: "contato@empresa.com, financeiro@empresa.com").
 * Retorna null se nenhum e-mail válido for fornecido.
 */
export function formatSupplierEmails(value: unknown): string | null {
  const { validEmails } = validateSupplierEmails(value)
  if (validEmails.length === 0) return null
  return validEmails.join(', ')
}

/**
 * Retorna o primeiro e-mail da lista (útil para locais onde apenas um e-mail é exibido).
 */
export function getFirstSupplierEmail(value: unknown): string | null {
  const emails = parseSupplierEmails(value)
  return emails.length > 0 ? emails[0] : null
}

/**
 * Gera uma string com múltiplos destinatários formatada para links mailto: (RFC 6068).
 * Separa os e-mails por vírgula (sem espaço) para o cabeçalho "to".
 */
export function formatMailtoRecipients(value: unknown): string {
  const { validEmails } = validateSupplierEmails(value)
  return validEmails.join(',')
}
