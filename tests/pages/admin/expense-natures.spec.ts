import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import ExpenseNaturesPage from '~/pages/admin/expense-natures.vue'
import { ref } from 'vue'

// Mock the composable
vi.mock('~/composables/useExpenseNatures', () => {
  return {
    useExpenseNatures: () => ({
      fetchExpenseNatures: vi.fn().mockResolvedValue({
        data: [
          { id: '33903000', name: 'MATERIAL DE CONSUMO', is_active: true },
        ],
        count: 1
      }),
      createExpenseNature: vi.fn(),
      updateExpenseNature: vi.fn(),
      deleteExpenseNature: vi.fn(),
    }),
  }
})

// Mock Nuxt built-ins
mockNuxtImport('useAsyncData', () => {
  return () => {
    return {
      data: ref([
        { id: '33903000', name: 'MATERIAL DE CONSUMO', is_active: true },
      ]),
      pending: ref(false),
      refresh: vi.fn(),
    }
  }
})

// Removed mock

mockNuxtImport('useHead', () => {
  return vi.fn()
})

mockNuxtImport('definePageMeta', () => {
  return vi.fn()
})

describe('Expense Natures Admin Page', () => {
  it('should render successfully with stubs', () => {
    const wrapper = mount(ExpenseNaturesPage, {
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
        },
      },
    })

    // Check if the component mounted properly
    expect(wrapper.exists()).toBe(true)
  })
})
