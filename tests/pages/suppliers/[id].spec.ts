import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { ref } from 'vue'
import SupplierDetailPage from '~/pages/suppliers/[id].vue'

const mockSupplierData = ref({
  id: 'sup-1',
  company_name: 'Fornecedor Alpha LTDA',
  cnpj: '12345678000199',
  responsible_name: 'Carlos da Silva',
  email: 'carlos@alpha.com',
  cell_phone: '(11) 98765-4321',
  landline: '(11) 3456-7890',
  address: 'Rua das Flores, 123',
  has_bb_account: 'Ag: 1234-5, CC: 98765-4',
  is_simples_optant: true,
  simples_optant_verified_at: '2026-05-10T10:00:00Z',
  is_active: true,
  created_at: '2026-01-15T08:00:00Z',
})

const mockWonSummaryData = ref({
  totalDemandsWon: 2,
  totalItemsWon: 5,
  totalAmountWon: 15400.5,
  averageDemandAmount: 7700.25,
  demands: [
    {
      demand_id: 'dem-1',
      demand_name: 'Aquisição de Material de Escritório',
      process_number: '042/2026',
      status: 'completed' as const,
      type: 'consumption' as const,
      dispute_date: '2026-06-15T14:00:00Z',
      items_count: 3,
      total_amount: 5400.5,
      items: [],
    },
    {
      demand_id: 'dem-2',
      demand_name: 'Equipamentos de Informática',
      process_number: '088/2026',
      status: 'dispute' as const,
      type: 'permanente' as const,
      dispute_date: '2026-07-20T10:00:00Z',
      items_count: 2,
      total_amount: 10000,
      items: [],
    },
  ],
})

const mockFetchSupplierById = vi.fn()
const mockFetchSupplierWonDemands = vi.fn()
const mockUpdateSupplier = vi.fn()
const mockToggleSupplierStatus = vi.fn()
const mockRouterPush = vi.fn()
const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
}

mockNuxtImport('useToast', () => () => mockToast)
mockNuxtImport('useHead', () => vi.fn())
mockNuxtImport('definePageMeta', () => vi.fn())
mockNuxtImport('useRoute', () => () => ({ params: { id: 'sup-1' } }))
mockNuxtImport('useRouter', () => () => ({ push: mockRouterPush }))

mockNuxtImport('useSuppliers', () => () => ({
  fetchSupplierById: mockFetchSupplierById,
  fetchSupplierWonDemands: mockFetchSupplierWonDemands,
  updateSupplier: mockUpdateSupplier,
  toggleSupplierStatus: mockToggleSupplierStatus,
}))

mockNuxtImport('useAsyncData', () => {
  return (key: string) => {
    if (key.startsWith('supplier-detail-')) {
      return {
        data: mockSupplierData,
        pending: ref(false),
        refresh: vi.fn(),
      }
    }
    if (key.startsWith('supplier-won-demands-')) {
      return {
        data: mockWonSummaryData,
        pending: ref(false),
        refresh: vi.fn(),
      }
    }
    return {
      data: ref(null),
      pending: ref(false),
      refresh: vi.fn(),
    }
  }
})

mockNuxtImport('useZodForm', () => {
  return () => ({
    errors: {},
    defineField: (_field: string) => [ref(''), {}],
    resetForm: vi.fn(),
    handleSubmit: (fn: unknown) => fn,
  })
})

const stubs = {
  UiContainer: { template: '<div><slot /></div>' },
  UiRow: { template: '<div class="ui-row"><slot /></div>' },
  UiCol: { template: '<div class="ui-col"><slot /></div>' },
  UiCard: { template: '<div class="ui-card"><slot name="header" /><slot /></div>' },
  UiButton: {
    name: 'UiButton',
    template:
      '<button class="ui-button" :data-icon="icon" @click="$emit(\'click\')"><slot /></button>',
    props: ['icon', 'color', 'variant', 'size', 'loading', 'disabled'],
  },
  UiChip: { template: '<span class="ui-chip"><slot /></span>' },
  UiIcon: { template: '<i class="ui-icon" />' },
  UiTable: {
    template: `
      <div class="ui-table-stub">
        <div v-for="item in items" :key="item.demand_id" class="table-row">
          <slot name="item-demand_name" :item="item">{{ item.demand_name }}</slot>
          <slot name="item-process_number" :item="item">{{ item.process_number }}</slot>
          <slot name="item-status" :item="item">{{ item.status }}</slot>
          <slot name="item-dispute_date" :item="item">{{ item.dispute_date }}</slot>
          <slot name="item-items_count" :item="item">{{ item.items_count }}</slot>
          <slot name="item-total_amount" :item="item">{{ item.total_amount }}</slot>
          <slot name="item-actions" :item="item" />
        </div>
        <div v-if="!items || items.length === 0" class="table-empty">
          <slot name="empty" />
        </div>
      </div>
    `,
    props: ['headers', 'items', 'loading'],
  },
  UiTooltip: { template: '<div class="ui-tooltip"><slot /></div>' },
  UiModal: { template: '<div class="ui-modal"><slot /><slot name="actions" /></div>' },
  UiAlert: { template: '<div class="ui-alert"><slot /></div>' },
  UiDivider: { template: '<hr />' },
  UiInput: { template: '<input class="ui-input" />' },
  UiSwitch: { template: '<input type="checkbox" class="ui-switch" />' },
  UiProgressCircular: { template: '<div class="ui-progress" />' },
  NuxtLink: {
    template: '<a :href="to"><slot /></a>',
    props: ['to'],
  },
}

describe('SupplierDetailPage (/suppliers/[id])', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders supplier registration info correctly', () => {
    const wrapper = mount(SupplierDetailPage, {
      global: {
        stubs,
      },
    })

    const text = wrapper.text()
    expect(text).toContain('Fornecedor Alpha LTDA')
    expect(text).toContain('12.345.678/0001-99')
    expect(text).toContain('Carlos da Silva')
    expect(text).toContain('carlos@alpha.com')
    expect(text).toContain('(11) 98765-4321')
    expect(text).toContain('(11) 3456-7890')
    expect(text).toContain('Rua das Flores, 123')
    expect(text).toContain('Ag: 1234-5, CC: 98765-4')
    expect(text).toContain('Simples Nacional')
    expect(text).toContain('ATIVO')
  })

  it('renders summary KPI metrics correctly', () => {
    const wrapper = mount(SupplierDetailPage, {
      global: {
        stubs,
      },
    })

    const text = wrapper.text()
    // Total demands won: 2
    expect(text).toContain('2')
    // Total items won: 5
    expect(text).toContain('5')
    // Total amount won: formatted currency
    expect(text).toContain('R$')
    // Average amount: formatted currency
    expect(text).toContain('Ticket Médio')
  })

  it('renders won demands table with demands data', () => {
    const wrapper = mount(SupplierDetailPage, {
      global: {
        stubs,
      },
    })

    const text = wrapper.text()
    expect(text).toContain('Aquisição de Material de Escritório')
    expect(text).toContain('042/2026')
    expect(text).toContain('Equipamentos de Informática')
    expect(text).toContain('088/2026')
  })

  it('navigates back to suppliers page when back button is clicked', async () => {
    const wrapper = mount(SupplierDetailPage, {
      global: {
        stubs,
      },
    })

    const buttons = wrapper.findAll('button.ui-button')
    const backBtn = buttons.find((b) => b.attributes('data-icon') === 'arrowLeft')
    expect(backBtn).toBeDefined()
    await backBtn!.trigger('click')

    expect(mockRouterPush).toHaveBeenCalledWith('/suppliers')
  })

  it('toggles supplier status when status toggle button is clicked', async () => {
    mockToggleSupplierStatus.mockResolvedValueOnce(undefined)

    const wrapper = mount(SupplierDetailPage, {
      global: {
        stubs,
      },
    })

    const buttons = wrapper.findAll('button.ui-button')
    const toggleBtn = buttons.find((b) => b.text().includes('Inativar Fornecedor'))
    expect(toggleBtn).toBeDefined()
    await toggleBtn!.trigger('click')

    expect(mockToggleSupplierStatus).toHaveBeenCalledWith(mockSupplierData.value)
  })

  it('shows empty message when supplier has no won demands', () => {
    const originalSummary = mockWonSummaryData.value
    mockWonSummaryData.value = {
      totalDemandsWon: 0,
      totalItemsWon: 0,
      totalAmountWon: 0,
      averageDemandAmount: 0,
      demands: [],
    }

    const wrapper = mount(SupplierDetailPage, {
      global: {
        stubs,
      },
    })

    expect(wrapper.text()).toContain('Nenhuma demanda vencida encontrada')

    // Restore
    mockWonSummaryData.value = originalSummary
  })
})
