import { z } from 'zod'
import { cnpjValidator } from '../validators'

export const demandBidFormSchema = z
  .object({
    id: z.string().optional(),
    isNewSupplier: z.boolean().default(false),
    supplierId: z.string().nullable().optional(),
    newSupplierCnpj: z.string().trim().optional(),
    newSupplierName: z.string().trim().optional(),
    newSupplierEmail: z.email('E-mail inválido.').trim().or(z.literal('')).optional(),
    amount: z
      .number({
        required_error: 'O valor do lance é obrigatório.',
        invalid_type_error: 'Valor inválido.',
      })
      .min(0.01, 'O valor deve ser maior que zero.'),
  })
  .superRefine((data, ctx) => {
    if (data.isNewSupplier) {
      if (!data.newSupplierCnpj || data.newSupplierCnpj.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'O CNPJ é obrigatório para um novo fornecedor.',
          path: ['newSupplierCnpj'],
        })
      } else {
        const result = cnpjValidator.safeParse(data.newSupplierCnpj)
        if (!result.success) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'CNPJ inválido.',
            path: ['newSupplierCnpj'],
          })
        }
      }

      if (!data.newSupplierName || data.newSupplierName.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'O Nome Fantasia é obrigatório para um novo fornecedor.',
          path: ['newSupplierName'],
        })
      }
    } else {
      if (!data.supplierId || data.supplierId.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Selecione um fornecedor existente.',
          path: ['supplierId'],
        })
      }
    }
  })

export type DemandBidFormInput = z.infer<typeof demandBidFormSchema>
