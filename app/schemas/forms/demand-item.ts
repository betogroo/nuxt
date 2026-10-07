import { z } from 'zod'

export const demandItemFormSchema = z.object({
  id: z.string().optional(),
  productId: z.string().optional(), // optional because edit mode doesn't need it
  quantity: z
    .number({
      required_error: 'A quantidade é obrigatória.',
      invalid_type_error: 'Quantidade inválida.',
    })
    .min(0.0001, 'A quantidade deve ser maior que zero.'),
  searchUnitText: z.string().trim().min(1, 'A unidade de medida é obrigatória.'),
  reference_price: z.number().nullable().optional(),
  bid_interval: z.number().optional(),
  bid_interval_type: z.enum(['percentage', 'monetary']).optional(),
})

export type DemandItemFormInput = z.infer<typeof demandItemFormSchema>
