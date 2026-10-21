import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useAuthSession } from '../../app/composables/useAuthSession'

const userRef = { value: null as { id: string; email?: string } | null }
const sessionRef = { value: null as Record<string, unknown> | null }

const getSessionMock = vi.fn()
const getClaimsMock = vi.fn()

mockNuxtImport('useSupabaseUser', () => () => userRef)
mockNuxtImport('useSupabaseSession', () => () => sessionRef)
mockNuxtImport('useSupabaseClient', () =>
  vi.fn(() => ({
    auth: {
      getSession: getSessionMock,
      getClaims: getClaimsMock,
    },
  })),
)

describe('useAuthSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    userRef.value = null
    sessionRef.value = null
  })

  it('returns immediately if user.value is already populated', async () => {
    userRef.value = { id: 'user-already-loaded', email: 'test@test.com' }
    const { ensureUser } = useAuthSession()
    const result = await ensureUser()

    expect(result).toEqual({ id: 'user-already-loaded', email: 'test@test.com' })
    expect(getSessionMock).not.toHaveBeenCalled()
  })

  it('restores session and user when user.value is null and active session exists', async () => {
    const fakeSession = {
      user: { id: 'user-restored', email: 'restored@test.com' },
      access_token: 'fake-token',
    }
    const fakeClaims = {
      sub: 'user-restored',
      email: 'restored@test.com',
    }

    getSessionMock.mockResolvedValue({ data: { session: fakeSession } })
    getClaimsMock.mockResolvedValue({ data: { claims: fakeClaims } })

    const { ensureUser } = useAuthSession()
    const result = await ensureUser()

    expect(getSessionMock).toHaveBeenCalledTimes(1)
    expect(sessionRef.value).toEqual(fakeSession)
    expect(result).toEqual(fakeClaims)
  })

  it('returns null when no active session exists in Supabase storage', async () => {
    getSessionMock.mockResolvedValue({ data: { session: null } })

    const { ensureUser } = useAuthSession()
    const result = await ensureUser()

    expect(getSessionMock).toHaveBeenCalledTimes(1)
    expect(result).toBeNull()
  })

  it('handles getSession exceptions gracefully without crashing', async () => {
    getSessionMock.mockRejectedValue(new Error('Network error'))

    const { ensureUser } = useAuthSession()
    const result = await ensureUser()

    expect(result).toBeNull()
  })
})
