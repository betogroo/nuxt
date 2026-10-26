import { z } from 'zod'

export const demandItemExecutionStatuses = [
  'homologated',
  'commitment_issued',
  'commitment_sent',
  'commitment_confirmed',
  'shipped',
  'delivered',
  'received',
  'completed',
  'error',
] as const

export const demandItemStatusChangeFormSchema = z
  .object({
    status: z.enum(demandItemExecutionStatuses, {
      error: 'Selecione um status de execução válido.',
    }),
    commitment_number: z.string().optional().default(''),
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
      message: 'A especificação do erro é obrigatória quando o status for "Erro".',
      path: ['error_details'],
    },
  )
  .refine(
    (data) => {
      if (data.status === 'commitment_issued') {
        return Boolean(data.commitment_number && data.commitment_number.trim().length > 0)
      }
      return true
    },
    {
      message: 'O número do empenho é obrigatório quando o status for "Empenho Emitido".',
      path: ['commitment_number'],
    },
  )
  .refine(
    (data) => {
      if (data.status === 'commitment_issued' && data.commitment_number) {
        return /^[A-Za-z0-9\-_./]+$/.test(data.commitment_number.trim())
      }
      return true
    },
    {
      message: 'O número do empenho deve ser alfanumérico (ex: 2026-NE-00247).',
      path: ['commitment_number'],
    },
  )

export type DemandItemStatusChangeFormInput = z.input<typeof demandItemStatusChangeFormSchema>
export type DemandItemStatusChangeFormValues = z.output<typeof demandItemStatusChangeFormSchema>
