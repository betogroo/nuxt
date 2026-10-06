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
  .refine(
    (data) => {
      if (data.is_suggesting_nature) {
        return (
          !!data.suggested_nature_id &&
          data.suggested_nature_id.length > 0 &&
          !!data.suggested_nature_name &&
          data.suggested_nature_name.length > 0
        )
      } else {
        return !!data.expense_nature_id && data.expense_nature_id.length > 0
      }
    },
    { message: 'A Natureza de Despesa é obrigatória.', path: ['expense_nature_id'] },
  )
  .refine(
    (data) => {
      if (data.is_suggesting_class) {
        return (
          !!data.suggested_class_id &&
          data.suggested_class_id.length > 0 &&
          !!data.suggested_class_name &&
          data.suggested_class_name.length > 0
        )
      }
      return true
    },
    {
      message: 'Código e Nome da Classe são obrigatórios se sugerida.',
      path: ['suggested_class_name'],
    },
  )

export type ProductFormInput = z.infer<typeof productFormSchema>
