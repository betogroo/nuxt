import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import electionsMiddleware from '~/middleware/elections'

// Nuxt module mocks
const { navigateToMock } = vi.hoisted(() => ({
  navigateToMock: vi.fn(),
}))
mockNuxtImport('navigateTo', () => navigateToMock)

const userRef = { value: { id: '123' } as { id: string } | null }
mockNuxtImport('useSupabaseUser', () => () => userRef)

const ensureUserMock = vi.fn().mockImplementation(async () => userRef.value)
mockNuxtImport('useAuthSession', () => () => ({
  ensureUser: ensureUserMock,
}))

const profileRef = { value: { role: 'user' } as { role: string } | null }
const fetchProfileMock = vi.fn()
mockNuxtImport('useProfile', () => () => ({
  profile: profileRef,
  fetchProfile: fetchProfileMock,
}))

mockNuxtImport('defineNuxtRouteMiddleware', () => (fn: never) => fn)

describe('Elections Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    userRef.value = { id: '123' }
    profileRef.value = { role: 'user' }
  })

  it('should redirect to /login if user is not authenticated', async () => {
    userRef.value = null
    await electionsMiddleware({ fullPath: '/elections' } as never, {} as never)
    expect(navigateToMock).toHaveBeenCalledWith({
      path: '/login',
      query: { redirect: '/elections' },
    })
  })

  it('should fetch profile if profile is not loaded', async () => {
    profileRef.value = null
    await electionsMiddleware({} as never, {} as never)
    expect(fetchProfileMock).toHaveBeenCalled()
  })

  it('should allow access if user is admin', async () => {
    profileRef.value = { role: 'admin' }
    await electionsMiddleware({} as never, {} as never)
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it('should allow access if user is user-election', async () => {
    profileRef.value = { role: 'user-election' }
    await electionsMiddleware({} as never, {} as never)
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it('should allow access if user is manager-election', async () => {
    profileRef.value = { role: 'manager-election' }
    await electionsMiddleware({} as never, {} as never)
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it('should allow access if user is admin-election', async () => {
    profileRef.value = { role: 'admin-election' }
    await electionsMiddleware({} as never, {} as never)
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it('should NOT allow access if user has standard role user', async () => {
    profileRef.value = { role: 'user' }
    await electionsMiddleware({} as never, {} as never)
    expect(navigateToMock).toHaveBeenCalledWith('/')
  })

  it('should NOT allow access if user is uge', async () => {
    profileRef.value = { role: 'uge' }
    await electionsMiddleware({} as never, {} as never)
    expect(navigateToMock).toHaveBeenCalledWith('/')
  })

  it('should NOT allow access if user is iirgd_user', async () => {
    profileRef.value = { role: 'iirgd_user' }
    await electionsMiddleware({} as never, {} as never)
    expect(navigateToMock).toHaveBeenCalledWith('/')
  })

  it('should NOT allow access if user is iirgd_manager', async () => {
    profileRef.value = { role: 'iirgd_manager' }
    await electionsMiddleware({} as never, {} as never)
    expect(navigateToMock).toHaveBeenCalledWith('/')
  })
})
