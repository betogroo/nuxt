/**
 * Utilitários para análise de CNPJ, identificação de faixa empresarial (Raiz de 8 dígitos)
 * e distinção entre Matriz (/0001) e Filiais (/0002+).
 */

export interface CnpjEstablishmentInfo {
  clean: string
  root: string
  formattedRoot: string
  branchCode: string
  branchNumber: number
  checkDigits: string
  isHeadquarters: boolean
  isBranch: boolean
  label: string
  badgeLabel: string
}

/**
 * Remove caracteres não numéricos de um CNPJ.
 */
export function cleanCnpjDigits(value: string | null | undefined): string {
  if (!value) return ''
  return value.replace(/\D/g, '')
}

/**
 * Extrai a raiz de 8 dígitos (CNPJ Básico) que identifica a empresa/grupo empresarial.
 * Ex: "08.822.824/0001-59" -> "08822824"
 */
export function getCnpjRoot(value: string | null | undefined): string | null {
  const clean = cleanCnpjDigits(value)
  if (clean.length < 8) return null
  return clean.slice(0, 8)
}

/**
 * Formata a raiz de 8 dígitos do CNPJ no padrão "XX.XXX.XXX".
 */
export function formatCnpjRoot(value: string | null | undefined): string {
  const root = getCnpjRoot(value)
  if (!root) return '-'
  return `${root.slice(0, 2)}.${root.slice(2, 5)}.${root.slice(5, 8)}`
}

/**
 * Extrai os 4 dígitos de ordem do estabelecimento (após a barra).
 * Ex: "08.822.824/0002-30" -> "0002"
 */
export function getCnpjBranchCode(value: string | null | undefined): string | null {
  const clean = cleanCnpjDigits(value)
  if (clean.length < 12) return null
  return clean.slice(8, 12)
}

/**
 * Retorna informações detalhadas sobre o estabelecimento do CNPJ (Matriz vs Filial).
 */
export function getCnpjEstablishmentInfo(
  value: string | null | undefined,
): CnpjEstablishmentInfo | null {
  const clean = cleanCnpjDigits(value)
  if (clean.length < 12) return null

  const root = clean.slice(0, 8)
  const formattedRoot = `${root.slice(0, 2)}.${root.slice(2, 5)}.${root.slice(5, 8)}`
  const branchCode = clean.slice(8, 12)
  const branchNumber = Number.parseInt(branchCode, 10) || 1
  const checkDigits = clean.slice(12, 14)
  const isHeadquarters = branchCode === '0001'
  const isBranch = !isHeadquarters

  return {
    clean,
    root,
    formattedRoot,
    branchCode,
    branchNumber,
    checkDigits,
    isHeadquarters,
    isBranch,
    label: isHeadquarters ? 'Matriz' : `Filial ${branchCode}`,
    badgeLabel: isHeadquarters ? 'Matriz /0001' : `Filial /${branchCode}`,
  }
}

/**
 * Verifica se dois CNPJs pertencem à mesma empresa (mesma raiz de 8 dígitos).
 */
export function isSameCnpjRoot(
  cnpjA: string | null | undefined,
  cnpjB: string | null | undefined,
): boolean {
  const rootA = getCnpjRoot(cnpjA)
  const rootB = getCnpjRoot(cnpjB)
  if (!rootA || !rootB) return false
  return rootA === rootB
}

/**
 * Filtra uma lista de fornecedores retornando todos os que compartilham a mesma raiz de CNPJ (8 dígitos).
 * Ordena colocando a Matriz (/0001) primeiro, seguida pelas filiais em ordem crescente.
 */
export function findSameRootSuppliers<T extends { id?: string; cnpj: string | null | undefined }>(
  targetCnpj: string | null | undefined,
  suppliers: readonly T[],
  optionsOrExcludeId?: { excludeId?: string | null; excludeExactCnpj?: boolean } | string | null,
): T[] {
  const targetRoot = getCnpjRoot(targetCnpj)
  if (!targetRoot || !suppliers?.length) return []

  const options =
    typeof optionsOrExcludeId === 'string'
      ? { excludeId: optionsOrExcludeId }
      : optionsOrExcludeId || {}

  const targetClean = cleanCnpjDigits(targetCnpj)

  return suppliers
    .filter((s) => {
      if (options.excludeId && s.id === options.excludeId) return false
      const sRoot = getCnpjRoot(s.cnpj)
      if (sRoot !== targetRoot) return false
      if (options.excludeExactCnpj && targetClean.length === 14) {
        if (cleanCnpjDigits(s.cnpj) === targetClean) return false
      }
      return true
    })
    .sort((a, b) => {
      const branchA = getCnpjBranchCode(a.cnpj) || '9999'
      const branchB = getCnpjBranchCode(b.cnpj) || '9999'
      return branchA.localeCompare(branchB)
    })
}

/**
 * Agrupa fornecedores pela raiz de 8 dígitos do CNPJ.
 */
export function buildCnpjRootCountMap<T extends { cnpj: string | null | undefined }>(
  suppliers: readonly T[],
): Map<string, T[]> {
  const map = new Map<string, T[]>()
  if (!suppliers?.length) return map

  for (const supplier of suppliers) {
    const root = getCnpjRoot(supplier.cnpj)
    if (!root) continue
    const list = map.get(root)
    if (list) {
      list.push(supplier)
    } else {
      map.set(root, [supplier])
    }
  }

  return map
}
