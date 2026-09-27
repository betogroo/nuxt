import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import ugeMiddleware from '~/middleware/uge'

// Nuxt module mocks
mockNuxtImport('navigateTo', () => () => {})

mockNuxtImport('useSupabaseUser', () => {
  return () => ({ value: { id: '123' } })
})

const profileRef = { value: { role: 'user' } } as any
mockNuxtImport('useProfile', () => {
  return () => ({
    profile: profileRef,
    fetchProfile: vi.fn()
  })
})

mockNuxtImport('defineNuxtRouteMiddleware', () => (fn: any) => fn)

describe('UGE Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    profileRef.value = { role: 'user' }
  })

  it('should allow access if user is admin', async () => {
    profileRef.value = { role: 'admin' }
    await ugeMiddleware({} as any, {} as any)
  })

  it('should allow access if user is uge', async () => {
    profileRef.value = { role: 'uge' }
    await ugeMiddleware({} as any, {} as any)
  })

  it('should allow access if user is user', async () => {
    profileRef.value = { role: 'user' }
    await ugeMiddleware({} as any, {} as any)
  })

  it('should evaluate redirect if user is iirgd', async () => {
    profileRef.value = { role: 'iirgd' }
    await ugeMiddleware({} as any, {} as any)
  })
})
