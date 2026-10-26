import { describe, it, expect } from 'vitest'
import { parseCharacteristicsText } from '~/utils/parseCharacteristics'

describe('parseCharacteristicsText', () => {
  it('should parse user example block with 8 lines correctly', () => {
    const input = `Tipo de escrita:  média (esfera entre 1mm e 2mm)
Material Corpo: Poliestireno cristal translúcido/transparente
Formato Corpo: Sextavado, com orifício lateral para equalização da pressão
Material Ponta: Latão com esfera de carboneto de tungstênio.
Característica Tampa: Ventilada (segurança antiasfixia) e plugue na cor da tinta (azul)
Característica Tinta: À base de óleo, de alta qualidade, com fluxo uniforme e escrita macia, sem borrões.
Rendimento: Mínimo de escrita 2000m
Certificação:  INMETRO`

    const result = parseCharacteristicsText(input)

    expect(result.items).toHaveLength(8)
    expect(result.ignoredLines).toHaveLength(0)

    expect(result.items[0]).toEqual({
      key: 'Tipo de escrita',
      value: 'média (esfera entre 1mm e 2mm)',
      originalLine: 'Tipo de escrita:  média (esfera entre 1mm e 2mm)',
      lineNumber: 1,
    })
    expect(result.items[1].key).toBe('Material Corpo')
    expect(result.items[1].value).toBe('Poliestireno cristal translúcido/transparente')
    expect(result.items[7].key).toBe('Certificação')
    expect(result.items[7].value).toBe('INMETRO')
  })

  it('should strip common list bullets and numbering', () => {
    const input = `- Cor: Azul
* Ponta: 1.0mm
• Rendimento: 2000m
1. Material: Plástico
2) Tampa: Ventilada`

    const result = parseCharacteristicsText(input)

    expect(result.items).toHaveLength(5)
    expect(result.items.map((i) => i.key)).toEqual([
      'Cor',
      'Ponta',
      'Rendimento',
      'Material',
      'Tampa',
    ])
    expect(result.items.map((i) => i.value)).toEqual([
      'Azul',
      '1.0mm',
      '2000m',
      'Plástico',
      'Ventilada',
    ])
  })

  it('should preserve multiple colons inside the value', () => {
    const input = 'Observação: Atenção: modelo novo: versão 2.0'
    const result = parseCharacteristicsText(input)

    expect(result.items).toHaveLength(1)
    expect(result.items[0].key).toBe('Observação')
    expect(result.items[0].value).toBe('Atenção: modelo novo: versão 2.0')
  })

  it('should ignore empty lines and whitespace', () => {
    const input = `
    
      Cor: Azul  
      
      Ponta: 0.7mm   
      
    `
    const result = parseCharacteristicsText(input)

    expect(result.items).toHaveLength(2)
    expect(result.items[0].key).toBe('Cor')
    expect(result.items[0].value).toBe('Azul')
    expect(result.items[1].key).toBe('Ponta')
    expect(result.items[1].value).toBe('0.7mm')
    expect(result.ignoredLines).toHaveLength(0)
  })

  it('should report lines without colon as ignored', () => {
    const input = `Cor: Azul
Texto sem separador de dois pontos
Ponta: 1.0mm`

    const result = parseCharacteristicsText(input)

    expect(result.items).toHaveLength(2)
    expect(result.ignoredLines).toHaveLength(1)
    expect(result.ignoredLines[0]).toEqual({
      lineNumber: 2,
      line: 'Texto sem separador de dois pontos',
      reason: 'Não contém o separador ":" entre chave e valor',
    })
  })

  it('should report empty key or empty value as ignored', () => {
    const input = `: valor sem chave
Chave sem valor:`

    const result = parseCharacteristicsText(input)

    expect(result.items).toHaveLength(0)
    expect(result.ignoredLines).toHaveLength(2)
    expect(result.ignoredLines[0].reason).toContain('Nome da chave está vazio')
    expect(result.ignoredLines[1].reason).toContain('Valor da característica está vazio')
  })

  it('should deduplicate case-insensitive repeated keys retaining the latest', () => {
    const input = `Cor: Azul
cor: Preto`

    const result = parseCharacteristicsText(input)

    expect(result.items).toHaveLength(1)
    expect(result.items[0].key).toBe('cor')
    expect(result.items[0].value).toBe('Preto')
  })

  it('should return empty result for null or non-string input', () => {
    expect(parseCharacteristicsText('')).toEqual({ items: [], ignoredLines: [] })
    expect(parseCharacteristicsText(null as unknown as string)).toEqual({
      items: [],
      ignoredLines: [],
    })
  })
})
