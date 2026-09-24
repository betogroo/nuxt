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
})
