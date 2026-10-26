import { z } from 'zod'

export const electionFormSchema = z.object({
  name: z
    .string({ required_error: 'O nome da eleição é obrigatório.' })
    .min(3, 'O nome deve ter pelo menos 3 caracteres.')
    .max(255, 'O nome deve ter no máximo 255 caracteres.'),
  election_date: z
    .string({ required_error: 'A data da eleição é obrigatória.' })
    .min(1, 'A data da eleição é obrigatória.'),
  digits_count: z.coerce
    .number({ invalid_type_error: 'A quantidade de dígitos deve ser um número.' })
    .int('A quantidade de dígitos deve ser inteira.')
    .min(1, 'A quantidade mínima de dígitos é 1.')
    .max(6, 'A quantidade máxima de dígitos é 6.')
    .default(2),
  is_uppercase: z.boolean().default(false),
  status: z
    .enum(['awaiting_release', 'released', 'tallying', 'finished'], {
      required_error: 'A situação é obrigatória.',
      invalid_type_error: 'Situação inválida.',
    })
    .default('awaiting_release'),
  voting_mode: z
    .enum(['simple', 'monitored'], {
      required_error: 'O modo de votação é obrigatório.',
      invalid_type_error: 'Modo de votação inválido.',
    })
    .default('simple'),
  is_anonymous: z.boolean().default(true),
  description: z.string().optional().nullable(),
})

export type ElectionFormInput = z.infer<typeof electionFormSchema>
