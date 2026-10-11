import { describe, it, expect, vi } from 'vitest'
import { useAdminDashboard } from '../../app/composables/useAdminDashboard'

import { mockNuxtImport } from '@nuxt/test-utils/runtime'

mockNuxtImport('useSupabaseClient', () => {
  return vi.fn(() => ({}))
})

describe('useAdminDashboard', () => {
  it('should return correct log colors based on action type', () => {
    const { getLogColor } = useAdminDashboard()

    expect(getLogColor('CREATE_USER')).toBe('success')
    expect(getLogColor('ADD_PRODUCT')).toBe('success')
    expect(getLogColor('DELETE_DEMAND')).toBe('error')
    expect(getLogColor('REMOVE_ITEM')).toBe('error')
    expect(getLogColor('UPDATE_PROFILE')).toBe('warning')
    expect(getLogColor('LOGIN')).toBe('primary')
  })

  it('should fetch and structure dashboard metrics properly', async () => {
    const mockClient = {
      from: vi.fn((table: string) => {
        if (table === 'profiles') return { select: vi.fn().mockResolvedValue({ count: 12 }) }
        if (table === 'products') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ count: 45 }) }) }
        if (table === 'demands') {
          return {
            select: vi.fn((_cols: string, opts?: { count?: string }) => {
              if (opts?.count) return Promise.resolve({ count: 30 })
              return { eq: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: [] }) }) }
            }),
          }
        }
        if (table === 'iirgd_demands') return { select: vi.fn().mockResolvedValue({ count: 88 }) }
        if (table === 'suppliers') return { select: vi.fn().mockResolvedValue({ count: 7 }) }
        if (table === 'logs') {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: [] }),
              }),
            }),
          }
        }
        return { select: vi.fn().mockResolvedValue({ count: 0, data: [] }) }
      }),
    }

    vi.mocked(useSupabaseClient).mockReturnValue(
      mockClient as unknown as ReturnType<typeof useSupabaseClient>,
    )

    const { fetchDashboardMetrics } = useAdminDashboard()
    const metrics = await fetchDashboardMetrics()

    expect(metrics.usersCount).toBe(12)
    expect(metrics.productsCount).toBe(45)
    expect(metrics.demandsCount).toBe(30)
    expect(metrics.iirgdDemandsCount).toBe(88)
    expect(metrics.suppliersCount).toBe(7)
  })
})
