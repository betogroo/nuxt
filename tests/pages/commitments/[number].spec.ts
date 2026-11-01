import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { ref } from 'vue'
import CommitmentDetailPage from '~/pages/commitments/[number].vue'

const mockDetailData = ref({
  commitment: {
    id: 'comm-1',
    commitment_number: '2026NE00313',
    demand_id: 'dem-1',
    supplier_id: 'sup-1',
    expense_nature_id: 'nat-1',
    issue_date: '2026-04-10',
    status: 'received',
    error_details: null,
    observation: 'Mercadoria conferida',
    disbursement_program_number: '2026PD00010',
    disbursement_program_issued_at: '2026-04-12',
    disbursement_program_observation: 'PD liberado',
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
    demand_commitment_liquidations: [],
  },
  liquidations: [
    {
      id: 'nl-1',
      commitment_id: 'comm-1',
      liquidation_number: '2026NL00101',
      issue_date: '2026-04-11',
      observation: 'Primeira NL',
      created_at: '2026-04-11T10:00:00Z',
    },
    {
      id: 'nl-2',
      commitment_id: 'comm-1',
      liquidation_number: '2026NL00102',
      issue_date: '2026-04-11',
      observation: 'Segunda NL',
      created_at: '2026-04-11T11:00:00Z',
    },
  ],
  items: [
    {
      id: 'item-1',
      demand_id: 'dem-1',
      unit_name_snapshot: 'CX',
      quantity: 50,
      winning_unit_price: 10,
      total_item_value: 500,
      execution_status: 'received',
      commitment_number: '2026NE00313',
      product: {
        id: 'prod-1',
        name: 'Caneta Esferográfica Azul',
        expense_natures: { id: 'nat-1', name: '339030 - Material de Consumo' },
      },
      measurement_units: { id: 'u-1', name: 'Caixa' },
    },
  ],
  total_amount: 500,
  status_history: [],
})

const mockFetchCommitmentByNumber = vi.fn().mockResolvedValue(mockDetailData.value)
const mockUpdateCommitmentLogisticsStatus = vi.fn()
const mockAddLiquidationNote = vi.fn()
const mockRemoveLiquidationNote = vi.fn()
const mockSaveDisbursementProgram = vi.fn()
const mockSaveBankOrderAndComplete = vi.fn()

vi.mock('vue-router', () => ({
  useRoute: () => ({
    params: { number: '2026NE00313' },
  }),
}))

mockNuxtImport('useHead', () => vi.fn())
mockNuxtImport('definePageMeta', () => vi.fn())
mockNuxtImport('useToast', () => () => ({
  success: vi.fn(),
  error: vi.fn(),
}))

mockNuxtImport('useCommitments', () => () => ({
  fetchCommitmentByNumber: mockFetchCommitmentByNumber,
  updateCommitmentLogisticsStatus: mockUpdateCommitmentLogisticsStatus,
  addLiquidationNote: mockAddLiquidationNote,
  removeLiquidationNote: mockRemoveLiquidationNote,
  saveDisbursementProgram: mockSaveDisbursementProgram,
  saveBankOrderAndComplete: mockSaveBankOrderAndComplete,
}))

mockNuxtImport('useAsyncData', () => {
  return (_key: unknown, fn: () => Promise<unknown>) => {
    fn()
    return {
      data: mockDetailData,
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
    template: '<button class="ui-button" :disabled="disabled"><slot /></button>',
    props: ['color', 'variant', 'size', 'loading', 'disabled', 'to', 'prependIcon', 'icon'],
  },
  UiChip: { template: '<span class="ui-chip"><slot /></span>' },
  UiIcon: { template: '<i class="ui-icon" />' },
  UiInput: { template: '<input class="ui-input" />' },
  UiTextarea: { template: '<textarea class="ui-textarea" />' },
  UiSelect: { template: '<select class="ui-select" />' },
  UiAlert: { template: '<div class="ui-alert"><slot /></div>' },
  UiModal: { template: '<div class="ui-modal"><slot /><slot name="actions" /></div>' },
  UiProgressCircular: { template: '<div class="ui-progress" />' },
  UiCopyButton: { template: '<button class="ui-copy-btn" />' },
  UiTable: {
    template: `
      <div class="ui-table-stub">
        <div v-for="(item, index) in items" :key="item.id" class="table-row">
          <slot name="item-item_number" :item="item" :index="index" />
          <slot name="item-product" :item="item" :index="index" />
          <slot name="item-unit" :item="item" :index="index" />
          <slot name="item-quantity" :item="item" :index="index" />
          <slot name="item-unit_price" :item="item" :index="index" />
          <slot name="item-subtotal" :item="item" :index="index" />
          <slot name="item-status" :item="item" :index="index" />
          <slot name="item-actions" :item="item" :index="index" />
        </div>
      </div>
    `,
    props: ['headers', 'items'],
  },
  NuxtLink: {
    template: '<a :href="to"><slot /></a>',
    props: ['to'],
  },
}

describe('CommitmentDetailPage (/commitments/[number])', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders commitment header, NLs, PD, OB controls, and linked demand items', () => {
    const wrapper = mount(CommitmentDetailPage, {
      global: {
        stubs,
      },
    })

    expect(mockFetchCommitmentByNumber).toHaveBeenCalledWith('2026NE00313')
    const text = wrapper.text()
    expect(text).toContain('2026NE00313')
    expect(text).toContain('Fornecedor Alpha LTDA')
    expect(text).toContain('2026NL00101')
    expect(text).toContain('2026NL00102')
    expect(text).toContain('2026PD00010')
    expect(text).toContain('Caneta Esferográfica Azul')
    expect(text).toContain('Registrar OB e Concluir Item(ns)')
  })
})
