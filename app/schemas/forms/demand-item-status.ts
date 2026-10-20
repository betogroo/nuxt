import { z } from 'zod'

export const demandItemExecutionStatuses = [
  'homologated',
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

export type DemandItemStatusChangeFormInput = z.input<typeof demandItemStatusChangeFormSchema>
export type DemandItemStatusChangeFormValues = z.output<typeof demandItemStatusChangeFormSchema>
