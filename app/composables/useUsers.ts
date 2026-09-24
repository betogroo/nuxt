import type { Database } from '~/types/database.types'

export type ProfileRow = Database['public']['Tables']['profiles']['Row']

export const useUsers = () => {
  const supabase = useSupabaseClient<Database>()

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  const updateUser = async (userId: string, payload: Partial<ProfileRow>) => {
    const { error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', userId)

    if (error) throw error
  }

  const toggleUserStatus = async (userId: string, newStatus: boolean) => {
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: newStatus })
      .eq('id', userId)

    if (error) throw error
  }

  return {
    fetchUsers,
    updateUser,
    toggleUserStatus,
  }
}
