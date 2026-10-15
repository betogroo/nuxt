import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import UiSelect from '~/components/ui/UiSelect.vue'

const vuetify = createVuetify({ components, directives })

describe('UiSelect', () => {
  const sampleItems = [
    { title: 'Opção 1', value: '1' },
    { title: 'Opção 2', value: '2' },
  ]

  it('renders with hideDetails="auto" and mb-3 by default', () => {
    const wrapper = mount(UiSelect, {
      props: {
        modelValue: null,
        items: sampleItems,
        label: 'Selecione',
      },
      global: {
        plugins: [vuetify],
      },
    })

    const vSelect = wrapper.findComponent({ name: 'VSelect' })
    expect(vSelect.exists()).toBe(true)
    expect(vSelect.props('hideDetails')).toBe('auto')
    expect(vSelect.classes()).toContain('mb-3')
  })

  it('removes mb-3 and passes hide-details when hideDetails is true', () => {
    const wrapper = mount(UiSelect, {
      props: {
        modelValue: null,
        items: sampleItems,
        label: 'Filtro Status',
        hideDetails: true,
      },
      global: {
        plugins: [vuetify],
      },
    })

    const vSelect = wrapper.findComponent({ name: 'VSelect' })
    expect(vSelect.exists()).toBe(true)
    expect(vSelect.props('hideDetails')).toBe(true)
    expect(vSelect.classes()).not.toContain('mb-3')
  })

  it('removes mb-3 when hide-details is passed as attribute', () => {
    const wrapper = mount(UiSelect, {
      props: {
        modelValue: null,
        items: sampleItems,
      },
      attrs: {
        'hide-details': true,
      },
      global: {
        plugins: [vuetify],
      },
    })

    const vSelect = wrapper.findComponent({ name: 'VSelect' })
    expect(vSelect.exists()).toBe(true)
    expect(vSelect.classes()).not.toContain('mb-3')
  })

  it('emits update:modelValue when value changes', async () => {
    const wrapper = mount(UiSelect, {
      props: {
        modelValue: null,
        items: sampleItems,
      },
      global: {
        plugins: [vuetify],
      },
    })

    const vSelect = wrapper.findComponent({ name: 'VSelect' })
    await vSelect.vm.$emit('update:modelValue', '1')

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')![0]).toEqual(['1'])
  })
})
