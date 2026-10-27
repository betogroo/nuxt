import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import DemandTermsOfReferenceTableModal from '~/components/demands/DemandTermsOfReferenceTableModal.vue'
import type { DemandTermsItem } from '~/utils/demandTermsOfReferenceTable'

const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
}

const mockCopy = vi.fn().mockResolvedValue(true)
const mockCopyHtml = vi.fn().mockResolvedValue(true)

mockNuxtImport('useToast', () => () => mockToast)
mockNuxtImport('useCopyToClipboard', () => () => ({
  copy: mockCopy,
  copyHtml: mockCopyHtml,
}))

describe('DemandTermsOfReferenceTableModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const commonStubs = {
    UiModal: {
      props: ['modelValue', 'title'],
      template: `
        <div v-if="modelValue" class="ui-modal">
          <div class="modal-title">{{ title }}</div>
          <slot />
          <slot name="actions" />
        </div>
      `,
    },
    UiAlert: {
      template: '<div class="ui-alert"><slot /></div>',
    },
    UiCard: {
      template: '<div class="ui-card"><slot /></div>',
    },
    UiRow: {
      template: '<div class="ui-row"><slot /></div>',
    },
    UiCol: {
      template: '<div class="ui-col"><slot /></div>',
    },
    UiSwitch: {
      props: ['modelValue', 'label'],
      template: `
        <label class="ui-switch">
          <input
            type="checkbox"
            :checked="modelValue"
            @change="$emit('update:modelValue', $event.target.checked)"
          />
          {{ label }}
        </label>
      `,
    },
    UiSelect: {
      props: ['modelValue', 'items', 'label'],
      template: `
        <div class="ui-select">
          <label>{{ label }}</label>
          <select
            :value="modelValue"
            @change="$emit('update:modelValue', $event.target.value)"
          >
            <option v-for="item in items" :key="item.value" :value="item.value">
              {{ item.title }}
            </option>
          </select>
        </div>
      `,
    },
    UiButton: {
      props: ['loading', 'disabled', 'prependIcon'],
      template: `
        <button class="ui-button" :disabled="disabled">
          <slot />
        </button>
      `,
    },
    UiSpacer: {
      template: '<div class="ui-spacer" />',
    },
  }

  const sampleItems: DemandTermsItem[] = [
    {
      id: 'item-1',
      sort_order: 1,
      product_name_snapshot: 'Caneta Esferográfica Azul',
      unit_name_snapshot: 'Caixa',
      alias_name_snapshot: 'Caixa 100 UN',
      alias_code_snapshot: 38,
      quantity: 10,
      reference_price: 25.5,
      product: {
        name: 'Caneta Esferográfica Azul',
        cat_mat: 123456,
        cat_bec: 78910,
        product_characteristics: [{ value: 'Média 1.0mm', key: { name: 'Ponta' } }],
      },
    },
  ]

  it('renders modal when open and displays table preview with items', () => {
    const wrapper = mount(DemandTermsOfReferenceTableModal, {
      props: {
        modelValue: true,
        items: sampleItems,
      },
      global: {
        stubs: commonStubs,
      },
    })

    expect(wrapper.find('.modal-title').text()).toContain('Tabela para Termo de Referência')
    expect(wrapper.text()).toContain('PRÉ-VISUALIZAÇÃO DA TABELA (1 item)')
    expect(wrapper.html()).toContain('Caneta Esferográfica Azul')
    expect(wrapper.html()).toContain('Ponta: </strong>Média 1.0mm')
  })

  it('displays warning alert when items list is empty', () => {
    const wrapper = mount(DemandTermsOfReferenceTableModal, {
      props: {
        modelValue: true,
        items: [],
      },
      global: {
        stubs: commonStubs,
      },
    })

    expect(wrapper.text()).toContain('Nenhum produto cadastrado nesta demanda ainda')
  })

  it('calls copyHtml when clicking Copiar Tabela Formatada button', async () => {
    const wrapper = mount(DemandTermsOfReferenceTableModal, {
      props: {
        modelValue: true,
        items: sampleItems,
      },
      global: {
        stubs: commonStubs,
      },
    })

    const buttons = wrapper.findAll('.ui-button')
    const copyFormattedButton = buttons.find((b) => b.text().includes('Copiar Tabela Formatada'))
    expect(copyFormattedButton).toBeDefined()

    await copyFormattedButton?.trigger('click')

    expect(mockCopyHtml).toHaveBeenCalledTimes(1)
    expect(mockCopyHtml.mock.calls[0][0]).toContain('<table')
    expect(mockCopyHtml.mock.calls[0][0]).toContain('Caneta Esferográfica Azul')
  })

  it('calls copy when clicking Copiar Código HTML button', async () => {
    const wrapper = mount(DemandTermsOfReferenceTableModal, {
      props: {
        modelValue: true,
        items: sampleItems,
      },
      global: {
        stubs: commonStubs,
      },
    })

    const buttons = wrapper.findAll('.ui-button')
    const copyHtmlButton = buttons.find((b) => b.text().includes('Copiar Código HTML'))
    expect(copyHtmlButton).toBeDefined()

    await copyHtmlButton?.trigger('click')

    expect(mockCopy).toHaveBeenCalledTimes(1)
    expect(mockCopy.mock.calls[0][0]).toContain('<table')
  })

  it('updates preview when toggling options', async () => {
    const wrapper = mount(DemandTermsOfReferenceTableModal, {
      props: {
        modelValue: true,
        items: sampleItems,
      },
      global: {
        stubs: commonStubs,
      },
    })

    // Initially contains characteristics
    expect(wrapper.html()).toContain('Ponta: </strong>Média 1.0mm')

    // Find characteristics switch and toggle it off
    const switches = wrapper.findAll('input[type="checkbox"]')
    await switches[0].setValue(false)

    expect(wrapper.html()).not.toContain('Ponta: </strong>Média 1.0mm')
  })
})
