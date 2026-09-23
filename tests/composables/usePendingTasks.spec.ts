import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

import { ref } from 'vue'

import { usePendingTasks } from '~/composables/usePendingTasks'

const mockSupabase = {
  from: vi.fn(),
}

mockNuxtImport('useSupabaseClient', () => {
  return () => mockSupabase
})

mockNuxtImport('useAsyncData', () => {
  return (key: string, handler: () => Promise<unknown>) => {
    const data = ref<unknown>(0)
    handler().then((res) => {
      data.value = res
    })
    return { data, refresh: vi.fn() }
  }
})

describe('usePendingTasks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should correctly fetch and calculate pending tasks', async () => {
    // Mock for products (categories)
    const productsMockEq = { count: 3, error: null }
    const unitsMockEq = { count: 2, error: null }

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'products') {
        return {
          select: vi.fn().mockReturnThis(),
          not: vi.fn().mockResolvedValue(productsMockEq),
        }
      }
      if (table === 'measurement_units') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue(unitsMockEq),
        }
      }
    })

    const { totalPending } = usePendingTasks()

    // Wait for the async data promises to resolve and refs to update
    // Wait multiple ticks or a small delay
    await new Promise((r) => setTimeout(r, 10))

    expect(totalPending.value).toBe(5)
  })
})
