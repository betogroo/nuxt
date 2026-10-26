import { computed } from 'vue'

interface UserTokenWithSub {
  id?: string
  sub?: string
}

/**
 * Retorna o ID único do usuário autenticado no Supabase.
 * Resolve tanto a propriedade `id` direta quanto `sub` presente em alguns tokens JWT.
 */
export function useCurrentUserId() {
  const user = useSupabaseUser()

  const userId = computed<string | null>(() => {
    if (!user.value) return null
    if (user.value.id) return user.value.id

    const tokenObj = user.value as unknown as UserTokenWithSub
    return tokenObj.sub || null
  })

  return {
    userId,
  }
}
