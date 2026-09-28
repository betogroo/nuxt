import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import ProductsPage from '~/pages/products/index.vue'
import { ref } from 'vue'

const mockCreateProduct = vi.fn()
const mockUpdateProduct = vi.fn()
const mockToggleProductStatus = vi.fn()
const mockRegisterPendingExpenseNature = vi.fn()

vi.mock('~/composables/useProducts', () => ({
  useProducts: () => ({
    fetchProducts: vi.fn().mockResolvedValue({
      data: [{ id: '1', name: 'Product 1', expense_nature_id: '33903000', is_active: true }],
      count: 1
    }),
    createProduct: mockCreateProduct,
    updateProduct: mockUpdateProduct,
    toggleProductStatus: mockToggleProductStatus,
  })
}))

vi.mock('~/composables/useExpenseNatures', () => ({
  useExpenseNatures: () => ({
    fetchAllActiveExpenseNatures: vi.fn().mockResolvedValue([{ id: '33903000', name: 'NATURE' }]),
    registerPendingExpenseNature: mockRegisterPendingExpenseNature,
  })
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

  it('should reset isSaving state when saveProduct finishes successfully', async () => {
    mockCreateProduct.mockResolvedValueOnce({})
    
    const wrapper = mount(ProductsPage, {
      global: {
        stubs: {
          PageHeader: true,
          UiCard: true,
          UiTable: true,
          UiButton: true,
          UiInput: true,
          UiSelect: true,
          UiModal: true,
          UiSwitch: true,
          UiChip: true,
          UiAlert: true,
          'v-row': true,
          'v-col': true,
          'v-spacer': true,
          'v-pagination': true,
          'v-tooltip': true,
          'v-autocomplete': true,
          NuxtLink: true,
        },
      },
    })

    const vm = wrapper.vm as any

    // Mock initial modal payload
    vm.modal.payload.value = {
      name: 'New Product',
      expense_nature_id: '33903000',
      is_suggesting_nature: false,
    }

    // Call save
    const savePromise = vm.saveProduct()
    
    // While saving, isSaving should be true
    expect(vm.modal.isSaving.value).toBe(true)

    await savePromise

    // After saving, isSaving should be reset to false
    expect(vm.modal.isSaving.value).toBe(false)
    expect(mockCreateProduct).toHaveBeenCalled()
  })

  it('should reset isSaving state when saveProduct fails', async () => {
    mockCreateProduct.mockRejectedValueOnce(new Error('Simulated Error'))
    
    const wrapper = mount(ProductsPage, {
      global: {
        stubs: {
          PageHeader: true,
          UiCard: true,
          UiTable: true,
          UiButton: true,
          UiInput: true,
          UiSelect: true,
          UiModal: true,
          UiSwitch: true,
          UiChip: true,
          UiAlert: true,
          'v-row': true,
          'v-col': true,
          'v-spacer': true,
          'v-pagination': true,
          'v-tooltip': true,
          'v-autocomplete': true,
          NuxtLink: true,
        },
      },
    })

    const vm = wrapper.vm as any

    vm.modal.payload.value = {
      name: 'New Product',
      expense_nature_id: '33903000',
      is_suggesting_nature: false,
    }

    const savePromise = vm.saveProduct()
    expect(vm.modal.isSaving.value).toBe(true)

    await savePromise

    // Even after an error, isSaving should be reset to false
    expect(vm.modal.isSaving.value).toBe(false)
    expect(vm.modal.error.value).toBe('Simulated Error')
  })
})
