import { z } from 'zod'
import { optionalCpf, optionalRgSp } from '../validators'

export const iirgdCitizenFormSchema = z
  .object({
    name: z.string({ error: 'O Nome é obrigatório.' }).trim().min(1, 'O Nome é obrigatório.'),
    is_other_state: z.boolean().optional(),
    cpf: optionalCpf,
    rg: optionalRgSp,
    other_document: z
      .string()
      .optional()
      .refine((val) => !val || /^[a-zA-Z0-9\s\-_/.]+$/.test(val), {
        message: 'O documento contém caracteres inválidos.',
      }),
  })
  .superRefine((data, ctx) => {
    const hasRg = Boolean(data.rg && data.rg.trim().length > 0)
    const hasCpf = Boolean(data.cpf && data.cpf.trim().length > 0)
    const hasOtherDoc = Boolean(data.other_document && data.other_document.trim().length > 0)

    if (data.is_other_state) {
      if (!hasOtherDoc && !hasCpf) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['other_document'],
          message: 'Informe o Documento de Outro Estado ou o CPF.',
        })
      }
    } else {
      if (!hasRg) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['rg'],
          message: 'O RG é obrigatório.',
        })
      }
    }
  })

export type IirgdCitizenFormInput = z.input<typeof iirgdCitizenFormSchema>
export type IirgdCitizenFormValues = z.output<typeof iirgdCitizenFormSchema>
