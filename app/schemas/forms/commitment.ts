import { z } from 'zod'

export const COMMITMENT_NUMBER_REGEX = /^\d{4}NE\d{5}$/i
export const LIQUIDATION_NUMBER_REGEX = /^\d{4}NL\d{5}$/i
export const DISBURSEMENT_PROGRAM_REGEX = /^\d{4}PD\d{5}$/i
export const BANK_ORDER_REGEX = /^\d{4}OB\d{5}$/i

export const MIN_LIQUIDATIONS_FOR_PD = 2

export const normalizeSiafemNumber = (value: string): string => value.trim().toUpperCase()

export const isValidCommitmentNumber = (value: string): boolean =>
  COMMITMENT_NUMBER_REGEX.test(value.trim())

export const isValidLiquidationNumber = (value: string): boolean =>
  LIQUIDATION_NUMBER_REGEX.test(value.trim())

export const isValidDisbursementProgramNumber = (value: string): boolean =>
  DISBURSEMENT_PROGRAM_REGEX.test(value.trim())

export const isValidBankOrderNumber = (value: string): boolean =>
  BANK_ORDER_REGEX.test(value.trim())

export const commitmentNumberSchema = z
  .string({ error: 'Informe o número da Nota de Empenho.' })
  .trim()
  .transform((val) => val.toUpperCase())
  .refine((val) => COMMITMENT_NUMBER_REGEX.test(val), {
    message: 'Formato inválido. Utilize o padrão SIAFEM: 2026NE00000.',
  })

export const commitmentLogisticsStatuses = [
  'commitment_issued',
  'commitment_sent',
  'commitment_confirmed',
  'shipped',
  'delivered',
  'error',
] as const

export const commitmentLogisticsStatusFormSchema = z
  .object({
    status: z.enum(commitmentLogisticsStatuses, {
      error: 'Selecione uma etapa logística válida.',
    }),
    observation: z.string().optional().default(''),
    error_details: z.string().optional().default(''),
  })
  .refine(
    (data) => {
      if (data.status === 'error') {
        return Boolean(data.error_details && data.error_details.trim().length > 0)
      }
      return true
    },
    {
      message: 'A especificação do problema é obrigatória quando o status for "Erro".',
      path: ['error_details'],
    },
  )

export const liquidationNoteFormSchema = z.object({
  liquidation_number: z
    .string({ error: 'Informe o número da Nota de Liquidação.' })
    .trim()
    .transform((val) => val.toUpperCase())
    .refine((val) => LIQUIDATION_NUMBER_REGEX.test(val), {
      message: 'Formato inválido. Utilize o padrão SIAFEM: 2026NL00000.',
    }),
  issue_date: z
    .string({ error: 'Informe a data de emissão.' })
    .trim()
    .min(1, 'A data de emissão é obrigatória.'),
  observation: z.string().optional().default(''),
})

export const disbursementProgramFormSchema = z.object({
  disbursement_program_number: z
    .string({ error: 'Informe o número do Programa de Desembolso.' })
    .trim()
    .transform((val) => val.toUpperCase())
    .refine((val) => DISBURSEMENT_PROGRAM_REGEX.test(val), {
      message: 'Formato inválido. Utilize o padrão SIAFEM: 2026PD00000.',
    }),
  disbursement_program_issued_at: z
    .string({ error: 'Informe a data de emissão.' })
    .trim()
    .min(1, 'A data de emissão é obrigatória.'),
  disbursement_program_paid_at: z.string().optional().default(''),
  disbursement_program_observation: z.string().optional().default(''),
})

export const bankOrderFormSchema = z.object({
  bank_order_number: z
    .string({ error: 'Informe o número da Ordem Bancária.' })
    .trim()
    .transform((val) => val.toUpperCase())
    .refine((val) => BANK_ORDER_REGEX.test(val), {
      message: 'Formato inválido. Utilize o padrão SIAFEM: 2026OB00000.',
    }),
  bank_order_issued_at: z
    .string({ error: 'Informe a data de emissão.' })
    .trim()
    .min(1, 'A data de emissão é obrigatória.'),
  bank_order_paid_at: z.string().optional().default(''),
  bank_order_observation: z.string().optional().default(''),
})

export type CommitmentLogisticsStatusFormInput = z.input<typeof commitmentLogisticsStatusFormSchema>
export type CommitmentLogisticsStatusFormValues = z.output<
  typeof commitmentLogisticsStatusFormSchema
>

export type LiquidationNoteFormInput = z.input<typeof liquidationNoteFormSchema>
export type LiquidationNoteFormValues = z.output<typeof liquidationNoteFormSchema>

export type DisbursementProgramFormInput = z.input<typeof disbursementProgramFormSchema>
export type DisbursementProgramFormValues = z.output<typeof disbursementProgramFormSchema>

export type BankOrderFormInput = z.input<typeof bankOrderFormSchema>
export type BankOrderFormValues = z.output<typeof bankOrderFormSchema>

export const cancelCommitmentFormSchema = z.object({
  reason: z
    .string({ error: 'Informe a justificativa do cancelamento.' })
    .trim()
    .min(3, 'A justificativa do cancelamento deve ter pelo menos 3 caracteres.'),
  cancellation_commitment_number: z
    .string({ error: 'Informe o número da Nota de Empenho de Cancelamento.' })
    .trim()
    .transform((val) => val.toUpperCase())
    .refine((val) => COMMITMENT_NUMBER_REGEX.test(val), {
      message: 'Formato inválido para a NE de Cancelamento. Utilize o padrão SIAFEM: 2026NE00000.',
    }),
  cancellation_issue_date: z
    .string({ error: 'Informe a data de emissão da NE de cancelamento.' })
    .trim()
    .min(1, 'A data de emissão da NE de cancelamento é obrigatória.'),
  cancellation_observation: z.string().optional().default(''),
})

export type CancelCommitmentFormInput = z.input<typeof cancelCommitmentFormSchema>
export type CancelCommitmentFormValues = z.output<typeof cancelCommitmentFormSchema>
