import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import UiSwitch from '~/components/ui/UiSwitch.vue'

const vuetify = createVuetify({ components, directives })

describe('UiSwitch', () => {
  it('renders with default color="primary"', () => {
    const wrapper = mount(UiSwitch, {
      props: {
        modelValue: false,
        label: 'Opção Padrão',
      },
      global: {
        plugins: [vuetify],
      },
    })

    const vSwitch = wrapper.findComponent({ name: 'VSwitch' })
    expect(vSwitch.exists()).toBe(true)
    expect(vSwitch.props('color')).toBe('primary')
    expect(wrapper.text()).toContain('Opção Padrão')
  })

  it('accepts custom color such as "success" for active status', () => {
    const wrapper = mount(UiSwitch, {
      props: {
        modelValue: true,
        label: 'Registro Ativo',
        color: 'success',
      },
      global: {
        plugins: [vuetify],
      },
    })

    const vSwitch = wrapper.findComponent({ name: 'VSwitch' })
    expect(vSwitch.exists()).toBe(true)
    expect(vSwitch.props('color')).toBe('success')
  })

  it('emits update:modelValue when toggled', async () => {
    const wrapper = mount(UiSwitch, {
      props: {
        modelValue: false,
      },
      global: {
        plugins: [vuetify],
      },
    })

    const vSwitch = wrapper.findComponent({ name: 'VSwitch' })
    await vSwitch.vm.$emit('update:modelValue', true)

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')![0]).toEqual([true])
  })

  it('configures density correctly based on size prop', () => {
    const compactWrapper = mount(UiSwitch, {
      props: {
        modelValue: false,
        size: 'sm',
      },
      global: {
        plugins: [vuetify],
      },
    })
    expect(compactWrapper.findComponent({ name: 'VSwitch' }).props('density')).toBe('compact')

    const defaultWrapper = mount(UiSwitch, {
      props: {
        modelValue: false,
        size: 'lg',
      },
      global: {
        plugins: [vuetify],
      },
    })
    expect(defaultWrapper.findComponent({ name: 'VSwitch' }).props('density')).toBe('default')
  })
})
