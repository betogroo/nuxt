import { describe, it, expect, vi } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import UnitsPage from '~/pages/admin/units.vue'

mockNuxtImport('useAsyncData', () => vi.fn().mockReturnValue({ data: { value: [] }, pending: { value: false }, refresh: vi.fn() }))
mockNuxtImport('useMeasurementUnits', () => () => ({
  fetchUnits: vi.fn().mockResolvedValue([]),
  fetchAliases: vi.fn().mockResolvedValue([]),
  createUnit: vi.fn(),
  updateUnit: vi.fn(),
  toggleUnitStatus: vi.fn(),
  createAliasAsAdmin: vi.fn(),
  updateAliasAsAdmin: vi.fn(),
  deleteAliasAsAdmin: vi.fn(),
  approvePendingUnit: vi.fn(),
  mergePendingUnit: vi.fn(),
}))

describe('Units Admin Page', () => {
  it('should render successfully with shallowMount', () => {
    const wrapper = shallowMount(UnitsPage)
    expect(wrapper.exists()).toBe(true)
  })
})
