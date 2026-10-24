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

  const deleteAvatarFromStorage = async (avatarUrl: string): Promise<void> => {
    if (!avatarUrl) return
    const marker = '/storage/v1/object/public/avatars/'
    if (avatarUrl.includes(marker)) {
      const filePath = avatarUrl.split(marker)[1]
      if (filePath) {
        const res = await supabase.storage.from('avatars').remove([filePath])
        if (res?.error) {
          console.warn('Aviso: Não foi possível remover avatar antigo do storage:', res.error)
        }
      }
    }
  }

  const uploadAvatar = async (file: File): Promise<string> => {
    if (!userId.value) {
      throw new Error('Usuário não autenticado.')
    }

    const MAX_SIZE = 5 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      throw new Error('A imagem selecionada deve ter no máximo 5MB.')
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Formato de arquivo não suportado. Utilize PNG, JPG, WEBP ou GIF.')
    }

    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const filePath = `${userId.value}/avatar_${Date.now()}.${fileExt}`

    if (profile.value?.avatar_url) {
      await deleteAvatarFromStorage(profile.value.avatar_url)
    }

    const { data, error: uploadErr } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      })

    if (uploadErr) {
      console.error('Erro no upload do avatar:', uploadErr)
      throw new Error(uploadErr.message || 'Falha ao enviar foto de perfil.')
    }

    const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(data.path)

    return publicUrlData.publicUrl
  }

  const removeAvatar = async (): Promise<void> => {
    if (!userId.value || !profile.value) {
      throw new Error('Usuário não autenticado.')
    }

    if (profile.value.avatar_url) {
      await deleteAvatarFromStorage(profile.value.avatar_url)
    }

    await updateProfile({ avatar_url: null })
  }

  const updateProfile = async (payload: Partial<Profile>) => {
    if (!userId.value) {
      throw new Error('Usuário não autenticado.')
    }

    const { error } = await supabase.from('profiles').update(payload).eq('id', userId.value)

    if (error) throw error

    await fetchProfile()
  }

  return {
    profile,
    isLoading,
    debugError,
    fetchProfile,
    fetchAllProfiles,
    updateProfile,
    uploadAvatar,
    removeAvatar,
  }
}
