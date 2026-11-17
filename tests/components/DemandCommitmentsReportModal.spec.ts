import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import DemandCommitmentsReportModal from '~/components/demands/DemandCommitmentsReportModal.vue'
import type { DemandRow } from '~/composables/useDemands'
import type { DemandProductRow } from '~/composables/useDemandProducts'
import type { CommitmentRow } from '~/composables/useCommitments'

const printDemandCommitmentsReportMock = vi.fn()
const exportDemandCommitmentsReportToCsvMock = vi.fn()

const mockDemand = {
  id: 'demand-1',
  name: 'Pregão Presencial 01/2026',
  process_number: '123/2026',
  internal_process_number: 'INT-999',
  bidding_notice_number: 'AV-01',
  status: 'completed',
} as DemandRow

const mockCommitments = [
  {
    id: 'comm-1',
    commitment_number: '2026NE00313',
    issue_date: '2026-02-12',
    status: 'completed',
    suppliers: {
      id: 'supp-1',
      company_name: 'Papelaria Central LTDA',
      cnpj: '12345678000199',
    },
    expense_natures: { id: 'exp-1', name: '339030' },
    disbursement_program_number: '2026PD00101',
    disbursement_program_paid_at: '2026-02-20',
    bank_order_number: '2026OBC00555',
    bank_order_paid_at: '2026-02-22',
    demand_commitment_liquidations: [
      {
        id: 'nl-1',
        liquidation_number: '2026NL00801',
        is_ir_retention: false,
        is_cancellation: false,
      },
    ],
  },
] as unknown as CommitmentRow[]

const mockItems = [
  {
    id: 'item-1',
    commitment_number: '2026NE00313',
    quantity: 200,
    product_name_snapshot: 'Papel Sulfite A4',
    product: { cat_bec: '12345', measurement_unit: 'CX' },
    demand_product_bids: [{ amount: 25.0, status: 'classified' }],
  },
] as unknown as DemandProductRow[]

mockNuxtImport('useDemandReports', () => () => ({
  printDemandCommitmentsReport: printDemandCommitmentsReportMock,
  exportDemandCommitmentsReportToCsv: exportDemandCommitmentsReportToCsvMock,
}))

const stubs = {
  UiModal: {
    template: '<div><slot /><slot name="actions" /></div>',
    props: ['modelValue'],
  },
  UiCard: { template: '<div><slot name="header" /><slot /></div>' },
  UiRow: { template: '<div><slot /></div>' },
  UiCol: { template: '<div><slot /></div>' },
  UiDivider: { template: '<hr />' },
  UiChip: { template: '<span><slot /></span>' },
  UiIcon: { template: '<span />' },
  UiAlert: { template: '<div><slot /></div>' },
  UiButton: { template: '<button><slot /></button>' },
  UiTable: { template: '<table><slot /></table>', props: ['headers', 'items'] },
  NuxtLink: { template: '<a><slot /></a>', props: ['to'] },
}

describe('DemandCommitmentsReportModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders demand metadata and commitment execution details', () => {
    const wrapper = mount(DemandCommitmentsReportModal, {
      props: {
        modelValue: true,
        demand: mockDemand,
        items: mockItems,
        commitments: mockCommitments,
      },
      global: { stubs },
    })

    const text = wrapper.text()
    expect(text).toContain('Pregão Presencial 01/2026')
    expect(text).toContain('123/2026')
    expect(text).toContain('INT-999')
    expect(text).toContain('2026NE00313')
    expect(text).toContain('Papelaria Central LTDA')
    expect(text).toContain('2026NL00801')
    expect(text).toContain('2026PD00101')
    expect(text).toContain('2026OBC00555')
  })

  it('triggers print and export csv on button clicks', async () => {
    const wrapper = mount(DemandCommitmentsReportModal, {
      props: {
        modelValue: true,
        demand: mockDemand,
        items: mockItems,
        commitments: mockCommitments,
      },
      global: { stubs },
    })

    const buttons = wrapper.findAll('button')
    const exportCsvBtn = buttons.find((b) => b.text().includes('Exportar CSV'))
    const printBtn = buttons.find((b) => b.text().includes('Imprimir / PDF'))

    expect(exportCsvBtn).toBeDefined()
    expect(printBtn).toBeDefined()

    await exportCsvBtn!.trigger('click')
    expect(exportDemandCommitmentsReportToCsvMock).toHaveBeenCalledTimes(1)

    await printBtn!.trigger('click')
    expect(printDemandCommitmentsReportMock).toHaveBeenCalledTimes(1)
  })
})
