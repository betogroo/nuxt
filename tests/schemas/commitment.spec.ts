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

  it('validates Nota de Liquidação (YYYYNL00000) and IR retention rules', () => {
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
      expect(validResult.data.is_ir_retention).toBe(false)
      expect(validResult.data.ir_retention_amount).toBeNull()
    }

    const validIrResult = liquidationNoteFormSchema.safeParse({
      liquidation_number: '2026nl00124',
      issue_date: '2026-11-01',
      is_ir_retention: true,
      ir_retention_amount: '24,50',
    })
    expect(validIrResult.success).toBe(true)
    if (validIrResult.success) {
      expect(validIrResult.data.is_ir_retention).toBe(true)
      expect(validIrResult.data.ir_retention_amount).toBe(24.5)
    }

    const missingIrAmountResult = liquidationNoteFormSchema.safeParse({
      liquidation_number: '2026NL00124',
      issue_date: '2026-11-01',
      is_ir_retention: true,
      ir_retention_amount: '',
    })
    expect(missingIrAmountResult.success).toBe(false)
    if (!missingIrAmountResult.success) {
      expect(missingIrAmountResult.error.issues[0]?.message).toContain(
        'Informe o valor da retenção de Imposto de Renda',
      )
    }

    const invalidResult = liquidationNoteFormSchema.safeParse({
      liquidation_number: 'NL-123',
      issue_date: '2026-11-01',
    })
    expect(invalidResult.success).toBe(false)
  })

  it('validates Programa de Desembolso (YYYYPD00000) and requires OB when payment date is provided', () => {
    expect(isValidDisbursementProgramNumber('2026PD00010')).toBe(true)
    expect(isValidDisbursementProgramNumber('2026pd00010')).toBe(true)
    expect(isValidDisbursementProgramNumber('2026OB00010')).toBe(false)

    // PD without payment date (initial registration)
    const validPd = disbursementProgramFormSchema.safeParse({
      disbursement_program_number: '2026pd00099',
      disbursement_program_issued_at: '2026-11-01',
      disbursement_program_observation: 'PD liberado',
    })
    expect(validPd.success).toBe(true)
    if (validPd.success) {
      expect(validPd.data.disbursement_program_number).toBe('2026PD00099')
      expect(validPd.data.disbursement_program_paid_at).toBe('')
      expect(validPd.data.bank_order_number).toBe('')
    }

    // PD with payment date but missing OB should fail
    const paidWithoutOb = disbursementProgramFormSchema.safeParse({
      disbursement_program_number: '2026PD00099',
      disbursement_program_issued_at: '2026-11-01',
      disbursement_program_paid_at: '2026-11-10',
    })
    expect(paidWithoutOb.success).toBe(false)
    if (!paidWithoutOb.success) {
      expect(paidWithoutOb.error.issues[0]?.message).toContain(
        'Informe o número da Ordem Bancária (OB) ao registrar a data de pagamento',
      )
    }

    // PD with payment date and valid OB should pass
    const paidWithOb = disbursementProgramFormSchema.safeParse({
      disbursement_program_number: '2026PD00099',
      disbursement_program_issued_at: '2026-11-01',
      disbursement_program_paid_at: '2026-11-10',
      bank_order_number: '2026ob00555',
    })
    expect(paidWithOb.success).toBe(true)
    if (paidWithOb.success) {
      expect(paidWithOb.data.bank_order_number).toBe('2026OB00555')
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
