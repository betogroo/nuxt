import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import UiButton from '~/components/ui/UiButton.vue'
import UiTooltip from '~/components/ui/UiTooltip.vue'

const vuetify = createVuetify({ components, directives })

describe('UiButton', () => {
  it('renders standard button without tooltip', () => {
    const wrapper = mount(UiButton, {
      slots: {
        default: 'Clique Aqui',
      },
      global: {
        plugins: [vuetify],
      },
    })

    const btn = wrapper.find('button')
    expect(btn.exists()).toBe(true)
    expect(btn.text()).toBe('Clique Aqui')
    expect(wrapper.findComponent(UiTooltip).exists()).toBe(false)
  })

  it('wraps button in UiTooltip when tooltip prop is provided', () => {
    const wrapper = mount(UiButton, {
      props: {
        icon: 'editOutline',
        tooltip: 'Editar Registro',
      },
      global: {
        plugins: [vuetify],
      },
    })

    const tooltip = wrapper.findComponent(UiTooltip)
    expect(tooltip.exists()).toBe(true)
    expect(tooltip.props('text')).toBe('Editar Registro')
  })

  it('passes disabled prop correctly to button and tooltip', () => {
    const wrapper = mount(UiButton, {
      props: {
        disabled: true,
        tooltip: 'Ação Desabilitada',
      },
      global: {
        plugins: [vuetify],
      },
    })

    const btn = wrapper.find('button')
    expect(btn.attributes('disabled')).toBeDefined()
    const tooltip = wrapper.findComponent(UiTooltip)
    expect(tooltip.props('disabled')).toBe(true)
  })
})
