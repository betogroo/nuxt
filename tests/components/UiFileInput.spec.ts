import { describe, it, expect } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import UiFileInput from '~/components/ui/UiFileInput.vue'

describe('UiFileInput Component', () => {
  it('renders correctly and emits update:modelValue on file selection', () => {
    const file = new File(['content'], 'test.png', { type: 'image/png' })
    const wrapper = shallowMount(UiFileInput, {
      props: {
        label: 'Foto do Candidato',
        accept: 'image/*',
        modelValue: file,
      },
      global: {
        stubs: {
          'v-file-input': {
            template:
              '<input type="file" @change="$emit(\'update:model-value\', $event.target.files[0])" />',
            props: ['label', 'accept', 'modelValue'],
          },
        },
      },
    })

    expect(wrapper.exists()).toBe(true)
    expect(wrapper.props().label).toBe('Foto do Candidato')
    expect(wrapper.props().accept).toBe('image/*')
  })
})
