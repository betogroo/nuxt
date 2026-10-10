import { describe, it, expect } from 'vitest'
import { iirgdDemandFormSchema } from '../../app/schemas/forms/iirgd-demand'

const VALID_RG = '72894286-0'
const VALID_CPF = '123.456.789-09'

const base = {
  station_code: '1342-5',
  rg: VALID_RG,
  cpf: '',
  name: 'Maria da Silva',
  document_type_id: 'eb7dbbb9-f018-4a57-ab66-b5ce53d39db7',
  observation: '',
}

const messagesFor = (input: unknown, path: string): string[] => {
  const result = iirgdDemandFormSchema.safeParse(input)
  if (result.success) return []
  return result.error.issues.filter((i) => i.path.join('.') === path).map((i) => i.message)
}

describe('iirgdDemandFormSchema', () => {
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

  it('exige RG', () => {
    expect(messagesFor({ ...base, rg: '' }, 'rg')).toEqual([
      'O RG é obrigatório.',
      'O RG informado é inválido ou seu dígito verificador não confere.',
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
