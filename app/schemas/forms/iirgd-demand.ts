import { z } from 'zod'
import { IIRGD_STATION_CODES } from '~/constants/iirgd-stations'
import { optionalCpf, optionalRgSp } from '../validators'

const REQUIRED_STATION = 'O Código do Posto é obrigatório.'

export const isAntecedentesDocumentType = (nameOrId?: string | null): boolean => {
  if (!nameOrId) return false
  const normalized = nameOrId
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  return normalized.includes('antecedentes')
}

export const iirgdDemandFormSchema = z
  .object({
    station_code: z.enum(IIRGD_STATION_CODES, { error: REQUIRED_STATION }),
    document_type_id: z
      .string({ error: 'O Tipo de Documento é obrigatório.' })
      .trim()
      .min(1, 'O Tipo de Documento é obrigatório.'),
    document_type_name: z.string().optional(),
    cpf: optionalCpf,
    rg: optionalRgSp,
    name: z.string({ error: 'O Nome é obrigatório.' }).trim().min(1, 'O Nome é obrigatório.'),
    observation: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const isAntecedentes =
      isAntecedentesDocumentType(data.document_type_name) ||
      isAntecedentesDocumentType(data.document_type_id)

    const hasRg = Boolean(data.rg && data.rg.trim().length > 0)
    const hasCpf = Boolean(data.cpf && data.cpf.trim().length > 0)

    if (isAntecedentes) {
      if (!hasRg && !hasCpf) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['rg'],
          message: 'Para Antecedentes, informe ao menos o RG ou o CPF.',
        })
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['cpf'],
          message: 'Para Antecedentes, informe ao menos o RG ou o CPF.',
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

export type IirgdDemandFormInput = z.input<typeof iirgdDemandFormSchema>
export type IirgdDemandFormValues = z.output<typeof iirgdDemandFormSchema>
