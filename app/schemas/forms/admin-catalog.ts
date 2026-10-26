import { z } from 'zod'

export const adminCatalogFormSchema = z.object({
  id: z.string().trim().min(1, 'O Código (ID) é obrigatório.'),
  name: z.string().trim().min(1, 'O Nome é obrigatório.'),
  is_active: z.boolean().default(true),
})

export type AdminCatalogFormInput = z.infer<typeof adminCatalogFormSchema>

export const adminCatalogResolveSchema = z
  .object({
    resolveMode: z.enum(['approve', 'merge']),
    newName: z.string().trim().optional(),
    finalTargetId: z.string().optional(),
    finalNatureId: z.string().optional(),
    finalClassId: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.resolveMode === 'approve') {
        return !!data.newName && data.newName.length > 0
      }
      return true
    },
    { message: 'O Nome Oficial é obrigatório para aprovação.', path: ['newName'] },
  )
  .refine(
    (data) => {
      if (data.resolveMode === 'merge') {
        return !!(data.finalTargetId || data.finalNatureId || data.finalClassId)
      }
      return true
    },
    { message: 'Selecione a Entidade Oficial de Destino.', path: ['finalTargetId'] },
  )

export type AdminCatalogResolveInput = z.infer<typeof adminCatalogResolveSchema>
