import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount, flushPromises } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import ProductBatchAddModal from '~/components/products/ProductBatchAddModal.vue'

const mockCreateProductsBatch = vi.fn()
const mockFetchAllActiveExpenseNatures = vi.fn().mockResolvedValue([
  { id: 'nat-1', name: 'Material de Consumo' },
  { id: 'nat-2', name: 'Serviços' },
])
const mockFetchAllActiveProductClasses = vi
  .fn()
  .mockResolvedValue([{ id: 'class-1', name: 'Material de Escritório' }])

mockNuxtImport('useProducts', () => () => ({
  createProductsBatch: mockCreateProductsBatch,
}))

mockNuxtImport('useExpenseNatures', () => () => ({
  fetchAllActiveExpenseNatures: mockFetchAllActiveExpenseNatures,
}))

mockNuxtImport('useProductClasses', () => () => ({
  fetchAllActiveProductClasses: mockFetchAllActiveProductClasses,
}))

describe('ProductBatchAddModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads catalogs when modal opens', async () => {
    const wrapper = shallowMount(ProductBatchAddModal, {
      props: {
        modelValue: true,
      },
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vm = wrapper.vm as any

    await flushPromises()
    expect(mockFetchAllActiveExpenseNatures).toHaveBeenCalled()
    expect(mockFetchAllActiveProductClasses).toHaveBeenCalled()
    expect(vm.expenseNatureOptions).toHaveLength(2)
    expect(vm.productClassOptions).toHaveLength(1)
  })

  it('processes raw text and populates preview items', async () => {
    const wrapper = shallowMount(ProductBatchAddModal, {
      props: {
        modelValue: true,
      },
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vm = wrapper.vm as any

    vm.defaultExpenseNatureId = 'nat-1'
    vm.defaultProductClassId = 'class-1'
    vm.rawText = 'Papel Sulfite A4\t123456\t654321\nCaneta Azul\t234567\t'

    vm.handleParseText()

    expect(vm.hasParsed).toBe(true)
    expect(vm.parsedItems).toHaveLength(2)
    expect(vm.validItemsCount).toBe(2)
    expect(vm.invalidItemsCount).toBe(0)
    expect(vm.parsedItems[0].name).toBe('Papel Sulfite A4')
    expect(vm.parsedItems[0].cat_mat).toBe(123456)
    expect(vm.parsedItems[0].cat_bec).toBe(654321)
  })

  it('removes item from preview and revalidates', async () => {
    const wrapper = shallowMount(ProductBatchAddModal, {
      props: {
        modelValue: true,
      },
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vm = wrapper.vm as any

    vm.defaultExpenseNatureId = 'nat-1'
    vm.rawText = 'Item 1\t111\nItem 2\t222'
    vm.handleParseText()
    expect(vm.parsedItems).toHaveLength(2)

    vm.removeItem(0)
    expect(vm.parsedItems).toHaveLength(1)
    expect(vm.parsedItems[0].name).toBe('Item 2')
  })

  it('saves batch when valid items are present and emits saved event', async () => {
    mockCreateProductsBatch.mockResolvedValue([
      { id: 'p1', name: 'Papel A4' },
      { id: 'p2', name: 'Caneta' },
    ])

    const wrapper = shallowMount(ProductBatchAddModal, {
      props: {
        modelValue: true,
      },
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vm = wrapper.vm as any

    vm.defaultExpenseNatureId = 'nat-1'
    vm.rawText = 'Papel A4\t111\nCaneta\t222'
    vm.handleParseText()

    await vm.handleSaveBatch()

    expect(mockCreateProductsBatch).toHaveBeenCalledWith([
      {
        name: 'Papel A4',
        cat_mat: 111,
        cat_bec: null,
        expense_nature_id: 'nat-1',
        product_class_id: null,
        is_active: true,
      },
      {
        name: 'Caneta',
        cat_mat: 222,
        cat_bec: null,
        expense_nature_id: 'nat-1',
        product_class_id: null,
        is_active: true,
      },
    ])
    expect(wrapper.emitted('saved')?.[0]).toEqual([2])
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
  })

  it('displays error if batch has 0 valid items', async () => {
    const wrapper = shallowMount(ProductBatchAddModal, {
      props: {
        modelValue: true,
      },
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vm = wrapper.vm as any

    // Without default nature, simple item is invalid
    vm.defaultExpenseNatureId = null
    vm.rawText = 'Item Sem Natureza'
    vm.handleParseText()

    await vm.handleSaveBatch()

    expect(mockCreateProductsBatch).not.toHaveBeenCalled()
    expect(vm.saveError).toContain('Nenhum item válido para cadastrar')
  })

  it('captures database error and sets saveError message', async () => {
    mockCreateProductsBatch.mockRejectedValue(
      new Error('Já existe um produto cadastrado com este código CATMAT.'),
    )

    const wrapper = shallowMount(ProductBatchAddModal, {
      props: {
        modelValue: true,
      },
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vm = wrapper.vm as any

    vm.defaultExpenseNatureId = 'nat-1'
    vm.rawText = 'Item Duplicado\t111'
    vm.handleParseText()

    await vm.handleSaveBatch()

    expect(vm.saveError).toBe('Já existe um produto cadastrado com este código CATMAT.')
    expect(vm.isSaving).toBe(false)
  })
})
