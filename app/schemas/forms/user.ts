import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('E-mail inválido.'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres.'),
})
export type LoginInput = z.infer<typeof loginSchema>

export const updateProfileSchema = z.object({
  name: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres.'),
})
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>

export const changePasswordSchema = z
  .object({
    password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres.'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem.',
    path: ['confirmPassword'],
  })
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>

// Admin / Gerenciamento de Usuários
export const adminUserEditSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres.'),
  role: z.enum(['admin', 'uge', 'iirgd_user', 'iirgd_manager', 'user'], {
    message: 'Selecione um nível de acesso.',
  }),
  is_active: z.boolean(),
})
export type AdminUserEditInput = z.infer<typeof adminUserEditSchema>

export const adminUserCreateSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres.'),
  email: z.string().email('E-mail inválido.'),
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres.'),
  role: z.enum(['admin', 'uge', 'iirgd_user', 'iirgd_manager', 'user']).default('user'),
})
export type AdminUserCreateInput = z.infer<typeof adminUserCreateSchema>
