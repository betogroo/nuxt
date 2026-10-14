import type { Database } from '~/types/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']

export const useProfile = () => {
  const supabase = useSupabaseClient<Database>()
  const { userId } = useCurrentUserId()

  const profile = useState<Profile | null>('user-profile', () => null)
  const isLoading = useState<boolean>('user-profile-loading', () => false)
  const debugError = useState<string>('user-profile-error', () => '')

  const fetchProfile = async () => {
    // Se não estiver logado ou o id ainda não estiver preenchido, aborta
    if (!userId.value) {
      profile.value = null
      return
    }

    isLoading.value = true
    debugError.value = ''

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId.value)
      .single()

    if (!error && data) {
      profile.value = data
    } else if (error) {
      debugError.value = error.message
      console.error('Erro ao buscar perfil:', error.message)
    }
    isLoading.value = false
  }

  const fetchAllProfiles = async () => {
    const { data, error } = await supabase.from('profiles').select('id, name').order('name')
    if (error) throw error
    return data
  }

  const updateProfile = async (payload: Partial<Profile>) => {
    if (!profile.value) return

    const { error } = await supabase.from('profiles').update(payload).eq('id', profile.value.id)

    if (error) throw error

    await fetchProfile()
  }

  return { profile, isLoading, debugError, fetchProfile, fetchAllProfiles, updateProfile }
}
