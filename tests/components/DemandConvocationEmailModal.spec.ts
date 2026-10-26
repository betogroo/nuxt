import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import DemandConvocationEmailModal from '~/components/demands/DemandConvocationEmailModal.vue'

const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
}

const mockCopy = vi.fn().mockResolvedValue(true)

mockNuxtImport('useToast', () => () => mockToast)
mockNuxtImport('useCopyToClipboard', () => () => ({
  copy: mockCopy,
}))

describe('DemandConvocationEmailModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const commonStubs = {
    UiModal: {
      template: '<div class="ui-modal"><slot /><slot name="actions" /></div>',
    },
    UiAlert: {
      template: '<div class="ui-alert"><slot /></div>',
    },
    UiChip: {
      template: '<span class="ui-chip"><slot /></span>',
    },
    UiIcon: {
      template: '<i class="ui-icon" />',
    },
    UiInput: {
      props: ['modelValue'],
      template:
        '<input class="ui-input" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
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

  const demand = {
    contract_number: '90001/2026',
    dispute_date: '2026-10-15T10:00:00Z',
  }

  const supplierWithEmail = {
    company_name: 'Papelaria Alfa LTDA',
    cnpj: '12345678000199',
    email: 'comercial@papelariaalfa.com.br',
    commitments: [
      {
        commitmentNumber: '2026NE00012',
        itemsCount: 2,
        totalAmount: 1500,
        itemNames: ['Resma A4', 'Caneta'],
      },
    ],
  }

  const supplierWithoutEmail = {
    company_name: 'Beta Serviços LTDA',
    cnpj: '98765432000188',
    email: null,
    commitments: [
      {
        commitmentNumber: '2026NE00045',
        itemsCount: 1,
        totalAmount: 850,
        itemNames: ['Grampeador'],
      },
    ],
  }

  it('renders modal content correctly when open with supplier and demand', () => {
    const wrapper = mount(DemandConvocationEmailModal, {
      props: {
        modelValue: true,
        demand,
        supplier: supplierWithEmail,
      },
      global: {
        stubs: commonStubs,
      },
    })

    expect(wrapper.text()).toContain('Papelaria Alfa LTDA')
    expect(wrapper.text()).toContain('12.345.678/0001-99')
    expect(wrapper.text()).toContain('comercial@papelariaalfa.com.br')
    expect(wrapper.text()).toContain('1 Empenho')

    const subjectInput = wrapper.find('.ui-input')
    expect((subjectInput.element as HTMLInputElement).value).toContain('90001/2026')

    const messageTextarea = wrapper.find('.ui-textarea')
    expect((messageTextarea.element as HTMLTextAreaElement).value).toContain(
      'Prezado(a) responsável pela Papelaria Alfa LTDA',
    )
    expect((messageTextarea.element as HTMLTextAreaElement).value).toContain('2026NE00012')
  })

  it('shows warning alert when supplier has no registered email', () => {
    const wrapper = mount(DemandConvocationEmailModal, {
      props: {
        modelValue: true,
        demand,
        supplier: supplierWithoutEmail,
      },
      global: {
        stubs: commonStubs,
      },
    })

    expect(wrapper.find('.ui-alert').text()).toContain(
      'Fornecedor sem e-mail cadastrado no sistema',
    )
  })

  it('copies full message to clipboard and displays toast', async () => {
    const wrapper = mount(DemandConvocationEmailModal, {
      props: {
        modelValue: true,
        demand,
        supplier: supplierWithEmail,
      },
      global: {
        stubs: commonStubs,
      },
    })

    const buttons = wrapper.findAll('.ui-button')
    const copyButton = buttons.find((b) => b.text().includes('Copiar Mensagem'))
    expect(copyButton).toBeDefined()

    await copyButton!.trigger('click')

    expect(mockCopy).toHaveBeenCalledTimes(1)
    expect(mockCopy.mock.calls[0][0]).toContain('Assunto: CONVOCAÇÃO: Envio de Nota de Empenho')
    expect(mockCopy.mock.calls[0][0]).toContain('Prezado(a) responsável pela Papelaria Alfa LTDA')
    expect(mockToast.success).toHaveBeenCalledWith('E-mail copiado com sucesso!')
  })

  it('copies subject to clipboard and displays toast', async () => {
    const wrapper = mount(DemandConvocationEmailModal, {
      props: {
        modelValue: true,
        demand,
        supplier: supplierWithEmail,
      },
      global: {
        stubs: commonStubs,
      },
    })

    const buttons = wrapper.findAll('.ui-button')
    const subjectCopyBtn = buttons[0] // copy subject icon button
    await subjectCopyBtn.trigger('click')

    expect(mockCopy).toHaveBeenCalledTimes(1)
    expect(mockCopy.mock.calls[0][0]).toContain(
      'CONVOCAÇÃO: Envio de Nota de Empenho - Dispensa Eletrônica nº 90001/2026',
    )
    expect(mockToast.success).toHaveBeenCalledWith('Assunto copiado com sucesso!')
  })

  it('emits update:modelValue false on close', async () => {
    const wrapper = mount(DemandConvocationEmailModal, {
      props: {
        modelValue: true,
        demand,
        supplier: supplierWithEmail,
      },
      global: {
        stubs: commonStubs,
      },
    })

    const buttons = wrapper.findAll('.ui-button')
    const closeBtn = buttons.find((b) => b.text().includes('Fechar'))
    expect(closeBtn).toBeDefined()

    await closeBtn!.trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
  })
})
