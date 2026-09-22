import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { email, password, name, role } = body

  if (!email || !password || !name) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Nome, E-mail e Senha são obrigatórios.',
    })
  }

  // Inicializa o cliente do Supabase com poderes de Administrador (bypassa RLS)
  // Casting event to never bypasses internal H3 version mismatches in Nuxt/Nitro
  const supabaseAdmin = serverSupabaseServiceRole<Database>(event as never)

  // 1. Cria o usuário no sistema de autenticação do Supabase
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Já confirma o email para evitar bloqueios
    user_metadata: { name, role },
  })

  if (authError) {
    throw createError({ statusCode: 400, statusMessage: authError.message })
  }

  const userId = authData.user.id

  // 2. A trigger de banco de dados do Supabase criou o registro vazio em `profiles` automaticamente.
  // Agora nós atualizamos esse profile com os dados que vieram do form do admin.
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .update({
      name,
      role: role || 'user',
      is_active: true,
    })
    .eq('id', userId)

  if (profileError) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Conta criada, mas falhou ao atualizar o perfil: ' + profileError.message,
    })
  }

  return { success: true, user: authData.user }
})
