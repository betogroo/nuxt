import { z } from 'zod'

export const demandFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, 'O Nome da Demanda é obrigatório.'),
  type: z.enum(['consumption', 'permanent'], {
    message: 'O Tipo de Demanda é obrigatório.',
  }),
  internal_process_number: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{4,6}$/, 'O processo interno deve seguir o formato AAAA-XXXX (ex: 2026-0001).')
    .optional()
    .nullable()
    .or(z.literal('')),
  process_number: z.string().trim().nullable().optional(),
  id_pca: z.string().trim().nullable().optional(),
  contract_number: z.string().trim().nullable().optional(),
  siafem_number: z.string().trim().nullable().optional(),
  is_historical: z.boolean().default(false),
  status: z
    .enum(['planning', 'quotation', 'bidding_notice', 'dispute', 'homologation', 'completed'])
    .optional(),
  dispute_date: z.string().trim().nullable().optional(),
  bidding_notice_number: z.string().trim().nullable().optional(),
  dispute_number: z.string().trim().nullable().optional(),
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
