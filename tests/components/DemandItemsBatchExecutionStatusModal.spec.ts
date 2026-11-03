import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import DemandItemsBatchExecutionStatusModal from '~/components/demands/DemandItemsBatchExecutionStatusModal.vue'
import type { DemandProductRow } from '~/composables/useDemandProducts'

const mockBatchUpdateDemandItemsExecutionStatus = vi.fn().mockResolvedValue(undefined)
const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
}

mockNuxtImport('useToast', () => () => mockToast)
mockNuxtImport('useDemandProducts', () => () => ({
  batchUpdateDemandItemsExecutionStatus: mockBatchUpdateDemandItemsExecutionStatus,
}))

describe('DemandItemsBatchExecutionStatusModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockItems: DemandProductRow[] = [
    {
      id: 'dp-1',
      demand_id: 'dem-1',
      product_id: 'p-1',
      product_name_snapshot: 'Papel A4',
      quantity: 50,
      execution_status: 'homologated' as const,
      execution_error_details: null,
      sort_order: 1,
      unit_id: 'u-1',
      created_at: '2026-10-20T10:00:00Z',
      updated_at: '2026-10-20T10:00:00Z',
      demand_product_bids: [
        {
          id: 'b-1',
          demand_product_id: 'dp-1',
          supplier_id: 'supp-1',
          amount: 20,
          status: 'classified',
          suppliers: { id: 'supp-1', company_name: 'Fornecedor Alpha', cnpj: '11111111000111' },
        },
      ],
    } as unknown as DemandProductRow,
    {
      id: 'dp-2',
      demand_id: 'dem-1',
      product_id: 'p-2',
      product_name_snapshot: 'Caneta Azul',
      quantity: 100,
      execution_status: 'homologated' as const,
      execution_error_details: null,
      sort_order: 2,
      unit_id: 'u-2',
      created_at: '2026-10-20T10:00:00Z',
      updated_at: '2026-10-20T10:00:00Z',
      demand_product_bids: [
        {
          id: 'b-2',
          demand_product_id: 'dp-2',
          supplier_id: 'supp-1',
          amount: 2.5,
          status: 'classified',
          suppliers: { id: 'supp-1', company_name: 'Fornecedor Alpha', cnpj: '11111111000111' },
        },
      ],
    } as unknown as DemandProductRow,
  ]

  it('renders correctly when opened with selected items', () => {
    const wrapper = mount(DemandItemsBatchExecutionStatusModal, {
      props: {
        modelValue: true,
        items: mockItems,
      },
      global: {
        stubs: {
          UiModal: {
            template: '<div class="ui-modal-stub"><slot /><slot name="actions" /></div>',
          },
          UiAlert: true,
          UiSelect: true,
          UiInput: true,
          UiTextarea: true,
          UiButton: true,
          UiCard: { template: '<div><slot /></div>' },
          UiChip: { template: '<span><slot /></span>' },
        },
      },
    })

    expect(wrapper.exists()).toBe(true)
    expect(wrapper.text()).toContain('Itens Selecionados (2)')
    expect(wrapper.text()).toContain('Papel A4')
    expect(wrapper.text()).toContain('Caneta Azul')
  })

  it('submits batch execution status update and emits saved event', async () => {
    const wrapper = mount(DemandItemsBatchExecutionStatusModal, {
      props: {
        modelValue: true,
        items: mockItems,
      },
      global: {
        stubs: {
          UiModal: {
            template: '<div class="ui-modal-stub"><slot /></div>',
          },
          UiAlert: true,
          UiSelect: true,
          UiInput: true,
          UiTextarea: true,
          UiButton: true,
          UiCard: true,
          UiChip: true,
        },
      },
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vm = wrapper.vm as any
    vm.status = 'delivered'
    vm.observation = 'Entregue com nota fiscal'

    await vm.onSubmit()

    expect(mockBatchUpdateDemandItemsExecutionStatus).toHaveBeenCalledWith({
      itemIds: ['dp-1', 'dp-2'],
      status: 'delivered',
      commitmentNumber: null,
      observation: 'Entregue com nota fiscal',
      errorDetails: null,
    })

    expect(mockToast.success).toHaveBeenCalledWith(
      expect.stringContaining('2 item(ns) com sucesso'),
    )
    expect(wrapper.emitted('saved')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
  })

  it('warns and blocks commitment_issued if items belong to multiple distinct suppliers', async () => {
    const itemsMultiSupplier = [
      mockItems[0],
      {
        ...mockItems[1],
        demand_product_bids: [
          {
            id: 'b-3',
            demand_product_id: 'dp-2',
            supplier_id: 'supp-2',
            amount: 3.0,
            status: 'classified',
            suppliers: { id: 'supp-2', company_name: 'Fornecedor Beta', cnpj: '22222222000122' },
          },
        ],
      } as unknown as DemandProductRow,
    ]

    const wrapper = mount(DemandItemsBatchExecutionStatusModal, {
      props: {
        modelValue: true,
        items: itemsMultiSupplier,
      },
      global: {
        stubs: {
          UiModal: {
            template: '<div class="ui-modal-stub"><slot /></div>',
          },
          UiAlert: true,
          UiSelect: true,
          UiInput: true,
          UiTextarea: true,
          UiButton: true,
          UiCard: true,
          UiChip: true,
        },
      },
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vm = wrapper.vm as any
    vm.status = 'commitment_issued'
    vm.commitmentNumber = '2026NE00099'

    expect(vm.hasMultipleSuppliersForCommitment).toBe(true)

    await vm.onSubmit()

    expect(mockBatchUpdateDemandItemsExecutionStatus).not.toHaveBeenCalled()
    expect(vm.serverError).toContain('fornecedores distintos')
  })
})
