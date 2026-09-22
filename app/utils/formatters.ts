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
