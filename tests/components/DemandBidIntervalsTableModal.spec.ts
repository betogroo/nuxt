import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import DemandBidIntervalsTableModal from '~/components/demands/DemandBidIntervalsTableModal.vue'
import type { DemandBidIntervalItem } from '~/utils/demandBidIntervalsTable'

const mockCopy = vi.fn().mockResolvedValue(true)
const mockCopyHtml = vi.fn().mockResolvedValue(true)

mockNuxtImport('useCopyToClipboard', () => () => ({
  copy: mockCopy,
  copyHtml: mockCopyHtml,
}))

describe('DemandBidIntervalsTableModal', () => {
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

  const validItems: DemandBidIntervalItem[] = [
    {
      id: 'item-1',
      sort_order: 1,
      product_name_snapshot: 'Caneta Esferográfica Azul',
      reference_price: 2.5,
      bid_interval: 0.05,
      bid_interval_type: 'monetary',
    },
    {
      id: 'item-2',
      sort_order: 2,
      product_name_snapshot: 'Papel A4 Sulfite 75g',
      reference_price: 32.0,
      bid_interval: 1,
      bid_interval_type: 'percentage',
    },
  ]

  it('renders modal when modelValue is true and displays table preview when all items configured', () => {
    const wrapper = mount(DemandBidIntervalsTableModal, {
      props: {
        modelValue: true,
        items: validItems,
        demandTitle: 'Demanda de Material de Escritório',
      },
      global: {
        stubs: commonStubs,
      },
    })

    expect(wrapper.find('.modal-title').text()).toContain(
      'Tabela de Intervalos entre Lances (Compras.gov.br)',
    )
    expect(wrapper.find('.bid-interval-preview-container').exists()).toBe(true)
    expect(wrapper.text()).toContain('Caneta Esferográfica Azul')
    expect(wrapper.text()).toContain('Papel A4 Sulfite 75g')
  })

  it('shows warning alert and disables copy buttons when items is empty', () => {
    const wrapper = mount(DemandBidIntervalsTableModal, {
      props: {
        modelValue: true,
        items: [],
      },
      global: {
        stubs: commonStubs,
      },
    })

    expect(wrapper.text()).toContain('Nenhum produto cadastrado nesta demanda ainda')
    const buttons = wrapper.findAll('button')
    const copyFormattedBtn = buttons.find((b) => b.text().includes('Copiar Tabela Formatada'))
    expect(copyFormattedBtn?.attributes('disabled')).toBeDefined()
  })

  it('shows pending intervals alert and disables copy buttons when items are incomplete', () => {
    const itemsWithPending: DemandBidIntervalItem[] = [
      ...validItems,
      {
        id: 'item-3',
        sort_order: 3,
        product_name_snapshot: 'Item Pendente Teste',
        reference_price: 10,
        bid_interval: null,
        bid_interval_type: null,
      },
    ]

    const wrapper = mount(DemandBidIntervalsTableModal, {
      props: {
        modelValue: true,
        items: itemsWithPending,
      },
      global: {
        stubs: commonStubs,
      },
    })

    expect(wrapper.text()).toContain('Intervalos pendentes (1 de 3 itens)')
    expect(wrapper.text()).toContain('Item Pendente Teste')
    expect(wrapper.find('.bid-interval-preview-container').exists()).toBe(false)

    const buttons = wrapper.findAll('button')
    const copyFormattedBtn = buttons.find((b) => b.text().includes('Copiar Tabela Formatada'))
    expect(copyFormattedBtn?.attributes('disabled')).toBeDefined()
  })

  it('calls copyHtml when clicking Copiar Tabela Formatada', async () => {
    const wrapper = mount(DemandBidIntervalsTableModal, {
      props: {
        modelValue: true,
        items: validItems,
      },
      global: {
        stubs: commonStubs,
      },
    })

    const buttons = wrapper.findAll('button')
    const copyFormattedBtn = buttons.find((b) => b.text().includes('Copiar Tabela Formatada'))
    expect(copyFormattedBtn).toBeDefined()

    await copyFormattedBtn!.trigger('click')
    expect(mockCopyHtml).toHaveBeenCalledTimes(1)
    expect(mockCopyHtml).toHaveBeenCalledWith(
      expect.stringContaining('<table'),
      expect.stringContaining('Caneta Esferográfica Azul'),
      expect.any(String),
    )
  })

  it('calls copy when clicking Copiar Código HTML', async () => {
    const wrapper = mount(DemandBidIntervalsTableModal, {
      props: {
        modelValue: true,
        items: validItems,
      },
      global: {
        stubs: commonStubs,
      },
    })

    const buttons = wrapper.findAll('button')
    const copyHtmlBtn = buttons.find((b) => b.text().includes('Copiar Código HTML'))
    expect(copyHtmlBtn).toBeDefined()

    await copyHtmlBtn!.trigger('click')
    expect(mockCopy).toHaveBeenCalledTimes(1)
    expect(mockCopy).toHaveBeenCalledWith(expect.stringContaining('<table'), expect.any(String))
  })
})
