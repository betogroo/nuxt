export function formatCurrency(
  value: number | string | null | undefined,
  options?: { minimumFractionDigits?: number; maximumFractionDigits?: number; fallback?: string },
): string {
  if (value == null || value === '' || isNaN(Number(value))) {
    return options?.fallback ?? '-'
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: options?.minimumFractionDigits ?? 2,
    maximumFractionDigits: options?.maximumFractionDigits ?? 2,
  }).format(Number(value))
}

export function formatReferencePrice(value: number | string | null | undefined): string {
  return formatCurrency(value, {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  })
}

export function formatDate(
  date: string | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions,
): string {
  if (!date) return '-'
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return '-'
  return new Intl.DateTimeFormat('pt-BR', options ?? { dateStyle: 'short' }).format(d)
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '-'
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return '-'
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(d)
}

export function formatCnpj(value: string | null | undefined): string {
  if (!value) return '-'
  const v = value.replace(/\D/g, '')
  if (v.length !== 14) return value
  return `${v.slice(0, 2)}.${v.slice(2, 5)}.${v.slice(5, 8)}/${v.slice(8, 12)}-${v.slice(12)}`
}

export function slugify(text: string): string {
  return text
    .toString()
    .normalize('NFD') // remove acentos
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // espaços por hífen
    .replace(/[^\w-]+/g, '') // remove caracteres não-palavra
    .replace(/--+/g, '-') // múltiplos hifens por um só
}

export const formatDemandType = (type: string) => {
  return type === 'consumption' ? 'Consumo' : 'Permanente'
}

export const formatDemandStatus = (status: string) => {
  const map: Record<string, string> = {
    planning: 'Planejamento',
    quotation: 'Cotação',
    bidding_notice: 'Aviso de Contratação',
    dispute: 'Cadastro de Lances',
    homologation: 'Documentação',
    completed: 'Concluído',
    cancelled: 'Cancelado',
  }
  return map[status] || status
}

export const getDemandStatusColor = (status: string) => {
  const map: Record<string, string> = {
    planning: 'grey',
    quotation: 'deep-purple',
    bidding_notice: 'info',
    dispute: 'warning',
    homologation: 'primary',
    completed: 'success',
    cancelled: 'error',
  }
  return map[status] || 'grey'
}

export function formatCpf(value: string): string {
  let v = value.replace(/\D/g, '')
  if (v.length > 11) v = v.slice(0, 11)

  if (v.length <= 3) return v
  if (v.length <= 6) return `${v.slice(0, 3)}.${v.slice(3)}`
  if (v.length <= 9) return `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6)}`
  return `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6, 9)}-${v.slice(9)}`
}

export function padAndFormatRg(value: string, pad: boolean = false): string {
  let v = value.replace(/[^0-9xX]/g, '').toUpperCase()
  if (v.length > 9) v = v.slice(0, 9)

  if (pad && v.length > 0) {
    v = v.padStart(9, '0')
  }

  if (v.length === 9) {
    return `${v.slice(0, 8)}-${v.slice(8)}`
  }

  // se ainda estiver digitando e nao pediu padding (pad=false)
  if (v.length > 8) {
    return `${v.slice(0, 8)}-${v.slice(8)}`
  }

  return v
}

export function isValidRgSP(value: string | null | undefined): boolean {
  if (!value) return false
  const v = value.replace(/[^0-9xX]/g, '').toUpperCase()

  if (v.length !== 9) return false

  const base = v.slice(0, 8)
  const checkDigit = v.charAt(8)

  const weights = [2, 3, 4, 5, 6, 7, 8, 9]
  let sum = 0

  for (let i = 0; i < 8; i++) {
    sum += parseInt(base.charAt(i), 10) * weights[i]
  }

  const mod = sum % 11
  let expectedDigit = (11 - mod).toString()

  if (expectedDigit === '10') {
    expectedDigit = 'X'
  } else if (expectedDigit === '11') {
    expectedDigit = '0'
  }

  return checkDigit === expectedDigit
}

export function isValidCpf(cpf: string): boolean {
  if (!cpf) return false
  const cleanCpf = cpf.replace(/\D/g, '')
  if (cleanCpf.length !== 11) return false

  if (/^(\d)\1+$/.test(cleanCpf)) return false

  let sum = 0
  let rest
  for (let i = 1; i <= 9; i++) sum = sum + parseInt(cleanCpf.substring(i - 1, i)) * (11 - i)
  rest = (sum * 10) % 11
  if (rest === 10 || rest === 11) rest = 0
  if (rest !== parseInt(cleanCpf.substring(9, 10))) return false

  sum = 0
  for (let i = 1; i <= 10; i++) sum = sum + parseInt(cleanCpf.substring(i - 1, i)) * (12 - i)
  rest = (sum * 10) % 11
  if (rest === 10 || rest === 11) rest = 0
  if (rest !== parseInt(cleanCpf.substring(10, 11))) return false

  return true
}
