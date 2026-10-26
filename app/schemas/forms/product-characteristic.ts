import { z } from 'zod'

export const productCharacteristicFormSchema = z.object({
  key_name: z.string().trim().min(1, 'A Chave (característica) é obrigatória.'),
  value: z.string().trim().min(1, 'O Valor da característica é obrigatório.'),
})

export type ProductCharacteristicFormInput = z.infer<typeof productCharacteristicFormSchema>

export const adminCharacteristicKeyFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, 'O Nome da Chave é obrigatório.'),
  is_active: z.boolean().default(true),
})

export type AdminCharacteristicKeyFormInput = z.infer<typeof adminCharacteristicKeyFormSchema>

export const adminCharacteristicKeyResolveSchema = z
  .object({
    resolveMode: z.enum(['approve', 'merge']),
    newName: z.string().trim().optional(),
    targetKeyId: z.string().trim().optional(),
  })
  .refine(
    (data) => {
      if (data.resolveMode === 'approve') {
        return !!data.newName && data.newName.length > 0
      }
      return true
    },
    { message: 'O Nome Oficial da Chave é obrigatório para aprovação.', path: ['newName'] },
  )
  .refine(
    (data) => {
      if (data.resolveMode === 'merge') {
        return !!data.targetKeyId && data.targetKeyId.length > 0
      }
      return true
    },
    { message: 'Selecione a Chave Oficial de Destino para unificação.', path: ['targetKeyId'] },
  )

export type AdminCharacteristicKeyResolveInput = z.infer<typeof adminCharacteristicKeyResolveSchema>

export const adminCharacteristicKeyMergeSchema = z.object({
  targetKeyId: z.string().trim().min(1, 'Selecione a Chave Oficial de Destino para unificação.'),
})

export type AdminCharacteristicKeyMergeInput = z.infer<typeof adminCharacteristicKeyMergeSchema>
