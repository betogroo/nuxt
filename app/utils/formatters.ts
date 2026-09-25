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
    dispute: 'Disputa',
    homologation: 'Homologação',
    completed: 'Concluído',
    cancelled: 'Cancelado',
  }
  return map[status] || status
}

export const getDemandStatusColor = (status: string) => {
  const map: Record<string, string> = {
    planning: 'grey',
    bidding_notice: 'info',
    dispute: 'warning',
    homologation: 'primary',
    completed: 'success',
    cancelled: 'error',
  }
  return map[status] || 'grey'
}
