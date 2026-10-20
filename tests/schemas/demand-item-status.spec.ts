import { describe, it, expect } from 'vitest'
import { demandItemStatusChangeFormSchema } from '~/schemas/forms/demand-item-status'

describe('demandItemStatusChangeFormSchema', () => {
  it('should accept valid sequential statuses without error details', () => {
    const validData = {
      status: 'commitment_sent' as const,
      observation: 'Empenho emitido sob número 2026NE001',
      error_details: '',
    }

    const result = demandItemStatusChangeFormSchema.safeParse(validData)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.status).toBe('commitment_sent')
      expect(result.data.observation).toBe('Empenho emitido sob número 2026NE001')
    }
  })

  it('should reject invalid status strings', () => {
    const invalidData = {
      status: 'invalid_status_xyz',
      observation: '',
      error_details: '',
    }

    const result = demandItemStatusChangeFormSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })

  it('should accept error status when error_details is filled', () => {
    const validErrorData = {
      status: 'error' as const,
      observation: 'Tentativa de contato realizada',
      error_details: 'Fornecedor alegou falta de insumo para entrega na data combinada.',
    }

    const result = demandItemStatusChangeFormSchema.safeParse(validErrorData)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.status).toBe('error')
      expect(result.data.error_details).toBe(
        'Fornecedor alegou falta de insumo para entrega na data combinada.',
      )
    }
  })

  it('should fail when status is error and error_details is missing or empty', () => {
    const invalidErrorData = {
      status: 'error' as const,
      observation: '',
      error_details: '   ',
    }

    const result = demandItemStatusChangeFormSchema.safeParse(invalidErrorData)
    expect(result.success).toBe(false)
    if (!result.success) {
      const errorMsg = result.error.issues[0]?.message
      expect(errorMsg).toBe('A especificação do erro é obrigatória quando o status for "Erro".')
    }
  })
})
