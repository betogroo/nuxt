import { z } from 'zod'

/**
 * Cria o schema de validação para o formulário de candidatos com base no número de dígitos da eleição.
 */
export const createCandidateSchema = (digitsCount: number = 2) => {
  const digits = Math.max(1, digitsCount)
  const digitLabel = digits === 1 ? '1 dígito' : `${digits} dígitos`

  return z.object({
    name: z
      .string()
      .min(2, 'O nome deve ter no mínimo 2 caracteres.')
      .max(100, 'O nome deve ter no máximo 100 caracteres.'),
    candidate_number: z
      .string()
      .regex(/^\d+$/, 'O número deve conter apenas dígitos.')
      .length(digits, `O número do candidato deve conter exatamente ${digitLabel}.`),
    photo_url: z
      .string()
      .url('A URL da foto deve ser um endereço web válido.')
      .optional()
      .or(z.literal(''))
      .nullable(),
  })
}

export type CandidateFormData = z.infer<ReturnType<typeof createCandidateSchema>>
