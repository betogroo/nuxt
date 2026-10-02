import { describe, it, expect, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useDemandWorkflow } from '../../app/composables/useDemandWorkflow'

mockNuxtImport('useSupabaseClient', () =>
  vi.fn(() => ({
    from: vi.fn(),
    auth: { signInWithPassword: vi.fn(), signOut: vi.fn(), getSession: vi.fn() },
  })),
)
mockNuxtImport('useSupabaseUser', () => vi.fn(() => ({ value: { id: 'user-1' } })))
mockNuxtImport('useLogger', () => () => ({ logAction: vi.fn() }))

describe('useDemandWorkflow', () => {
  it('should be defined', () => {
    const composable = useDemandWorkflow()
    expect(composable).toBeDefined()
  })
})
