import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { ref } from 'vue'
import { useProfile } from '../../app/composables/useProfile'

const fromMock = vi.fn()
const uploadMock = vi.fn()
const removeMock = vi.fn()
const getPublicUrlMock = vi.fn()

const storageFromMock = vi.fn().mockReturnValue({
  upload: uploadMock,
  remove: removeMock,
  getPublicUrl: getPublicUrlMock,
})

const supabaseMock = {
  from: fromMock,
  storage: {
    from: storageFromMock,
  },
}

const userIdRef = ref<string | null>('user-123')
const profileStateRef = ref<Record<string, unknown> | null>(null)

mockNuxtImport('useSupabaseClient', () => () => supabaseMock)
mockNuxtImport('useCurrentUserId', () => () => ({ userId: userIdRef }))
mockNuxtImport('useState', () => (key: string, init: () => unknown) => {
  if (key === 'user-profile') return profileStateRef
  return ref(init())
})
mockNuxtImport('useLogger', () => () => ({ logAction: vi.fn() }))

describe('useProfile Composable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    userIdRef.value = 'user-123'
    profileStateRef.value = null
    removeMock.mockResolvedValue({ error: null })
  })

  it('fetchProfile should fetch single profile by authenticated userId', async () => {
    const singleMock = vi.fn().mockResolvedValue({
      data: { id: 'user-123', name: 'Test User', role: 'user', avatar_url: null },
      error: null,
    })
    const eqMock = vi.fn().mockReturnValue({ single: singleMock })
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock })
    fromMock.mockReturnValue({ select: selectMock })

    const { fetchProfile, profile } = useProfile()
    await fetchProfile()

    expect(fromMock).toHaveBeenCalledWith('profiles')
    expect(eqMock).toHaveBeenCalledWith('id', 'user-123')
    expect(profile.value).toEqual({
      id: 'user-123',
      name: 'Test User',
      role: 'user',
      avatar_url: null,
    })
  })

  it('updateProfile should update only the profile of authenticated user', async () => {
    const updateEqMock = vi.fn().mockResolvedValue({ error: null })
    const updateMock = vi.fn().mockReturnValue({ eq: updateEqMock })

    const singleMock = vi.fn().mockResolvedValue({
      data: { id: 'user-123', name: 'Updated Name', role: 'user', avatar_url: null },
      error: null,
    })
    const selectEqMock = vi.fn().mockReturnValue({ single: singleMock })
    const selectMock = vi.fn().mockReturnValue({ eq: selectEqMock })

    fromMock.mockReturnValue({
      update: updateMock,
      select: selectMock,
    })

    const { updateProfile } = useProfile()
    await updateProfile({ name: 'Updated Name' })

    expect(fromMock).toHaveBeenCalledWith('profiles')
    expect(updateMock).toHaveBeenCalledWith({ name: 'Updated Name' })
    expect(updateEqMock).toHaveBeenCalledWith('id', 'user-123')
  })

  it('updateProfile should throw error when user is not authenticated', async () => {
    userIdRef.value = null

    const { updateProfile } = useProfile()
    await expect(updateProfile({ name: 'Test' })).rejects.toThrow('Usuário não autenticado.')
  })

  it('uploadAvatar should throw error when file exceeds 5MB', async () => {
    const { uploadAvatar } = useProfile()
    const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.png', {
      type: 'image/png',
    })
    Object.defineProperty(largeFile, 'size', { value: 6 * 1024 * 1024 })

    await expect(uploadAvatar(largeFile)).rejects.toThrow('deve ter no máximo 5MB')
  })

  it('uploadAvatar should throw error when file type is not supported', async () => {
    const { uploadAvatar } = useProfile()
    const invalidFile = new File(['text'], 'doc.pdf', {
      type: 'application/pdf',
    })

    await expect(uploadAvatar(invalidFile)).rejects.toThrow('Formato de arquivo não suportado')
  })

  it('uploadAvatar should upload to avatars/<userId>/ and return public url', async () => {
    uploadMock.mockResolvedValue({
      data: { path: 'user-123/avatar_123.png' },
      error: null,
    })
    getPublicUrlMock.mockReturnValue({
      data: {
        publicUrl: 'https://supabase.co/storage/v1/object/public/avatars/user-123/avatar_123.png',
      },
    })

    const { uploadAvatar } = useProfile()
    const validFile = new File(['avatar-bytes'], 'me.png', {
      type: 'image/png',
    })

    const url = await uploadAvatar(validFile)

    expect(storageFromMock).toHaveBeenCalledWith('avatars')
    expect(uploadMock).toHaveBeenCalledWith(
      expect.stringMatching(/^user-123\/avatar_\d+\.png$/),
      validFile,
      expect.objectContaining({ upsert: true }),
    )
    expect(url).toBe('https://supabase.co/storage/v1/object/public/avatars/user-123/avatar_123.png')
  })

  it('uploadAvatar should remove previous avatar if one was set in avatars bucket', async () => {
    profileStateRef.value = {
      id: 'user-123',
      avatar_url: 'https://supabase.co/storage/v1/object/public/avatars/user-123/avatar_old.png',
    }

    uploadMock.mockResolvedValue({
      data: { path: 'user-123/avatar_new.png' },
      error: null,
    })
    getPublicUrlMock.mockReturnValue({
      data: {
        publicUrl: 'https://supabase.co/storage/v1/object/public/avatars/user-123/avatar_new.png',
      },
    })

    const { uploadAvatar } = useProfile()
    const validFile = new File(['new-bytes'], 'new.png', {
      type: 'image/png',
    })

    await uploadAvatar(validFile)

    expect(removeMock).toHaveBeenCalledWith(['user-123/avatar_old.png'])
  })

  it('removeAvatar should delete file from storage and set avatar_url to null', async () => {
    profileStateRef.value = {
      id: 'user-123',
      avatar_url:
        'https://supabase.co/storage/v1/object/public/avatars/user-123/avatar_current.png',
    }

    const updateEqMock = vi.fn().mockResolvedValue({ error: null })
    const updateMock = vi.fn().mockReturnValue({ eq: updateEqMock })

    const singleMock = vi.fn().mockResolvedValue({
      data: { id: 'user-123', name: 'User', role: 'user', avatar_url: null },
      error: null,
    })
    const selectEqMock = vi.fn().mockReturnValue({ single: singleMock })
    const selectMock = vi.fn().mockReturnValue({ eq: selectEqMock })

    fromMock.mockReturnValue({
      update: updateMock,
      select: selectMock,
    })

    const { removeAvatar } = useProfile()
    await removeAvatar()

    expect(removeMock).toHaveBeenCalledWith(['user-123/avatar_current.png'])
    expect(updateMock).toHaveBeenCalledWith({ avatar_url: null })
    expect(updateEqMock).toHaveBeenCalledWith('id', 'user-123')
  })
})
