import { describe, it, expect } from 'vitest'
import { iirgdStatusChangeFormSchema } from '../../app/schemas/forms/iirgd-status-change'
import { publicIirgdDemandStatusSchema } from '../../app/schemas/generated/database.schemas'
import { Constants } from '../../app/types/database.types'

describe('iirgdStatusChangeFormSchema', () => {
  it('aceita qualquer status sem observação, exceto other_pending', () => {
    expect(
      iirgdStatusChangeFormSchema.safeParse({ status: 'issued', observation: '' }).success,
    ).toBe(true)
  })

  it('exige observação para other_pending', () => {
    const result = iirgdStatusChangeFormSchema.safeParse({
      status: 'other_pending',
      observation: '   ',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['observation'])
      expect(result.error.issues[0]?.message).toBe(
        'A observação é obrigatória para o status "Outra Pendência".',
      )
    }
  })

  it('aceita other_pending com observação', () => {
    expect(
      iirgdStatusChangeFormSchema.safeParse({ status: 'other_pending', observation: 'Falta doc.' })
        .success,
    ).toBe(true)
  })

  it('rejeita status inexistente', () => {
    expect(iirgdStatusChangeFormSchema.safeParse({ status: 'foo', observation: '' }).success).toBe(
      false,
    )
  })
})

describe('schemas gerados (contrato com o banco)', () => {
  it('o enum de status gerado coincide com o enum do database.types.ts', () => {
    expect([...publicIirgdDemandStatusSchema.options].sort()).toEqual(
      [...Constants.public.Enums.iirgd_demand_status].sort(),
    )
  })
})
