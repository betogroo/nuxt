import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import ugeMiddleware from '~/middleware/uge'

// Nuxt module mocks
const { navigateToMock } = vi.hoisted(() => ({
  navigateToMock: vi.fn(),
}))
mockNuxtImport('navigateTo', () => navigateToMock)

mockNuxtImport('useSupabaseUser', () => {
  return () => ({ value: { id: '123' } })
})

const profileRef = { value: { role: 'user' } } as never
mockNuxtImport('useProfile', () => {
  return () => ({
    profile: profileRef,
    fetchProfile: vi.fn(),
  })
})

mockNuxtImport('defineNuxtRouteMiddleware', () => (fn: never) => fn)

describe('UGE Middleware', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    profileRef.value = { role: 'user' }
  })

  it('should allow access if user is admin', async () => {
    profileRef.value = { role: 'admin' }
    await ugeMiddleware({} as never, {} as never)
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it('should allow access if user is uge', async () => {
    profileRef.value = { role: 'uge' }
    await ugeMiddleware({} as never, {} as never)
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it('should NOT allow access if user is generic user', async () => {
    profileRef.value = { role: 'user' }
    await ugeMiddleware({} as never, {} as never)
    expect(navigateToMock).toHaveBeenCalledWith('/')
  })

  it('should NOT allow access if user is iirgd', async () => {
    profileRef.value = { role: 'iirgd' }
    await ugeMiddleware({} as never, {} as never)
    expect(navigateToMock).toHaveBeenCalledWith('/')
  })
})
