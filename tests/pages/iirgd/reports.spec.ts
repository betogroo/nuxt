import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { mount, shallowMount, flushPromises } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import ReportsPage from '~/pages/iirgd/reports.vue'

mockNuxtImport('useHead', () => vi.fn())
mockNuxtImport('definePageMeta', () => vi.fn())

const mockReportData = {
  items: [
    { documentTypeId: 't1', documentTypeName: '1ª Via', count: 15, percentage: 60 },
    { documentTypeId: 't2', documentTypeName: '2ª Via', count: 10, percentage: 40 },
  ],
  totalIssued: 25,
  topDocumentType: '1ª Via',
  dailyAverage: 5,
  periodDays: 5,
  startDate: '2026-10-01',
  endDate: '2026-10-05',
}

const exportIssuedDemandsToCsvMock = vi.fn()
const fetchIssuedDemandsByDocumentTypeMock = vi.fn().mockResolvedValue(mockReportData)

mockNuxtImport('useIirgdReports', () => () => ({
  fetchIssuedDemandsByDocumentType: fetchIssuedDemandsByDocumentTypeMock,
  exportIssuedDemandsToCsv: exportIssuedDemandsToCsvMock,
}))

const refreshMock = vi.fn()
mockNuxtImport('useAsyncData', () => () => ({
  data: ref(mockReportData),
  pending: ref(false),
  refresh: refreshMock,
}))

const defaultStubs = {
  UiPageHeader: {
    template: '<div><slot /><slot name="actions" /></div>',
  },
  UiCard: {
    template: '<div><slot name="header" /><slot /></div>',
  },
  UiContainer: {
    template: '<div><slot /></div>',
  },
  UiRow: {
    template: '<div><slot /></div>',
  },
  UiCol: {
    template: '<div><slot /></div>',
  },
  UiButton: {
    template: '<button @click="$emit(\'click\')"><slot /></button>',
  },
  UiInput: true,
  UiSelect: true,
  UiAvatar: true,
  UiIcon: true,
  UiChart: true,
  UiTable: {
    template: '<table><slot /></table>',
  },
  UiSwitch: true,
  UiChip: {
    template: '<span><slot /></span>',
  },
}

describe('IIRGD Reports Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render successfully with shallowMount', () => {
    const wrapper = shallowMount(ReportsPage)
    expect(wrapper.exists()).toBe(true)
  })

  it('should display KPI summary metrics', async () => {
    const wrapper = mount(ReportsPage, {
      global: {
        stubs: defaultStubs,
      },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('25')
    expect(wrapper.text()).toContain('1ª Via')
    expect(wrapper.text()).toContain('5')
    expect(wrapper.text()).toContain('Total Emitido')
    expect(wrapper.text()).toContain('Tipo Mais Emitido')
    expect(wrapper.text()).toContain('Média Diária')
  })

  it('should call exportIssuedDemandsToCsv when export button is clicked', async () => {
    const wrapper = mount(ReportsPage, {
      global: {
        stubs: defaultStubs,
      },
    })
    await flushPromises()

    const exportBtn = wrapper.findAll('button').find((btn) => btn.text().includes('Exportar CSV'))
    expect(exportBtn).toBeDefined()
    if (exportBtn) {
      await exportBtn.trigger('click')
      expect(exportIssuedDemandsToCsvMock).toHaveBeenCalledWith(mockReportData)
    }
  })

  it('should refresh data when clicking a quick preset', async () => {
    const wrapper = mount(ReportsPage, {
      global: {
        stubs: defaultStubs,
      },
    })
    await flushPromises()

    const preset7d = wrapper.findAll('button').find((btn) => btn.text().includes('Últimos 7 dias'))
    expect(preset7d).toBeDefined()
    if (preset7d) {
      await preset7d.trigger('click')
      expect(refreshMock).toHaveBeenCalled()
    }
  })
})
