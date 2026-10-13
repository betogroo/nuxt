import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import UiCheckbox from '~/components/ui/UiCheckbox.vue'

const vuetify = createVuetify({ components, directives })

describe('UiCheckbox', () => {
  it('renders correctly with label', () => {
    const wrapper = mount(UiCheckbox, {
      props: {
        label: 'Cidadão de outro estado (sem RG de SP)',
        modelValue: false,
      },
      global: {
        plugins: [vuetify],
      },
    })

    expect(wrapper.text()).toContain('Cidadão de outro estado (sem RG de SP)')
  })
})
