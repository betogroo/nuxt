export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
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
