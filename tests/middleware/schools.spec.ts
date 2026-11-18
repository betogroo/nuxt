import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import schoolsMiddleware from '~/middleware/schools'

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

describe('Schools Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    userRef.value = { id: '123' }
    profileRef.value = { role: 'user' }
  })

  it('should redirect to /login if user is not authenticated', async () => {
    userRef.value = null
    await schoolsMiddleware({ fullPath: '/schools' } as never, {} as never)
    expect(navigateToMock).toHaveBeenCalledWith({
      path: '/login',
      query: { redirect: '/schools' },
    })
  })

  it('should fetch profile if profile is not loaded', async () => {
    profileRef.value = null
    await schoolsMiddleware({} as never, {} as never)
    expect(fetchProfileMock).toHaveBeenCalled()
  })

  it('should allow access if user is admin', async () => {
    profileRef.value = { role: 'admin' }
    await schoolsMiddleware({} as never, {} as never)
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it('should allow access if user is school-manager', async () => {
    profileRef.value = { role: 'school-manager' }
    await schoolsMiddleware({} as never, {} as never)
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it('should allow access if user is school-user', async () => {
    profileRef.value = { role: 'school-user' }
    await schoolsMiddleware({} as never, {} as never)
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it('should NOT allow access if user has standard role user', async () => {
    profileRef.value = { role: 'user' }
    await schoolsMiddleware({} as never, {} as never)
    expect(navigateToMock).toHaveBeenCalledWith('/')
  })

  it('should NOT allow access if user is uge', async () => {
    profileRef.value = { role: 'uge' }
    await schoolsMiddleware({} as never, {} as never)
    expect(navigateToMock).toHaveBeenCalledWith('/')
  })

  it('should NOT allow access if user is iirgd_user', async () => {
    profileRef.value = { role: 'iirgd_user' }
    await schoolsMiddleware({} as never, {} as never)
    expect(navigateToMock).toHaveBeenCalledWith('/')
  })

  it('should NOT allow access if user is user-election', async () => {
    profileRef.value = { role: 'user-election' }
    await schoolsMiddleware({} as never, {} as never)
    expect(navigateToMock).toHaveBeenCalledWith('/')
  })
})
