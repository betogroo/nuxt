import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import DemandTechnicalCapacityModal from '~/components/demands/DemandTechnicalCapacityModal.vue'
import type { DemandRow } from '~/composables/useDemands'
import type { TechnicalCertificateItem } from '~/utils/technicalCapacityCertificate'
import * as reportHtmlModule from '~/utils/reportHtml'

const copyMock = vi.fn().mockResolvedValue(true)
const toastSuccessMock = vi.fn()
const toastErrorMock = vi.fn()

const mockWonItems: TechnicalCertificateItem[] = [
  {
    id: 'item-1',
    product_name: 'Papel Sulfite A4',
    unit_name: 'CX',
    quantity: 10,
    unit_price: 25,
    total_price: 250,
    demand_id: 'dem-1',
    demand_name: 'Material de Escritório 2026',
    process_number: '058.00125162/2026-03',
    contract_number: '63/2026',
  },
  {
    id: 'item-2',
    product_name: 'Caneta Esferográfica Azul',
    unit_name: 'UN',
    quantity: 100,
    unit_price: 1.5,
    total_price: 150,
    demand_id: 'dem-2',
    demand_name: 'Papelaria Geral 2025',
    process_number: '058.00099887/2025-11',
    contract_number: '12/2025',
  },
]

const fetchSupplierWonProductsDetailedMock = vi.fn().mockResolvedValue(mockWonItems)
const fetchSupplierByIdMock = vi.fn().mockResolvedValue({
  id: 'sup-1',
  company_name: 'FAROL SOLUÇÕES LTDA',
  cnpj: '22.466.779/0001-78',
})

mockNuxtImport('useToast', () => () => ({
  success: toastSuccessMock,
  error: toastErrorMock,
}))

mockNuxtImport('useCopyToClipboard', () => () => ({
  copy: copyMock,
}))

mockNuxtImport('useSuppliers', () => () => ({
  fetchSupplierWonProductsDetailed: fetchSupplierWonProductsDetailedMock,
  fetchSupplierById: fetchSupplierByIdMock,
}))

describe('DemandTechnicalCapacityModal', () => {
  const commonStubs = {
    UiModal: {
      template: '<div class="ui-modal"><slot /><slot name="actions" /></div>',
    },
    UiCard: {
      template: '<div class="ui-card"><slot /></div>',
    },
    UiChip: {
      template: '<span class="ui-chip"><slot /></span>',
    },
    UiAlert: {
      template: '<div class="ui-alert"><slot /></div>',
    },
    UiIcon: {
      template: '<span class="ui-icon" />',
    },
    UiButton: {
      props: ['disabled', 'loading'],
      template: '<button class="ui-button" :disabled="disabled"><slot /></button>',
    },
    UiTable: {
      props: ['items', 'headers'],
      template: `
        <div class="ui-table">
          <div v-for="item in items" :key="item.id" class="table-row">
            <slot name="item-select" :item="item" />
            <slot name="item-product_name" :item="item" />
            <slot name="item-demand_name" :item="item" />
            <slot name="item-unit_price" :item="item" />
            <slot name="item-total_price" :item="item" />
          </div>
        </div>
      `,
    },
    UiCheckbox: {
      props: ['modelValue'],
      template:
        '<input type="checkbox" class="ui-checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" />',
    },
    UiTextField: {
      props: ['modelValue'],
      template:
        '<input class="ui-text-field" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    },
    UiTextarea: {
      props: ['modelValue'],
      template:
        '<textarea class="ui-textarea" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    },
    UiSelect: {
      props: ['modelValue', 'items'],
      template: '<select class="ui-select" :value="modelValue" />',
    },
  }

  const mockSupplier = {
    id: 'sup-1',
    company_name: 'FAROL SOLUÇÕES LTDA',
    cnpj: '22.466.779/0001-78',
  }

  const mockDemand = {
    id: 'dem-1',
    name: 'Material de Escritório 2026',
    process_number: '058.00125162/2026-03',
  } as unknown as DemandRow

  interface ModalVm {
    selectedItemIds: string[]
    activeTab: string
  }

  beforeEach(() => {
    vi.clearAllMocks()
    fetchSupplierWonProductsDetailedMock.mockResolvedValue(mockWonItems)
  })

  it('renders correctly and loads supplier won products on open', async () => {
    const wrapper = mount(DemandTechnicalCapacityModal, {
      props: {
        modelValue: true,
        initialSupplier: mockSupplier,
        demand: mockDemand,
      },
      global: {
        stubs: commonStubs,
      },
    })

    expect(fetchSupplierWonProductsDetailedMock).toHaveBeenCalledWith('sup-1')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('FAROL SOLUÇÕES LTDA')
    expect(wrapper.text()).toContain('22.466.779/0001-78')
  })

  it('pre-selects current demand items when opened from a demand', async () => {
    const wrapper = mount(DemandTechnicalCapacityModal, {
      props: {
        modelValue: true,
        initialSupplier: mockSupplier,
        demand: mockDemand, // dem-1
      },
      global: {
        stubs: commonStubs,
      },
    })

    await wrapper.vm.$nextTick()
    // Should have pre-selected item-1 which belongs to dem-1
    const vm = wrapper.vm as unknown as ModalVm
    expect(vm.selectedItemIds).toContain('item-1')
  })

  it('allows switching tabs to preview, text, and settings', async () => {
    const wrapper = mount(DemandTechnicalCapacityModal, {
      props: {
        modelValue: true,
        initialSupplier: mockSupplier,
        demand: mockDemand,
      },
      global: {
        stubs: commonStubs,
      },
    })

    await wrapper.vm.$nextTick()

    const vm = wrapper.vm as unknown as ModalVm

    // Switch to preview tab
    const previewTabBtn = wrapper.find('[data-testid="tab-preview"]')
    expect(previewTabBtn.exists()).toBe(true)
    await previewTabBtn.trigger('click')
    expect(vm.activeTab).toBe('preview')

    // Switch to text tab
    const textTabBtn = wrapper.find('[data-testid="tab-text"]')
    await textTabBtn.trigger('click')
    expect(vm.activeTab).toBe('text')

    // Switch to settings tab
    const settingsTabBtn = wrapper.find('[data-testid="tab-settings"]')
    await settingsTabBtn.trigger('click')
    expect(vm.activeTab).toBe('settings')
  })

  it('copies formatted certificate text to clipboard', async () => {
    const wrapper = mount(DemandTechnicalCapacityModal, {
      props: {
        modelValue: true,
        initialSupplier: mockSupplier,
        demand: mockDemand,
      },
      global: {
        stubs: commonStubs,
      },
    })

    await wrapper.vm.$nextTick()

    const copyBtn = wrapper.find('[data-testid="btn-copy-certificate"]')
    expect(copyBtn.exists()).toBe(true)
    await copyBtn.trigger('click')

    expect(copyMock).toHaveBeenCalled()
    expect(toastSuccessMock).toHaveBeenCalledWith(
      'Atestado de Capacidade Técnica copiado para a área de transferência!',
    )
  })

  it('triggers print via iframe when clicking print certificate', async () => {
    const printSpy = vi
      .spyOn(reportHtmlModule, 'printHtmlViaIframe')
      .mockImplementation(() => Promise.resolve())

    const wrapper = mount(DemandTechnicalCapacityModal, {
      props: {
        modelValue: true,
        initialSupplier: mockSupplier,
        demand: mockDemand,
      },
      global: {
        stubs: commonStubs,
      },
    })

    await wrapper.vm.$nextTick()

    const printBtn = wrapper.find('[data-testid="btn-print-certificate"]')
    expect(printBtn.exists()).toBe(true)
    await printBtn.trigger('click')

    expect(printSpy).toHaveBeenCalled()
    printSpy.mockRestore()
  })
})
