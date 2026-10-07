import { z } from 'zod'

export const productFormSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().trim().min(1, 'O Nome do Produto é obrigatório.'),

    // Expense Nature Fields
    is_suggesting_nature: z.boolean().default(false),
    expense_nature_id: z.string().trim().nullable().default(null),
    suggested_nature_id: z.string().trim().optional(),
    suggested_nature_name: z.string().trim().optional(),

    // Product Class Fields
    is_suggesting_class: z.boolean().default(false),
    product_class_id: z.string().trim().nullable().default(null),
    suggested_class_id: z.string().trim().optional(),
    suggested_class_name: z.string().trim().optional(),

    is_active: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    if (data.is_suggesting_nature) {
      if (!data.suggested_nature_id || data.suggested_nature_id.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'O Código da Natureza é obrigatório.',
          path: ['suggested_nature_id'],
        })
      }
      if (!data.suggested_nature_name || data.suggested_nature_name.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'O Nome da Natureza é obrigatório.',
          path: ['suggested_nature_name'],
        })
      }
    } else {
      if (!data.expense_nature_id || data.expense_nature_id.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'A Natureza de Despesa é obrigatória.',
          path: ['expense_nature_id'],
        })
      }
    }
  })
  .superRefine((data, ctx) => {
    if (data.is_suggesting_class) {
      if (!data.suggested_class_id || data.suggested_class_id.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'O Código da Classe é obrigatório.',
          path: ['suggested_class_id'],
        })
      }
      if (!data.suggested_class_name || data.suggested_class_name.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'O Nome da Classe é obrigatório.',
          path: ['suggested_class_name'],
        })
      }
    } else {
      if (!data.product_class_id || data.product_class_id.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'A Classe do Produto é obrigatória.',
          path: ['product_class_id'],
        })
      }
    }
  })

export type ProductFormInput = z.infer<typeof productFormSchema>
