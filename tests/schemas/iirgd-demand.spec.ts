import { describe, it, expect } from 'vitest'
import {
  iirgdDemandFormSchema,
  isAntecedentesDocumentType,
} from '../../app/schemas/forms/iirgd-demand'

const VALID_RG = '72894286-0'
const VALID_CPF = '123.456.789-09'

const base = {
  station_code: '1342-5',
  rg: VALID_RG,
  cpf: '',
  name: 'Maria da Silva',
  document_type_id: 'eb7dbbb9-f018-4a57-ab66-b5ce53d39db7',
  document_type_name: 'Primeira Via',
  observation: '',
}

const messagesFor = (input: unknown, path: string): string[] => {
  const result = iirgdDemandFormSchema.safeParse(input)
  if (result.success) return []
  return result.error.issues.filter((i) => i.path.join('.') === path).map((i) => i.message)
}

describe('isAntecedentesDocumentType', () => {
  it('retorna true para tipos de antecedentes com variações de caixa e acentuação', () => {
    expect(isAntecedentesDocumentType('Antecedentes Numeral')).toBe(true)
    expect(isAntecedentesDocumentType('Antecedentes Nominal')).toBe(true)
    expect(isAntecedentesDocumentType('antecedentes')).toBe(true)
    expect(isAntecedentesDocumentType('Atestado de Antecedentes')).toBe(true)
  })

  it('retorna false para tipos regulares ou nulos', () => {
    expect(isAntecedentesDocumentType('Primeira Via')).toBe(false)
    expect(isAntecedentesDocumentType('Segunda Via CIN')).toBe(false)
    expect(isAntecedentesDocumentType(null)).toBe(false)
    expect(isAntecedentesDocumentType(undefined)).toBe(false)
    expect(isAntecedentesDocumentType('')).toBe(false)
  })
})

describe('iirgdDemandFormSchema', () => {
  describe('Documentos Padrão (Não-Antecedentes, SP)', () => {
    it('aceita um formulário válido com RG e CPF vazio', () => {
      expect(iirgdDemandFormSchema.safeParse(base).success).toBe(true)
    })

    it('aceita um formulário válido com CPF e RG preenchidos', () => {
      const result = iirgdDemandFormSchema.safeParse({ ...base, cpf: VALID_CPF })
      expect(result.success).toBe(true)
    })

    it('exige o código do posto', () => {
      expect(messagesFor({ ...base, station_code: undefined }, 'station_code')).toEqual([
        'O Código do Posto é obrigatório.',
      ])
    })

    it('rejeita código de posto fora da lista', () => {
      expect(messagesFor({ ...base, station_code: '0000-0' }, 'station_code')).toHaveLength(1)
    })

    it('exige o nome e remove espaços nas bordas', () => {
      expect(messagesFor({ ...base, name: '   ' }, 'name')).toEqual(['O Nome é obrigatório.'])

      const result = iirgdDemandFormSchema.safeParse({ ...base, name: '  Maria  ' })
      expect(result.success && result.data.name).toBe('Maria')
    })

    it('exige RG quando não for antecedentes nem outro estado (mesmo com CPF preenchido)', () => {
      expect(messagesFor({ ...base, rg: '', cpf: VALID_CPF }, 'rg')).toEqual([
        'O RG é obrigatório.',
      ])
    })

    it('rejeita RG com dígito verificador inválido', () => {
      expect(messagesFor({ ...base, rg: '72894286-1' }, 'rg')).toEqual([
        'O RG informado é inválido ou seu dígito verificador não confere.',
      ])
    })

    it('rejeita CPF inválido se preenchido', () => {
      expect(messagesFor({ ...base, cpf: '123.456.789-00' }, 'cpf')).toEqual([
        'O CPF informado é inválido.',
      ])
    })
  })

  describe('Documentos de Outro Estado (is_other_state = true)', () => {
    const otherStateBase = {
      ...base,
      is_other_state: true,
      rg: '',
      cpf: '',
      other_document: '0561015112-BA',
    }

    it('aceita documento de outro estado sem CPF e sem RG de SP', () => {
      const result = iirgdDemandFormSchema.safeParse(otherStateBase)
      expect(result.success).toBe(true)
    })

    it('aceita documento de outro estado alfanumérico com CPF preenchido', () => {
      const result = iirgdDemandFormSchema.safeParse({
        ...otherStateBase,
        other_document: 'MG-12.345.678',
        cpf: VALID_CPF,
      })
      expect(result.success).toBe(true)
    })

    it('aceita cidadão de outro estado apenas com CPF (sem outro documento)', () => {
      const result = iirgdDemandFormSchema.safeParse({
        ...otherStateBase,
        other_document: '',
        cpf: VALID_CPF,
      })
      expect(result.success).toBe(true)
    })

    it('rejeita se outro estado for marcado mas nem outro documento nem CPF forem informados', () => {
      const result = iirgdDemandFormSchema.safeParse({
        ...otherStateBase,
        other_document: '',
        cpf: '',
      })
      expect(result.success).toBe(false)
      expect(
        messagesFor({ ...otherStateBase, other_document: '', cpf: '' }, 'other_document'),
      ).toEqual(['Informe o Documento de Outro Estado ou o CPF.'])
    })

    it('rejeita caracteres inválidos em other_document', () => {
      const result = iirgdDemandFormSchema.safeParse({
        ...otherStateBase,
        other_document: 'DOC#@!*&',
      })
      expect(result.success).toBe(false)
      expect(
        messagesFor({ ...otherStateBase, other_document: 'DOC#@!*&' }, 'other_document'),
      ).toEqual(['O documento contém caracteres inválidos.'])
    })
  })

  describe('Documentos do tipo Antecedentes', () => {
    const antecedentesBase = {
      ...base,
      document_type_id: 'doc-ant-1',
      document_type_name: 'Antecedentes Numeral',
    }

    it('aceita antecedentes com apenas RG preenchido', () => {
      const result = iirgdDemandFormSchema.safeParse({
        ...antecedentesBase,
        rg: VALID_RG,
        cpf: '',
      })
      expect(result.success).toBe(true)
    })

    it('aceita antecedentes com apenas CPF preenchido', () => {
      const result = iirgdDemandFormSchema.safeParse({
        ...antecedentesBase,
        rg: '',
        cpf: VALID_CPF,
      })
      expect(result.success).toBe(true)
    })

    it('aceita antecedentes com ambos RG e CPF preenchidos', () => {
      const result = iirgdDemandFormSchema.safeParse({
        ...antecedentesBase,
        rg: VALID_RG,
        cpf: VALID_CPF,
      })
      expect(result.success).toBe(true)
    })

    it('rejeita antecedentes se nem RG nem CPF forem informados', () => {
      const result = iirgdDemandFormSchema.safeParse({
        ...antecedentesBase,
        rg: '',
        cpf: '',
      })
      expect(result.success).toBe(false)
      expect(messagesFor({ ...antecedentesBase, rg: '', cpf: '' }, 'rg')).toEqual([
        'Para Antecedentes, informe ao menos o RG ou o CPF.',
      ])
      expect(messagesFor({ ...antecedentesBase, rg: '', cpf: '' }, 'cpf')).toEqual([
        'Para Antecedentes, informe ao menos o RG ou o CPF.',
      ])
    })

    it('rejeita antecedentes se RG for inválido (mesmo com CPF válido)', () => {
      expect(messagesFor({ ...antecedentesBase, rg: '72894286-1', cpf: VALID_CPF }, 'rg')).toEqual([
        'O RG informado é inválido ou seu dígito verificador não confere.',
      ])
    })

    it('rejeita antecedentes se CPF for inválido (mesmo com RG válido)', () => {
      expect(
        messagesFor({ ...antecedentesBase, rg: VALID_RG, cpf: '123.456.789-00' }, 'cpf'),
      ).toEqual(['O CPF informado é inválido.'])
    })

    it('reconhece antecedentes quando o nome é informado diretamente no document_type_id', () => {
      const result = iirgdDemandFormSchema.safeParse({
        ...base,
        document_type_id: 'Antecedentes Nominal',
        document_type_name: undefined,
        rg: '',
        cpf: VALID_CPF,
      })
      expect(result.success).toBe(true)
    })
  })
})
