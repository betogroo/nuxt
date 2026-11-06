import { describe, it, expect } from 'vitest'
import { parseBatchSuppliersText } from '~/utils/parseBatchSuppliers'

describe('parseBatchSuppliersText', () => {
  it('deve retornar resultado vazio quando o texto estiver em branco', () => {
    const result = parseBatchSuppliersText('')
    expect(result.items).toHaveLength(0)
    expect(result.readyCount).toBe(0)
    expect(result.ignoredCount).toBe(0)
  })

  it('deve parsear corretamente linhas separadas por tabulação com CNPJ formatado e não formatado', () => {
    const text = [
      '00.000.000/0001-91\tEmpresa Alpha LTDA',
      '33000167000101\tBeta Distribuidora S/A',
    ].join('\n')

    const result = parseBatchSuppliersText(text)

    expect(result.items).toHaveLength(2)
    expect(result.readyCount).toBe(2)
    expect(result.ignoredCount).toBe(0)

    expect(result.items[0]).toMatchObject({
      cnpj: '00.000.000/0001-91',
      cleanCnpj: '00000000000191',
      company_name: 'Empresa Alpha LTDA',
      isValid: true,
      status: 'ready',
    })

    expect(result.items[1]).toMatchObject({
      cnpj: '33.000.167/0001-01',
      cleanCnpj: '33000167000101',
      company_name: 'Beta Distribuidora S/A',
      isValid: true,
      status: 'ready',
    })
  })

  it('deve aceitar múltiplos delimitadores como ponto e vírgula, vírgula, hífen e barra vertical', () => {
    const text = [
      '00.000.000/0001-91; Empresa Ponto e Vírgula',
      '33000167000101, Empresa Vírgula',
      '11.222.333/0001-81 - Empresa Hífen',
      '00000000000191 | Empresa Barra',
    ].join('\n')

    const result = parseBatchSuppliersText(text)

    expect(result.items).toHaveLength(4)
    expect(result.items[0].company_name).toBe('Empresa Ponto e Vírgula')
    expect(result.items[1].company_name).toBe('Empresa Vírgula')
    expect(result.items[2].company_name).toBe('Empresa Hífen')
    expect(result.items[3].company_name).toBe('Empresa Barra')
  })

  it('deve reconhecer ordem inversa (Nome na primeira coluna e CNPJ na segunda coluna)', () => {
    const text = 'Fornecedor Invertido LTDA\t00.000.000/0001-91'
    const result = parseBatchSuppliersText(text)

    expect(result.items).toHaveLength(1)
    expect(result.items[0].company_name).toBe('Fornecedor Invertido LTDA')
    expect(result.items[0].cnpj).toBe('00.000.000/0001-91')
    expect(result.items[0].isValid).toBe(true)
  })

  it('deve extrair CNPJ mesmo sem delimitador formal se o padrão for encontrado na linha', () => {
    const text = '12345678000195 ACME Comércio de Papéis'
    const result = parseBatchSuppliersText(text)

    expect(result.items).toHaveLength(1)
    expect(result.items[0].cleanCnpj).toBe('12345678000195')
    expect(result.items[0].company_name).toBe('ACME Comércio de Papéis')
    expect(result.items[0].isValid).toBe(true)
  })

  it('deve ignorar linhas de cabeçalho comuns', () => {
    const text = ['CNPJ\tNome da Empresa', '00.000.000/0001-91\tEmpresa Real LTDA'].join('\n')

    const result = parseBatchSuppliersText(text)

    expect(result.items).toHaveLength(1)
    expect(result.ignoredLines).toHaveLength(1)
    expect(result.ignoredLines[0].reason).toContain('cabeçalho')
    expect(result.items[0].company_name).toBe('Empresa Real LTDA')
  })

  it('deve invalidar fornecedores com CNPJ inválido (dígitos verificadores incorretos)', () => {
    // 12345678000199 tem DV incorreto (o correto para essa raiz seria 95)
    const text = '12345678000199\tFornecedor Com DV Errado'
    const result = parseBatchSuppliersText(text)

    expect(result.items).toHaveLength(1)
    expect(result.items[0].isValid).toBe(false)
    expect(result.items[0].status).toBe('invalid_cnpj')
    expect(result.items[0].errorReason).toContain('dígitos verificadores')
  })

  it('deve invalidar CNPJ incompleto ou com tamanho diferente de 14 dígitos', () => {
    const text = '12345\tFornecedor Com Poucos Dígitos'
    const result = parseBatchSuppliersText(text)

    expect(result.items).toHaveLength(1)
    expect(result.items[0].isValid).toBe(false)
    expect(result.items[0].status).toBe('invalid_cnpj')
    expect(result.items[0].errorReason).toContain('14 dígitos')
  })

  it('deve invalidar linha sem nome da empresa', () => {
    const text = '00.000.000/0001-91\t'
    const result = parseBatchSuppliersText(text)

    expect(result.items).toHaveLength(1)
    expect(result.items[0].isValid).toBe(false)
    expect(result.items[0].status).toBe('missing_name')
    expect(result.items[0].errorReason).toContain('Nome da empresa é obrigatório')
  })

  it('deve detectar duplicidade interna dentro do lote colado e ignorar as repetições', () => {
    const text = [
      '00.000.000/0001-91\tPrimeira Ocorrência',
      '00000000000191\tSegunda Ocorrência Repetida',
    ].join('\n')

    const result = parseBatchSuppliersText(text)

    expect(result.items).toHaveLength(2)
    expect(result.items[0].isValid).toBe(true)
    expect(result.items[0].status).toBe('ready')

    expect(result.items[1].isValid).toBe(false)
    expect(result.items[1].status).toBe('duplicate_in_batch')
    expect(result.items[1].errorReason).toContain('duplicado')

    expect(result.readyCount).toBe(1)
    expect(result.ignoredCount).toBe(1)
  })
})
