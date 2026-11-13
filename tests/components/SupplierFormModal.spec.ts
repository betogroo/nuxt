import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import SupplierFormModal from '../../app/components/suppliers/SupplierFormModal.vue'

const mockCreateSupplier = vi.fn()
const mockUpdateSupplier = vi.fn()
const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
}

mockNuxtImport('useToast', () => () => mockToast)
mockNuxtImport('useSuppliers', () => () => ({
  createSupplier: mockCreateSupplier,
  updateSupplier: mockUpdateSupplier,
}))

const stubs = {
  UiModal: {
    template: '<div class="ui-modal"><slot /><slot name="actions" /></div>',
    props: ['modelValue', 'title'],
  },
  UiAlert: { template: '<div class="ui-alert"><slot /></div>' },
  UiRow: { template: '<div class="ui-row"><slot /></div>' },
  UiCol: { template: '<div class="ui-col"><slot /></div>' },
  UiInput: {
    template:
      '<input class="ui-input" :data-label="label" :data-required="$attrs.required" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'label', 'errorMessages'],
  },
  UiSwitch: {
    template:
      '<input type="checkbox" class="ui-switch" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" />',
    props: ['modelValue', 'label'],
  },
  UiDivider: { template: '<hr />' },
  UiChip: {
    template:
      '<div class="ui-chip" :data-color="color"><slot /><button class="close-btn" @click="$emit(\'click:close\')">x</button></div>',
    props: ['color', 'closable', 'size', 'variant'],
  },
  UiButton: {
    template: '<button class="ui-button" @click="$emit(\'click\')"><slot /></button>',
    props: ['loading', 'disabled', 'color', 'variant'],
  },
}

describe('components/suppliers/SupplierFormModal.vue', () => {
  it('renders correctly when modelValue is true', () => {
    const wrapper = mount(SupplierFormModal, {
      props: {
        modelValue: true,
        supplier: null,
      },
      global: { stubs },
    })

    expect(wrapper.find('.ui-modal').exists()).toBe(true)
    expect(wrapper.text()).toContain('Cancelar')
    expect(wrapper.text()).toContain('Salvar')
  })

  it('emits update:modelValue with false when cancel button is clicked', async () => {
    const wrapper = mount(SupplierFormModal, {
      props: {
        modelValue: true,
        supplier: null,
      },
      global: { stubs },
    })

    const cancelBtn = wrapper.findAll('button.ui-button').find((b) => b.text().includes('Cancelar'))
    expect(cancelBtn).toBeDefined()
    await cancelBtn!.trigger('click')

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')![0]).toEqual([false])
  })

  it('renders email input as optional without asterisk or required attribute', () => {
    const wrapper = mount(SupplierFormModal, {
      props: {
        modelValue: true,
        supplier: null,
      },
      global: { stubs },
    })

    const inputs = wrapper.findAll('input.ui-input')
    const emailInput = inputs.find((i) => i.attributes('data-label') === 'E-mail')
    expect(emailInput).toBeDefined()
    expect(emailInput?.attributes('data-required')).toBeUndefined()

    const cnpjInput = inputs.find((i) => i.attributes('data-label') === 'CNPJ *')
    expect(cnpjInput?.attributes('data-required')).toBeDefined()
  })

  it('renders chips for multiple emails and allows removing one', async () => {
    const wrapper = mount(SupplierFormModal, {
      props: {
        modelValue: true,
        supplier: {
          id: 'sup-1',
          cnpj: '00.000.000/0001-91',
          company_name: 'Empresa Teste',
          email: 'contato@teste.com, financeiro@teste.com',
          is_active: true,
          created_at: '',
          updated_at: '',
        },
      },
      global: { stubs },
    })

    const chips = wrapper.findAll('.supplier-email-chip')
    expect(chips.length).toBe(2)
    expect(chips[0].text()).toContain('contato@teste.com')
    expect(chips[1].text()).toContain('financeiro@teste.com')

    const closeBtn = chips[0].find('button.close-btn')
    await closeBtn.trigger('click')

    const inputs = wrapper.findAll('input.ui-input')
    const emailInput = inputs.find((i) => i.attributes('data-label') === 'E-mail')
    expect((emailInput?.element as HTMLInputElement).value).toBe('financeiro@teste.com')
  })
})
