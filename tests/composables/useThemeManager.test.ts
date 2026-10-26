import { describe, it, expect, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useThemeManager } from '../../app/composables/useThemeManager'

mockNuxtImport('useSupabaseClient', () => vi.fn(() => ({ from: vi.fn() })))
mockNuxtImport('useSupabaseUser', () => vi.fn(() => ({ value: { id: 'user-1' } })))
mockNuxtImport('useLogger', () => () => ({ logAction: vi.fn() }))
mockNuxtImport('useState', () => vi.fn(() => ({ value: 'light' })))
mockNuxtImport('useNuxtApp', () =>
  vi.fn(() => ({ $vuetify: { theme: { global: { name: { value: 'light' } } } } })),
)
mockNuxtImport('useProfile', () => vi.fn(() => ({ profile: { value: null } })))

describe('useThemeManager', () => {
  it('should be defined', () => {
    const composable = useThemeManager()
    expect(composable).toBeDefined()
  })
})
