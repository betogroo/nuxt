import { describe, it, expect, vi } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import DemandItemsPage from '~/pages/demands/[id]/index.vue'

mockNuxtImport('useAsyncData', () => vi.fn().mockReturnValue({ data: { value: [] }, pending: { value: false }, refresh: vi.fn() }))
mockNuxtImport('useHead', () => vi.fn())
mockNuxtImport('useMeasurementUnits', () => () => ({
  fetchAliases: vi.fn().mockResolvedValue([]),
  registerPendingAliasAndUnit: vi.fn().mockResolvedValue({ alias: {}, unit: {} }),
}))
mockNuxtImport('useSupabaseClient', () => () => ({}))
mockNuxtImport('useDemandProducts', () => () => ({
  fetchDemandItemDetails: vi.fn().mockResolvedValue({}),
  addDemandItemWithDependencies: vi.fn().mockResolvedValue({}),
  updateDemandItemWithDependencies: vi.fn().mockResolvedValue({}),
  removeDemandProduct: vi.fn().mockResolvedValue({}),
}))
mockNuxtImport('useRoute', () => () => ({
  params: { id: 'demand-123' },
}))
mockNuxtImport('useRouter', () => () => ({
  push: vi.fn(),
}))
mockNuxtImport('useSupabaseUser', () => () => ({
  value: { id: 'user-1' }
}))
mockNuxtImport('useProfile', () => () => ({
  fetchAllProfiles: vi.fn().mockResolvedValue([])
}))
mockNuxtImport('useDemands', () => () => ({
  fetchDemandDetails: vi.fn().mockResolvedValue({}),
  fetchDemandResponsibles: vi.fn().mockResolvedValue([]),
  addDemandResponsible: vi.fn(),
  removeDemandResponsible: vi.fn(),
}))
mockNuxtImport('useProducts', () => () => ({
  fetchProducts: vi.fn().mockResolvedValue([])
}))
mockNuxtImport('useExpenseNatures', () => () => ({
  fetchCategories: vi.fn().mockResolvedValue([])
}))

describe('Demand Items Page', () => {
  it('should successfully open the Add Modal without errors', async () => {
    const wrapper = shallowMount(DemandItemsPage)
    const vm = wrapper.vm as any
    
    // Call the function
    vm.openAddModal()
    
    // Check state
    expect(vm.isModalOpen).toBe(true)
    expect(vm.selectedUnitSearch).toBe('')
    expect(vm.selectedProductId).toBe(null)
  })
  it('should render successfully with shallowMount', () => {
    const wrapper = shallowMount(DemandItemsPage)
    expect(wrapper.exists()).toBe(true)
  })
})

