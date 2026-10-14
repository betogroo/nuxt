import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { ref } from 'vue'
import SuppliersIndexPage from '~/pages/suppliers/index.vue'

const mockSuppliersList = ref([
  {
    id: 'sup-1',
    company_name: 'Alpha Materiais LTDA',
    cnpj: '00.000.000/0001-91',
    email: 'alpha@materiais.com',
    is_simples_optant: true,
    simples_optant_verified_at: '2026-05-10T10:00:00Z',
    is_active: true,
  },
  {
    id: 'sup-2',
    company_name: 'Beta Serviços LTDA',
    cnpj: '33000167000101',
    email: 'beta@servicos.com',
    is_simples_optant: false,
    simples_optant_verified_at: null,
    is_active: false,
  },
])

const mockCopy = vi.fn()
const mockFetchSuppliers = vi.fn().mockResolvedValue({
  data: mockSuppliersList.value,
  count: 2,
})
const mockToggleSupplierStatus = vi.fn()
const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
}

mockNuxtImport('useToast', () => () => mockToast)
mockNuxtImport('useHead', () => vi.fn())
mockNuxtImport('definePageMeta', () => vi.fn())
mockNuxtImport('useCopyToClipboard', () => () => ({ copy: mockCopy }))

mockNuxtImport('useSuppliers', () => () => ({
  fetchSuppliers: mockFetchSuppliers,
  toggleSupplierStatus: mockToggleSupplierStatus,
}))

mockNuxtImport('usePagination', () => () => ({
  currentPage: ref(1),
  itemsPerPage: ref(10),
  totalItems: ref(2),
  totalPages: ref(1),
  resetPage: vi.fn(),
}))

mockNuxtImport('useAsyncData', () => {
  return (_key: string, fn: () => Promise<unknown>) => {
    fn()
    return {
      data: mockSuppliersList,
      pending: ref(false),
      refresh: vi.fn(),
    }
  }
})

const stubs = {
  PageHeader: {
    template: '<div class="page-header">{{ title }} - {{ subtitle }}</div>',
    props: ['title', 'subtitle'],
  },
  UiRow: { template: '<div class="ui-row"><slot /></div>' },
  UiCol: { template: '<div class="ui-col"><slot /></div>' },
  UiCard: { template: '<div class="ui-card"><slot name="header" /><slot /></div>' },
  UiSpacer: { template: '<div class="ui-spacer" />' },
  UiButton: {
    name: 'UiButton',
    template: '<button class="ui-button" :data-icon="icon" :data-size="size"><slot /></button>',
    props: ['icon', 'color', 'variant', 'size', 'loading', 'disabled', 'to', 'prependIcon'],
  },
  UiChip: { template: '<span class="ui-chip"><slot /></span>' },
  UiIcon: { template: '<i class="ui-icon" />' },
  UiTable: {
    template: `
      <div class="ui-table-stub">
        <div v-for="item in items" :key="item.id" class="table-row">
          <slot name="item-cnpj" :item="item">{{ item.cnpj }}</slot>
          <slot name="item-company_name" :item="item">{{ item.company_name }}</slot>
          <slot name="item-is_simples_optant" :item="item">{{ item.is_simples_optant }}</slot>
          <slot name="item-is_active" :item="item">{{ item.is_active }}</slot>
          <slot name="item-actions" :item="item" />
        </div>
        <div v-if="!items || items.length === 0" class="table-empty">
          <slot name="empty" />
        </div>
      </div>
    `,
    props: ['headers', 'items', 'loading'],
  },
  UiTooltip: {
    template:
      '<div class="ui-tooltip"><slot name="activator" :props="{}" /><span>{{ text }}</span></div>',
    props: ['text'],
  },
  UiModal: { template: '<div class="ui-modal"><slot /><slot name="actions" /></div>' },
  UiAlert: { template: '<div class="ui-alert"><slot /></div>' },
  UiDivider: { template: '<hr />' },
  UiInput: { template: '<input class="ui-input" />' },
  UiPagination: { template: '<div class="ui-pagination" />' },
  SupplierFormModal: { template: '<div class="supplier-form-modal-stub" />' },
  NuxtLink: {
    template: '<a :href="to"><slot /></a>',
    props: ['to'],
  },
}

describe('SuppliersIndexPage (/suppliers)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders active and inactive suppliers tables with formatted CNPJ', () => {
    const wrapper = mount(SuppliersIndexPage, {
      global: {
        stubs,
      },
    })

    const text = wrapper.text()
    expect(text).toContain('Alpha Materiais LTDA')
    expect(text).toContain('00.000.000/0001-91')
    expect(text).toContain('Beta Serviços LTDA')
    expect(text).toContain('33.000.167/0001-01')
  })

  it('copies unformatted CNPJ (digits only) when copy button is clicked', async () => {
    const wrapper = mount(SuppliersIndexPage, {
      global: {
        stubs,
      },
    })

    // Find all copy buttons in table rows
    const copyButtons = wrapper
      .findAll('button.ui-button')
      .filter((b) => b.attributes('data-icon') === 'copy')

    expect(copyButtons.length).toBeGreaterThanOrEqual(1)

    // Click the copy button for the first supplier (Alpha Materiais, CNPJ "00.000.000/0001-91")
    await copyButtons[0].trigger('click')

    expect(mockCopy).toHaveBeenCalledTimes(1)
    expect(mockCopy).toHaveBeenCalledWith('00000000000191', 'CNPJ copiado!')
  })
})
