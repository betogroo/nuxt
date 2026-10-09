import { z } from 'zod'
import { optionalCpf, rgSpValidator } from '../validators'

export const iirgdCitizenFormSchema = z.object({
  name: z.string({ error: 'O Nome é obrigatório.' }).trim().min(1, 'O Nome é obrigatório.'),
  cpf: optionalCpf,
  rg: rgSpValidator,
})

export type IirgdCitizenFormInput = z.input<typeof iirgdCitizenFormSchema>
export type IirgdCitizenFormValues = z.output<typeof iirgdCitizenFormSchema>
