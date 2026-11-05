import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { ref } from 'vue'
import CommitmentDetailPage from '~/pages/commitments/[number].vue'
import * as downloadModule from '~/utils/download'

const mockLogAction = vi.fn()
const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
  confirm: vi.fn().mockResolvedValue(true),
}

const mockDetailData = ref({
  commitment: {
    id: 'comm-1',
    commitment_number: '2026NE00313',
    demand_id: 'dem-1',
    supplier_id: 'sup-1',
    expense_nature_id: 'nat-1',
    issue_date: '2026-04-10',
    status: 'delivered',
    error_details: null,
    observation: 'Mercadoria conferida',
    disbursement_program_number: '2026PD00010',
    disbursement_program_issued_at: '2026-04-12',
    disbursement_program_observation: 'PD liberado',
    bank_order_number: null,
    bank_order_issued_at: null,
    bank_order_observation: null,
    created_at: '2026-04-10T10:00:00Z',
    updated_at: '2026-04-12T10:00:00Z',
    suppliers: {
      id: 'sup-1',
      company_name: 'Fornecedor Alpha LTDA',
      cnpj: '12345678000190',
    },
    demands: {
      id: 'dem-1',
      name: 'Aquisição de Materiais de Escritório',
      internal_process_number: '042/2026',
      process_number: null,
      status: 'in_progress',
    },
    expense_natures: {
      id: 'nat-1',
      name: '339030 - Material de Consumo',
    },
    demand_commitment_liquidations: [],
  },
  liquidations: [
    {
      id: 'nl-1',
      commitment_id: 'comm-1',
      liquidation_number: '2026NL00101',
      issue_date: '2026-04-11',
      observation: 'Primeira NL',
      is_cancellation: false,
      created_at: '2026-04-11T10:00:00Z',
    },
    {
      id: 'nl-2',
      commitment_id: 'comm-1',
      liquidation_number: '2026NL00102',
      issue_date: '2026-04-11',
      observation: 'Segunda NL',
      is_cancellation: false,
      created_at: '2026-04-11T11:00:00Z',
    },
  ],
  items: [
    {
      id: 'item-1',
      demand_id: 'dem-1',
      unit_name_snapshot: 'CX',
      quantity: 50,
      winning_unit_price: 10,
      total_item_value: 500,
      execution_status: 'delivered',
      commitment_number: '2026NE00313',
      demand_item_number: 4,
      product: {
        id: 'prod-1',
        name: 'Caneta Esferográfica Azul',
        expense_natures: { id: 'nat-1', name: '339030 - Material de Consumo' },
      },
      measurement_units: { id: 'u-1', name: 'Caixa' },
    },
  ],
  total_amount: 500,
  status_history: [],
})

const mockFetchCommitmentByNumber = vi.fn().mockResolvedValue(mockDetailData.value)
const mockUpdateCommitmentLogisticsStatus = vi.fn()
const mockAddLiquidationNote = vi.fn()
const mockUpdateLiquidationNote = vi.fn()
const mockRemoveLiquidationNote = vi.fn()
const mockSaveDisbursementProgram = vi.fn()
const mockRemoveDisbursementProgram = vi.fn()
const mockSaveBankOrderAndComplete = vi.fn()
const mockRemoveBankOrder = vi.fn()

vi.mock('vue-router', () => ({
  useRoute: () => ({
    params: { number: '2026NE00313' },
  }),
}))

mockNuxtImport('useHead', () => vi.fn())
mockNuxtImport('definePageMeta', () => vi.fn())
mockNuxtImport('useToast', () => () => mockToast)
mockNuxtImport('useLogger', () => () => ({ logAction: mockLogAction }))

mockNuxtImport('useCommitments', () => () => ({
  fetchCommitmentByNumber: mockFetchCommitmentByNumber,
  updateCommitmentLogisticsStatus: mockUpdateCommitmentLogisticsStatus,
  addLiquidationNote: mockAddLiquidationNote,
  updateLiquidationNote: mockUpdateLiquidationNote,
  removeLiquidationNote: mockRemoveLiquidationNote,
  saveDisbursementProgram: mockSaveDisbursementProgram,
  removeDisbursementProgram: mockRemoveDisbursementProgram,
  saveBankOrderAndComplete: mockSaveBankOrderAndComplete,
  removeBankOrder: mockRemoveBankOrder,
}))

mockNuxtImport('useAsyncData', () => {
  return (_key: unknown, fn: () => Promise<unknown>) => {
    fn()
    return {
      data: mockDetailData,
      pending: ref(false),
      refresh: vi.fn(),
    }
  }
})

const stubs = {
  UiRow: { template: '<div class="ui-row"><slot /></div>' },
  UiCol: { template: '<div class="ui-col"><slot /></div>' },
  UiCard: { template: '<div class="ui-card"><slot /></div>' },
  UiButton: {
    template:
      '<button class="ui-button" :disabled="disabled" :data-icon="icon" :data-tooltip="tooltip"><slot /></button>',
    props: [
      'color',
      'variant',
      'size',
      'loading',
      'disabled',
      'to',
      'prependIcon',
      'icon',
      'tooltip',
    ],
  },
  UiChip: { template: '<span class="ui-chip"><slot /></span>' },
  UiIcon: { template: '<i class="ui-icon" />' },
  UiInput: { template: '<input class="ui-input" />' },
  UiTextField: { template: '<input class="ui-text-field" />' },
  UiTextarea: { template: '<textarea class="ui-textarea" />' },
  UiSelect: { template: '<select class="ui-select" />' },
  UiAlert: { template: '<div class="ui-alert"><slot /></div>' },
  UiModal: { template: '<div class="ui-modal"><slot /><slot name="actions" /></div>' },
  UiProgressCircular: { template: '<div class="ui-progress" />' },
  UiCopyButton: {
    template: '<button class="ui-copy-btn" :data-value="value" :data-tooltip="tooltip" />',
    props: ['value', 'text', 'tooltip', 'successMessage', 'color', 'size'],
  },
  UiTable: {
    template: `
      <div class="ui-table-stub">
        <div v-for="(item, index) in items" :key="item.id" class="table-row">
          <slot name="item-item_number" :item="item" :index="index" />
          <slot name="item-product" :item="item" :index="index" />
          <slot name="item-unit" :item="item" :index="index" />
          <slot name="item-quantity" :item="item" :index="index" />
          <slot name="item-unit_price" :item="item" :index="index" />
          <slot name="item-subtotal" :item="item" :index="index" />
          <slot name="item-status" :item="item" :index="index" />
          <slot name="item-actions" :item="item" :index="index" />
        </div>
      </div>
    `,
    props: ['headers', 'items'],
  },
  NuxtLink: {
    template: '<a :href="to"><slot /></a>',
    props: ['to'],
  },
}

describe('CommitmentDetailPage (/commitments/[number])', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDetailData.value = {
      commitment: {
        id: 'comm-1',
        commitment_number: '2026NE00313',
        demand_id: 'dem-1',
        supplier_id: 'sup-1',
        expense_nature_id: 'nat-1',
        issue_date: '2026-04-10',
        status: 'delivered',
        error_details: null,
        observation: 'Mercadoria conferida',
        disbursement_program_number: '2026PD00010',
        disbursement_program_issued_at: '2026-04-12',
        disbursement_program_observation: 'PD liberado',
        bank_order_number: null,
        bank_order_issued_at: null,
        bank_order_observation: null,
        created_at: '2026-04-10T10:00:00Z',
        updated_at: '2026-04-12T10:00:00Z',
        suppliers: {
          id: 'sup-1',
          company_name: 'Fornecedor Alpha LTDA',
          cnpj: '12345678000190',
        },
        demands: {
          id: 'dem-1',
          name: 'Aquisição de Materiais de Escritório',
          internal_process_number: '042/2026',
          process_number: null,
          status: 'in_progress',
        },
        expense_natures: {
          id: 'nat-1',
          name: '339030 - Material de Consumo',
        },
        demand_commitment_liquidations: [],
      },
      liquidations: [
        {
          id: 'nl-1',
          commitment_id: 'comm-1',
          liquidation_number: '2026NL00101',
          issue_date: '2026-04-11',
          observation: 'Primeira NL',
          is_cancellation: false,
          created_at: '2026-04-11T10:00:00Z',
        },
        {
          id: 'nl-2',
          commitment_id: 'comm-1',
          liquidation_number: '2026NL00102',
          issue_date: '2026-04-11',
          observation: 'Segunda NL',
          is_cancellation: false,
          created_at: '2026-04-11T11:00:00Z',
        },
      ],
      items: [
        {
          id: 'item-1',
          demand_id: 'dem-1',
          unit_name_snapshot: 'CX',
          quantity: 50,
          winning_unit_price: 10,
          total_item_value: 500,
          execution_status: 'delivered',
          commitment_number: '2026NE00313',
          demand_item_number: 4,
          product: {
            id: 'prod-1',
            name: 'Caneta Esferográfica Azul',
            expense_natures: { id: 'nat-1', name: '339030 - Material de Consumo' },
          },
          measurement_units: { id: 'u-1', name: 'Caixa' },
        },
      ],
      total_amount: 500,
      status_history: [],
    }
  })

  it('renders commitment header, NLs, PD, OB controls, and linked demand items', () => {
    const wrapper = mount(CommitmentDetailPage, {
      global: {
        stubs,
      },
    })

    expect(mockFetchCommitmentByNumber).toHaveBeenCalledWith('2026NE00313')
    const text = wrapper.text()
    expect(text).toContain('2026NE00313')
    expect(text).toContain('Fornecedor Alpha LTDA')
    expect(text).toContain('2026NL00101')
    expect(text).toContain('2026NL00102')
    expect(text).toContain('2026PD00010')
    expect(text).toContain('Caneta Esferográfica Azul')
    expect(text).toContain('#4')
    expect(text).toContain('Registrar OB e Concluir Item(ns)')
  })

  it('renders copy buttons for NE, NLs and PD', () => {
    const wrapper = mount(CommitmentDetailPage, {
      global: {
        stubs,
      },
    })

    const copyButtons = wrapper.findAll('.ui-copy-btn')
    expect(copyButtons.length).toBeGreaterThanOrEqual(4)

    const copyValues = copyButtons.map((btn) => btn.attributes('data-value'))
    expect(copyValues).toContain('2026NE00313')
    expect(copyValues).toContain('2026NL00101')
    expect(copyValues).toContain('2026NL00102')
    expect(copyValues).toContain('2026PD00010')
  })

  it('renders download CSV button and triggers download with RFC 4180 format when clicked', async () => {
    const downloadFileSpy = vi.spyOn(downloadModule, 'downloadFile').mockImplementation(() => {})

    const wrapper = mount(CommitmentDetailPage, {
      global: {
        stubs,
      },
    })

    const downloadBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('Baixar CSV (NL, PD, OB)'))
    expect(downloadBtn).toBeDefined()

    await downloadBtn!.trigger('click')

    expect(downloadFileSpy).toHaveBeenCalledTimes(1)
    const [content, filename, mimeType] = downloadFileSpy.mock.calls[0]

    expect(content).toContain('\uFEFF')
    expect(content).toContain('"Tipo de Documento";"Número do Documento"')
    expect(content).toContain('"2026NL00101"')
    expect(content).toContain('"2026NL00102"')
    expect(content).toContain('"2026PD00010"')
    expect(content).toContain('"Fornecedor Alpha LTDA"')
    expect(filename).toContain('documentos-financeiros-2026ne00313')
    expect(mimeType).toBe('text/csv;charset=utf-8;')

    expect(mockLogAction).toHaveBeenCalledWith(
      'EXPORT_COMMITMENT_FINANCIAL_DOCS_CSV',
      'Exportada lista CSV de documentos financeiros (NL, PD, OB) da NE 2026NE00313',
    )
    expect(mockToast.success).toHaveBeenCalledWith(
      'Lista CSV de documentos financeiros baixada com sucesso!',
    )

    downloadFileSpy.mockRestore()
  })

  it('disables download CSV button when no financial documents exist', () => {
    mockDetailData.value.liquidations = []
    mockDetailData.value.commitment.disbursement_program_number = null
    mockDetailData.value.commitment.bank_order_number = null

    const wrapper = mount(CommitmentDetailPage, {
      global: {
        stubs,
      },
    })

    const downloadBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('Baixar CSV (NL, PD, OB)'))
    expect(downloadBtn).toBeDefined()
    expect(downloadBtn!.attributes('disabled')).toBeDefined()
  })

  it('allows editing an NL: opens modal and saves with updated date', async () => {
    mockUpdateLiquidationNote.mockResolvedValue({
      id: 'nl-1',
      commitment_id: 'comm-1',
      liquidation_number: '2026NL00101',
      issue_date: '2026-04-20',
      observation: 'NL retificada',
    })

    const wrapper = mount(CommitmentDetailPage, {
      global: {
        stubs,
      },
    })

    // Find edit button for first NL
    const editNlBtn = wrapper
      .findAll('button')
      .find((b) => b.attributes('data-tooltip')?.includes('Editar data / observação da NL'))
    expect(editNlBtn).toBeDefined()

    await editNlBtn!.trigger('click')

    // Find submit button in NL modal
    const saveBtn = wrapper.findAll('button').find((b) => b.text().includes('Salvar Alterações'))
    expect(saveBtn).toBeDefined()

    await saveBtn!.trigger('click')

    expect(mockUpdateLiquidationNote).toHaveBeenCalledWith(
      expect.objectContaining({
        liquidationId: 'nl-1',
        commitmentId: 'comm-1',
        commitmentNumber: '2026NE00313',
        liquidationNumber: '2026NL00101',
        issueDate: '2026-04-11',
      }),
    )
    expect(mockToast.success).toHaveBeenCalledWith(expect.stringContaining('atualizada!'))
  })

  it('allows removing PD with confirmation dialog', async () => {
    mockRemoveDisbursementProgram.mockResolvedValue(undefined)

    const wrapper = mount(CommitmentDetailPage, {
      global: {
        stubs,
      },
    })

    const deletePdBtn = wrapper
      .findAll('button')
      .find((b) => b.attributes('data-tooltip')?.includes('Excluir Programa de Desembolso'))
    expect(deletePdBtn).toBeDefined()

    await deletePdBtn!.trigger('click')

    expect(mockToast.confirm).toHaveBeenCalledWith(
      expect.stringContaining('Deseja realmente excluir o Programa de Desembolso 2026PD00010?'),
    )
    expect(mockRemoveDisbursementProgram).toHaveBeenCalledWith({
      commitmentId: 'comm-1',
      commitmentNumber: '2026NE00313',
    })
    expect(mockToast.success).toHaveBeenCalledWith(expect.stringContaining('excluído com sucesso!'))
  })

  it('allows removing OB with confirmation dialog and warning that status reverts to Entregue', async () => {
    mockDetailData.value.commitment.bank_order_number = '2026OB00050'
    mockDetailData.value.commitment.bank_order_issued_at = '2026-04-15'
    mockDetailData.value.commitment.status = 'completed'
    mockRemoveBankOrder.mockResolvedValue(undefined)

    const wrapper = mount(CommitmentDetailPage, {
      global: {
        stubs,
      },
    })

    const deleteObBtn = wrapper
      .findAll('button')
      .find((b) => b.attributes('data-tooltip')?.includes('Excluir Ordem Bancária'))
    expect(deleteObBtn).toBeDefined()

    await deleteObBtn!.trigger('click')

    expect(mockToast.confirm).toHaveBeenCalledWith(
      expect.stringContaining(
        'Deseja realmente excluir a Ordem Bancária 2026OB00050? A Nota de Empenho e seus itens retornarão ao status "Entregue".',
      ),
    )
    expect(mockRemoveBankOrder).toHaveBeenCalledWith({
      commitmentId: 'comm-1',
      commitmentNumber: '2026NE00313',
    })
    expect(mockToast.success).toHaveBeenCalledWith(
      expect.stringContaining(
        'Ordem Bancária 2026OB00050 excluída. Status retornado para Entregue!',
      ),
    )
  })

  it('hides edit/delete NL buttons and delete PD button when OB is present', () => {
    mockDetailData.value.commitment.bank_order_number = '2026OB00050'
    mockDetailData.value.commitment.status = 'completed'

    const wrapper = mount(CommitmentDetailPage, {
      global: {
        stubs,
      },
    })

    const editNlBtn = wrapper
      .findAll('button')
      .find((b) => b.attributes('data-tooltip')?.includes('Editar data / observação da NL'))
    expect(editNlBtn).toBeUndefined()

    const deleteNlBtn = wrapper
      .findAll('button')
      .find((b) => b.attributes('data-tooltip')?.includes('Remover NL'))
    expect(deleteNlBtn).toBeUndefined()

    const deletePdBtn = wrapper
      .findAll('button')
      .find((b) => b.attributes('data-tooltip')?.includes('Excluir Programa de Desembolso'))
    expect(deletePdBtn).toBeUndefined()
  })
})
