import { describe, it, expect } from 'vitest'
import { filterSupplierOption } from '../../app/utils/supplierFilter'
import type { SupplierRow } from '../../app/composables/useSuppliers'

describe('supplierFilter utility', () => {
  const sampleSupplier: SupplierRow = {
    id: 'supp-1',
    company_name: 'Comércio e Indústria Eletrônica Silva Ltda',
    cnpj: '12345678000199',
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    email: 'contato@silva.com',
    phone: null,
    responsible_name: 'João Silva',
  }

  const vuetifyWrapperItem = {
    raw: sampleSupplier,
    title: sampleSupplier.company_name,
    value: sampleSupplier.id,
  }

  describe('Busca por Razão Social', () => {
    it('retorna true para busca exata pelo nome', () => {
      expect(
        filterSupplierOption(
          null,
          'Comércio e Indústria Eletrônica Silva Ltda',
          vuetifyWrapperItem,
        ),
      ).toBe(true)
    })

    it('retorna true para busca parcial', () => {
      expect(filterSupplierOption(null, 'Silva', vuetifyWrapperItem)).toBe(true)
      expect(filterSupplierOption(null, 'indústria', vuetifyWrapperItem)).toBe(true)
    })

    it('retorna true ignorando maiúsculas e minúsculas', () => {
      expect(filterSupplierOption(null, 'comércio', vuetifyWrapperItem)).toBe(true)
      expect(filterSupplierOption(null, 'SILVA', vuetifyWrapperItem)).toBe(true)
    })

    it('retorna true ignorando acentos (ex: comercio encontra Comércio)', () => {
      expect(filterSupplierOption(null, 'comercio', vuetifyWrapperItem)).toBe(true)
      expect(filterSupplierOption(null, 'industria', vuetifyWrapperItem)).toBe(true)
      expect(filterSupplierOption(null, 'eletronica', vuetifyWrapperItem)).toBe(true)
    })
  })

  describe('Busca por CNPJ', () => {
    it('retorna true para CNPJ completo apenas com números', () => {
      expect(filterSupplierOption(null, '12345678000199', vuetifyWrapperItem)).toBe(true)
    })

    it('retorna true para CNPJ formatado completo', () => {
      expect(filterSupplierOption(null, '12.345.678/0001-99', vuetifyWrapperItem)).toBe(true)
    })

    it('retorna true para trechos do CNPJ apenas com dígitos', () => {
      expect(filterSupplierOption(null, '12345', vuetifyWrapperItem)).toBe(true)
      expect(filterSupplierOption(null, '000199', vuetifyWrapperItem)).toBe(true)
    })

    it('retorna true para trechos parciais formatados do CNPJ', () => {
      expect(filterSupplierOption(null, '12.345', vuetifyWrapperItem)).toBe(true)
      expect(filterSupplierOption(null, '/0001', vuetifyWrapperItem)).toBe(true)
    })
  })

  describe('Casos limites e robustez', () => {
    it('retorna true se a query estiver vazia ou contiver apenas espaços', () => {
      expect(filterSupplierOption(null, '', vuetifyWrapperItem)).toBe(true)
      expect(filterSupplierOption(null, '   ', vuetifyWrapperItem)).toBe(true)
    })

    it('retorna false quando a query não coincidir nem com o nome nem com o CNPJ', () => {
      expect(filterSupplierOption(null, 'Papelaria XYZ', vuetifyWrapperItem)).toBe(false)
      expect(filterSupplierOption(null, '99999999999999', vuetifyWrapperItem)).toBe(false)
    })

    it('suporta item passado diretamente sem o wrapper raw do Vuetify', () => {
      expect(filterSupplierOption(null, 'Silva', sampleSupplier)).toBe(true)
      expect(filterSupplierOption(null, '12345678000199', sampleSupplier)).toBe(true)
    })

    it('lida com fornecedor sem CNPJ ou nome nulo com segurança', () => {
      const minimalSupplier = {
        id: 'supp-2',
        company_name: '',
        cnpj: null,
      } as unknown as SupplierRow
      expect(filterSupplierOption(null, 'teste', minimalSupplier)).toBe(false)
    })
  })
})
