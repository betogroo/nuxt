import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import ReportsPage from '~/pages/demands/reports.vue'
import type {
  IrRetentionReportRow,
  IrRetentionReportSummary,
} from '~/composables/useDemandGeneralReports'

mockNuxtImport('useHead', () => vi.fn())
mockNuxtImport('definePageMeta', () => vi.fn())

const toastMock = {
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
}
mockNuxtImport('useToast', () => () => toastMock)

const mockIrRows: IrRetentionReportRow[] = [
  {
    liquidationId: 'l1',
    liquidationNumber: '2026NL00001',
    irRetentionAmount: 96,
    commitmentTotalAmount: 2000,
    issueDate: '2026-04-10',
    liquidationCreatedAt: '2026-04-10T10:00:00Z',
    commitmentId: 'c1',
    commitmentNumber: '2026NE00001',
    disbursementProgramNumber: '2026PD00001',
    disbursementProgramIssuedAt: '2026-04-12',
    disbursementProgramPaidAt: '2026-04-24',
    bankOrderNumber: '2026OB00001',
    bankOrderIssuedAt: '2026-04-24',
    bankOrderPaidAt: '2026-04-24',
    supplierId: 's1',
    supplierName: 'FORNECEDOR BETA LTDA',
    supplierCnpj: '12345678000199',
    supplierCnpjFormatted: '12.345.678/0001-99',
    isSimplesOptant: false,
    demandId: 'd1',
    demandName: 'Demanda de Suprimentos',
    demandProcessNumber: '010/2026',
    isPaid: true,
  },
]

const mockIrSummary: IrRetentionReportSummary = {
  totalIrRetentionAmount: 96,
  totalCommitmentAmount: 2000,
  liquidationsCount: 1,
  commitmentsCount: 1,
  suppliersCount: 1,
  paidLiquidationsCount: 1,
  pendingLiquidationsCount: 0,
}

const fetchIrRetentionReportMock = vi.fn().mockResolvedValue({
  rows: mockIrRows,
  summary: mockIrSummary,
})

const exportIrRetentionToCsvMock = vi.fn()
const exportIrRetentionToPdfMock = vi.fn().mockResolvedValue(undefined)
const fetchCommitmentExecutionReportMock = vi.fn().mockResolvedValue({
  rows: [],
  summary: {
    totalCommittedAmount: 0,
    totalPaidCommitmentsAmount: 0,
    paidCommitmentsCount: 0,
    pendingCommitmentsCount: 0,
    commitmentsCount: 0,
  },
})
const exportExecutionToCsvMock = vi.fn()

mockNuxtImport('useDemandGeneralReports', () => () => ({
  fetchIrRetentionReport: fetchIrRetentionReportMock,
  exportIrRetentionToCsv: exportIrRetentionToCsvMock,
  exportIrRetentionToPdf: exportIrRetentionToPdfMock,
  fetchCommitmentExecutionReport: fetchCommitmentExecutionReportMock,
  exportExecutionToCsv: exportExecutionToCsvMock,
}))

const refreshMock = vi.fn()
mockNuxtImport('useAsyncData', () => (key: string) => {
  if (key === 'demands-ir-retention-report') {
    return {
      data: ref({ rows: mockIrRows, summary: mockIrSummary }),
      pending: ref(false),
      refresh: refreshMock,
    }
  }
  return {
    data: ref({
      rows: [],
      summary: {
        totalCommittedAmount: 0,
        totalPaidCommitmentsAmount: 0,
        paidCommitmentsCount: 0,
        pendingCommitmentsCount: 0,
        commitmentsCount: 0,
      },
    }),
    pending: ref(false),
    refresh: refreshMock,
  }
})

const defaultStubs = {
  UiPageHeader: {
    props: ['title', 'subtitle'],
    template: '<div><h1>{{ title }}</h1><p>{{ subtitle }}</p><slot /><slot name="actions" /></div>',
  },
  UiCard: {
    template: '<div><slot name="header" /><slot /></div>',
  },
  UiRow: {
    template: '<div><slot /></div>',
  },
  UiCol: {
    template: '<div><slot /></div>',
  },
  UiButton: {
    props: ['disabled', 'loading'],
    template: '<button :disabled="disabled"><slot /></button>',
  },
  UiActionButton: {
    template: '<button><slot /></button>',
  },
  UiTabs: {
    props: ['modelValue'],
    template: '<div><slot /></div>',
  },
  UiTab: {
    props: ['value'],
    template: '<div class="ui-tab" @click="$emit(\'click\')"><slot /></div>',
  },
  UiChip: {
    props: ['filter', 'color'],
    template: '<span class="ui-chip" @click="$emit(\'click\')"><slot /></span>',
  },
  UiInput: {
    props: ['modelValue', 'label'],
    template:
      '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  UiSelect: {
    props: ['modelValue', 'items'],
    template:
      '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><slot /></select>',
  },
  UiTable: {
    props: ['headers', 'items', 'loading'],
    template: `
      <table>
        <tbody>
          <tr v-for="item in items" :key="item.liquidationId || item.commitmentId">
            <td><slot name="item-is_paid" :item="item" /></td>
            <td><slot name="item-pd_paid_date" :item="item" /></td>
            <td><slot name="item-commitment_number" :item="item" /></td>
            <td><slot name="item-supplier" :item="item" /></td>
            <td><slot name="item-liquidation_number" :item="item" /></td>
            <td><slot name="item-ir_retention_amount" :item="item" /></td>
            <td><slot name="item-commitment_amount" :item="item" /></td>
            <td><slot name="item-pd_ob" :item="item" /></td>
            <td><slot name="item-demand" :item="item" /></td>
          </tr>
        </tbody>
      </table>
    `,
  },
  UiBadge: {
    template: '<span><slot /></span>',
  },
  UiIcon: {
    template: '<span />',
  },
  NuxtLink: {
    props: ['to'],
    template: '<a :href="to"><slot /></a>',
  },
}

describe('ReportsPage (/demands/reports)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders page header and tabs correctly', async () => {
    const wrapper = mount(ReportsPage, {
      global: {
        stubs: defaultStubs,
      },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('Central de Relatórios de Demandas')
    expect(wrapper.text()).toContain('Retenção de Imposto de Renda (IR)')
    expect(wrapper.text()).toContain('Execução Financeira (NE / NL / PD / OB)')
    expect(wrapper.text()).toContain('Outros Relatórios & Atalhos')
  })

  it('renders IR retention metrics cards and table rows', async () => {
    const wrapper = mount(ReportsPage, {
      global: {
        stubs: defaultStubs,
      },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('Total de Retenção de IR')
    expect(wrapper.text()).toContain('FORNECEDOR BETA LTDA')
    expect(wrapper.text()).toContain('2026NE00001')
    expect(wrapper.text()).toContain('2026NL00001')
  })

  it('triggers CSV export when Exportar CSV button is clicked', async () => {
    const wrapper = mount(ReportsPage, {
      global: {
        stubs: defaultStubs,
      },
    })
    await flushPromises()

    const exportCsvBtn = wrapper.findAll('button').find((b) => b.text().includes('Exportar CSV'))
    expect(exportCsvBtn).toBeDefined()
    await exportCsvBtn!.trigger('click')

    expect(exportIrRetentionToCsvMock).toHaveBeenCalledTimes(1)
    expect(toastMock.success).toHaveBeenCalledWith(expect.stringContaining('CSV com sucesso'))
  })

  it('triggers PDF export when Baixar PDF button is clicked', async () => {
    const wrapper = mount(ReportsPage, {
      global: {
        stubs: defaultStubs,
      },
    })
    await flushPromises()

    const exportPdfBtn = wrapper.findAll('button').find((b) => b.text().includes('Baixar PDF'))
    expect(exportPdfBtn).toBeDefined()
    await exportPdfBtn!.trigger('click')

    expect(exportIrRetentionToPdfMock).toHaveBeenCalledTimes(1)
    expect(toastMock.success).toHaveBeenCalledWith(
      expect.stringContaining('PDF gerado com sucesso'),
    )
  })
})
