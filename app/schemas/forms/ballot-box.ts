import { z } from 'zod'

export const ballotBoxSchema = z.object({
  name: z
    .string()
    .min(2, 'O nome da urna deve ter no mínimo 2 caracteres.')
    .max(100, 'O nome da urna deve ter no máximo 100 caracteres.'),
  device_info: z
    .string()
    .max(255, 'A descrição do equipamento deve ter no máximo 255 caracteres.')
    .optional()
    .or(z.literal(''))
    .nullable(),
})

export type BallotBoxFormData = z.infer<typeof ballotBoxSchema>
