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

  it('parseia corretamente blocos multilinhas do Compras.gov.br e sanitiza os nomes retirando o CNPJ', () => {
    const text = `10.879.466/0001-62
ME/EPP
E. RENATA P. L. LUNARDI PAPELARIA E ARMARINHOS
Itens julgados:
1 de 1

53.249.470/0001-50
ME/EPP
SISTECNICA INFORMATICA E SERVICOS LTDA
Itens julgados:
1 de 1

65.120.864/0001-92
ME/EPP
65.120.864 LUIZ EDUARDO LUNA
Itens julgados:
1 de 1

66.621.367/0001-30
ME/EPP
66.621.367 RENAN TIAGO PEREIRA DE OLIVEIRA
Itens julgados:
1 de 1

57.070.703/0001-03
ME/EPP
KIRE COMERCIO DE UTILIDADES LTDA
Itens julgados:
1 de 1

57.215.203/0001-12
ME/EPP
57.215.203 ELIUDE VINICIOS SILVA
Itens julgados:
0 de 0

65.189.221/0001-03
ME/EPP
ALVORADA DISTRIBUIDORA E PRESTACAO DE SERVICOS LTDA
Itens julgados:
0 de 0

59.632.454/0001-28
ME/EPP
59.632.454 ENZO BRITO FREITAS
Itens julgados:
0 de 0

36.469.275/0001-16
ME/EPP
SO BATERIAS - COMERCIO DE BATERIAS LTDA
Itens julgados:
0 de 0`

    const result = parseBatchSuppliersText(text)

    expect(result.items).toHaveLength(9)
    expect(result.readyCount).toBe(9)
    expect(result.ignoredCount).toBe(0)

    expect(result.items[0]).toMatchObject({
      cnpj: '10.879.466/0001-62',
      cleanCnpj: '10879466000162',
      company_name: 'E. RENATA P. L. LUNARDI PAPELARIA E ARMARINHOS',
      isValid: true,
      status: 'ready',
    })

    expect(result.items[1]).toMatchObject({
      cnpj: '53.249.470/0001-50',
      cleanCnpj: '53249470000150',
      company_name: 'SISTECNICA INFORMATICA E SERVICOS LTDA',
      isValid: true,
      status: 'ready',
    })

    expect(result.items[2]).toMatchObject({
      cnpj: '65.120.864/0001-92',
      cleanCnpj: '65120864000192',
      company_name: 'LUIZ EDUARDO LUNA',
      isValid: true,
      status: 'ready',
    })

    expect(result.items[3]).toMatchObject({
      cnpj: '66.621.367/0001-30',
      cleanCnpj: '66621367000130',
      company_name: 'RENAN TIAGO PEREIRA DE OLIVEIRA',
      isValid: true,
      status: 'ready',
    })

    expect(result.items[4]).toMatchObject({
      cnpj: '57.070.703/0001-03',
      cleanCnpj: '57070703000103',
      company_name: 'KIRE COMERCIO DE UTILIDADES LTDA',
      isValid: true,
      status: 'ready',
    })

    expect(result.items[5]).toMatchObject({
      cnpj: '57.215.203/0001-12',
      cleanCnpj: '57215203000112',
      company_name: 'ELIUDE VINICIOS SILVA',
      isValid: true,
      status: 'ready',
    })

    expect(result.items[6]).toMatchObject({
      cnpj: '65.189.221/0001-03',
      cleanCnpj: '65189221000103',
      company_name: 'ALVORADA DISTRIBUIDORA E PRESTACAO DE SERVICOS LTDA',
      isValid: true,
      status: 'ready',
    })

    expect(result.items[7]).toMatchObject({
      cnpj: '59.632.454/0001-28',
      cleanCnpj: '59632454000128',
      company_name: 'ENZO BRITO FREITAS',
      isValid: true,
      status: 'ready',
    })

    expect(result.items[8]).toMatchObject({
      cnpj: '36.469.275/0001-16',
      cleanCnpj: '36469275000116',
      company_name: 'SO BATERIAS - COMERCIO DE BATERIAS LTDA',
      isValid: true,
      status: 'ready',
    })
  })

  it('sanitiza nome da empresa no formato linha única retirando prefixo de CNPJ ou raiz MEI', () => {
    const text = [
      '65.120.864/0001-92\t65.120.864 LUIZ EDUARDO LUNA',
      '66.621.367/0001-30 - 66.621.367/0001-30 RENAN TIAGO PEREIRA DE OLIVEIRA',
      '57215203000112; 57215203 ELIUDE VINICIOS SILVA',
    ].join('\n')

    const result = parseBatchSuppliersText(text)

    expect(result.items).toHaveLength(3)
    expect(result.readyCount).toBe(3)
    expect(result.items[0].company_name).toBe('LUIZ EDUARDO LUNA')
    expect(result.items[1].company_name).toBe('RENAN TIAGO PEREIRA DE OLIVEIRA')
    expect(result.items[2].company_name).toBe('ELIUDE VINICIOS SILVA')
  })
})
