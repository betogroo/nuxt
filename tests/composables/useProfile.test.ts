import { describe, it, expect, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useProfile } from '../../app/composables/useProfile'

mockNuxtImport('useSupabaseClient', () => vi.fn(() => ({ from: vi.fn(), auth: { signInWithPassword: vi.fn(), signOut: vi.fn(), getSession: vi.fn() } })))
mockNuxtImport('useSupabaseUser', () => vi.fn(() => ({ value: { id: 'user-1' } })))
mockNuxtImport('useState', () => vi.fn(() => ({ value: null })))
mockNuxtImport('useLogger', () => () => ({ logAction: vi.fn() }))

describe('useProfile', () => {
  it('should be defined', () => {
    const composable = useProfile()
    expect(composable).toBeDefined()
  })
})
