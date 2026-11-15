import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount, flushPromises } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import DemandItemBatchBidsModal from '~/components/demands/DemandItemBatchBidsModal.vue'

const { mockCheckExistingSuppliers, mockCreateSuppliersBatch, mockAddBidsBatch, mockToast } =
  vi.hoisted(() => ({
    mockCheckExistingSuppliers: vi.fn(),
    mockCreateSuppliersBatch: vi.fn(),
    mockAddBidsBatch: vi.fn(),
    mockToast: {
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
    },
  }))

mockNuxtImport('useToast', () => () => mockToast)
mockNuxtImport('useSuppliers', () => () => ({
  checkExistingSuppliersByCnpjs: mockCheckExistingSuppliers,
  createSuppliersBatch: mockCreateSuppliersBatch,
}))
mockNuxtImport('useProductBids', () => () => ({
  addBidsBatch: mockAddBidsBatch,
}))

describe('DemandItemBatchBidsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCheckExistingSuppliers.mockResolvedValue(new Map())
    mockCreateSuppliersBatch.mockResolvedValue([])
    mockAddBidsBatch.mockResolvedValue(0)
  })

  it('renders and starts in input stage', () => {
    const wrapper = shallowMount(DemandItemBatchBidsModal, {
      props: {
        modelValue: true,
        demandProductId: 'prod-item-1',
        referencePrice: 20.0,
      },
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vm = wrapper.vm as any
    expect(vm.hasParsed).toBe(false)
    expect(vm.rawText).toBe('')
    expect(vm.parsedItems).toHaveLength(0)
  })

  it('processes text and distinguishes existing suppliers from new suppliers', async () => {
    const existingMap = new Map()
    existingMap.set('37862590000171', {
      id: 'supp-existing-1',
      cnpj: '37.862.590/0001-71',
      company_name: 'Fornecedor Cadastrado Ltda',
    })
    mockCheckExistingSuppliers.mockResolvedValue(existingMap)

    const wrapper = shallowMount(DemandItemBatchBidsModal, {
      props: {
        modelValue: true,
        demandProductId: 'prod-item-1',
        referencePrice: 20.0,
      },
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vm = wrapper.vm as any
    vm.rawText = `37.862.590/0001-71 R$ 18,0000
62.341.521/0001-60 R$ 18,9900`

    await vm.handleProcessText()
    await flushPromises()

    expect(vm.hasParsed).toBe(true)
    expect(vm.readyItems).toHaveLength(2)

    // Item 1 is existing
    expect(vm.readyItems[0].isNewSupplier).toBe(false)
    expect(vm.readyItems[0].supplierId).toBe('supp-existing-1')
    expect(vm.readyItems[0].supplierName).toBe('Fornecedor Cadastrado Ltda')
    expect(vm.readyItems[0].amount).toBe(18)

    // Item 2 is new
    expect(vm.readyItems[1].isNewSupplier).toBe(true)
    expect(vm.readyItems[1].supplierId).toBeNull()
    expect(vm.readyItems[1].supplierName).toContain('Fornecedor 62.341.521/0001-60')
    expect(vm.readyItems[1].amount).toBe(18.99)
  })

  it('correctly detects bids above reference price', () => {
    const wrapper = shallowMount(DemandItemBatchBidsModal, {
      props: {
        modelValue: true,
        demandProductId: 'prod-item-1',
        referencePrice: 20.0,
      },
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vm = wrapper.vm as any
    expect(vm.isBidAboveReference(18.0)).toBe(false)
    expect(vm.isBidAboveReference(20.0)).toBe(false)
    expect(vm.isBidAboveReference(20.01)).toBe(true)
    expect(vm.isBidAboveReference(22.5)).toBe(true)
  })

  it('saves batch by auto-creating new suppliers and inserting bids', async () => {
    mockCreateSuppliersBatch.mockResolvedValue([
      { id: 'supp-new-2', cnpj: '62.341.521/0001-60', company_name: 'Nova Empresa' },
    ])
    mockAddBidsBatch.mockResolvedValue(2)

    const wrapper = shallowMount(DemandItemBatchBidsModal, {
      props: {
        modelValue: true,
        demandProductId: 'prod-item-1',
        referencePrice: 25.0,
      },
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vm = wrapper.vm as any
    vm.rawText = `37.862.590/0001-71 R$ 18,0000
62.341.521/0001-60 R$ 18,9900`

    const existingMap = new Map()
    existingMap.set('37862590000171', {
      id: 'supp-existing-1',
      cnpj: '37.862.590/0001-71',
      company_name: 'Fornecedor Cadastrado',
    })
    mockCheckExistingSuppliers.mockResolvedValue(existingMap)

    await vm.handleProcessText()
    await flushPromises()

    // Customize name of new supplier
    vm.readyItems[1].supplierName = 'Nova Empresa'

    await vm.handleSaveBatch()
    await flushPromises()

    expect(mockCreateSuppliersBatch).toHaveBeenCalledWith([
      { cnpj: '62341521000160', company_name: 'Nova Empresa' },
    ])

    expect(mockAddBidsBatch).toHaveBeenCalledWith(
      'prod-item-1',
      [
        { supplier_id: 'supp-existing-1', amount: 18 },
        { supplier_id: 'supp-new-2', amount: 18.99 },
      ],
      { referencePrice: 25.0 },
    )

    expect(wrapper.emitted('saved')?.[0]).toEqual([2])
    expect(mockToast.success).toHaveBeenCalledWith('2 lance(s) registrado(s) com sucesso!')
  })
})
