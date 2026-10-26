import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import UiTooltip from '~/components/ui/UiTooltip.vue'

const vuetify = createVuetify({ components, directives })

describe('UiTooltip', () => {
  it('renders content passed via default slot fallback in activator', () => {
    const wrapper = mount(UiTooltip, {
      props: {
        text: 'Tooltip Text',
      },
      slots: {
        default: '<button class="test-btn">Click Me</button>',
      },
      global: {
        plugins: [vuetify],
      },
    })

    const button = wrapper.find('.test-btn')
    expect(button.exists()).toBe(true)
    expect(button.text()).toBe('Click Me')
  })

  it('renders content passed via activator named slot', () => {
    const wrapper = mount(UiTooltip, {
      props: {
        text: 'Tooltip Text',
      },
      slots: {
        activator: '<button class="activator-btn">Activator Button</button>',
      },
      global: {
        plugins: [vuetify],
      },
    })

    const button = wrapper.find('.activator-btn')
    expect(button.exists()).toBe(true)
    expect(button.text()).toBe('Activator Button')
  })
})
