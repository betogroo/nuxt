import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { ref } from 'vue'
import NewDemandModal from '~/components/iirgd/NewDemandModal.vue'

const vuetify = createVuetify({ components, directives })

const mockCreateDemand = vi.fn()
mockNuxtImport('useToast', () => () => ({ success: vi.fn(), error: vi.fn() }))
mockNuxtImport('useIirgdDemands', () => () => ({
  createDemand: mockCreateDemand,
}))
mockNuxtImport('useIirgdCitizens', () => () => ({
  fetchCitizenByDocument: vi.fn(),
}))
const DOC_TYPE_1 = '11111111-1111-1111-1111-111111111111'
const DOC_TYPE_2 = '22222222-2222-2222-2222-222222222222'

mockNuxtImport('useIirgdDocumentTypes', () => () => ({
  fetchAllActiveDocumentTypes: vi.fn().mockResolvedValue([
    { id: DOC_TYPE_1, name: 'Primeira Via' },
    { id: DOC_TYPE_2, name: 'Antecedentes Numeral' },
  ]),
  createPendingDocumentType: vi
    .fn()
    .mockResolvedValue({ id: '33333333-3333-3333-3333-333333333333' }),
}))
mockNuxtImport('useAsyncData', () => () => ({
  data: ref([
    { id: DOC_TYPE_1, name: 'Primeira Via' },
    { id: DOC_TYPE_2, name: 'Antecedentes Numeral' },
  ]),
  pending: ref(false),
  refresh: vi.fn(),
}))

describe('NewDemandModal', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('renders UiCheckbox with label "Cidadão de outro estado (sem RG de SP)"', () => {
    const wrapper = mount(NewDemandModal, {
      props: {
        modelValue: true,
      },
      global: {
        plugins: [vuetify],
        stubs: {
          UiModal: { template: '<div><slot /><slot name="actions" /></div>' },
          UiButton: {
            template: '<button @click="$emit(\'click\', $event)"><slot /></button>',
            emits: ['click'],
          },
        },
      },
    })

    expect(wrapper.text()).toContain('Cidadão de outro estado (sem RG de SP)')
  })

  it('swaps RG input for other_document input when checkbox is checked', async () => {
    const wrapper = mount(NewDemandModal, {
      props: {
        modelValue: true,
      },
      global: {
        plugins: [vuetify],
        stubs: {
          UiModal: { template: '<div><slot /><slot name="actions" /></div>' },
          UiButton: {
            template: '<button @click="$emit(\'click\', $event)"><slot /></button>',
            emits: ['click'],
          },
        },
      },
    })

    // Initially shows RG
    expect(wrapper.text()).toContain('Número do RG')
    expect(wrapper.text()).not.toContain('Documento de Outro Estado')

    // Find and check the checkbox
    const checkbox = wrapper.findComponent({ name: 'UiCheckbox' })
    expect(checkbox.exists()).toBe(true)

    const input = checkbox.find('input[type="checkbox"]')
    await input.setValue(true)

    // Now shows Documento de Outro Estado
    expect(wrapper.text()).toContain('Documento de Outro Estado')
  })

  it('pre-fills station_code and document_type_id from localStorage on mount and reopen', async () => {
    localStorage.setItem('iirgd_last_station_code', '1062-9')
    localStorage.setItem('iirgd_last_document_type_id', DOC_TYPE_1)

    const wrapper = mount(NewDemandModal, {
      props: {
        modelValue: true,
      },
      global: {
        plugins: [vuetify],
        stubs: {
          UiModal: { template: '<div><slot /><slot name="actions" /></div>' },
          UiButton: {
            template: '<button @click="$emit(\'click\', $event)"><slot /></button>',
            emits: ['click'],
          },
        },
      },
    })

    const select = wrapper.findComponent({ name: 'UiSelect' })
    const combobox = wrapper.findComponent({ name: 'UiCombobox' })

    expect(select.props('modelValue')).toBe('1062-9')
    expect(combobox.props('modelValue')).toBe(DOC_TYPE_1)

    // Simulate closing and reopening modal
    await wrapper.setProps({ modelValue: false })
    await wrapper.setProps({ modelValue: true })

    expect(select.props('modelValue')).toBe('1062-9')
    expect(combobox.props('modelValue')).toBe(DOC_TYPE_1)
  })

  it('persists station_code and document_type_id to localStorage on save', async () => {
    const wrapper = mount(NewDemandModal, {
      props: {
        modelValue: true,
      },
      global: {
        plugins: [vuetify],
        stubs: {
          UiModal: { template: '<div><slot /><slot name="actions" /></div>' },
          UiButton: {
            template: '<button @click="$emit(\'click\', $event)"><slot /></button>',
            emits: ['click'],
          },
        },
      },
    })

    const select = wrapper.findComponent({ name: 'UiSelect' })
    const combobox = wrapper.findComponent({ name: 'UiCombobox' })

    await select.vm.$emit('update:modelValue', '1342-5')
    await combobox.vm.$emit('update:modelValue', DOC_TYPE_2)

    // Fill citizen name and RG
    const rgInput = wrapper.findComponent({ name: 'UiRgInput' })
    await rgInput.vm.$emit('update:modelValue', '72894286-0')

    const allInputs = wrapper.findAllComponents({ name: 'UiInput' })
    const nameInput = allInputs.find((i) => i.props('label')?.includes('Nome do Cidadão'))
    expect(nameInput).toBeDefined()
    await nameInput!.vm.$emit('update:modelValue', 'CIDADAO TESTE')

    // Find and click save button
    const buttons = wrapper.findAll('button')
    const saveBtn = buttons.find((b) => b.text().includes('Salvar'))
    expect(saveBtn).toBeDefined()
    const vm = wrapper.vm as unknown as { saveDemand: () => Promise<void> }
    await vm.saveDemand()
    await flushPromises()

    expect(mockCreateDemand).toHaveBeenCalled()
    expect(localStorage.getItem('iirgd_last_station_code')).toBe('1342-5')
    expect(localStorage.getItem('iirgd_last_document_type_id')).toBe(DOC_TYPE_2)
  })
})
