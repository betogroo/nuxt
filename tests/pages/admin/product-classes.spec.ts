import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import ProductClassesPage from '~/pages/admin/product-classes.vue'
import { ref } from 'vue'

// Mock the composable
vi.mock('~/composables/useProductClasses', () => {
  return {
    useProductClasses: () => ({
      fetchProductClasses: vi.fn().mockResolvedValue({
        data: [{ id: '5915', name: 'Filtros e redes', is_active: true }],
        count: 1,
      }),
      fetchPendingProductClasses: vi.fn().mockResolvedValue([]),
      fetchAllActiveProductClasses: vi
        .fn()
        .mockResolvedValue([{ id: '5915', name: 'Filtros e redes', is_active: true }]),
      createProductClass: vi.fn(),
      updateProductClass: vi.fn(),
      deleteProductClass: vi.fn(),
      toggleProductClassStatus: vi.fn(),
      approvePendingProductClass: vi.fn(),
      mergePendingProductClass: vi.fn(),
    }),
  }
})

// Mock Nuxt built-ins
mockNuxtImport('useAsyncData', () => {
  return () => {
    return {
      data: ref([{ id: '5915', name: 'Filtros e redes', is_active: true }]),
      pending: ref(false),
      refresh: vi.fn(),
    }
  }
})

mockNuxtImport('useHead', () => {
  return vi.fn()
})

mockNuxtImport('definePageMeta', () => {
  return vi.fn()
})

describe('Product Classes Admin Page', () => {
  it('should render successfully with stubs', () => {
    const wrapper = mount(ProductClassesPage, {
      global: {
        stubs: {
          PageHeader: true,
          UiCard: true,
          UiTable: true,
          UiButton: true,
          UiInput: true,
          UiModal: true,
          UiSwitch: true,
          UiChip: true,
          UiAlert: true,
          'v-row': true,
          'v-col': true,
          'v-spacer': true,
          'v-pagination': true,
          'v-tabs': true,
          'v-tab': true,
          'v-badge': true,
          'v-radio-group': true,
          'v-radio': true,
          'v-autocomplete': true,
          'v-text-field': true,
          'v-form': true,
        },
      },
    })

    expect(wrapper.exists()).toBe(true)
  })

  it('should expose toggleStatus method on the component instance', () => {
    const wrapper = mount(ProductClassesPage, {
      global: {
        stubs: {
          PageHeader: true,
          UiCard: true,
          UiButton: true,
          UiInput: true,
          UiTable: true,
          UiChip: true,
          UiModal: true,
          UiAlert: true,
          UiSwitch: true,
          'v-row': true,
          'v-col': true,
          'v-spacer': true,
          'v-pagination': true,
          'v-tabs': true,
          'v-tab': true,
          'v-badge': true,
          'v-radio-group': true,
          'v-radio': true,
          'v-autocomplete': true,
          'v-text-field': true,
          'v-form': true,
        },
      },
    })

    const vm = wrapper.vm as unknown as { toggleStatus: unknown }
    expect(vm.toggleStatus).toBeDefined()
  })
})
