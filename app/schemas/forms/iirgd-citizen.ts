import { z } from 'zod'
import { cpfValidator, optionalRgSp } from '../validators'

export const iirgdCitizenFormSchema = z.object({
  name: z.string({ error: 'O Nome é obrigatório.' }).trim().min(1, 'O Nome é obrigatório.'),
  cpf: cpfValidator,
  rg: optionalRgSp,
})

export type IirgdCitizenFormInput = z.input<typeof iirgdCitizenFormSchema>
export type IirgdCitizenFormValues = z.output<typeof iirgdCitizenFormSchema>
