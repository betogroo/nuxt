import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { toTypedSchema } from '../../app/utils/toTypedSchema'
import { setupZod } from '../../app/schemas/zod-setup'

const schema = z.object({
  name: z.string().min(3, 'Nome curto'),
  address: z.object({ zip: z.string().length(8, 'CEP inválido') }),
})

describe('toTypedSchema', () => {
  it('retorna o valor parseado quando válido', async () => {
    const typed = toTypedSchema(schema)
    const result = await typed.parse({ name: 'Maria', address: { zip: '12345678' } })

    expect(result.errors).toEqual([])
    expect(result.value).toEqual({ name: 'Maria', address: { zip: '12345678' } })
  })

  it('agrupa erros por caminho, incluindo caminhos aninhados', async () => {
    const typed = toTypedSchema(schema)
    const result = await typed.parse({ name: 'Ma', address: { zip: '1' } })

    expect(result.value).toBeUndefined()
    expect(result.errors).toEqual(
      expect.arrayContaining([
        { path: 'name', errors: ['Nome curto'] },
        { path: 'address.zip', errors: ['CEP inválido'] },
      ]),
    )
  })

  it('declara o tipo de schema esperado pelo vee-validate', () => {
    expect(toTypedSchema(schema).__type).toBe('VVTypedSchema')
  })
})

describe('setupZod', () => {
  it('configura mensagens padrão em português', () => {
    setupZod()
    const result = z.string().safeParse(undefined)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).not.toMatch(/Invalid input/i)
    }
  })
})
