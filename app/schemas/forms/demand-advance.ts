import { z } from 'zod'

export const demandAdvanceSchema = z
  .object({
    targetStatus: z.string(),
    bidding_notice_number: z.string().trim().optional(),
    dispute_number: z.string().trim().optional(),
    dispute_date: z.string().trim().optional(),
    offer_opening_date: z.string().trim().optional(),
    offer_opening_time: z.string().trim().optional(),
    contract_number: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.targetStatus === 'bidding_notice') {
      if (!data.bidding_notice_number || data.bidding_notice_number.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'O Número do Aviso de Contratação é obrigatório.',
          path: ['bidding_notice_number'],
        })
      }
    } else if (data.targetStatus === 'dispute') {
      if (!data.dispute_number || data.dispute_number.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'O Número da Disputa é obrigatório.',
          path: ['dispute_number'],
        })
      }
      if (!data.dispute_date || data.dispute_date.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'A Data da Disputa é obrigatória.',
          path: ['dispute_date'],
        })
      }
    } else if (data.targetStatus === 'homologation') {
      if (!data.contract_number || data.contract_number.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'O Número da Contratação é obrigatório.',
          path: ['contract_number'],
        })
      }
    }
  })

export type DemandAdvanceInput = z.infer<typeof demandAdvanceSchema>
