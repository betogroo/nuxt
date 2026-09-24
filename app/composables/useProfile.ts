import type { Database } from '~/types/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']

export const useProfile = () => {
  const supabase = useSupabaseClient<Database>()
  const user = useSupabaseUser()

  const profile = useState<Profile | null>('user-profile', () => null)
  const isLoading = useState<boolean>('user-profile-loading', () => false)
  const debugError = useState<string>('user-profile-error', () => '')

  const fetchProfile = async () => {
    // Em alguns ambientes/tokens, o ID vem na propriedade 'sub' do JWT
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userId = user.value?.id || (user.value as any)?.sub

    // Se não estiver logado ou o id ainda não estiver preenchido, aborta
    if (!userId) {
      profile.value = null
      return
    }

    isLoading.value = true
    debugError.value = ''

    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()

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

  return { profile, isLoading, debugError, fetchProfile, fetchAllProfiles }
}
