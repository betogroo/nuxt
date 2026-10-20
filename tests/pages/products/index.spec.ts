import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import ProductsPage from '~/pages/products/index.vue'
import { ref } from 'vue'

const mockCreateProduct = vi.fn().mockResolvedValue({})
const mockUpdateProduct = vi.fn().mockResolvedValue({})
const mockToggleProductStatus = vi.fn().mockResolvedValue({})
const mockRegisterPendingExpenseNature = vi.fn()

vi.mock('~/composables/useProducts', () => ({
  useProducts: () => ({
    fetchProducts: vi.fn().mockResolvedValue({
      data: [
        {
          id: '1',
          name: 'Product 1',
          cat_mat: 12345,
          cat_bec: 67890,
          expense_nature_id: '33903000',
          product_class_id: '5915',
          is_active: true,
        },
      ],
      count: 1,
    }),
    createProduct: mockCreateProduct,
    updateProduct: mockUpdateProduct,
    toggleProductStatus: mockToggleProductStatus,
  }),
}))

vi.mock('~/composables/useExpenseNatures', () => ({
  useExpenseNatures: () => ({
    fetchAllActiveExpenseNatures: vi.fn().mockResolvedValue([{ id: '33903000', name: 'NATURE' }]),
    registerPendingExpenseNature: mockRegisterPendingExpenseNature,
  }),
}))

vi.mock('~/composables/useProductClasses', () => ({
  useProductClasses: () => ({
    fetchAllActiveProductClasses: vi.fn().mockResolvedValue([{ id: '5915', name: 'CLASSE' }]),
    registerPendingProductClass: vi.fn().mockResolvedValue({ id: '5915', name: 'CLASSE' }),
  }),
}))

mockNuxtImport('useAsyncData', () => {
  return () => ({
    data: ref([]),
    pending: ref(false),
    refresh: vi.fn(),
  })
})

mockNuxtImport('useHead', () => vi.fn())
mockNuxtImport('definePageMeta', () => vi.fn())

describe('Products Admin Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('initializes add modal with empty CATMAT and CATBEC and saves new product', async () => {
    const wrapper = shallowMount(ProductsPage)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vm = wrapper.vm as any

    vm.openAddModal()
    expect(vm.modal.isOpen.value).toBe(true)
    expect(vm.isEditing).toBe(false)
    expect(vm.catMat).toBeNull()
    expect(vm.catBec).toBeNull()

    vm.name = 'Monitor Dell 27'
    vm.expenseNatureId = '33903000'
    vm.productClassId = '5915'
    vm.catMat = 445566
    vm.catBec = 778899

    await vm.saveProduct()

    expect(mockCreateProduct).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Monitor Dell 27',
        expense_nature_id: '33903000',
        product_class_id: '5915',
        cat_mat: 445566,
        cat_bec: 778899,
      }),
    )
    expect(vm.modal.isOpen.value).toBe(false)
  })

  it('pre-populates edit modal with existing CATMAT and CATBEC and updates product', async () => {
    const wrapper = shallowMount(ProductsPage)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vm = wrapper.vm as any

    vm.openEditModal({
      id: 'prod-99',
      name: 'Mesa de Reunião',
      expense_nature_id: '33903000',
      product_class_id: '5915',
      cat_mat: 112233,
      cat_bec: 445566,
      is_active: true,
    })

    expect(vm.modal.isOpen.value).toBe(true)
    expect(vm.isEditing).toBe(true)
    expect(vm.catMat).toBe(112233)
    expect(vm.catBec).toBe(445566)

    vm.catMat = 999999

    await vm.saveProduct()

    expect(mockUpdateProduct).toHaveBeenCalledWith(
      'prod-99',
      expect.objectContaining({
        name: 'Mesa de Reunião',
        cat_mat: 999999,
        cat_bec: 445566,
      }),
    )
  })

  it('handles unique constraint duplicate error gracefully in modal', async () => {
    mockCreateProduct.mockRejectedValueOnce(
      new Error('Já existe um produto cadastrado com este código CATMAT.'),
    )

    const wrapper = shallowMount(ProductsPage)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vm = wrapper.vm as any

    vm.openAddModal()
    vm.name = 'Item Duplicado'
    vm.expenseNatureId = '33903000'
    vm.productClassId = '5915'
    vm.catMat = 12345

    await vm.saveProduct()

    expect(vm.modal.error.value).toBe('Já existe um produto cadastrado com este código CATMAT.')
    expect(vm.modal.isOpen.value).toBe(true)
  })

  it('provides getBecProductUrl for CATBEC links', () => {
    const wrapper = shallowMount(ProductsPage)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vm = wrapper.vm as any

    expect(vm.getBecProductUrl).toBeDefined()
    expect(vm.getBecProductUrl(67890)).toContain('67890')
    expect(vm.getBecProductUrl(null)).toBeNull()
  })
})
