import { z } from 'zod'

export const loginPasswordSchema = z.object({
  email: z.email('E-mail inválido.').trim().min(1, 'O e-mail é obrigatório.'),
  password: z.string().min(1, 'A senha é obrigatória.'),
})

export const loginMagicLinkSchema = z.object({
  email: z.email('E-mail inválido.').trim().min(1, 'O e-mail é obrigatório.'),
})

export const loginOtpSchema = z.object({
  email: z.email('E-mail inválido.').trim().min(1, 'O e-mail é obrigatório.'),
  otpCode: z.string().min(1, 'O código OTP é obrigatório.'),
})

export const registerSchema = z.object({
  email: z.email('E-mail inválido.').trim().min(1, 'O e-mail é obrigatório.'),
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres.'),
})
