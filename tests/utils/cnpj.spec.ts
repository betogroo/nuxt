import { describe, it, expect } from 'vitest'
import {
  cleanCnpjDigits,
  getCnpjRoot,
  formatCnpjRoot,
  getCnpjBranchCode,
  getCnpjEstablishmentInfo,
  isSameCnpjRoot,
  findSameRootSuppliers,
  buildCnpjRootCountMap,
} from '../../app/utils/cnpj'

describe('cnpj utilities (root and branch/headquarters detection)', () => {
  const MATRIZ_CNPJ = '08822824000159'
  const FILIAL_CNPJ = '08822824000230'
  const MASKED_MATRIZ = '08.822.824/0001-59'
  const MASKED_FILIAL = '08.822.824/0002-30'
  const OTHER_COMPANY_CNPJ = '12345678000190'

  it('cleans non-digit characters from CNPJ', () => {
    expect(cleanCnpjDigits(MASKED_MATRIZ)).toBe(MATRIZ_CNPJ)
    expect(cleanCnpjDigits(null)).toBe('')
    expect(cleanCnpjDigits(undefined)).toBe('')
  })

  it('extracts the 8-digit CNPJ root (CNPJ Básico)', () => {
    expect(getCnpjRoot(MATRIZ_CNPJ)).toBe('08822824')
    expect(getCnpjRoot(FILIAL_CNPJ)).toBe('08822824')
    expect(getCnpjRoot(MASKED_FILIAL)).toBe('08822824')
    expect(getCnpjRoot('1234567')).toBeNull()
  })

  it('formats the 8-digit CNPJ root as XX.XXX.XXX', () => {
    expect(formatCnpjRoot(MATRIZ_CNPJ)).toBe('08.822.824')
    expect(formatCnpjRoot('08822824')).toBe('08.822.824')
    expect(formatCnpjRoot('123')).toBe('-')
  })

  it('extracts the 4-digit establishment branch code', () => {
    expect(getCnpjBranchCode(MATRIZ_CNPJ)).toBe('0001')
    expect(getCnpjBranchCode(FILIAL_CNPJ)).toBe('0002')
    expect(getCnpjBranchCode(MASKED_FILIAL)).toBe('0002')
    expect(getCnpjBranchCode('08822824')).toBeNull()
  })

  it('identifies Matriz (0001) vs Filial (0002+) correctly for 08822824000159 and 08822824000230', () => {
    const matrizInfo = getCnpjEstablishmentInfo(MATRIZ_CNPJ)
    expect(matrizInfo).toEqual({
      clean: '08822824000159',
      root: '08822824',
      formattedRoot: '08.822.824',
      branchCode: '0001',
      branchNumber: 1,
      checkDigits: '59',
      isHeadquarters: true,
      isBranch: false,
      label: 'Matriz',
      badgeLabel: 'Matriz /0001',
    })

    const filialInfo = getCnpjEstablishmentInfo(FILIAL_CNPJ)
    expect(filialInfo).toEqual({
      clean: '08822824000230',
      root: '08822824',
      formattedRoot: '08.822.824',
      branchCode: '0002',
      branchNumber: 2,
      checkDigits: '30',
      isHeadquarters: false,
      isBranch: true,
      label: 'Filial 0002',
      badgeLabel: 'Filial /0002',
    })

    expect(getCnpjEstablishmentInfo('invalid')).toBeNull()
  })

  it('detects when two CNPJs belong to the same company root', () => {
    expect(isSameCnpjRoot(MATRIZ_CNPJ, FILIAL_CNPJ)).toBe(true)
    expect(isSameCnpjRoot(MASKED_MATRIZ, MASKED_FILIAL)).toBe(true)
    expect(isSameCnpjRoot(MATRIZ_CNPJ, OTHER_COMPANY_CNPJ)).toBe(false)
    expect(isSameCnpjRoot(MATRIZ_CNPJ, '')).toBe(false)
  })

  it('finds same-root sibling suppliers excluding the target supplier or exact same CNPJ', () => {
    const suppliers = [
      { id: 'sup-matriz', cnpj: MASKED_MATRIZ, company_name: 'Empresa X Matriz' },
      { id: 'sup-filial', cnpj: FILIAL_CNPJ, company_name: 'Empresa X Filial' },
      { id: 'sup-other', cnpj: OTHER_COMPANY_CNPJ, company_name: 'Outra Empresa' },
    ]

    const siblingsForMatriz = findSameRootSuppliers(MATRIZ_CNPJ, suppliers, 'sup-matriz')
    expect(siblingsForMatriz).toHaveLength(1)
    expect(siblingsForMatriz[0]?.id).toBe('sup-filial')

    const siblingsViaOptions = findSameRootSuppliers(MATRIZ_CNPJ, suppliers, {
      excludeExactCnpj: true,
    })
    expect(siblingsViaOptions).toHaveLength(1)
    expect(siblingsViaOptions[0]?.id).toBe('sup-filial')

    // Also works by root only (8 digits) when typing a new CNPJ
    const byRootOnly = findSameRootSuppliers('08.822.824', suppliers)
    expect(byRootOnly).toHaveLength(2)
  })

  it('builds a CNPJ root count map for flagging multi-establishment groups', () => {
    const suppliers = [{ cnpj: MATRIZ_CNPJ }, { cnpj: FILIAL_CNPJ }, { cnpj: OTHER_COMPANY_CNPJ }]
    const map = buildCnpjRootCountMap(suppliers)
    expect(map.get('08822824')).toHaveLength(2)
    expect(map.get('12345678')).toHaveLength(1)
  })
})
