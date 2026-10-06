import { z } from 'zod'
import { IIRGD_STATION_CODES } from '~/constants/iirgd-stations'
import { optionalCpf, optionalRgSp } from '../validators'

const REQUIRED_STATION = 'O Código do Posto é obrigatório.'

export const iirgdDemandFormSchema = z
  .object({
    station_code: z.enum(IIRGD_STATION_CODES, { error: REQUIRED_STATION }),
    rg: optionalRgSp,
    cpf: optionalCpf,
    name: z.string({ error: 'O Nome é obrigatório.' }).trim().min(1, 'O Nome é obrigatório.'),
    observation: z.string().optional(),
  })
  .refine((data) => !!data.rg || !!data.cpf, {
    error: 'É necessário informar pelo menos o RG ou o CPF.',
    path: ['rg'],
  })

export type IirgdDemandFormInput = z.input<typeof iirgdDemandFormSchema>
export type IirgdDemandFormValues = z.output<typeof iirgdDemandFormSchema>
