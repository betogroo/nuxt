import { describe, it, expect, vi } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import ReportsPage from '~/pages/iirgd/reports.vue'

mockNuxtImport('useHead', () => vi.fn())
mockNuxtImport('definePageMeta', () => vi.fn())

describe('IIRGD Reports Page', () => {
  it('should render successfully', () => {
    const wrapper = shallowMount(ReportsPage)
    expect(wrapper.exists()).toBe(true)
  })
})
