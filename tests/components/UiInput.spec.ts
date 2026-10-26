import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import UiInput from '~/components/ui/UiInput.vue'

const vuetify = createVuetify({ components, directives })

describe('UiInput', () => {
  it('renders with hideDetails="auto" and mb-3 by default', () => {
    const wrapper = mount(UiInput, {
      props: {
        modelValue: '',
        label: 'Nome',
      },
      global: {
        plugins: [vuetify],
      },
    })

    const vTextField = wrapper.findComponent({ name: 'VTextField' })
    expect(vTextField.exists()).toBe(true)
    expect(vTextField.props('hideDetails')).toBe('auto')
    expect(vTextField.classes()).toContain('mb-3')
  })

  it('removes mb-3 and passes hide-details when hideDetails is true', () => {
    const wrapper = mount(UiInput, {
      props: {
        modelValue: '',
        label: 'Filtro',
        hideDetails: true,
      },
      global: {
        plugins: [vuetify],
      },
    })

    const vTextField = wrapper.findComponent({ name: 'VTextField' })
    expect(vTextField.exists()).toBe(true)
    expect(vTextField.props('hideDetails')).toBe(true)
    expect(vTextField.classes()).not.toContain('mb-3')
  })

  it('removes mb-3 when hide-details is passed as attribute', () => {
    const wrapper = mount(UiInput, {
      props: {
        modelValue: '',
      },
      attrs: {
        'hide-details': true,
      },
      global: {
        plugins: [vuetify],
      },
    })

    const vTextField = wrapper.findComponent({ name: 'VTextField' })
    expect(vTextField.exists()).toBe(true)
    expect(vTextField.classes()).not.toContain('mb-3')
  })

  it('emits update:modelValue when value changes', async () => {
    const wrapper = mount(UiInput, {
      props: {
        modelValue: 'texto inicial',
      },
      global: {
        plugins: [vuetify],
      },
    })

    const vTextField = wrapper.findComponent({ name: 'VTextField' })
    await vTextField.vm.$emit('update:modelValue', 'novo texto')

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')![0]).toEqual(['novo texto'])
  })
})
