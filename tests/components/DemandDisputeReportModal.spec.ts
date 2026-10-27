import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import DemandDisputeReportModal from '~/components/demands/DemandDisputeReportModal.vue'
import type { DemandRow } from '~/composables/useDemands'
import type { DemandProductRow } from '~/composables/useDemandProducts'

const exportDisputeReportToCsvMock = vi.fn()
const exportDisputeReportToPdfMock = vi.fn()
const printDisputeReportMock = vi.fn()

mockNuxtImport('useDemandReports', () => () => ({
  generateDisputeReportData: vi.fn(() => ({
    demandId: 'demand-1',
    demandName: 'Pregão Presencial 01/2026',
    demand: {
      id: 'demand-1',
      name: 'Pregão Presencial 01/2026',
      type: 'consumption',
      typeLabel: 'Material de Consumo',
      status: 'homologation',
      statusLabel: 'Homologação',
      processNumber: '123/2026',
      internalProcessNumber: 'INT-999',
      biddingNoticeNumber: 'AV-01',
      disputeNumber: 'DISP-01',
      disputeDate: '25/10/2026',
      offerOpeningDate: '22/10/2026 09:00',
      idPca: 'PCA-2026-001',
      siafemNumber: '2026NE000999',
    },
    winnerGroups: [
      {
        supplier: {
          id: 'supp-1',
          companyName: 'Papelaria Central LTDA',
          cnpj: '12345678000199',
          cnpjFormatted: '12.345.678/0001-99',
          email: 'contato@papelariacentral.com',
          cellPhone: '11999998888',
          landline: null,
          address: 'Rua das Flores, 100',
          responsibleName: 'Carlos Silva',
          isSimplesOptant: true,
          hasBbAccount: 'Ag 1234 / CC 5678-9',
        },
        subtotalValorFinal: 255.0,
        totalItemsCount: 1,
        items: [
          {
            id: 'item-1',
            natureza: '339030',
            itemBec: '12345',
            especificacao: 'Papel A4 Sulfite',
            unidadeBec: '101 - Pacote 500fls',
            qtd: 10,
            valorOfertado: 25.5,
            valorFinal: 255.0,
            outcome: 'winner' as const,
            outcomeLabel: 'Vencedor',
          },
        ],
      },
    ],
    nonWinnerItems: [],
    grandTotalValorFinal: 255.0,
    totalItemsCount: 1,
    winnersCount: 1,
    failedCount: 0,
    desertedCount: 0,
  })),
  exportDisputeReportToCsv: exportDisputeReportToCsvMock,
  exportDisputeReportToPdf: exportDisputeReportToPdfMock,
  printDisputeReport: printDisputeReportMock,
}))

const stubs = {
  UiModal: {
    template: '<div><slot /><slot name="actions" /></div>',
    props: ['modelValue'],
  },
  UiCard: { template: '<div><slot /></div>' },
  UiRow: { template: '<div><slot /></div>' },
  UiCol: { template: '<div><slot /></div>' },
  UiDivider: { template: '<hr />' },
  UiChip: { template: '<span><slot /></span>' },
  UiIcon: { template: '<span />' },
  UiButton: { template: '<button><slot /></button>' },
}

describe('DemandDisputeReportModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders demand metadata and winner supplier details', () => {
    const wrapper = mount(DemandDisputeReportModal, {
      props: {
        modelValue: true,
        demand: { id: 'demand-1' } as DemandRow,
        items: [] as DemandProductRow[],
      },
      global: { stubs },
    })

    const text = wrapper.text()
    expect(text).toContain('Pregão Presencial 01/2026')
    expect(text).toContain('123/2026')
    expect(text).toContain('INT-999')
    expect(text).toContain('AV-01')
    expect(text).toContain('DISP-01')
    expect(text).toContain('PCA-2026-001')
    expect(text).toContain('Nº SIAFEM')
    expect(text).toContain('2026NE000999')
    expect(text).toContain('Papelaria Central LTDA')
    expect(text).toContain('12.345.678/0001-99')
    expect(text).toContain('Carlos Silva')
    expect(text).toContain('contato@papelariacentral.com')
    expect(text).toContain('Rua das Flores, 100')
    expect(text).toContain('Papel A4 Sulfite')
    expect(text).toContain('12345')
    expect(text.replace(/\s/g, ' ')).toContain('25,5000')
  })

  it('triggers CSV export when clicking the export CSV button', async () => {
    const wrapper = mount(DemandDisputeReportModal, {
      props: {
        modelValue: true,
        demand: { id: 'demand-1' } as DemandRow,
        items: [] as DemandProductRow[],
      },
      global: { stubs },
    })

    const buttons = wrapper.findAll('button')
    const csvButton = buttons.find((b) => b.text().includes('Exportar CSV'))
    expect(csvButton).toBeDefined()

    await csvButton!.trigger('click')
    expect(exportDisputeReportToCsvMock).toHaveBeenCalledTimes(1)
  })

  it('triggers exportDisputeReportToPdf when clicking export PDF button', async () => {
    const wrapper = mount(DemandDisputeReportModal, {
      props: {
        modelValue: true,
        demand: { id: 'demand-1' } as DemandRow,
        items: [] as DemandProductRow[],
      },
      global: { stubs },
    })

    const buttons = wrapper.findAll('button')
    const pdfButton = buttons.find((b) => b.text().includes('Exportar PDF'))
    expect(pdfButton).toBeDefined()

    await pdfButton!.trigger('click')
    expect(exportDisputeReportToPdfMock).toHaveBeenCalledTimes(1)
  })
})
