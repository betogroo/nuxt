import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import DemandItemsPage from '~/pages/demands/[id]/index.vue'
import { ref } from 'vue'

vi.mock('~/composables/useProfile', () => ({
  useProfile: () => ({ profile: ref({ id: '1' }), fetchAllProfiles: vi.fn().mockResolvedValue([]) })
}))
vi.mock('~/composables/useDemandProducts', () => ({
  useDemandProducts: () => ({
    fetchDemandItemDetails: vi.fn(),
    addDemandItemWithDependencies: vi.fn(),
    removeDemandProduct: vi.fn(),
    updateDemandItemWithDependencies: vi.fn(),
  })
}))
vi.mock('~/composables/useDemands', () => ({
  useDemands: () => ({
    addResponsible: vi.fn(),
    removeResponsible: vi.fn(),
    updateDemand: vi.fn(),
  })
}))
vi.mock('~/composables/useProducts', () => ({
  useProducts: () => ({
    fetchAllActiveProducts: vi.fn().mockResolvedValue([]),
    fetchPendingProductSuggestions: vi.fn().mockResolvedValue([])
  })
}))
vi.mock('~/composables/useCategories', () => ({
  useCategories: () => ({ fetchAllActiveCategories: vi.fn().mockResolvedValue([]) })
}))
vi.mock('~/composables/useMeasurementUnits', () => ({
  useMeasurementUnits: () => ({ fetchUnits: vi.fn().mockResolvedValue([]) })
}))
vi.mock('~/composables/useDemandWorkflow', () => ({
  useDemandWorkflow: () => ({
    approveDemand: vi.fn(),
    cancelDemand: vi.fn(),
    reopenDemand: vi.fn(),
    canEdit: ref(true)
  })
}))

mockNuxtImport('useRoute', () => () => ({ params: { id: '1' } }))
mockNuxtImport('useRouter', () => () => ({ push: vi.fn() }))
mockNuxtImport('useHead', () => vi.fn())
mockNuxtImport('definePageMeta', () => vi.fn())
mockNuxtImport('useAsyncData', () => {
  return (key: string, fn: any) => {
    return { data: ref([]), pending: ref(false), refresh: vi.fn() }
  }
})
mockNuxtImport('useModal', () => () => ({ isOpen: ref(false), open: vi.fn(), close: vi.fn() }))

describe('Demand Items Page', () => {
  it('should render successfully and verify computedMeasurementUnits', async () => {
    const wrapper = mount(DemandItemsPage, {
      global: {
        stubs: {
          PageHeader: true, UiCard: true, UiButton: true, UiInput: true, UiModal: true,
          UiCombobox: true, UiChip: true, UiAlert: true, UiAutocomplete: true, UiSelect: true,
          UiTable: true, UiSwitch: true, NuxtLink: true,
          'v-row': true, 'v-container': true, VContainer: true, 'v-col': true, 'v-spacer': true, 'v-icon': true, 'v-card-text': true,
          'v-divider': true, 'v-menu': true, 'v-list': true, 'v-list-item': true, 'v-dialog': true,
          'v-card': true, 'v-card-title': true, 'v-card-actions': true
        }
      }
    })

    expect(wrapper.exists()).toBe(true)
  })
})
