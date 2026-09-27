import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import iirgdMiddleware from '~/middleware/iirgd'



// Nuxt module mocks
mockNuxtImport('navigateTo', () => { return () => {} })

mockNuxtImport('useSupabaseUser', () => {
  return () => ({ value: { id: '123' } })
})

mockNuxtImport('useProfile', () => {
  return () => ({
    profile: { value: { role: 'admin' } },
    fetchProfile: vi.fn()
  })
})

mockNuxtImport('defineNuxtRouteMiddleware', () => (fn: any) => fn)

describe('IIRGD Middleware', () => {
  it('should allow access if user is admin', async () => {
    await iirgdMiddleware({} as any, {} as any)
  })
})
