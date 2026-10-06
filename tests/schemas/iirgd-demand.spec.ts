import { describe, it, expect } from 'vitest'
import { iirgdDemandFormSchema } from '../../app/schemas/forms/iirgd-demand'

const VALID_RG = '72894286-0'
const VALID_CPF = '123.456.789-09'

const base = {
  station_code: '1342-5',
  rg: VALID_RG,
  cpf: '',
  name: 'Maria da Silva',
  observation: '',
}

const messagesFor = (input: unknown, path: string): string[] => {
  const result = iirgdDemandFormSchema.safeParse(input)
  if (result.success) return []
  return result.error.issues.filter((i) => i.path.join('.') === path).map((i) => i.message)
}

describe('iirgdDemandFormSchema', () => {
  it('aceita um formulário válido apenas com RG', () => {
    expect(iirgdDemandFormSchema.safeParse(base).success).toBe(true)
  })

  it('aceita um formulário válido apenas com CPF', () => {
    const result = iirgdDemandFormSchema.safeParse({ ...base, rg: '', cpf: VALID_CPF })
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

  it('exige RG ou CPF', () => {
    expect(messagesFor({ ...base, rg: '', cpf: '' }, 'rg')).toEqual([
      'É necessário informar pelo menos o RG ou o CPF.',
    ])
  })

  it('rejeita RG com dígito verificador inválido', () => {
    expect(messagesFor({ ...base, rg: '72894286-1' }, 'rg')).toEqual([
      'O RG informado é inválido ou seu dígito verificador não confere.',
    ])
  })

  it('rejeita CPF inválido', () => {
    expect(messagesFor({ ...base, cpf: '123.456.789-00' }, 'cpf')).toEqual([
      'O CPF informado é inválido.',
    ])
  })
})
