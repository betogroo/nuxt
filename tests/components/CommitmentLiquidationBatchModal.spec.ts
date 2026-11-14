import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import CommitmentLiquidationBatchModal from '~/components/commitments/CommitmentLiquidationBatchModal.vue'

const mockAddMultipleLiquidationNotes = vi.fn()
const mockFetchIrRetentionRate = vi.fn().mockResolvedValue(1.2)
const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
}

vi.mock('~/composables/useCommitments', () => ({
  useCommitments: () => ({
    addMultipleLiquidationNotes: mockAddMultipleLiquidationNotes,
  }),
}))

vi.mock('~/composables/useSystemSettings', () => ({
  useSystemSettings: () => ({
    fetchIrRetentionRate: mockFetchIrRetentionRate,
  }),
}))

vi.mock('~/composables/useToast', () => ({
  useToast: () => mockToast,
}))

const stubs = {
  UiModal: {
    template: '<div><slot /><slot name="actions" /></div>',
    props: ['modelValue', 'title'],
  },
  UiCard: { template: '<div><slot /></div>' },
  UiRow: { template: '<div><slot /></div>' },
  UiCol: { template: '<div><slot /></div>' },
  UiAlert: { template: '<div class="alert"><slot /></div>' },
  UiChip: {
    template: '<span class="chip" @click="$emit(\'click\')"><slot /></span>',
    props: ['color', 'variant'],
  },
  UiIcon: { template: '<i class="icon" />' },
  UiInput: {
    props: ['modelValue', 'label', 'hint'],
    template:
      '<input :value="modelValue" :placeholder="label" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  UiTextarea: {
    props: ['modelValue', 'label', 'hint'],
    template:
      '<textarea :value="modelValue" :placeholder="label" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  UiButton: {
    template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
    props: ['color', 'variant', 'disabled', 'loading', 'icon'],
  },
}

describe('CommitmentLiquidationBatchModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders modal header, commitment number and badge for Simples optant', () => {
    const wrapper = mount(CommitmentLiquidationBatchModal, {
      props: {
        modelValue: true,
        commitmentId: 'comm-1',
        commitmentNumber: '2026NE00012',
        totalAmount: 10000,
        isSimplesOptant: true,
      },
      global: { stubs },
    })

    expect(wrapper.text()).toContain('2026NE00012')
    expect(wrapper.text()).toContain('Optante pelo Simples Nacional (Padrão: 4 NLs)')
  })

  it('renders badge for non-Simples supplier and displays suggested IR calculation info', async () => {
    const wrapper = mount(CommitmentLiquidationBatchModal, {
      props: {
        modelValue: true,
        commitmentId: 'comm-1',
        commitmentNumber: '2026NE00012',
        totalAmount: 10000,
        isSimplesOptant: false,
      },
      global: { stubs },
    })

    expect(wrapper.text()).toContain('Não Optante (Padrão: 4 NLs + 1 NL Retenção IR)')

    const textarea = wrapper.find('textarea')
    await textarea.setValue('45, 46, 78, 79, 80')

    expect(wrapper.text()).toContain('2026NL00045')
    expect(wrapper.text()).toContain('2026NL00080')
    expect(wrapper.text()).toContain('Retenção de IR')
    // 10000 * 1.2% = 120
    expect(wrapper.text()).toContain('1,2%')
    expect(wrapper.text()).toContain('120,00')
  })

  it('keeps all NLs ordinary when supplier is Simples optant', async () => {
    const wrapper = mount(CommitmentLiquidationBatchModal, {
      props: {
        modelValue: true,
        commitmentId: 'comm-1',
        commitmentNumber: '2026NE00012',
        totalAmount: 10000,
        isSimplesOptant: true,
      },
      global: { stubs },
    })

    const textarea = wrapper.find('textarea')
    await textarea.setValue('45, 46, 78, 79')

    expect(wrapper.text()).toContain('2026NL00045')
    expect(wrapper.text()).toContain('2026NL00079')
    expect(wrapper.text()).toContain('4 Ordinárias')
    expect(wrapper.text()).not.toContain('Retenção de IR (Clique p/ alterar)')
  })

  it('detects existing NL conflict and blocks save button', async () => {
    const wrapper = mount(CommitmentLiquidationBatchModal, {
      props: {
        modelValue: true,
        commitmentId: 'comm-1',
        commitmentNumber: '2026NE00012',
        totalAmount: 10000,
        isSimplesOptant: true,
        existingLiquidations: [{ liquidation_number: '2026NL00045' }],
      },
      global: { stubs },
    })

    const textarea = wrapper.find('textarea')
    await textarea.setValue('45, 46')

    expect(wrapper.text()).toContain('Já cadastrada no empenho')
    const buttons = wrapper.findAll('button')
    const saveBtn = buttons.find((b) => b.text().includes('Cadastrar 2 Notas de Liquidação'))
    expect(saveBtn?.attributes('disabled')).toBeDefined()
  })

  it('submits batch NLs and emits saved event', async () => {
    mockAddMultipleLiquidationNotes.mockResolvedValue([
      { id: 'nl-1', liquidation_number: '2026NL00045' },
      { id: 'nl-2', liquidation_number: '2026NL00046' },
      { id: 'nl-3', liquidation_number: '2026NL00078' },
      { id: 'nl-4', liquidation_number: '2026NL00079' },
    ])

    const wrapper = mount(CommitmentLiquidationBatchModal, {
      props: {
        modelValue: true,
        commitmentId: 'comm-1',
        commitmentNumber: '2026NE00012',
        totalAmount: 10000,
        isSimplesOptant: true,
      },
      global: { stubs },
    })

    const textarea = wrapper.find('textarea')
    await textarea.setValue('45-46, 78-79')

    const buttons = wrapper.findAll('button')
    const saveBtn = buttons.find((b) => b.text().includes('Cadastrar 4 Notas de Liquidação'))
    expect(saveBtn).toBeDefined()

    await saveBtn?.trigger('click')

    expect(mockAddMultipleLiquidationNotes).toHaveBeenCalledWith(
      expect.objectContaining({
        commitmentId: 'comm-1',
        commitmentNumber: '2026NE00012',
        items: [
          expect.objectContaining({ liquidationNumber: '2026NL00045', isIrRetention: false }),
          expect.objectContaining({ liquidationNumber: '2026NL00046', isIrRetention: false }),
          expect.objectContaining({ liquidationNumber: '2026NL00078', isIrRetention: false }),
          expect.objectContaining({ liquidationNumber: '2026NL00079', isIrRetention: false }),
        ],
      }),
    )

    expect(mockToast.success).toHaveBeenCalledWith('4 Notas de Liquidação cadastradas com sucesso!')
    expect(wrapper.emitted('saved')).toBeTruthy()
    expect(wrapper.emitted('saved')?.[0]).toEqual([4])
  })
})
