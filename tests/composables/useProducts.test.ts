import { describe, it, expect, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useProducts } from '../../app/composables/useProducts'

mockNuxtImport('useSupabaseClient', () => {
  return vi.fn(() => ({}))
})

mockNuxtImport('useSupabaseUser', () => {
  return vi.fn(() => ({ value: { id: 'user-1' } }))
})

describe('useProducts', () => {
  it('should be defined', () => {
    const composable = useProducts()
    expect(composable.fetchProducts).toBeDefined()
    expect(composable.createProduct).toBeDefined()
  })
})
