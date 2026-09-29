import { describe, it, expect, vi } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import DemandItemsPage from '~/pages/demands/[id]/index.vue'

mockNuxtImport('useAsyncData', () => vi.fn().mockReturnValue({ data: { value: [] }, pending: { value: false }, refresh: vi.fn() }))
mockNuxtImport('useHead', () => vi.fn())
mockNuxtImport('useMeasurementUnits', () => () => ({
  fetchAliases: vi.fn().mockResolvedValue([]),
  resolveOrCreateUnit: vi.fn().mockResolvedValue('unit-1'),
  registerPendingAliasAndUnit: vi.fn().mockResolvedValue({ alias: {}, unit: {} }),
}))
mockNuxtImport('useSupabaseClient', () => () => ({ from: vi.fn().mockReturnValue({ insert: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'new-unit' } }) }) }) }) }))
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
  it('should resolve final unit and call saveToDemand', async () => {
    const wrapper = shallowMount(DemandItemsPage)
    const vm = wrapper.vm as any

    vm.demandId = '123'
    vm.isNewProductMode = false
    vm.selectedProductId = 'prod-1'
    vm.selectedUnitSearch = 'cx'
    vm.itemQuantity = 10
    vm.itemReferencePrice = 5.5
    
    // Mock allMeasurementUnits
    vm.allMeasurementUnits = [{ id: 'unit-1', name: 'CX' }]
    
    // Since useDemandProducts mock returns a resolved addDemandItemWithDependencies, 
    // it should not throw 'allAliases is not defined'.
    await vm.saveToDemand()
    
    expect(vm.saveError).toBe('')
  })
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




