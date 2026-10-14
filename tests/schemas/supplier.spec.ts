import { describe, it, expect } from 'vitest'
import { supplierFormSchema } from '~/schemas/forms/supplier'

describe('supplierFormSchema validation', () => {
  const validSupplierBase = {
    company_name: 'Fornecedor Exemplo LTDA',
    email: 'contato@fornecedor.com.br',
    responsible_name: 'Maria Oliveira',
    cell_phone: '11999999999',
    landline: null,
    address: 'Av Paulista, 1000',
    has_bb_account: 'Sim',
    is_simples_optant: true,
    is_active: true,
  }

  it('deve aceitar fornecedor com CNPJ válido e formatado', () => {
    const result = supplierFormSchema.safeParse({
      ...validSupplierBase,
      cnpj: '00.000.000/0001-91',
    })

    expect(result.success).toBe(true)
  })

  it('deve aceitar fornecedor com CNPJ válido sem pontuação', () => {
    const result = supplierFormSchema.safeParse({
      ...validSupplierBase,
      cnpj: '33000167000101',
    })

    expect(result.success).toBe(true)
  })

  it('deve rejeitar fornecedor com CNPJ que possui dígitos verificadores inválidos', () => {
    const result = supplierFormSchema.safeParse({
      ...validSupplierBase,
      cnpj: '12345678000199', // 12.345.678/0001-95 seria o correto
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      const cnpjError = result.error.issues.find((i) => i.path.includes('cnpj'))
      expect(cnpjError).toBeDefined()
      expect(cnpjError?.message).toBe('O CNPJ informado é inválido.')
    }
  })

  it('deve rejeitar fornecedor com CNPJ de dígitos repetidos', () => {
    const result = supplierFormSchema.safeParse({
      ...validSupplierBase,
      cnpj: '11.111.111/1111-11',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      const cnpjError = result.error.issues.find((i) => i.path.includes('cnpj'))
      expect(cnpjError).toBeDefined()
      expect(cnpjError?.message).toBe('O CNPJ informado é inválido.')
    }
  })

  it('deve rejeitar fornecedor sem CNPJ ou com string vazia', () => {
    const result = supplierFormSchema.safeParse({
      ...validSupplierBase,
      cnpj: '',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      const cnpjError = result.error.issues.find((i) => i.path.includes('cnpj'))
      expect(cnpjError).toBeDefined()
    }
  })

  it('deve aceitar fornecedor sem e-mail (vazio, null ou omitido)', () => {
    const withoutEmail = { ...validSupplierBase, cnpj: '00.000.000/0001-91' }
    delete (withoutEmail as Record<string, unknown>).email

    expect(supplierFormSchema.safeParse(withoutEmail).success).toBe(true)

    expect(
      supplierFormSchema.safeParse({
        ...validSupplierBase,
        cnpj: '00.000.000/0001-91',
        email: '',
      }).success,
    ).toBe(true)

    expect(
      supplierFormSchema.safeParse({
        ...validSupplierBase,
        cnpj: '00.000.000/0001-91',
        email: null,
      }).success,
    ).toBe(true)
  })

  it('deve rejeitar fornecedor com formato de e-mail inválido', () => {
    const result = supplierFormSchema.safeParse({
      ...validSupplierBase,
      cnpj: '00.000.000/0001-91',
      email: 'email-invalido-sem-arroba',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      const emailError = result.error.issues.find((i) => i.path.includes('email'))
      expect(emailError).toBeDefined()
      expect(emailError?.message).toBe('Formato de e-mail inválido.')
    }
  })
})
