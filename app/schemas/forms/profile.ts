import { z } from 'zod'

export const profileFormSchema = z.object({
  name: z.string().trim().min(1, 'O nome é obrigatório.'),
  avatar_url: z.string().trim().nullable().default(null),
})

export type ProfileFormInput = z.infer<typeof profileFormSchema>
