import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import CommitmentExtractModal from '~/components/commitments/CommitmentExtractModal.vue'
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

describe('CommitmentExtractModal', () => {
  const commonStubs = {
    UiModal: {
      template: '<div class="ui-modal"><slot /><slot name="actions" /></div>',
    },
    UiChip: {
      template: '<span class="ui-chip"><slot /></span>',
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

  const dummyCommitment = {
    id: 'comm-123',
    commitment_number: '2026NE00386',
    demand_id: 'dem-1',
    supplier_id: 'sup-1',
    expense_nature_id: '33903016',
    status: 'delivered' as const,
    issue_date: '2026-11-13',
    observation: null,
    error_details: null,
    disbursement_program_number: null,
    disbursement_program_issued_at: null,
    disbursement_program_observation: null,
    disbursement_program_paid_at: null,
    bank_order_number: null,
    bank_order_issued_at: null,
    bank_order_paid_at: null,
    bank_order_observation: null,
    cancellation_commitment_number: null,
    cancels_commitment_number: null,
    created_by: null,
    created_at: '2026-11-13T10:00:00Z',
    updated_at: '2026-11-13T10:00:00Z',
    suppliers: {
      id: 'sup-1',
      company_name: 'FAROL SOLUÇÕES COMÉRCIO E SERVIÇOS LTDA',
      cnpj: '22466779000178',
    },
    demands: {
      id: 'dem-1',
      name: 'Material de Escritório e Papelaria',
      contract_number: '63/2026',
      process_number: '058.00125162/2026-03',
      internal_process_number: '2026-0063',
      status: 'completed' as const,
    },
    expense_natures: {
      id: '33903016',
      name: 'Material de Escritório',
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders modal with generated commitment extract when opened', () => {
    const wrapper = mount(CommitmentExtractModal, {
      props: {
        modelValue: true,
        commitment: dummyCommitment,
        totalAmount: 24800,
      },
      global: {
        stubs: commonStubs,
      },
    })

    const textarea = wrapper.find('textarea')
    expect(textarea.exists()).toBe(true)
    const val = textarea.element.value
    expect(val).toContain('EXTRATO NOTA DE EMPENHO')
    expect(val).toContain('Dispensa de Licitação nº 63/2026')
    expect(val).toContain('Processo SEI nº 058.00125162/2026-03')
    expect(val).toContain('Contratante - Delegacia Seccional de Polícia de São Joaquim da Barra')
    expect(val).toContain('Objeto: Material de Escritório e Papelaria')
    expect(val).toContain('Natureza de despesa: 33903016')
    expect(val).toContain('Programa de trabalho: 06181180149890000')
    expect(val).toContain('PTRES: 180205')
    expect(val).toContain('Contratada: FAROL SOLUÇÕES COMÉRCIO E SERVIÇOS LTDA')
    expect(val).toContain('CNPJ 22.466.779/0001-78')
    expect(val).toContain('Valor total: R$ 24.800,00 (vinte e quatro mil e oitocentos reais)')
    expect(val).toContain('Nota de empenho: 2026NE00386')
    expect(val).toContain('Data de emissão: 13/11/2026')
  })

  it('calls copy and shows success toast when clicking "Copiar Extrato"', async () => {
    const wrapper = mount(CommitmentExtractModal, {
      props: {
        modelValue: true,
        commitment: dummyCommitment,
        totalAmount: 24800,
      },
      global: {
        stubs: commonStubs,
      },
    })

    const copyBtn = wrapper.findAll('button').find((btn) => btn.text().includes('Copiar Extrato'))
    expect(copyBtn?.exists()).toBe(true)

    await copyBtn?.trigger('click')

    expect(copyMock).toHaveBeenCalledTimes(1)
    expect(copyMock.mock.calls[0][0]).toContain('EXTRATO NOTA DE EMPENHO')
    expect(toastSuccessMock).toHaveBeenCalledWith('Extrato copiado com sucesso!')
  })

  it('triggers printHtmlViaIframe when clicking "Imprimir Extrato"', async () => {
    const printSpy = vi.spyOn(reportHtmlModule, 'printHtmlViaIframe').mockImplementation(() => {})

    const wrapper = mount(CommitmentExtractModal, {
      props: {
        modelValue: true,
        commitment: dummyCommitment,
        totalAmount: 24800,
      },
      global: {
        stubs: commonStubs,
      },
    })

    const printBtn = wrapper
      .findAll('button')
      .find((btn) => btn.text().includes('Imprimir Extrato'))
    expect(printBtn?.exists()).toBe(true)

    await printBtn?.trigger('click')

    expect(printSpy).toHaveBeenCalledTimes(1)
    expect(printSpy.mock.calls[0][0]).toContain('EXTRATO NOTA DE EMPENHO')
  })
})
