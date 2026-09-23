import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import CategoriesPage from '~/pages/admin/categories.vue'
import { ref } from 'vue'

vi.mock('~/composables/useCategories', () => {
  return {
    useCategories: () => ({
      fetchCategories: vi
        .fn()
        .mockResolvedValue({ data: [{ id: '1', name: 'Alimentos', is_active: true }], count: 1 }),
      fetchAllActiveCategories: vi.fn().mockResolvedValue([{ id: '1', name: 'Alimentos' }]),
      fetchPendingSuggestions: vi.fn().mockResolvedValue([{ name: 'Papelaria', count: 2 }]),
      createCategory: vi.fn(),
      updateCategory: vi.fn(),
      resolveSuggestion: vi.fn(),
      toggleCategoryStatus: vi.fn(),
    }),
  }
})

// Mock Nuxt auto-imports
mockNuxtImport('useAsyncData', () => {
  return (key: string) => {
    if (key === 'admin-categories') {
      return {
        data: ref([{ id: '1', name: 'Alimentos', is_active: true }]),
        pending: ref(false),
        refresh: vi.fn(),
      }
    }
    if (key === 'all-active-categories') {
      return {
        data: ref([{ id: '1', name: 'Alimentos' }]),
        pending: ref(false),
        refresh: vi.fn(),
      }
    }
    if (key === 'admin-suggestions') {
      return {
        data: ref([{ name: 'Papelaria', count: 2 }]),
        pending: ref(false),
        refresh: vi.fn(),
      }
    }
    return { data: ref(null), pending: ref(false), refresh: vi.fn() }
  }
})

mockNuxtImport('refreshNuxtData', () => {
  return vi.fn()
})

mockNuxtImport('useHead', () => {
  return vi.fn()
})

describe('Categories Admin Page', () => {
  it('should render successfully with stubs', () => {
    const wrapper = mount(CategoriesPage, {
      global: {
        stubs: {
          PageHeader: true,
          UiCard: true,
          UiTable: true,
          UiButton: true,
          UiInput: true,
          UiSelect: true,
          'v-row': true,
          'v-col': true,
          'v-icon': true,
          'v-alert': true,
          'v-chip': true,
          'v-spacer': true,
          'v-dialog': true,
          'v-switch': true,
          'v-radio-group': true,
          'v-radio': true,
          'v-slide-y-transition': true,
          'v-pagination': true,
        },
      },
    })

    expect(wrapper.exists()).toBe(true)
  })
})
