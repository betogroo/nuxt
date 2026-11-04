import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { ref } from 'vue'
import CommitmentsIndexPage from '~/pages/commitments/index.vue'

const mockCommitmentsList = ref([
  {
    id: 'comm-1',
    commitment_number: '2026NE00313',
    demand_id: 'dem-1',
    supplier_id: 'sup-1',
    expense_nature_id: 'nat-1',
    issue_date: '2026-04-10',
    status: 'delivered',
    error_details: null,
    observation: 'Mercadoria conferida',
    disbursement_program_number: '2026PD00010',
    disbursement_program_issued_at: '2026-04-12',
    disbursement_program_observation: null,
    bank_order_number: null,
    bank_order_issued_at: null,
    bank_order_observation: null,
    created_at: '2026-04-10T10:00:00Z',
    updated_at: '2026-04-12T10:00:00Z',
    suppliers: {
      id: 'sup-1',
      company_name: 'Fornecedor Alpha LTDA',
      cnpj: '12345678000190',
    },
    demands: {
      id: 'dem-1',
      name: 'Aquisição de Materiais de Escritório',
      internal_process_number: '042/2026',
      process_number: null,
      status: 'in_progress',
    },
    expense_natures: {
      id: 'nat-1',
      name: '339030 - Material de Consumo',
    },
    demand_commitment_liquidations: [
      {
        id: 'nl-1',
        commitment_id: 'comm-1',
        liquidation_number: '2026NL00101',
        issue_date: '2026-04-11',
        observation: null,
        created_at: '2026-04-11T10:00:00Z',
      },
      {
        id: 'nl-2',
        commitment_id: 'comm-1',
        liquidation_number: '2026NL00102',
        issue_date: '2026-04-11',
        observation: null,
        created_at: '2026-04-11T11:00:00Z',
      },
    ],
    items_count: 3,
    total_amount: 1500.5,
    liquidations_count: 2,
  },
])

const mockFetchCommitments = vi.fn().mockResolvedValue(mockCommitmentsList.value)

mockNuxtImport('useHead', () => vi.fn())
mockNuxtImport('definePageMeta', () => vi.fn())

mockNuxtImport('useCommitments', () => () => ({
  fetchCommitments: mockFetchCommitments,
}))

mockNuxtImport('useAsyncData', () => {
  return (_key: string, fn: () => Promise<unknown>) => {
    fn()
    return {
      data: mockCommitmentsList,
      pending: ref(false),
      refresh: vi.fn(),
    }
  }
})

const stubs = {
  UiRow: { template: '<div class="ui-row"><slot /></div>' },
  UiCol: { template: '<div class="ui-col"><slot /></div>' },
  UiCard: { template: '<div class="ui-card"><slot /></div>' },
  UiButton: {
    template: '<button class="ui-button"><slot /></button>',
    props: ['color', 'variant', 'size', 'loading', 'to', 'prependIcon'],
  },
  UiChip: { template: '<span class="ui-chip"><slot /></span>' },
  UiIcon: { template: '<i class="ui-icon" />' },
  UiInput: { template: '<input class="ui-input" />' },
  UiSelect: { template: '<select class="ui-select" />' },
  UiTable: {
    template: `
      <div class="ui-table-stub">
        <div v-for="item in items" :key="item.id" class="table-row">
          <slot name="item-commitment_number" :item="item" />
          <slot name="item-demand" :item="item" />
          <slot name="item-supplier" :item="item" />
          <slot name="item-amount" :item="item" />
          <slot name="item-status" :item="item" />
          <slot name="item-financial" :item="item" />
          <slot name="item-actions" :item="item" />
        </div>
      </div>
    `,
    props: ['headers', 'items', 'loading'],
  },
  NuxtLink: {
    template: '<a :href="to"><slot /></a>',
    props: ['to'],
  },
  CancelCommitmentModal: {
    template: '<div class="cancel-commitment-modal-stub" />',
    props: ['modelValue', 'commitment'],
  },
  UiActionButton: {
    template: '<button class="ui-action-button" />',
    props: ['action', 'color', 'icon', 'tooltip'],
  },
}

describe('CommitmentsIndexPage (/commitments)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders commitment list, metrics, and financial badges cleanly', () => {
    const wrapper = mount(CommitmentsIndexPage, {
      global: {
        stubs,
      },
    })

    expect(mockFetchCommitments).toHaveBeenCalledTimes(1)
    const text = wrapper.text()
    expect(text).toContain('Notas de Empenho (NE)')
    expect(text).toContain('2026NE00313')
    expect(text).toContain('Fornecedor Alpha LTDA')
    expect(text).toContain('Aquisição de Materiais de Escritório')
    expect(text).toContain('NL: 2/2+')
    expect(text).toContain('PD: 2026PD00010')
    expect(text).toContain('OB: Pendente')
  })
})
