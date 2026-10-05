import { describe, it, expect, vi } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import DemandItemsPage from '~/pages/demands/[id]/index.vue'

const { mockProductsList } = vi.hoisted(() => ({
  mockProductsList: { value: [] as unknown[] },
}))

mockNuxtImport('useAsyncData', () => (key: string) => {
  if (key === 'all-active-products') {
    return { data: mockProductsList, pending: { value: false }, refresh: vi.fn() }
  }
  return { data: { value: [] }, pending: { value: false }, refresh: vi.fn() }
})
mockNuxtImport('useHead', () => vi.fn())
mockNuxtImport('useMeasurementUnits', () => () => ({
  fetchAliases: vi.fn().mockResolvedValue([]),
  resolveOrCreateUnit: vi.fn().mockResolvedValue('unit-1'),
  registerPendingAliasAndUnit: vi.fn().mockResolvedValue({ alias: {}, unit: {} }),
}))
mockNuxtImport('useSupabaseClient', () => () => ({
  from: vi.fn().mockReturnValue({
    insert: vi.fn().mockReturnValue({
      select: vi
        .fn()
        .mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'new-unit' } }) }),
    }),
  }),
}))
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
  value: { id: 'user-1' },
}))
mockNuxtImport('useProfile', () => () => ({
  fetchAllProfiles: vi.fn().mockResolvedValue([]),
}))
mockNuxtImport('useDemands', () => () => ({
  fetchDemandDetails: vi.fn().mockResolvedValue({}),
  fetchDemandResponsibles: vi.fn().mockResolvedValue([]),
  addDemandResponsible: vi.fn(),
  removeDemandResponsible: vi.fn(),
}))
mockNuxtImport('useProducts', () => () => ({
  fetchProducts: vi.fn().mockResolvedValue([]),
}))
mockNuxtImport('useExpenseNatures', () => () => ({
  fetchExpenseNatures: vi.fn().mockResolvedValue([]),
}))

describe('Demand Items Page', () => {
  it('should resolve final unit and call saveToDemand', async () => {
    const wrapper = shallowMount(DemandItemsPage)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vm = wrapper.vm as any

    // Call the function
    vm.openAddModal()

    // Check state
    expect(vm.isModalOpen).toBe(true)
    expect(vm.selectedUnitSearch).toBe('')
    expect(vm.selectedProductId).toBe(null)
  })
  it('should extract available product units and pre-select first unit when product is selected', async () => {
    mockProductsList.value = [
      {
        id: 'prod-abc',
        name: 'Caneta Esferográfica',
        product_units: [
          {
            unit_id: 'unit-cx',
            measurement_units: { id: 'unit-cx', name: 'Caixa com 50', legacy_alias: 'CX' },
          },
          {
            unit_id: 'unit-un',
            measurement_units: { id: 'unit-un', name: 'Unidade', legacy_alias: null },
          },
        ],
      },
    ]

    const wrapper = shallowMount(DemandItemsPage)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vm = wrapper.vm as any

    // Select the product
    vm.selectedProductId = 'prod-abc'
    await wrapper.vm.$nextTick()

    // Verify units belonging to the product are correctly extracted
    expect(vm.availableUnitsForSelectedProduct).toHaveLength(2)
    expect(vm.availableUnitsForSelectedProduct[0].name).toBe('Caixa com 50')

    // Verify first unit was auto pre-selected
    expect(vm.selectedUnitSearch).toBe('Caixa com 50')
  })

  it('should render successfully with shallowMount', () => {
    const wrapper = shallowMount(DemandItemsPage)
    expect(wrapper.exists()).toBe(true)
  })
})
