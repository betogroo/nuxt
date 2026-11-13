import { z } from 'zod'
import { cnpjValidator } from '~/schemas/validators'
import { formatSupplierEmails, validateSupplierEmails } from '~/utils/supplierEmail'

export const supplierFormSchema = z.object({
  id: z.string().optional(),
  cnpj: cnpjValidator,
  company_name: z.string().trim().min(1, 'O Nome da Empresa é obrigatório.'),
  responsible_name: z.string().trim().nullable().default(null),
  email: z
    .union([z.string(), z.array(z.string()), z.null(), z.undefined()])
    .superRefine((val, ctx) => {
      if (val === null || val === undefined || val === '') return
      const validation = validateSupplierEmails(val)
      if (!validation.isValid) {
        const errorList = validation.invalidEmails.map((e) => `"${e}"`).join(', ')
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            validation.invalidEmails.length === 1
              ? `Formato de e-mail inválido: ${errorList}.`
              : `Formatos de e-mail inválidos: ${errorList}.`,
        })
      }
    })
    .transform((val) => formatSupplierEmails(val))
    .default(null),
  cell_phone: z.string().trim().nullable().default(null),
  landline: z.string().trim().nullable().default(null),
  address: z.string().trim().nullable().default(null),
  has_bb_account: z.string().trim().nullable().default(null),
  is_simples_optant: z.boolean().default(false),
  simples_optant_verified_at: z.string().nullable().default(null),
  is_active: z.boolean().default(true),
})

export type SupplierFormInput = z.infer<typeof supplierFormSchema>
