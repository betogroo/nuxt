import { z } from 'zod'

const optionalPositiveNumber = z.preprocess(
  (val) => {
    if (val === '' || val === null || val === undefined) return undefined
    if (typeof val === 'number') return val
    if (typeof val === 'string') {
      const trimmed = val.trim()
      if (!trimmed) return undefined
      const normalized = trimmed.includes(',')
        ? trimmed.replace(/\./g, '').replace(',', '.')
        : trimmed
      const num = Number(normalized)
      return isNaN(num) ? val : num
    }
    return val
  },
  z
    .number({ invalid_type_error: 'Valor do intervalo inválido.' })
    .positive('O valor do intervalo deve ser maior que zero.')
    .optional(),
)

const optionalPriceNumber = z.preprocess(
  (val) => {
    if (val === '' || val === null || val === undefined) return null
    if (typeof val === 'number') return val
    if (typeof val === 'string') {
      const trimmed = val.trim()
      if (!trimmed) return null
      const normalized = trimmed.includes(',')
        ? trimmed.replace(/\./g, '').replace(',', '.')
        : trimmed
      const num = Number(normalized)
      return isNaN(num) ? val : num
    }
    return val
  },
  z
    .number({ invalid_type_error: 'Valor referencial inválido.' })
    .min(0, 'O valor referencial não pode ser negativo.')
    .nullable()
    .optional(),
)

const optionalBidIntervalType = z.preprocess(
  (value) => (value === '' || value === null ? undefined : value),
  z.enum(['percentage', 'monetary']).optional(),
)

export const demandItemFormSchema = z
  .object({
    id: z.string().optional(),
    productId: z.string().optional(), // optional because edit mode doesn't need it
    quantity: z
      .number({
        required_error: 'A quantidade é obrigatória.',
        invalid_type_error: 'Quantidade inválida.',
      })
      .min(0.0001, 'A quantidade deve ser maior que zero.'),
    searchUnitText: z.string().trim().min(1, 'A unidade de medida é obrigatória.'),
    aliasId: z.string().nullable().optional(),
    reference_price: optionalPriceNumber,
    bid_interval: optionalPositiveNumber,
    bid_interval_type: optionalBidIntervalType,
  })
  .superRefine((data, ctx) => {
    // O intervalo é opcional no cadastro, porém tipo e valor devem ser informados em conjunto.
    // A obrigatoriedade total é validada na transição para o Aviso de Contratação.
    if (data.bid_interval !== undefined && data.bid_interval_type === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['bid_interval_type'],
        message: 'Informe o tipo do intervalo.',
      })
    }
    if (data.bid_interval_type !== undefined && data.bid_interval === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['bid_interval'],
        message: 'Informe o valor do intervalo.',
      })
    }
  })

export type DemandItemFormInput = z.infer<typeof demandItemFormSchema>
