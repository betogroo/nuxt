import { z } from 'zod'
import { publicIirgdDemandStatusSchema } from '../generated/database.schemas'

export const iirgdStatusChangeFormSchema = z
  .object({
    status: publicIirgdDemandStatusSchema,
    observation: z.string(),
  })
  .refine((data) => data.status !== 'other_pending' || data.observation.trim().length > 0, {
    error: 'A observação é obrigatória para o status "Outra Pendência".',
    path: ['observation'],
  })

export type IirgdStatusChangeFormInput = z.input<typeof iirgdStatusChangeFormSchema>
export type IirgdStatusChangeFormValues = z.output<typeof iirgdStatusChangeFormSchema>
