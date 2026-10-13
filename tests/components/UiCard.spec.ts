import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import UiCard from '~/components/ui/UiCard.vue'

const vuetify = createVuetify({ components, directives })

describe('UiCard', () => {
  it('renders correctly with title and content', () => {
    const wrapper = mount(UiCard, {
      props: {
        title: 'Dashboard IIRGD',
      },
      slots: {
        default: 'Card Body Content',
      },
      global: {
        plugins: [vuetify],
      },
    })

    expect(wrapper.text()).toContain('Dashboard IIRGD')
    expect(wrapper.text()).toContain('Card Body Content')
  })

  it('passes to and href props to the underlying v-card', () => {
    const wrapper = mount(UiCard, {
      props: {
        to: '/iirgd',
        href: 'https://example.com',
      },
      global: {
        plugins: [vuetify],
      },
    })

    const vCard = wrapper.findComponent({ name: 'VCard' })
    expect(vCard.exists()).toBe(true)
    expect(vCard.props('to')).toBe('/iirgd')
    expect(vCard.props('href')).toBe('https://example.com')
  })
})
