import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import DemandTablesHubModal from '~/components/demands/DemandTablesHubModal.vue'

describe('DemandTablesHubModal', () => {
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
    UiAvatar: {
      template: '<div class="ui-avatar"><slot /></div>',
    },
    UiIcon: {
      props: ['name'],
      template: '<i :class="name"></i>',
    },
    UiChip: {
      props: ['color'],
      template: '<span class="ui-chip"><slot /></span>',
    },
    UiButton: {
      props: ['disabled'],
      template: '<button class="ui-button" :disabled="disabled"><slot /></button>',
    },
    UiTooltip: {
      template: '<div class="ui-tooltip"><slot name="activator" :props="{}" /></div>',
    },
    UiSpacer: {
      template: '<div class="ui-spacer" />',
    },
  }

  const validItems = [
    {
      id: 'item-1',
      sort_order: 1,
      product_name_snapshot: 'Caneta Esferográfica Azul',
      reference_price: 2.5,
      bid_interval: 0.05,
      bid_interval_type: 'monetary',
      quantity: 10,
    },
    {
      id: 'item-2',
      sort_order: 2,
      product_name_snapshot: 'Papel A4 Sulfite 75g',
      reference_price: 32.0,
      bid_interval: 1,
      bid_interval_type: 'percentage',
      quantity: 20,
    },
  ]

  it('renders modal when modelValue is true and displays all 4 table model cards', () => {
    const wrapper = mount(DemandTablesHubModal, {
      props: {
        modelValue: true,
        items: validItems,
      },
      global: {
        stubs: commonStubs,
      },
    })

    expect(wrapper.find('.modal-title').text()).toContain(
      'Central de Tabelas e Modelos de Contratação',
    )
    expect(wrapper.text()).toContain('Termo de Referência (TR)')
    expect(wrapper.text()).toContain('Intervalos entre Lances')
    expect(wrapper.text()).toContain('Saldo por Classe')
    expect(wrapper.text()).toContain('Tabela para Informação')
  })

  it('disables action buttons when items list is empty', () => {
    const wrapper = mount(DemandTablesHubModal, {
      props: {
        modelValue: true,
        items: [],
      },
      global: {
        stubs: commonStubs,
      },
    })

    const termsBtn = wrapper.find('[data-testid="btn-hub-open-terms"]')
    expect(termsBtn.attributes('disabled')).toBeDefined()

    const intervalsBtn = wrapper.find('[data-testid="btn-hub-open-bid-intervals"]')
    expect(intervalsBtn.attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('Sem Itens')
  })

  it('indicates pending intervals and blocks interval table button when items are incomplete', () => {
    const itemsWithPending = [
      ...validItems,
      {
        id: 'item-3',
        sort_order: 3,
        product_name_snapshot: 'Grampeador',
        reference_price: 15,
        bid_interval: null,
        bid_interval_type: null,
        quantity: 5,
      },
    ]

    const wrapper = mount(DemandTablesHubModal, {
      props: {
        modelValue: true,
        items: itemsWithPending,
      },
      global: {
        stubs: commonStubs,
      },
    })

    expect(wrapper.text()).toContain('1 pendente(s)')
    const intervalsBtn = wrapper.find('[data-testid="btn-hub-open-bid-intervals"]')
    expect(intervalsBtn.attributes('disabled')).toBeDefined()

    // TR is still enabled
    const termsBtn = wrapper.find('[data-testid="btn-hub-open-terms"]')
    expect(termsBtn.attributes('disabled')).toBeUndefined()
  })

  it('emits openBidIntervalsTable when all items are valid and user clicks Gerar Tabela', async () => {
    const wrapper = mount(DemandTablesHubModal, {
      props: {
        modelValue: true,
        items: validItems,
      },
      global: {
        stubs: commonStubs,
      },
    })

    expect(wrapper.text()).toContain('Pronto para Disputa')
    const intervalsBtn = wrapper.find('[data-testid="btn-hub-open-bid-intervals"]')
    expect(intervalsBtn.attributes('disabled')).toBeUndefined()

    await intervalsBtn.trigger('click')
    expect(wrapper.emitted('openBidIntervalsTable')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
  })

  it('emits openTermsTable and closes modal when Gerar Tabela on TR card is clicked', async () => {
    const wrapper = mount(DemandTablesHubModal, {
      props: {
        modelValue: true,
        items: validItems,
      },
      global: {
        stubs: commonStubs,
      },
    })

    const termsBtn = wrapper.find('[data-testid="btn-hub-open-terms"]')
    await termsBtn.trigger('click')
    expect(wrapper.emitted('openTermsTable')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
  })

  it('emits openClassBalanceTable and closes modal when Gerar Tabela on Saldo por Classe card is clicked', async () => {
    const wrapper = mount(DemandTablesHubModal, {
      props: {
        modelValue: true,
        items: validItems,
      },
      global: {
        stubs: commonStubs,
      },
    })

    const classBalanceBtn = wrapper.find('[data-testid="btn-hub-open-class-balance"]')
    await classBalanceBtn.trigger('click')
    expect(wrapper.emitted('openClassBalanceTable')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
  })
})
