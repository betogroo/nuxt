import { z } from 'zod'

export const adminUnitFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, 'O Nome da Unidade é obrigatório.'),
  aliasIds: z.array(z.string()).default([]),
  is_active: z.boolean().default(true),
})

export type AdminUnitFormInput = z.infer<typeof adminUnitFormSchema>

export const adminUnitAliasFormSchema = z.object({
  id: z.string().optional(),
  code: z.number({
    required_error: 'O Código é obrigatório.',
    invalid_type_error: 'Deve ser um número.',
  }),
  name: z.string().trim().min(1, 'O Nome/Descrição é obrigatório.'),
})

export type AdminUnitAliasFormInput = z.infer<typeof adminUnitAliasFormSchema>

export const adminUnitResolveSchema = z
  .object({
    resolveMode: z.enum(['new', 'link']),
    resolveNewName: z.string().trim().optional(),
    resolveLinkUnitId: z.string().trim().optional(),
  })
  .refine(
    (data) => {
      if (data.resolveMode === 'new') {
        return !!data.resolveNewName && data.resolveNewName.length > 0
      }
      return true
    },
    { message: 'O Nome da Nova Unidade é obrigatório.', path: ['resolveNewName'] },
  )
  .refine(
    (data) => {
      if (data.resolveMode === 'link') {
        return !!data.resolveLinkUnitId && data.resolveLinkUnitId.length > 0
      }
      return true
    },
    { message: 'Selecione a Unidade Oficial.', path: ['resolveLinkUnitId'] },
  )

export type AdminUnitResolveInput = z.infer<typeof adminUnitResolveSchema>
