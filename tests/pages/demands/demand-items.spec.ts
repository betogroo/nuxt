import { describe, it, expect, vi } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import DemandItemsPage from '~/pages/demands/[id]/index.vue'

const { mockProductsList, mockDemandData, mockUpdateDemandDb } = vi.hoisted(() => ({
  mockProductsList: { value: [] as unknown[] },
  mockDemandData: { value: null as Record<string, unknown> | null },
  mockUpdateDemandDb: vi.fn().mockResolvedValue({}),
}))

mockNuxtImport('useAsyncData', () => (key: string) => {
  if (key === 'all-active-products') {
    return { data: mockProductsList, pending: { value: false }, refresh: vi.fn() }
  }
  if (key === 'demand-demand-123') {
    return { data: mockDemandData, pending: { value: false }, refresh: vi.fn() }
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
const mockAddDemandItemWithDependencies = vi.fn().mockResolvedValue({})
const mockUpdateDemandItemWithDependencies = vi.fn().mockResolvedValue({})

mockNuxtImport('useProductClasses', () => () => ({
  fetchAllActiveProductClasses: vi.fn().mockResolvedValue([]),
}))
mockNuxtImport('useDemandProducts', () => () => ({
  fetchDemandItemDetails: vi.fn().mockResolvedValue({}),
  addDemandItemWithDependencies: mockAddDemandItemWithDependencies,
  updateDemandItemWithDependencies: mockUpdateDemandItemWithDependencies,
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
  fetchDemandById: vi.fn().mockResolvedValue({}),
  updateDemand: mockUpdateDemandDb,
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
    expect(vm.newProductClassId).toBe(null)
    expect(vm.isSuggestingClass).toBe(false)
    expect(vm.suggestedClassId).toBe('')
    expect(vm.suggestedClassName).toBe('')
  })
  it('should pass product class fields to addDemandItemWithDependencies when in new product mode', async () => {
    const wrapper = shallowMount(DemandItemsPage)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vm = wrapper.vm as any

    vm.demandId = 'demand-123'
    vm.isNewProductMode = true
    vm.newProductName = 'Teclado Mecânico'
    vm.newProductExpenseNatureId = '33903000'
    vm.newProductClassId = '5915'
    vm.isSuggestingClass = false
    vm.selectedUnitSearch = 'un'
    vm.itemQuantity = 2
    vm.itemReferencePrice = 150

    await vm.saveToDemand()

    expect(mockAddDemandItemWithDependencies).toHaveBeenCalledWith(
      expect.objectContaining({
        demandId: 'demand-123',
        isNewProductMode: true,
        newProductName: 'Teclado Mecânico',
        newProductExpenseNatureId: '33903000',
        newProductClassId: '5915',
        isSuggestingClass: false,
      }),
    )
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

  it('should populate bid interval fields when openEditItemModal is called', () => {
    const wrapper = shallowMount(DemandItemsPage)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vm = wrapper.vm as any

    vm.openEditItemModal({
      id: 'item-1',
      quantity: 5,
      reference_price: 25.5,
      bid_interval: 2.5,
      bid_interval_type: 'monetary',
      product_id: 'prod-1',
      product: { id: 'prod-1', name: 'Notebook' },
      unit_id: 'unit-1',
      measurement_units: { id: 'unit-1', name: 'Unidade' },
    })

    expect(vm.isEditItemModalOpen).toBe(true)
    expect(vm.editItemFormMeta.productName).toBe('Notebook')
    expect(vm.eiBidInterval).toBe(2.5)
    expect(vm.eiBidIntervalType).toBe('monetary')
  })

  it('should pass bid interval fields to updateDemandItemWithDependencies when saveEditItem is executed', async () => {
    const wrapper = shallowMount(DemandItemsPage)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vm = wrapper.vm as any

    vm.demandId = 'demand-123'
    vm.openEditItemModal({
      id: 'item-10',
      quantity: 10,
      reference_price: 100,
      bid_interval: 4,
      bid_interval_type: 'percentage',
      product_id: 'prod-10',
      product: { id: 'prod-10', name: 'Projetor' },
      unit_id: 'unit-10',
      measurement_units: { id: 'unit-10', name: 'Unidade' },
    })

    await vm.saveEditItem()

    expect(mockUpdateDemandItemWithDependencies).toHaveBeenCalledWith(
      expect.objectContaining({
        itemId: 'item-10',
        demandId: 'demand-123',
        quantity: 10,
        referencePrice: 100,
        bidInterval: 4,
        bidIntervalType: 'percentage',
      }),
    )
  })

  it('should open edit bidding notice modal and save updated notice data', async () => {
    mockDemandData.value = {
      id: 'demand-123',
      bidding_notice_number: 'AV-01',
      dispute_number: 'DISP-01',
      dispute_date: '2026-11-10',
      offer_opening_date: '2026-11-05T14:00:00.000Z',
    }
    const wrapper = shallowMount(DemandItemsPage)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vm = wrapper.vm as any

    vm.openEditBiddingNoticeModal()
    expect(vm.editBiddingNoticeModal.isOpen.value).toBe(true)
    expect(vm.editBiddingNoticeModal.payload.value.bidding_notice_number).toBe('AV-01')
    expect(vm.editBiddingNoticeModal.payload.value.dispute_number).toBe('DISP-01')

    vm.editBiddingNoticeModal.payload.value.bidding_notice_number = 'AV-02-UPDATED'

    await vm.saveBiddingNoticeData()
    expect(mockUpdateDemandDb).toHaveBeenCalledWith(
      'demand-123',
      expect.objectContaining({
        bidding_notice_number: 'AV-02-UPDATED',
      }),
    )
    expect(vm.editBiddingNoticeModal.isOpen.value).toBe(false)
  })
})
