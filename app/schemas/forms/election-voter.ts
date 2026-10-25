import { z } from 'zod'

export const electionVoterSchema = z.object({
  name: z
    .string()
    .min(3, 'O nome deve ter no mínimo 3 caracteres.')
    .max(120, 'O nome deve ter no máximo 120 caracteres.'),
  voter_registration_number: z
    .string()
    .min(1, 'O número do título é obrigatório.')
    .max(30, 'O número do título deve ter no máximo 30 caracteres.')
    .regex(/^[a-zA-Z0-9.\-_/]+$/, 'O número do título contém caracteres inválidos.'),
  is_active: z.boolean().default(true),
})

export type ElectionVoterFormData = z.infer<typeof electionVoterSchema>
