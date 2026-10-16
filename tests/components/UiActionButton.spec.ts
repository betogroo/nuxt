import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import UiActionButton from '~/components/ui/UiActionButton.vue'

const vuetify = createVuetify({ components, directives })

describe('UiActionButton', () => {
  it('renders edit preset correctly', () => {
    const wrapper = mount(UiActionButton, {
      props: {
        action: 'edit',
      },
      global: {
        plugins: [vuetify],
      },
    })

    const button = wrapper.findComponent({ name: 'UiButton' })
    expect(button.exists()).toBe(true)
    expect(button.props('icon')).toBe('editOutline')
    expect(button.props('color')).toBe('primary')
    expect(button.props('tooltip')).toBe('Editar')
  })

  it('renders delete preset correctly', () => {
    const wrapper = mount(UiActionButton, {
      props: {
        action: 'delete',
      },
      global: {
        plugins: [vuetify],
      },
    })

    const button = wrapper.findComponent({ name: 'UiButton' })
    expect(button.props('icon')).toBe('deleteOutline')
    expect(button.props('color')).toBe('error')
    expect(button.props('tooltip')).toBe('Excluir')
  })

  it('allows overriding tooltip, icon and color', () => {
    const wrapper = mount(UiActionButton, {
      props: {
        action: 'edit',
        tooltip: 'Modificar cadastro',
        icon: 'pencil',
        color: 'warning',
      },
      global: {
        plugins: [vuetify],
      },
    })

    const button = wrapper.findComponent({ name: 'UiButton' })
    expect(button.props('icon')).toBe('pencil')
    expect(button.props('color')).toBe('warning')
    expect(button.props('tooltip')).toBe('Modificar cadastro')
  })

  it('emits click event on click', async () => {
    const wrapper = mount(UiActionButton, {
      props: {
        action: 'refresh',
      },
      global: {
        plugins: [vuetify],
      },
    })

    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('click')).toBeTruthy()
  })
})
