import { describe, it, expect, vi } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import DemandItemsPage from '~/pages/demands/[id]/index.vue'

const { mockProductsList, mockDemandData, mockDemandProducts, mockUpdateDemandDb } = vi.hoisted(
  () => ({
    mockProductsList: { value: [] as unknown[] },
    mockDemandData: { value: null as Record<string, unknown> | null },
    mockDemandProducts: { value: [] as unknown[] },
    mockUpdateDemandDb: vi.fn().mockResolvedValue({}),
  }),
)

mockNuxtImport('useAsyncData', () => (key: string) => {
  if (key === 'all-active-products') {
    return { data: mockProductsList, pending: { value: false }, refresh: vi.fn() }
  }
  if (key === 'demand-demand-123') {
    return { data: mockDemandData, pending: { value: false }, refresh: vi.fn() }
  }
  if (key === 'demand-items-demand-123') {
    return { data: mockDemandProducts, pending: { value: false }, refresh: vi.fn() }
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
  profile: { value: { id: 'user-1', role: 'admin' } },
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
  it('should resolve final unit and call saveToDemand with alias', async () => {
    const wrapper = shallowMount(DemandItemsPage)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vm = wrapper.vm as any

    vm.demandId = '123'
    vm.isNewProductMode = false
    vm.selectedProductId = 'prod-1'
    vm.selectedUnitSearch = 'cx'
    vm.selectedAliasId = 'alias-1'
    vm.itemQuantity = 10
    vm.itemReferencePrice = 5.5

    // Mock allMeasurementUnits
    vm.allMeasurementUnits = [
      {
        id: 'unit-1',
        name: 'CX',
        measurement_unit_aliases: [{ id: 'alias-1', code: 38, name: 'Caixa' }],
      },
    ]

    await vm.saveToDemand()

    expect(vm.saveError).toBe('')
    expect(mockAddDemandItemWithDependencies).toHaveBeenCalledWith(
      expect.objectContaining({
        selectedAliasId: 'alias-1',
      }),
    )
  })

  it('should fail saveToDemand if alias is not selected or suggested', async () => {
    const wrapper = shallowMount(DemandItemsPage)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vm = wrapper.vm as any

    vm.demandId = '123'
    vm.isNewProductMode = false
    vm.selectedProductId = 'prod-1'
    vm.selectedUnitSearch = 'cx'
    vm.selectedAliasId = null
    vm.isSuggestingAlias = false
    vm.itemQuantity = 10
    vm.itemReferencePrice = 5.5

    await vm.saveToDemand()

    expect(vm.saveError).toBe('Selecione ou sugira um registro alternativo (alias) para o item.')
  })

  it('should successfully open the Add Modal without errors and reset alias state', async () => {
    const wrapper = shallowMount(DemandItemsPage)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vm = wrapper.vm as any

    // Call the function
    vm.openAddModal()

    // Check state
    expect(vm.isModalOpen).toBe(true)
    expect(vm.selectedUnitSearch).toBe('')
    expect(vm.selectedAliasId).toBe(null)
    expect(vm.isSuggestingAlias).toBe(false)
    expect(vm.suggestedAliasCode).toBe(null)
    expect(vm.suggestedAliasName).toBe('')
    expect(vm.selectedProductId).toBe(null)
    expect(vm.newProductClassId).toBe(null)
    expect(vm.isSuggestingClass).toBe(false)
    expect(vm.suggestedClassId).toBe('')
    expect(vm.suggestedClassName).toBe('')
    expect(vm.newProductCatMat).toBe(null)
    expect(vm.newProductCatBec).toBe(null)
  })

  it('should pass product class, cat_mat, cat_bec, and suggested alias to addDemandItemWithDependencies', async () => {
    const wrapper = shallowMount(DemandItemsPage)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vm = wrapper.vm as any

    vm.demandId = 'demand-123'
    vm.isNewProductMode = true
    vm.newProductName = 'Teclado Mecânico'
    vm.newProductExpenseNatureId = '33903000'
    vm.newProductClassId = '5915'
    vm.isSuggestingClass = false
    vm.newProductCatMat = 123456
    vm.newProductCatBec = 78910
    vm.selectedUnitSearch = 'un'
    vm.isSuggestingAlias = true
    vm.suggestedAliasCode = 201
    vm.suggestedAliasName = 'Pacote 100'
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
        newProductCatMat: 123456,
        newProductCatBec: 78910,
        isSuggestingAlias: true,
        suggestedAliasCode: 201,
        suggestedAliasName: 'Pacote 100',
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

  it('correctly calculates disputeSummary for winners, failed, and deserted items', () => {
    mockDemandProducts.value = [
      // 1. Deserted item: 0 bids
      {
        id: 'item-deserted',
        product: { name: 'Item Sem Lances' },
        quantity: 5,
        demand_product_bids: [],
      },
      // 2. Failed item: only disqualified bids
      {
        id: 'item-failed',
        product: { name: 'Item Fracassado' },
        quantity: 2,
        demand_product_bids: [
          {
            id: 'bid-f1',
            amount: 50,
            status: 'disqualified',
          },
        ],
      },
      // 3. Winner item: classified bid
      {
        id: 'item-winner',
        product: { name: 'Item com Vencedor' },
        quantity: 10,
        demand_product_bids: [
          {
            id: 'bid-w1',
            amount: 15,
            status: 'classified',
            suppliers: { company_name: 'Fornecedor Campeão' },
          },
        ],
      },
    ]

    const wrapper = shallowMount(DemandItemsPage)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vm = wrapper.vm as any

    expect(vm.disputeSummary.total).toBe(3)
    expect(vm.disputeSummary.desertedCount).toBe(1)
    expect(vm.disputeSummary.failedCount).toBe(1)
    expect(vm.disputeSummary.winnersCount).toBe(1)
  })

  it('opens report modal on handleGenerateReport', () => {
    const wrapper = shallowMount(DemandItemsPage)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vm = wrapper.vm as any

    expect(vm.isReportModalOpen).toBe(false)
    vm.handleGenerateReport()
    expect(vm.isReportModalOpen).toBe(true)
  })

  it('includes execution_status column when demand status is homologation or completed', () => {
    mockDemandData.value = {
      id: 'demand-123',
      status: 'homologation',
    }
    const wrapper = shallowMount(DemandItemsPage)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vm = wrapper.vm as any

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const headers = vm.demandProductHeaders as any[]
    const execHeader = headers.find((h) => h.value === 'execution_status')
    expect(execHeader).toBeDefined()
    expect(execHeader.text).toBe('Execução')
  })

  it('does not include execution_status column when demand status is quotation', () => {
    mockDemandData.value = {
      id: 'demand-123',
      status: 'quotation',
    }
    const wrapper = shallowMount(DemandItemsPage)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vm = wrapper.vm as any

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const headers = vm.demandProductHeaders as any[]
    const execHeader = headers.find((h) => h.value === 'execution_status')
    expect(execHeader).toBeUndefined()
  })

  it('opens execution status modal on openExecutionStatusModal', () => {
    const wrapper = shallowMount(DemandItemsPage)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vm = wrapper.vm as any

    expect(vm.isExecutionStatusModalOpen).toBe(false)
    vm.openExecutionStatusModal({ id: 'item-1', product_name_snapshot: 'Item Teste' })
    expect(vm.isExecutionStatusModalOpen).toBe(true)
    expect(vm.selectedItemForExecutionStatus.id).toBe('item-1')
  })

  it('opens edit planning modal and populates form values', () => {
    mockDemandData.value = {
      id: 'demand-123',
      name: 'Demanda de Teste',
      type: 'consumption',
      process_number: '058.00100793/2026-21',
      id_pca: 'PCA-2026',
      contract_number: '12345',
      siafem_number: '2026NE0001',
      status: 'planning',
    }

    const wrapper = shallowMount(DemandItemsPage)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vm = wrapper.vm as any

    vm.openEditPlanning()
    expect(vm.editPlanningModal.isOpen.value).toBe(true)
    expect(vm.epProcess).toBe('058.00100793/2026-21')
    expect(vm.epName).toBe('Demanda de Teste')
  })

  it('saves planning data calling updateDemand with payload', async () => {
    mockDemandData.value = {
      id: 'demand-123',
      name: 'Demanda de Teste',
      type: 'consumption',
      process_number: '058.00100793/2026-21',
      status: 'planning',
    }

    const wrapper = shallowMount(DemandItemsPage)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vm = wrapper.vm as any

    vm.openEditPlanning()
    vm.epProcess = '058.00100793/2026-99'
    await vm.savePlanning()

    expect(mockUpdateDemandDb).toHaveBeenCalledWith(
      'demand-123',
      expect.objectContaining({
        process_number: '058.00100793/2026-99',
      }),
    )
  })

  it('saves internal_process_number when user is admin', async () => {
    mockDemandData.value = {
      id: 'demand-123',
      name: 'Demanda de Teste',
      type: 'consumption',
      internal_process_number: '2026-0001',
      process_number: '058.00100793/2026-21',
      status: 'planning',
    }

    const wrapper = shallowMount(DemandItemsPage)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vm = wrapper.vm as any

    vm.openEditPlanning()
    expect(vm.epInternalProcess).toBe('2026-0001')
    vm.epInternalProcess = '2026-0042'
    await vm.savePlanning()

    expect(mockUpdateDemandDb).toHaveBeenCalledWith(
      'demand-123',
      expect.objectContaining({
        internal_process_number: '2026-0042',
      }),
    )
  })
})
