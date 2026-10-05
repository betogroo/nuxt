import { describe, it, expect, vi } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import CitizensPage from '~/pages/iirgd/citizens/index.vue'

mockNuxtImport('useHead', () => vi.fn())
mockNuxtImport('definePageMeta', () => vi.fn())

mockNuxtImport('useIirgdCitizens', () => {
  return () => ({
    fetchCitizens: vi.fn(),
  })
})

mockNuxtImport('useAsyncData', () => {
  return () => ({
    data: {
      value: [{ id: 'cit-1', name: 'John Doe', rg: '123', created_at: new Date().toISOString() }],
    },
    pending: { value: false },
  })
})

describe('Citizens Index Page', () => {
  it('should render successfully', () => {
    const wrapper = shallowMount(CitizensPage, {
      global: {
        stubs: {
          NuxtLink: true,
          PageHeader: true,
          UiCard: true,
          UiTable: true,
        },
      },
    })
    expect(wrapper.exists()).toBe(true)
  })
})
