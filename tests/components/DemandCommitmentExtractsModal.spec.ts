import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import DemandCommitmentExtractsModal from '~/components/demands/DemandCommitmentExtractsModal.vue'
import type { DemandRow } from '~/composables/useDemands'
import type { CommitmentRow } from '~/composables/useCommitments'
import type { DemandProductRow } from '~/composables/useDemandProducts'
import * as reportHtmlModule from '~/utils/reportHtml'

const copyMock = vi.fn().mockResolvedValue(true)
const toastSuccessMock = vi.fn()

mockNuxtImport('useToast', () => () => ({
  success: toastSuccessMock,
  error: vi.fn(),
}))

mockNuxtImport('useCopyToClipboard', () => () => ({
  copy: copyMock,
}))

describe('DemandCommitmentExtractsModal', () => {
  const commonStubs = {
    UiModal: {
      template: '<div class="ui-modal"><slot /><slot name="actions" /></div>',
    },
    UiChip: {
      template: '<span class="ui-chip"><slot /></span>',
    },
    UiAlert: {
      template: '<div class="ui-alert"><slot /></div>',
    },
    UiTextarea: {
      props: ['modelValue'],
      template:
        '<textarea class="ui-textarea" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    },
    UiButton: {
      props: ['loading', 'disabled'],
      template: '<button class="ui-button" :disabled="disabled"><slot /></button>',
    },
  }

  const mockDemand = {
    id: 'dem-1',
    name: 'Material de Escritório e Papelaria',
    contract_number: '63/2026',
    process_number: '058.00125162/2026-03',
    internal_process_number: '2026-0063',
    status: 'completed',
  } as unknown as DemandRow

  const mockCommitments = [
    {
      id: 'comm-1',
      commitment_number: '2026NE00386',
      issue_date: '2026-11-13',
      status: 'delivered',
      suppliers: {
        id: 'sup-1',
        company_name: 'FAROL SOLUÇÕES COMÉRCIO E SERVIÇOS LTDA',
        cnpj: '22466779000178',
      },
      expense_natures: { id: '33903016', name: 'Material de Consumo' },
    },
    {
      id: 'comm-cancelled',
      commitment_number: '2026NE00387',
      issue_date: '2026-11-14',
      status: 'cancelled',
      suppliers: {
        id: 'sup-2',
        company_name: 'EMPRESA CANCELADA LTDA',
        cnpj: '11222333000144',
      },
    },
    {
      id: 'comm-2',
      commitment_number: '2026NE00388',
      issue_date: '2026-11-15',
      status: 'commitment_sent',
      suppliers: {
        id: 'sup-3',
        company_name: 'PAPELARIA CENTRAL LTDA',
        cnpj: '99888777000155',
      },
      expense_natures: { id: '33903016', name: 'Material de Consumo' },
    },
  ] as unknown as CommitmentRow[]

  const mockItems = [
    {
      id: 'item-1',
      commitment_number: '2026NE00386',
      quantity: 10,
      demand_product_bids: [{ id: 'b-1', amount: 2480, status: 'classified' }],
    },
    {
      id: 'item-2',
      commitment_number: '2026NE00388',
      quantity: 5,
      demand_product_bids: [{ id: 'b-2', amount: 100, status: 'classified' }],
    },
    {
      id: 'item-cancelled',
      commitment_number: '2026NE00387',
      quantity: 1,
      demand_product_bids: [{ id: 'b-3', amount: 500, status: 'classified' }],
    },
  ] as unknown as DemandProductRow[]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders modal and combines only active commitments (excludes cancelled)', () => {
    const wrapper = mount(DemandCommitmentExtractsModal, {
      props: {
        modelValue: true,
        demand: mockDemand,
        commitments: mockCommitments,
        items: mockItems,
      },
      global: {
        stubs: commonStubs,
      },
    })

    const textarea = wrapper.find('textarea')
    expect(textarea.exists()).toBe(true)
    const val = textarea.element.value

    expect(val).toContain('Nota de empenho: 2026NE00386')
    expect(val).toContain('FAROL SOLUÇÕES COMÉRCIO E SERVIÇOS LTDA')
    expect(val).toContain('Valor total: R$ 24.800,00 (vinte e quatro mil e oitocentos reais)')

    expect(val).toContain('Nota de empenho: 2026NE00388')
    expect(val).toContain('PAPELARIA CENTRAL LTDA')
    expect(val).toContain('Valor total: R$ 500,00 (quinhentos reais)')

    // Must NOT contain cancelled commitment
    expect(val).not.toContain('2026NE00387')
    expect(val).not.toContain('EMPRESA CANCELADA LTDA')
  })

  it('allows switching views between all and single commitment', async () => {
    const wrapper = mount(DemandCommitmentExtractsModal, {
      props: {
        modelValue: true,
        demand: mockDemand,
        commitments: mockCommitments,
        items: mockItems,
      },
      global: {
        stubs: commonStubs,
      },
    })

    const singleCommitmentBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('2026NE00388'))
    expect(singleCommitmentBtn?.exists()).toBe(true)

    await singleCommitmentBtn?.trigger('click')

    const textarea = wrapper.find('textarea')
    const val = textarea.element.value
    expect(val).toContain('Nota de empenho: 2026NE00388')
    expect(val).not.toContain('Nota de empenho: 2026NE00386')
  })

  it('copies extracts to clipboard when clicking "Copiar Todos os Extratos"', async () => {
    const wrapper = mount(DemandCommitmentExtractsModal, {
      props: {
        modelValue: true,
        demand: mockDemand,
        commitments: mockCommitments,
        items: mockItems,
      },
      global: {
        stubs: commonStubs,
      },
    })

    const copyBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('Copiar Todos os Extratos'))
    expect(copyBtn?.exists()).toBe(true)

    await copyBtn?.trigger('click')

    expect(copyMock).toHaveBeenCalledTimes(1)
    expect(toastSuccessMock).toHaveBeenCalledWith('Todos os extratos foram copiados com sucesso!')
  })

  it('triggers printHtmlViaIframe on print', async () => {
    const printSpy = vi.spyOn(reportHtmlModule, 'printHtmlViaIframe').mockImplementation(() => {})

    const wrapper = mount(DemandCommitmentExtractsModal, {
      props: {
        modelValue: true,
        demand: mockDemand,
        commitments: mockCommitments,
        items: mockItems,
      },
      global: {
        stubs: commonStubs,
      },
    })

    const printBtn = wrapper.findAll('button').find((b) => b.text().includes('Imprimir Extratos'))
    expect(printBtn?.exists()).toBe(true)

    await printBtn?.trigger('click')

    expect(printSpy).toHaveBeenCalledTimes(1)
  })

  it('displays alert when there are no active commitments', () => {
    const wrapper = mount(DemandCommitmentExtractsModal, {
      props: {
        modelValue: true,
        demand: mockDemand,
        commitments: [mockCommitments[1]!], // only cancelled
        items: mockItems,
      },
      global: {
        stubs: commonStubs,
      },
    })

    expect(wrapper.find('.ui-alert').text()).toContain(
      'Nenhum empenho ativo (não cancelado) foi encontrado para esta demanda.',
    )
  })
})
