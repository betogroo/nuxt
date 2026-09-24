import { describe, it, expect, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useDemands } from '../../app/composables/useDemands'
import { useDemandProducts } from '../../app/composables/useDemandProducts'

mockNuxtImport('useSupabaseClient', () => {
  return vi.fn(() => ({}))
})

mockNuxtImport('useSupabaseUser', () => {
  return vi.fn(() => ({ value: { id: 'user-1' } }))
})

describe('useDemands', () => {
  it('should be defined', () => {
    const composable = useDemands()
    expect(composable.fetchDemands).toBeDefined()
    expect(composable.fetchDemandById).toBeDefined()
  })
})

describe('useDemandProducts', () => {
  it('should be defined', () => {
    const composable = useDemandProducts()
    expect(composable.fetchDemandProducts).toBeDefined()
    expect(composable.addDemandProduct).toBeDefined()
  })
})
