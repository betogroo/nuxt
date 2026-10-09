import { z } from 'zod'
import { publicIirgdDemandStatusSchema } from '../generated/database.schemas'
import { IIRGD_STATION_CODES } from '~/constants/iirgd-stations'

export const iirgdStatusChangeFormSchema = z
  .object({
    status: publicIirgdDemandStatusSchema,
    observation: z.string(),
    station_code: z
      .enum(IIRGD_STATION_CODES, { error: 'O Código do Posto é obrigatório.' })
      .optional(),
  })
  .refine((data) => data.status !== 'other_pending' || data.observation.trim().length > 0, {
    error: 'A observação é obrigatória para o status "Outra Pendência".',
    path: ['observation'],
  })

export type IirgdStatusChangeFormInput = z.input<typeof iirgdStatusChangeFormSchema>
export type IirgdStatusChangeFormValues = z.output<typeof iirgdStatusChangeFormSchema>
