import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import UnitsPage from '~/pages/admin/units.vue'
import { ref } from 'vue'

// Mock the composable
vi.mock('~/composables/useMeasurementUnits', () => {
  return {
    useMeasurementUnits: () => ({
      fetchUnits: vi.fn().mockResolvedValue([
        { id: '1', name: 'Metro', is_active: true, is_pending: false, legacy_alias: 'm' },
        { id: '2', name: 'Pend', is_active: false, is_pending: true, legacy_alias: null },
      ]),
      createUnit: vi.fn(),
      updateUnit: vi.fn(),
      toggleUnitStatus: vi.fn(),
      approvePendingUnit: vi.fn(),
      mergePendingUnit: vi.fn(),
    }),
  }
})

// Mock Nuxt built-ins using mockNuxtImport
mockNuxtImport('useAsyncData', () => {
  return () => {
    return {
      data: ref([
        { id: '1', name: 'Metro', is_active: true, is_pending: false, legacy_alias: 'm' },
      ]),
      pending: ref(false),
      refresh: vi.fn(),
    }
  }
})

mockNuxtImport('refreshNuxtData', () => {
  return vi.fn()
})

describe('Units Admin Page', () => {
  it('should render successfully with stubs', () => {
    const wrapper = mount(UnitsPage, {
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
        },
      },
    })

    // Check if the component mounted properly
    expect(wrapper.exists()).toBe(true)
  })
})
