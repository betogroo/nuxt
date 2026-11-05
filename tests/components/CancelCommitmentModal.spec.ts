import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import CancelCommitmentModal from '~/components/demands/CancelCommitmentModal.vue'

const cancelCommitmentMock = vi.fn()
const toastSuccessMock = vi.fn()
const toastErrorMock = vi.fn()

vi.mock('~/composables/useCommitments', () => ({
  useCommitments: () => ({
    cancelCommitment: cancelCommitmentMock,
  }),
}))

vi.mock('~/composables/useToast', () => ({
  useToast: () => ({
    success: toastSuccessMock,
    error: toastErrorMock,
  }),
}))

interface CancelModalVm {
  reason: string
  cancellationCommitmentNumber: string
  cancellationIssueDate: string
  cancellationObservation: string
  onSubmit: () => Promise<void>
}

describe('CancelCommitmentModal', () => {
  const dummyCommitment = {
    id: 'comm-123',
    commitment_number: '2026NE00010',
    demand_id: 'dem-1',
    supplier_id: 'sup-1',
    expense_nature_id: '339030',
    status: 'commitment_issued' as const,
    issue_date: '2026-11-01',
    observation: null,
    error_details: null,
    disbursement_program_number: null,
    disbursement_program_issued_at: null,
    disbursement_program_observation: null,
    bank_order_number: null,
    bank_order_issued_at: null,
    bank_order_observation: null,
    cancellation_commitment_number: null,
    cancels_commitment_number: null,
    created_by: null,
    created_at: '2026-11-01T10:00:00Z',
    updated_at: '2026-11-01T10:00:00Z',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders modal with warning and required fields when open', () => {
    const wrapper = mount(CancelCommitmentModal, {
      props: {
        modelValue: true,
        commitment: dummyCommitment,
        itemsCount: 2,
      },
      global: {
        stubs: {
          UiModal: { template: '<div><slot /></div>' },
          UiAlert: {
            props: ['title'],
            template: '<div><div v-if="title">{{ title }}</div><slot /></div>',
          },
          UiCard: { template: '<div><slot /></div>' },
          UiRow: { template: '<div><slot /></div>' },
          UiCol: { template: '<div><slot /></div>' },
          UiTextarea: {
            props: ['modelValue', 'label', 'errorMessages'],
            template:
              '<textarea :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
          },
          UiInput: {
            props: ['modelValue', 'label', 'errorMessages'],
            template:
              '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
          },
          UiTextField: {
            props: ['modelValue', 'label', 'errorMessages'],
            template:
              '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
          },
          UiButton: { template: '<button><slot /></button>' },
          UiIcon: true,
        },
      },
    })

    expect(wrapper.text()).toContain('Atenção: Cancelamento de Empenho')
    expect(wrapper.text()).toContain('2026NE00010')
    expect(wrapper.text()).toContain('Nova Nota de Empenho (NE) de Cancelamento')
    expect(wrapper.text()).toContain('Confirmar Cancelamento')
  })

  it('submits cancellation when user informs valid reason and cancellation NE', async () => {
    cancelCommitmentMock.mockResolvedValue(undefined)

    const wrapper = mount(CancelCommitmentModal, {
      props: {
        modelValue: true,
        commitment: dummyCommitment,
        itemsCount: 1,
      },
      global: {
        stubs: {
          UiModal: { template: '<div><slot /></div>' },
          UiAlert: {
            props: ['title'],
            template: '<div><div v-if="title">{{ title }}</div><slot /></div>',
          },
          UiCard: { template: '<div><slot /></div>' },
          UiRow: { template: '<div><slot /></div>' },
          UiCol: { template: '<div><slot /></div>' },
          UiTextarea: {
            props: ['modelValue'],
            template:
              '<textarea class="reason-input" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
          },
          UiInput: {
            props: ['modelValue'],
            template:
              '<input class="text-input" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
          },
          UiTextField: {
            props: ['modelValue'],
            template:
              '<input class="text-input" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
          },
          UiButton: { template: '<button><slot /></button>' },
        },
      },
    })

    const vm = wrapper.vm as unknown as CancelModalVm
    vm.reason = 'Fornecedor desistiu da contratação'
    vm.cancellationCommitmentNumber = '2026NE00099'
    vm.cancellationIssueDate = '2026-11-05'
    await wrapper.vm.$nextTick()

    await vm.onSubmit()

    expect(cancelCommitmentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        commitmentId: 'comm-123',
        commitmentNumber: '2026NE00010',
        reason: 'Fornecedor desistiu da contratação',
        cancellationCommitmentNumber: '2026NE00099',
        cancellationIssueDate: '2026-11-05',
      }),
    )
    expect(toastSuccessMock).toHaveBeenCalledWith(
      expect.stringContaining('cancelada pela NE 2026NE00099'),
    )
    expect(wrapper.emitted('cancelled')).toBeTruthy()
  })

  it('displays error toast when cancelCommitment rejects', async () => {
    cancelCommitmentMock.mockRejectedValue(new Error('A Nota de Empenho já existe.'))

    const wrapper = mount(CancelCommitmentModal, {
      props: {
        modelValue: true,
        commitment: dummyCommitment,
        itemsCount: 1,
      },
      global: {
        stubs: {
          UiModal: { template: '<div><slot /></div>' },
          UiAlert: {
            props: ['title'],
            template: '<div><div v-if="title">{{ title }}</div><slot /></div>',
          },
          UiCard: { template: '<div><slot /></div>' },
          UiRow: { template: '<div><slot /></div>' },
          UiCol: { template: '<div><slot /></div>' },
          UiTextarea: {
            props: ['modelValue'],
            template: '<textarea :value="modelValue" />',
          },
          UiInput: {
            props: ['modelValue'],
            template: '<input :value="modelValue" />',
          },
          UiTextField: {
            props: ['modelValue'],
            template: '<input :value="modelValue" />',
          },
          UiButton: { template: '<button><slot /></button>' },
        },
      },
    })

    const vm = wrapper.vm as unknown as CancelModalVm
    vm.reason = 'Cancelamento por falha do fornecedor'
    vm.cancellationCommitmentNumber = '2026NE00099'
    vm.cancellationIssueDate = '2026-11-05'
    await wrapper.vm.$nextTick()

    await vm.onSubmit()

    expect(toastErrorMock).toHaveBeenCalledWith('A Nota de Empenho já existe.')
  })
})
