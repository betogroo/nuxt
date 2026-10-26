import { describe, it, expect, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import iirgdMiddleware from '~/middleware/iirgd'

// Nuxt module mocks
const { navigateToMock } = vi.hoisted(() => ({
  navigateToMock: vi.fn(),
}))
mockNuxtImport('navigateTo', () => navigateToMock)

mockNuxtImport('useSupabaseUser', () => {
  return () => ({ value: { id: '123' } })
})
mockNuxtImport('useAuthSession', () => () => ({
  ensureUser: vi.fn().mockResolvedValue({ id: '123' }),
}))

mockNuxtImport('useProfile', () => {
  return () => ({
    profile: { value: { role: 'admin' } },
    fetchProfile: vi.fn(),
  })
})

mockNuxtImport('defineNuxtRouteMiddleware', () => (fn: unknown) => fn)

describe('IIRGD Middleware', () => {
  it('should allow access if user is admin', async () => {
    await iirgdMiddleware({} as never, {} as never)
    expect(navigateToMock).not.toHaveBeenCalled()
  })
})
