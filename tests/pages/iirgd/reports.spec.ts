import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { mount, shallowMount, flushPromises } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import ReportsPage from '~/pages/iirgd/reports.vue'

mockNuxtImport('useHead', () => vi.fn())
mockNuxtImport('definePageMeta', () => vi.fn())

const mockReportData = {
  items: [
    {
      documentTypeId: 't1',
      documentTypeName: '1ª Via',
      count: 15,
      percentage: 60,
      stationCounts: { '1342-5': 10, '1062-9': 5 },
    },
    {
      documentTypeId: 't2',
      documentTypeName: '2ª Via',
      count: 10,
      percentage: 40,
      stationCounts: { '1342-5': 5, '1062-9': 5 },
    },
  ],
  totalIssued: 25,
  topDocumentType: '1ª Via',
  dailyAverage: 5,
  periodDays: 5,
  startDate: '2026-10-01',
  endDate: '2026-10-05',
  stations: ['1342-5', '1062-9'],
  stationTotals: { '1342-5': 15, '1062-9': 10 },
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
    props: ['headers', 'items'],
    template: `
      <table>
        <thead>
          <tr>
            <th v-for="h in headers" :key="h.value">{{ h.text }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in items" :key="item.documentTypeName">
            <slot name="item-documentTypeName" :item="item" />
            <slot v-for="st in ['1342-5', '1062-9']" :name="'item-station_' + st" :item="item" />
            <slot name="item-count" :item="item" />
            <slot name="item-percentage" :item="item" />
          </tr>
        </tbody>
      </table>
    `,
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

  it('should render station columns in detailed table when all stations is selected', async () => {
    const wrapper = mount(ReportsPage, {
      global: {
        stubs: defaultStubs,
      },
    })
    await flushPromises()

    // Headers should contain Posto 1342-5 and Posto 1062-9
    expect(wrapper.text()).toContain('Posto 1342-5')
    expect(wrapper.text()).toContain('Posto 1062-9')
    expect(wrapper.text()).toContain('Total Geral')

    // Footer breakdown by station
    expect(wrapper.text()).toContain('Posto 1342-5:')
    expect(wrapper.text()).toContain('15')
    expect(wrapper.text()).toContain('Posto 1062-9:')
    expect(wrapper.text()).toContain('10')
  })

  it('should call exportIssuedDemandsToCsv when export button in table card is clicked', async () => {
    const wrapper = mount(ReportsPage, {
      global: {
        stubs: defaultStubs,
      },
    })
    await flushPromises()

    // Find export button inside the card header
    const exportButtons = wrapper
      .findAll('button')
      .filter((btn) => btn.text().trim() === 'Exportar' || btn.text().includes('Exportar'))
    expect(exportButtons.length).toBeGreaterThanOrEqual(1)

    const tableExportBtn = exportButtons.find((btn) => btn.text().trim() === 'Exportar')
    if (tableExportBtn) {
      await tableExportBtn.trigger('click')
      expect(exportIssuedDemandsToCsvMock).toHaveBeenCalledWith(mockReportData)
    } else {
      await exportButtons[0].trigger('click')
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
