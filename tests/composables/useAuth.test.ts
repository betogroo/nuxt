import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useAuth } from '../../app/composables/useAuth'

const { navigateToMock, signOutMock, logActionMock, pluckMock, cookieRef, routeRef } = vi.hoisted(
  () => ({
    navigateToMock: vi.fn(),
    signOutMock: vi.fn(),
    logActionMock: vi.fn(),
    pluckMock: vi.fn(),
    cookieRef: { value: null as string | null },
    routeRef: { query: {} as Record<string, string> },
  }),
)

mockNuxtImport('useRoute', () => () => routeRef)
mockNuxtImport('navigateTo', () => navigateToMock)
mockNuxtImport('useSupabaseCookieRedirect', () => () => ({
  pluck: pluckMock,
}))
mockNuxtImport('useCookie', () => () => cookieRef)
mockNuxtImport('useSupabaseClient', () =>
  vi.fn(() => ({
    from: vi.fn(),
    auth: {
      signInWithPassword: vi.fn(),
      signOut: signOutMock,
      getSession: vi.fn(),
    },
  })),
)
mockNuxtImport('useSupabaseUser', () => vi.fn(() => ({ value: { id: 'user-1' } })))
mockNuxtImport('useLogger', () => () => ({ logAction: logActionMock }))

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should be defined', () => {
    const composable = useAuth()
    expect(composable).toBeDefined()
  })

  it('should signOut and redirect to /login by default when no route is provided', async () => {
    const { signOut } = useAuth()
    await signOut()

    expect(logActionMock).toHaveBeenCalledWith('LOGOUT', 'Usuário fez logoff do sistema.', 'user-1')
    expect(signOutMock).toHaveBeenCalledTimes(1)
    expect(navigateToMock).toHaveBeenCalledWith('/login')
  })

  it('should signOut and redirect to custom route when a valid string is provided', async () => {
    const { signOut } = useAuth()
    await signOut('/login?error=inactive')

    expect(logActionMock).toHaveBeenCalledWith('LOGOUT', 'Usuário fez logoff do sistema.', 'user-1')
    expect(signOutMock).toHaveBeenCalledTimes(1)
    expect(navigateToMock).toHaveBeenCalledWith('/login?error=inactive')
  })

  it('should safely fallback to /login if a non-string argument (like DOM click event) is passed', async () => {
    const { signOut } = useAuth()
    await signOut({ target: {} } as unknown as string)

    expect(logActionMock).toHaveBeenCalledWith('LOGOUT', 'Usuário fez logoff do sistema.', 'user-1')
    expect(signOutMock).toHaveBeenCalledTimes(1)
    expect(navigateToMock).toHaveBeenCalledWith('/login')
  })

  describe('getRedirectUrl', () => {
    it('returns path from route.query.redirect when present', () => {
      routeRef.query = { redirect: '/elections/abc/ballot-box/def' }
      pluckMock.mockReturnValue('/other')
      cookieRef.value = null

      const { getRedirectUrl } = useAuth()
      expect(getRedirectUrl()).toBe('/elections/abc/ballot-box/def')
      routeRef.query = {}
    })

    it('returns path from useSupabaseCookieRedirect when available', () => {
      pluckMock.mockReturnValue('/elections/123/ballot-box/456')
      cookieRef.value = null

      const { getRedirectUrl } = useAuth()
      expect(getRedirectUrl()).toBe('/elections/123/ballot-box/456')
    })

    it('returns path from cookie fallback when useSupabaseCookieRedirect returns null', () => {
      pluckMock.mockReturnValue(null)
      cookieRef.value = '/demands'

      const { getRedirectUrl } = useAuth()
      expect(getRedirectUrl()).toBe('/demands')
      expect(cookieRef.value).toBeNull()
    })

    it('returns default "/" when no redirect path is stored', () => {
      pluckMock.mockReturnValue(null)
      cookieRef.value = null

      const { getRedirectUrl } = useAuth()
      expect(getRedirectUrl()).toBe('/')
    })
  })
})
