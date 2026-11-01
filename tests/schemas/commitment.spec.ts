import { describe, expect, it } from 'vitest'
import {
  bankOrderFormSchema,
  commitmentNumberSchema,
  disbursementProgramFormSchema,
  isValidBankOrderNumber,
  isValidCommitmentNumber,
  isValidDisbursementProgramNumber,
  isValidLiquidationNumber,
  liquidationNoteFormSchema,
} from '~/schemas/forms/commitment'
import { demandItemStatusChangeFormSchema } from '~/schemas/forms/demand-item-status'

describe('Commitment & Financial Execution SIAFEM Schemas', () => {
  it('validates and normalizes Nota de Empenho (YYYYNE00000)', () => {
    expect(isValidCommitmentNumber('2026NE00001')).toBe(true)
    expect(isValidCommitmentNumber('2026ne00313')).toBe(true)
    expect(isValidCommitmentNumber('2026-NE-00313')).toBe(false)
    expect(isValidCommitmentNumber('2026NE123')).toBe(false)

    const parsed = commitmentNumberSchema.safeParse(' 2026ne00315 ')
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data).toBe('2026NE00315')
    }
  })

  it('validates Nota de Liquidação (YYYYNL00000)', () => {
    expect(isValidLiquidationNumber('2026NL00001')).toBe(true)
    expect(isValidLiquidationNumber('2026nl00450')).toBe(true)
    expect(isValidLiquidationNumber('2026NE00450')).toBe(false)

    const validResult = liquidationNoteFormSchema.safeParse({
      liquidation_number: '2026nl00123',
      issue_date: '2026-11-01',
      observation: 'Primeira NL',
    })
    expect(validResult.success).toBe(true)
    if (validResult.success) {
      expect(validResult.data.liquidation_number).toBe('2026NL00123')
    }

    const invalidResult = liquidationNoteFormSchema.safeParse({
      liquidation_number: 'NL-123',
      issue_date: '2026-11-01',
    })
    expect(invalidResult.success).toBe(false)
  })

  it('validates Programa de Desembolso (YYYYPD00000)', () => {
    expect(isValidDisbursementProgramNumber('2026PD00010')).toBe(true)
    expect(isValidDisbursementProgramNumber('2026pd00010')).toBe(true)
    expect(isValidDisbursementProgramNumber('2026OB00010')).toBe(false)

    const validPd = disbursementProgramFormSchema.safeParse({
      disbursement_program_number: '2026pd00099',
      disbursement_program_issued_at: '2026-11-01',
      disbursement_program_observation: 'PD liberado',
    })
    expect(validPd.success).toBe(true)
    if (validPd.success) {
      expect(validPd.data.disbursement_program_number).toBe('2026PD00099')
    }
  })

  it('validates Ordem Bancária (YYYYOB00000)', () => {
    expect(isValidBankOrderNumber('2026OB00500')).toBe(true)
    expect(isValidBankOrderNumber('2026ob00500')).toBe(true)
    expect(isValidBankOrderNumber('2026PD00500')).toBe(false)

    const validOb = bankOrderFormSchema.safeParse({
      bank_order_number: '2026ob00500',
      bank_order_issued_at: '2026-11-01',
      bank_order_observation: 'Pagamento efetuado',
    })
    expect(validOb.success).toBe(true)
    if (validOb.success) {
      expect(validOb.data.bank_order_number).toBe('2026OB00500')
    }
  })

  it('enforces SIAFEM NE pattern in demandItemStatusChangeFormSchema when status is commitment_issued', () => {
    const invalidNe = demandItemStatusChangeFormSchema.safeParse({
      status: 'commitment_issued',
      commitment_number: '2026-NE-00313',
    })
    expect(invalidNe.success).toBe(false)

    const validNe = demandItemStatusChangeFormSchema.safeParse({
      status: 'commitment_issued',
      commitment_number: '2026NE00313',
    })
    expect(validNe.success).toBe(true)
  })
})
