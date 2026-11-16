import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { ref, defineComponent, nextTick } from 'vue'
import Textarea from '~/components/ui/Textarea.vue'

const vuetify = createVuetify({ components, directives })

describe('UiTextarea', () => {
  it('supports two-way data binding with defineModel', async () => {
    const TestHost = defineComponent({
      components: { UiTextarea: Textarea },
      setup() {
        const text = ref('Initial Text')
        return { text }
      },
      template: '<UiTextarea v-model="text" />',
    })

    const wrapper = mount(TestHost, {
      global: {
        plugins: [vuetify],
      },
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vm = wrapper.vm as any

    expect(vm.text).toBe('Initial Text')

    // Programmatic update
    vm.text = 'Updated Programmatically'
    await nextTick()

    const textareaComponent = wrapper.findComponent(Textarea)
    expect(textareaComponent.props('modelValue')).toBe('Updated Programmatically')
  })
})
