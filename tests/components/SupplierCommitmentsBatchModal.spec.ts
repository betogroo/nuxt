import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import SupplierCommitmentsBatchModal, {
  type SupplierNatureGroup,
} from '~/components/demands/SupplierCommitmentsBatchModal.vue'
import type { DemandProductRow } from '~/composables/useDemandProducts'

const mockBatchUpdateCommitmentsByNature = vi.fn().mockResolvedValue(undefined)
const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
}

mockNuxtImport('useToast', () => () => mockToast)
mockNuxtImport('useDemandProducts', () => () => ({
  batchUpdateCommitmentsByNature: mockBatchUpdateCommitmentsByNature,
}))

describe('SupplierCommitmentsBatchModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const supplier = {
    id: 'sup-alpha',
    company_name: 'Fornecedor Alpha Distribuidora LTDA',
    cnpj: '12345678000199',
  }

  const items = [
    {
      id: 'item-1',
      demand_id: 'dem-1',
      product_id: 'prod-1',
      quantity: 10,
      unit_name_snapshot: 'Pct',
      product_name_snapshot: 'Papel A4',
      commitment_number: '2026-NE-00100',
      product: {
        id: 'prod-1',
        name: 'Papel A4',
        expense_nature_id: '33903016',
        expense_natures: { id: '33903016', name: 'Material de Consumo' },
      },
      demand_product_bids: [
        {
          id: 'bid-1',
          supplier_id: 'sup-alpha',
          amount: 25.0,
          status: 'classified',
        },
      ],
    },
    {
      id: 'item-2',
      demand_id: 'dem-1',
      product_id: 'prod-2',
      quantity: 5,
      unit_name_snapshot: 'Cx',
      product_name_snapshot: 'Caneta Esferográfica',
      commitment_number: '2026-NE-00100',
      product: {
        id: 'prod-2',
        name: 'Caneta Esferográfica',
        expense_nature_id: '33903016',
        expense_natures: { id: '33903016', name: 'Material de Consumo' },
      },
      demand_product_bids: [
        {
          id: 'bid-2',
          supplier_id: 'sup-alpha',
          amount: 10.0,
          status: 'classified',
        },
      ],
    },
    {
      id: 'item-3',
      demand_id: 'dem-1',
      product_id: 'prod-3',
      quantity: 2,
      unit_name_snapshot: 'Lt',
      product_name_snapshot: 'Óleo Motor',
      commitment_number: null,
      product: {
        id: 'prod-3',
        name: 'Óleo Motor',
        expense_nature_id: '33903010',
        expense_natures: { id: '33903010', name: 'Combustíveis e Lubrificantes' },
      },
      demand_product_bids: [
        {
          id: 'bid-3',
          supplier_id: 'sup-alpha',
          amount: 100.0,
          status: 'classified',
        },
      ],
    },
  ]

  it('groups won items by expense nature and computes subtotals properly', () => {
    const wrapper = mount(SupplierCommitmentsBatchModal, {
      props: {
        modelValue: true,
        demandId: 'dem-1',
        supplier,
        items: items as unknown as DemandProductRow[],
      },
      global: {
        stubs: {
          UiModal: {
            template: '<div class="ui-modal-stub"><slot /><slot name="actions" /></div>',
          },
          UiAlert: true,
          UiCard: {
            template: '<div class="ui-card-stub"><slot /></div>',
          },
          UiChip: true,
          UiInput: {
            props: ['modelValue', 'label'],
            template: '<input class="ui-input-stub" :value="modelValue" />',
          },
          UiButton: true,
        },
      },
    })

    const vm = wrapper.vm as unknown as {
      natureGroups: SupplierNatureGroup[]
      commitmentInputs: Record<string, string>
      onSave: () => Promise<void>
      serverError: string
    }
    expect(vm.natureGroups).toHaveLength(2)

    const nature16 = vm.natureGroups.find((g: SupplierNatureGroup) => g.natureId === '33903016')
    expect(nature16).toBeDefined()
    expect(nature16?.items).toHaveLength(2)
    // 10 * 25 = 250; 5 * 10 = 50 => Total 300
    expect(nature16?.totalAmount).toBe(300)
    expect(nature16?.initialCommitment).toBe('2026-NE-00100')

    const nature10 = vm.natureGroups.find((g: SupplierNatureGroup) => g.natureId === '33903010')
    expect(nature10).toBeDefined()
    expect(nature10?.items).toHaveLength(1)
    // 2 * 100 = 200
    expect(nature10?.totalAmount).toBe(200)
    expect(nature10?.initialCommitment).toBe('')
  })

  it('prevents saving when the same commitment number is used in different natures', async () => {
    const wrapper = mount(SupplierCommitmentsBatchModal, {
      props: {
        modelValue: true,
        demandId: 'dem-1',
        supplier,
        items: items as unknown as DemandProductRow[],
      },
      global: {
        stubs: {
          UiModal: {
            template: '<div class="ui-modal-stub"><slot /><slot name="actions" /></div>',
          },
          UiAlert: true,
          UiCard: true,
          UiChip: true,
          UiInput: true,
          UiButton: true,
        },
      },
    })

    const vm = wrapper.vm as unknown as {
      commitmentInputs: Record<string, string>
      onSave: () => Promise<void>
      serverError: string
    }
    vm.commitmentInputs['33903016'] = '2026-NE-00100'
    vm.commitmentInputs['33903010'] = '2026-NE-00100' // Duplicate!

    await vm.onSave()

    expect(mockBatchUpdateCommitmentsByNature).not.toHaveBeenCalled()
    expect(vm.serverError).toContain('foi informado para mais de uma natureza de despesa diferente')
  })

  it('calls batchUpdateCommitmentsByNature with distinct commitments and emits saved', async () => {
    const wrapper = mount(SupplierCommitmentsBatchModal, {
      props: {
        modelValue: true,
        demandId: 'dem-1',
        supplier,
        items: items as unknown as DemandProductRow[],
      },
      global: {
        stubs: {
          UiModal: {
            template: '<div class="ui-modal-stub"><slot /><slot name="actions" /></div>',
          },
          UiAlert: true,
          UiCard: true,
          UiChip: true,
          UiInput: true,
          UiButton: true,
        },
      },
    })

    const vm = wrapper.vm as unknown as {
      commitmentInputs: Record<string, string>
      onSave: () => Promise<void>
    }
    vm.commitmentInputs['33903016'] = '2026-NE-00100'
    vm.commitmentInputs['33903010'] = '2026-NE-00200'

    await vm.onSave()

    expect(mockBatchUpdateCommitmentsByNature).toHaveBeenCalledWith({
      demandId: 'dem-1',
      supplierId: 'sup-alpha',
      updates: [
        { expenseNatureId: '33903010', commitmentNumber: '2026-NE-00200' },
        { expenseNatureId: '33903016', commitmentNumber: '2026-NE-00100' },
      ],
    })
    expect(mockToast.success).toHaveBeenCalledWith('Notas de empenho atualizadas com sucesso!')
    expect(wrapper.emitted('saved')).toBeTruthy()
  })
})
