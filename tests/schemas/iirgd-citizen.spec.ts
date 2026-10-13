import { describe, it, expect } from 'vitest'
import { iirgdCitizenFormSchema } from '../../app/schemas/forms/iirgd-citizen'

const VALID_RG = '72894286-0'
const VALID_CPF = '123.456.789-09'

const messagesFor = (input: unknown, path: string): string[] => {
  const result = iirgdCitizenFormSchema.safeParse(input)
  if (result.success) return []
  return result.error.issues.filter((i) => i.path.join('.') === path).map((i) => i.message)
}

describe('iirgdCitizenFormSchema', () => {
  describe('Cidadão de São Paulo (Padrão)', () => {
    it('aceita cidadão válido com RG SP e sem CPF', () => {
      const result = iirgdCitizenFormSchema.safeParse({
        name: 'Maria da Silva',
        rg: VALID_RG,
        cpf: '',
        is_other_state: false,
      })
      expect(result.success).toBe(true)
    })

    it('aceita cidadão válido com RG SP e CPF', () => {
      const result = iirgdCitizenFormSchema.safeParse({
        name: 'Maria da Silva',
        rg: VALID_RG,
        cpf: VALID_CPF,
        is_other_state: false,
      })
      expect(result.success).toBe(true)
    })

    it('exige RG se não for de outro estado', () => {
      const msgs = messagesFor(
        {
          name: 'Maria da Silva',
          rg: '',
          cpf: '',
          is_other_state: false,
        },
        'rg',
      )
      expect(msgs).toContain('O RG é obrigatório.')
    })

    it('rejeita RG SP com dígito verificador inválido', () => {
      const msgs = messagesFor(
        {
          name: 'Maria da Silva',
          rg: '11111111-1',
          cpf: '',
          is_other_state: false,
        },
        'rg',
      )
      expect(msgs).toContain('O RG informado é inválido ou seu dígito verificador não confere.')
    })

    it('exige nome preenchido', () => {
      const msgs = messagesFor(
        {
          name: '   ',
          rg: VALID_RG,
          cpf: '',
        },
        'name',
      )
      expect(msgs).toContain('O Nome é obrigatório.')
    })
  })

  describe('Cidadão de Outro Estado (is_other_state = true)', () => {
    it('aceita cidadão com documento de outro estado sem CPF', () => {
      const result = iirgdCitizenFormSchema.safeParse({
        name: 'Carlos Bahia',
        is_other_state: true,
        other_document: '0561015112-BA',
        rg: '',
        cpf: '',
      })
      expect(result.success).toBe(true)
    })

    it('aceita cidadão com apenas CPF quando is_other_state for true', () => {
      const result = iirgdCitizenFormSchema.safeParse({
        name: 'Carlos Bahia',
        is_other_state: true,
        other_document: '',
        rg: '',
        cpf: VALID_CPF,
      })
      expect(result.success).toBe(true)
    })

    it('aceita cidadão com documento de outro estado e CPF', () => {
      const result = iirgdCitizenFormSchema.safeParse({
        name: 'Carlos Bahia',
        is_other_state: true,
        other_document: 'MG-12.345.678',
        rg: '',
        cpf: VALID_CPF,
      })
      expect(result.success).toBe(true)
    })

    it('exige documento de outro estado ou CPF se is_other_state for true e ambos estiverem vazios', () => {
      const msgs = messagesFor(
        {
          name: 'Carlos Bahia',
          is_other_state: true,
          other_document: '',
          rg: '',
          cpf: '',
        },
        'other_document',
      )
      expect(msgs).toContain('Informe o Documento de Outro Estado ou o CPF.')
    })

    it('rejeita caracteres especiais inválidos no documento de outro estado', () => {
      const msgs = messagesFor(
        {
          name: 'Carlos Bahia',
          is_other_state: true,
          other_document: 'DOC*&!@#$',
          rg: '',
          cpf: '',
        },
        'other_document',
      )
      expect(msgs).toContain('O documento contém caracteres inválidos.')
    })
  })
})
