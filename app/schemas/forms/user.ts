import { z } from 'zod'

export const adminUserEditSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1, 'O nome é obrigatório.'),
  role: z.enum(['admin', 'uge', 'iirgd', 'user'], { message: 'Selecione um nível de acesso.' }),
  is_active: z.boolean().default(true),
})

export type AdminUserEditInput = z.infer<typeof adminUserEditSchema>

export const adminUserCreateSchema = z.object({
  name: z.string().trim().min(1, 'O nome é obrigatório.'),
  email: z.string().trim().email('E-mail inválido.').min(1, 'O e-mail é obrigatório.'),
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres.'),
  role: z.enum(['admin', 'uge', 'iirgd', 'user']).default('user'),
})

export type AdminUserCreateInput = z.infer<typeof adminUserCreateSchema>
