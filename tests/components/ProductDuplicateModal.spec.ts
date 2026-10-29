import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import ProductDuplicateModal from '~/components/products/ProductDuplicateModal.vue'

const mockFetchProductById = vi.fn()
const mockDuplicateProduct = vi.fn()
const mockToast = { success: vi.fn(), error: vi.fn(), info: vi.fn() }
const mockPush = vi.fn()

vi.mock('~/composables/useProducts', () => ({
  useProducts: () => ({
    fetchProductById: mockFetchProductById,
    duplicateProduct: mockDuplicateProduct,
  }),
}))

vi.mock('~/composables/useProductCharacteristics', () => ({
  useProductCharacteristics: () => ({
    fetchAllSelectableKeys: vi.fn().mockResolvedValue([
      { id: 'k-1', name: 'Tamanho' },
      { id: 'k-2', name: 'Material' },
      { id: 'k-3', name: 'Cor' },
    ]),
  }),
}))

vi.mock('~/composables/useExpenseNatures', () => ({
  useExpenseNatures: () => ({
    fetchAllActiveExpenseNatures: vi
      .fn()
      .mockResolvedValue([{ id: '339030', name: 'Material de Consumo' }]),
  }),
}))

vi.mock('~/composables/useProductClasses', () => ({
  useProductClasses: () => ({
    fetchAllActiveProductClasses: vi
      .fn()
      .mockResolvedValue([{ id: '7510', name: 'Material de Escritório' }]),
  }),
}))

vi.mock('~/composables/useToast', () => ({
  useToast: () => mockToast,
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

const sampleProduct = {
  id: 'prod-original',
  name: 'Colchete numero 4',
  expense_nature_id: '339030',
  product_class_id: '7510',
  cat_mat: 11111,
  cat_bec: 22222,
  is_active: true,
  units: [
    { id: 'unit-cx', name: 'Caixa com 50', is_pending: false, is_active: true, aliases: [] },
    { id: 'unit-un', name: 'Unidade', is_pending: false, is_active: true, aliases: [] },
  ],
  characteristics: [
    {
      id: 'c-1',
      key_id: 'k-1',
      key_name: 'Tamanho',
      value: '4',
      is_pending: false,
      is_active: true,
    },
    {
      id: 'c-2',
      key_id: 'k-2',
      key_name: 'Material',
      value: 'Aço galvanizado',
      is_pending: false,
      is_active: true,
    },
  ],
}

describe('ProductDuplicateModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetchProductById.mockResolvedValue(sampleProduct)
    mockDuplicateProduct.mockResolvedValue({
      id: 'prod-new-9',
      name: 'Colchete numero 9',
    })
  })

  const mountModal = (props = {}) => {
    return mount(ProductDuplicateModal, {
      props: {
        modelValue: true,
        productId: 'prod-original',
        ...props,
      },
      global: {
        stubs: {
          UiModal: {
            template: `
              <div class="ui-modal-stub" v-if="modelValue">
                <slot />
                <slot name="actions" />
              </div>
            `,
            props: ['modelValue', 'title'],
          },
          UiInput: {
            template: `<input class="ui-input-stub" :value="modelValue" @input="$emit('update:modelValue', $event.target.value)" />`,
            props: ['modelValue', 'label', 'type'],
            emits: ['update:modelValue'],
          },
          UiSelect: {
            template: `<select class="ui-select-stub" :value="modelValue" @change="$emit('update:modelValue', $event.target.value)"><option v-for="item in items" :key="item.id" :value="item.id">{{ item.name }}</option></select>`,
            props: ['modelValue', 'items', 'label'],
            emits: ['update:modelValue'],
          },
          UiCombobox: {
            template: `<input class="ui-combobox-stub" :value="modelValue" @input="$emit('update:modelValue', $event.target.value)" />`,
            props: ['modelValue', 'items', 'label'],
            emits: ['update:modelValue'],
          },
          UiCheckbox: {
            template: `<input type="checkbox" class="ui-checkbox-stub" :checked="modelValue" @change="$emit('update:modelValue', $event.target.checked)" />`,
            props: ['modelValue', 'label'],
            emits: ['update:modelValue'],
          },
          UiButton: {
            template: `<button class="ui-button-stub" :disabled="disabled" @click="$emit('click', $event)"><slot /></button>`,
            props: ['disabled', 'loading', 'color', 'variant'],
            emits: ['click'],
          },
          UiAlert: {
            template: `<div class="ui-alert-stub"><slot /><slot name="prepend" /></div>`,
          },
          UiChip: { template: '<span><slot /></span>' },
          UiDivider: { template: '<hr />' },
          UiIcon: { template: '<i />' },
          UiProgressCircular: { template: '<div class="progress-stub" />' },
        },
      },
    })
  }

  it('loads source product and pre-populates name, classification, units and characteristics', async () => {
    const wrapper = mountModal()
    await wrapper.vm.$nextTick()
    await new Promise((r) => setTimeout(r, 10))

    expect(mockFetchProductById).toHaveBeenCalledWith('prod-original')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vm = wrapper.vm as any

    expect(vm.name).toBe('Colchete numero 4')
    expect(vm.sourceProductName).toBe('Colchete numero 4')
    expect(vm.expenseNatureId).toBe('339030')
    expect(vm.productClassId).toBe('7510')
    // CATMAT and CATBEC must be null by default to avoid unique constraint conflict
    expect(vm.catMat).toBeNull()
    expect(vm.catBec).toBeNull()

    // Units pre-selected
    expect(vm.units).toHaveLength(2)
    expect(vm.units[0].name).toBe('Caixa com 50')
    expect(vm.units[0].selected).toBe(true)

    // Characteristics prefilled
    expect(vm.characteristics).toHaveLength(2)
    expect(vm.characteristics[0]).toEqual({ key: 'Tamanho', value: '4' })
    expect(vm.characteristics[1]).toEqual({ key: 'Material', value: 'Aço galvanizado' })
  })

  it('allows adding and removing characteristics', async () => {
    const wrapper = mountModal()
    await wrapper.vm.$nextTick()
    await new Promise((r) => setTimeout(r, 10))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vm = wrapper.vm as any

    expect(vm.characteristics).toHaveLength(2)

    vm.addCharacteristic()
    expect(vm.characteristics).toHaveLength(3)
    expect(vm.characteristics[2]).toEqual({ key: '', value: '' })

    vm.removeCharacteristic(0) // Remove Tamanho
    expect(vm.characteristics).toHaveLength(2)
    expect(vm.characteristics[0].key).toBe('Material')
  })

  it('validates required name before submitting', async () => {
    const wrapper = mountModal()
    await wrapper.vm.$nextTick()
    await new Promise((r) => setTimeout(r, 10))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vm = wrapper.vm as any

    vm.name = '   '
    await vm.handleDuplicate()

    expect(vm.errorMessage).toBe('O Nome do Produto é obrigatório.')
    expect(mockDuplicateProduct).not.toHaveBeenCalled()
  })

  it('validates invalid non-integer CATMAT or CATBEC', async () => {
    const wrapper = mountModal()
    await wrapper.vm.$nextTick()
    await new Promise((r) => setTimeout(r, 10))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vm = wrapper.vm as any

    vm.name = 'Produto Válido'
    vm.catMat = -10
    await vm.handleDuplicate()
    expect(vm.errorMessage).toBe('O CATMAT deve ser um número inteiro positivo.')

    vm.catMat = null
    vm.catBec = 12.5
    await vm.handleDuplicate()
    expect(vm.errorMessage).toBe('O CATBEC deve ser um número inteiro positivo.')
  })

  it('duplicates product successfully with edited name and characteristics, emits saved, and navigates', async () => {
    const wrapper = mountModal()
    await wrapper.vm.$nextTick()
    await new Promise((r) => setTimeout(r, 10))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vm = wrapper.vm as any

    // Edit the name to Colchete numero 9
    vm.name = 'Colchete numero 9'
    // Edit characteristic Tamanho to 9
    vm.characteristics[0].value = '9'
    // Deselect unit Caixa com 50
    vm.units[0].selected = false

    await vm.handleDuplicate()

    expect(mockDuplicateProduct).toHaveBeenCalledWith({
      sourceProductId: 'prod-original',
      name: 'Colchete numero 9',
      expense_nature_id: '339030',
      product_class_id: '7510',
      cat_mat: null,
      cat_bec: null,
      is_active: true,
      unitIds: ['unit-un'],
      characteristics: [
        { key: 'Tamanho', value: '9' },
        { key: 'Material', value: 'Aço galvanizado' },
      ],
    })

    expect(mockToast.success).toHaveBeenCalledWith(expect.stringContaining('Colchete numero 9'))
    expect(wrapper.emitted('saved')).toBeTruthy()
    expect(wrapper.emitted('saved')![0]).toEqual(['prod-new-9'])
    expect(mockPush).toHaveBeenCalledWith('/products/prod-new-9')
  })

  it('displays error message when duplicateProduct rejects', async () => {
    mockDuplicateProduct.mockRejectedValue(new Error('Já existe um produto com este nome.'))

    const wrapper = mountModal()
    await wrapper.vm.$nextTick()
    await new Promise((r) => setTimeout(r, 10))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vm = wrapper.vm as any

    vm.name = 'Colchete 9'
    await vm.handleDuplicate()

    expect(vm.errorMessage).toBe('Já existe um produto com este nome.')
  })
})
