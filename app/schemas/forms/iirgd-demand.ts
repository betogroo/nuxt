import { z } from 'zod'
import { IIRGD_STATION_CODES } from '~/constants/iirgd-stations'
import { optionalCpf, rgSpValidator } from '../validators'

const REQUIRED_STATION = 'O Código do Posto é obrigatório.'

export const iirgdDemandFormSchema = z.object({
  station_code: z.enum(IIRGD_STATION_CODES, { error: REQUIRED_STATION }),
  document_type_id: z.string({ error: 'O Tipo de Documento é obrigatório.' }).trim().min(1, 'O Tipo de Documento é obrigatório.'),
  cpf: optionalCpf,
  rg: rgSpValidator,
  name: z.string({ error: 'O Nome é obrigatório.' }).trim().min(1, 'O Nome é obrigatório.'),
  observation: z.string().optional(),
})

export type IirgdDemandFormInput = z.input<typeof iirgdDemandFormSchema>
export type IirgdDemandFormValues = z.output<typeof iirgdDemandFormSchema>
