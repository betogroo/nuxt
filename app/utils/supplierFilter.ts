import { formatCnpj } from './formatters'
import type { SupplierRow } from '~/composables/useSuppliers'

/**
 * Filtro customizado para autocompletes de seleção de fornecedores.
 * Permite buscar tanto pela Razão Social (insensível a acentos e maiúsculas/minúsculas)
 * quanto pelo CNPJ (com formatação, sem formatação ou trechos numéricos).
 */
export function filterSupplierOption(_value: unknown, query: string, item?: unknown): boolean {
  if (!query) return true
  const queryStr = String(query).trim()
  if (!queryStr) return true

  let supplier: SupplierRow | null = null
  if (item && typeof item === 'object') {
    if ('raw' in item && item.raw && typeof item.raw === 'object') {
      supplier = item.raw as SupplierRow
    } else {
      supplier = item as SupplierRow
    }
  }

  if (!supplier) return false

  const cleanQuery = queryStr.toLowerCase()
  const normalizedQuery = cleanQuery.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const queryDigits = cleanQuery.replace(/\D/g, '')

  // 1. Busca por Razão Social (insensível a maiúsculas e acentos)
  const companyName = String(supplier.company_name || '').toLowerCase()
  const normalizedCompanyName = companyName.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  if (normalizedCompanyName.includes(normalizedQuery)) {
    return true
  }

  // 2. Busca por CNPJ
  const cnpj = String(supplier.cnpj || '')
  const cnpjDigits = cnpj.replace(/\D/g, '')

  // Correspondência textual direta na string original do CNPJ
  if (cnpj.toLowerCase().includes(cleanQuery)) {
    return true
  }

  // Correspondência na versão formatada do CNPJ (ex: 12.345.678/0001-90)
  const formattedCnpj = formatCnpj(cnpj).toLowerCase()
  if (formattedCnpj.includes(cleanQuery)) {
    return true
  }

  // Se o usuário digitou dígitos, compara contra os números limpos do CNPJ
  if (queryDigits.length > 0 && cnpjDigits.includes(queryDigits)) {
    return true
  }

  return false
}
