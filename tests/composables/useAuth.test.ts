import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useAuth } from '../../app/composables/useAuth'

const { navigateToMock, signOutMock, logActionMock } = vi.hoisted(() => ({
  navigateToMock: vi.fn(),
  signOutMock: vi.fn(),
  logActionMock: vi.fn(),
}))

mockNuxtImport('navigateTo', () => navigateToMock)
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
})
