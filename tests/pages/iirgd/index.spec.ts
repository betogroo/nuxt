import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import IirgdPage from '~/pages/iirgd/index.vue'

mockNuxtImport('useHead', () => vi.fn())
mockNuxtImport('definePageMeta', () => vi.fn())

describe('IIRGD Page', () => {
  it('should render successfully', () => {
    const wrapper = mount(IirgdPage, {
      global: {
        stubs: {
          PageHeader: true,
          UiCard: false,
          'v-row': true,
          'v-col': true,
          'v-card': true,
          'v-card-text': true,
          'v-card-title': true
        }
      }
    })

    expect(wrapper.exists()).toBe(true)
    
  })
})
