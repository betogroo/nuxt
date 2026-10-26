import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import UiCopyButton from '~/components/ui/UiCopyButton.vue'

const vuetify = createVuetify({ components, directives })

const mockCopy = vi.fn()
vi.mock('~/composables/useCopyToClipboard', () => ({
  useCopyToClipboard: () => ({
    copy: mockCopy,
  }),
}))

describe('UiCopyButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCopy.mockResolvedValue(true)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders copy button correctly', () => {
    const wrapper = mount(UiCopyButton, {
      props: {
        value: '123456789',
      },
      global: {
        plugins: [vuetify],
      },
    })

    const button = wrapper.findComponent({ name: 'UiButton' })
    expect(button.exists()).toBe(true)
    expect(button.props('icon')).toBe('copy')
    expect(button.props('size')).toBe('xs')
  })

  it('copies raw text when cleanDigitsOnly is false', async () => {
    const wrapper = mount(UiCopyButton, {
      props: {
        value: '12.345.678/0001-90',
        cleanDigitsOnly: false,
      },
      global: {
        plugins: [vuetify],
      },
    })

    const button = wrapper.findComponent({ name: 'UiButton' })
    await button.trigger('click')

    expect(mockCopy).toHaveBeenCalledWith(
      '12.345.678/0001-90',
      'Copiado para a área de transferência!',
    )
    expect(wrapper.emitted('copied')).toBeTruthy()
    expect(wrapper.emitted('copied')![0]).toEqual(['12.345.678/0001-90'])
  })

  it('cleans non-digits when cleanDigitsOnly is true', async () => {
    const wrapper = mount(UiCopyButton, {
      props: {
        value: '12.345.678/0001-90',
        cleanDigitsOnly: true,
        successMessage: 'CNPJ copiado!',
      },
      global: {
        plugins: [vuetify],
      },
    })

    const button = wrapper.findComponent({ name: 'UiButton' })
    await button.trigger('click')

    expect(mockCopy).toHaveBeenCalledWith('12345678000190', 'CNPJ copiado!')
    expect(wrapper.emitted('copied')).toBeTruthy()
    expect(wrapper.emitted('copied')![0]).toEqual(['12345678000190'])
  })

  it('supports text prop as fallback for value', async () => {
    const wrapper = mount(UiCopyButton, {
      props: {
        text: '98.765.432/0001-10',
        cleanDigitsOnly: true,
      },
      global: {
        plugins: [vuetify],
      },
    })

    const button = wrapper.findComponent({ name: 'UiButton' })
    await button.trigger('click')

    expect(mockCopy).toHaveBeenCalledWith('98765432000110', 'Copiado para a área de transferência!')
  })

  it('does not copy when value is empty', async () => {
    const wrapper = mount(UiCopyButton, {
      props: {
        value: '',
      },
      global: {
        plugins: [vuetify],
      },
    })

    const button = wrapper.findComponent({ name: 'UiButton' })
    await button.trigger('click')

    expect(mockCopy).not.toHaveBeenCalled()
    expect(wrapper.emitted('copied')).toBeFalsy()
  })

  it('renders disabled button when disabled prop is true', () => {
    const wrapper = mount(UiCopyButton, {
      props: {
        value: '12345',
        disabled: true,
      },
      global: {
        plugins: [vuetify],
      },
    })

    const button = wrapper.findComponent({ name: 'UiButton' })
    expect(button.props('disabled')).toBe(true)
  })
})
