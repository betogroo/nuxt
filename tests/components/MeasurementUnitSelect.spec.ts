import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import MeasurementUnitSelect from '~/components/MeasurementUnitSelect.vue'

const mockFetchAllActiveUnits = vi.fn()

mockNuxtImport('useAsyncData', () =>
  vi.fn().mockReturnValue({ data: { value: [] }, pending: { value: false }, refresh: vi.fn() }),
)

mockNuxtImport('useMeasurementUnits', () => () => ({
  fetchAllActiveUnits: mockFetchAllActiveUnits,
}))

describe('MeasurementUnitSelect', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetchAllActiveUnits.mockResolvedValue([
      { id: 'u-1', name: 'Unidade', legacy_alias: null },
      { id: 'u-2', name: 'Caixa', legacy_alias: 'CX' },
    ])
  })

  it('renders provided items when items prop is passed (e.g. product units)', () => {
    const productUnits = [
      { id: 'pu-1', name: 'Pacote 500g', legacy_alias: null },
      { id: 'pu-2', name: 'Fardo com 10', legacy_alias: 'FD' },
    ]

    const wrapper = mount(MeasurementUnitSelect, {
      props: {
        modelValue: 'Pacote 500g',
        items: productUnits,
      },
      global: {
        stubs: {
          UiCombobox: {
            template: `
              <div class="ui-combobox-stub">
                <input
                  class="combobox-input"
                  :value="modelValue"
                  @input="$emit('update:modelValue', $event.target.value)"
                  @blur="$emit('blur')"
                />
                <ul>
                  <li v-for="item in items" :key="item.id || item.name">{{ item.displayName }}</li>
                </ul>
              </div>
            `,
            props: ['modelValue', 'search', 'items', 'label', 'loading'],
            emits: ['update:modelValue', 'update:search', 'blur'],
          },
        },
      },
    })

    const renderedItems = wrapper.findAll('li')
    expect(renderedItems).toHaveLength(2)
    expect(renderedItems[0].text()).toBe('Pacote 500g')
    expect(renderedItems[1].text()).toBe('Fardo com 10 (Legado: FD)')
  })

  it('updates modelValue on blur if custom text was typed in search', async () => {
    const wrapper = mount(MeasurementUnitSelect, {
      props: {
        modelValue: '',
        items: [{ id: '1', name: 'Caixa' }],
      },
      global: {
        stubs: {
          UiCombobox: {
            name: 'UiCombobox',
            template: '<div class="ui-combobox-stub"></div>',
            props: ['modelValue', 'search', 'items'],
            emits: ['update:modelValue', 'update:search', 'blur'],
          },
        },
      },
    })

    // Simulate search update (user typing "Nova Unidade Especial")
    const combobox = wrapper.findComponent({ name: 'UiCombobox' })
    combobox.vm.$emit('update:search', 'Nova Unidade Especial')
    await wrapper.vm.$nextTick()

    // Simulate blur
    combobox.vm.$emit('blur')
    await wrapper.vm.$nextTick()

    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted).toBeTruthy()
    expect(emitted?.[0]).toEqual(['Nova Unidade Especial'])
  })
})
