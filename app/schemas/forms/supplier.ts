import { z } from 'zod'

export const supplierFormSchema = z.object({
  id: z.string().optional(),
  cnpj: z.string().trim().min(14, 'O CNPJ deve ter no mínimo 14 caracteres.'),
  company_name: z.string().trim().min(1, 'O Nome da Empresa é obrigatório.'),
  responsible_name: z.string().trim().nullable().default(null),
  email: z.email('Formato de e-mail inválido.').trim().min(1, 'O e-mail é obrigatório.'),
  cell_phone: z.string().trim().nullable().default(null),
  landline: z.string().trim().nullable().default(null),
  address: z.string().trim().nullable().default(null),
  has_bb_account: z.string().trim().nullable().default(null),
  is_simples_optant: z.boolean().default(false),
  simples_optant_verified_at: z.string().nullable().default(null),
  is_active: z.boolean().default(true),
})

export type SupplierFormInput = z.infer<typeof supplierFormSchema>
