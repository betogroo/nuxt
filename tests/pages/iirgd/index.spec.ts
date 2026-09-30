import { describe, it, expect, vi } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import IirgdPage from '~/pages/iirgd/index.vue'

mockNuxtImport('useHead', () => vi.fn())
mockNuxtImport('definePageMeta', () => vi.fn())

mockNuxtImport('useIirgdDemands', () => {
  return () => ({
    fetchDemands: vi.fn(),
    createDemand: vi.fn(),
  })
})

mockNuxtImport('useAsyncData', () => {
  return () => ({ data: { value: [] }, pending: { value: false }, refresh: vi.fn() })
})

describe('IIRGD Page', () => {
  it('should render successfully', () => {
    const wrapper = shallowMount(IirgdPage)
    expect(wrapper.exists()).toBe(true)
  })
})
