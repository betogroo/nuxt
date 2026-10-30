import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import DemandClassBalanceTableModal from '~/components/demands/DemandClassBalanceTableModal.vue'
import type { DemandTermsItem } from '~/utils/demandTermsOfReferenceTable'

const mockCopy = vi.fn().mockResolvedValue(true)
const mockCopyHtml = vi.fn().mockResolvedValue(true)
const mockFetchCeilings = vi.fn().mockResolvedValue({ '2026': 65492.11 })
const mockGetCeilingForYear = vi.fn().mockReturnValue({ amount: 65492.11, isConfigured: true })
const mockFetchDemandsForClassSpending = vi.fn().mockResolvedValue([])

mockNuxtImport('useCopyToClipboard', () => () => ({
  copy: mockCopy,
  copyHtml: mockCopyHtml,
}))

mockNuxtImport('useSystemSettings', () => () => ({
  fetchProductClassAnnualCeilings: mockFetchCeilings,
  getCeilingForYear: mockGetCeilingForYear,
}))

mockNuxtImport('useDemandReports', () => () => ({
  fetchDemandsForClassSpending: mockFetchDemandsForClassSpending,
}))

describe('DemandClassBalanceTableModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetchCeilings.mockResolvedValue({ '2026': 65492.11 })
    mockGetCeilingForYear.mockReturnValue({ amount: 65492.11, isConfigured: true })
    mockFetchDemandsForClassSpending.mockResolvedValue([])
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
    UiChip: {
      template: '<span class="ui-chip"><slot /></span>',
    },
    UiProgressCircular: {
      template: '<div class="ui-progress" />',
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

  const sampleDemand = {
    id: 'dem-1',
    name: 'Aquisição de Material de Escritório',
    dispute_date: null,
    internal_process_number: '2026-0015',
    created_at: '2026-04-01T10:00:00Z',
  }

  const sampleItems: DemandTermsItem[] = [
    {
      id: 'item-1',
      quantity: 10,
      reference_price: 25.5,
      product: {
        name: 'Caneta Esferográfica Azul',
        product_class_id: '7520',
        product_classes: { id: '7520', name: 'Artigos e Utensílios de Escritório' },
      },
    },
  ]

  it('loads spending context when opened and renders table preview', async () => {
    const wrapper = mount(DemandClassBalanceTableModal, {
      props: {
        modelValue: true,
        demand: sampleDemand,
        items: sampleItems,
      },
      global: {
        stubs: commonStubs,
      },
    })

    await flushPromises()

    expect(mockFetchCeilings).toHaveBeenCalledTimes(1)
    expect(mockFetchDemandsForClassSpending).toHaveBeenCalledTimes(1)
    expect(wrapper.find('.modal-title').text()).toContain('Tabela de Saldo por Classe de Materiais')
    expect(wrapper.text()).toContain('PRÉ-VISUALIZAÇÃO DA TABELA (1 classe)')
    expect(wrapper.html()).toContain('7520 - Artigos e Utensílios de Escritório')
    expect(wrapper.html()).toContain('Teto Anual (2026)')
    expect(wrapper.html()).toContain('Já Empenhado (Outras Demandas)')
    expect(wrapper.html()).toContain('Valor Nesta Demanda')
    expect(wrapper.html()).toContain('Saldo Restante')
  })

  it('displays warning alert when items list is empty', async () => {
    const wrapper = mount(DemandClassBalanceTableModal, {
      props: {
        modelValue: true,
        demand: sampleDemand,
        items: [],
      },
      global: {
        stubs: commonStubs,
      },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('Nenhum produto cadastrado nesta demanda ainda')
  })

  it('calls copyHtml when clicking Copiar Tabela Formatada button', async () => {
    const wrapper = mount(DemandClassBalanceTableModal, {
      props: {
        modelValue: true,
        demand: sampleDemand,
        items: sampleItems,
      },
      global: {
        stubs: commonStubs,
      },
    })

    await flushPromises()

    const buttons = wrapper.findAll('.ui-button')
    const copyFormattedButton = buttons.find((b) => b.text().includes('Copiar Tabela Formatada'))
    expect(copyFormattedButton).toBeDefined()

    await copyFormattedButton?.trigger('click')

    expect(mockCopyHtml).toHaveBeenCalledTimes(1)
    expect(mockCopyHtml.mock.calls[0][0]).toContain('<table')
    expect(mockCopyHtml.mock.calls[0][0]).toContain('7520 - Artigos e Utensílios de Escritório')
  })

  it('calls copy when clicking Copiar Código HTML button', async () => {
    const wrapper = mount(DemandClassBalanceTableModal, {
      props: {
        modelValue: true,
        demand: sampleDemand,
        items: sampleItems,
      },
      global: {
        stubs: commonStubs,
      },
    })

    await flushPromises()

    const buttons = wrapper.findAll('.ui-button')
    const copyHtmlButton = buttons.find((b) => b.text().includes('Copiar Código HTML'))
    expect(copyHtmlButton).toBeDefined()

    await copyHtmlButton?.trigger('click')

    expect(mockCopy).toHaveBeenCalledTimes(1)
    expect(mockCopy.mock.calls[0][0]).toContain('<table')
  })
})
