import { z } from 'zod'

export const demandFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, 'O Nome da Demanda é obrigatório.'),
  type: z.enum(['consumption', 'permanent'], {
    message: 'O Tipo de Demanda é obrigatório.',
  }),
  process_number: z.string().trim().nullable().optional(),
  id_pca: z.string().trim().nullable().optional(),
  contract_number: z.string().trim().nullable().optional(),
})

export const demandResponsibleSchema = z.object({
  user_id: z.string().min(1, 'Selecione um responsável.'),
})

export const demandRevertSchema = z.object({
  status: z.string().min(1, 'O status de destino é obrigatório.'),
  observation: z.string().trim().min(1, 'A justificativa é obrigatória.'),
})

export type DemandFormInput = z.infer<typeof demandFormSchema>
export type DemandResponsibleInput = z.infer<typeof demandResponsibleSchema>
export type DemandRevertInput = z.infer<typeof demandRevertSchema>
