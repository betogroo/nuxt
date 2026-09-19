export const useLogger = () => {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  const logAction = async (action: string, description?: string, customUserId?: string) => {
    const userId = customUserId || user.value?.id
    if (!userId) return

    try {
      await supabase.from('logs').insert({
        user_id: userId,
        action,
        description,
      })
    } catch (e) {
      console.error('Failed to log action:', e)
    }
  }

  return {
    logAction,
  }
}
