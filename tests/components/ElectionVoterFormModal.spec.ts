import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import ElectionVoterFormModal from '~/components/elections/ElectionVoterFormModal.vue'

const toastSuccessMock = vi.fn()
const toastErrorMock = vi.fn()
mockNuxtImport('useToast', () => () => ({
  success: toastSuccessMock,
  error: toastErrorMock,
}))

const createVoterMock = vi.fn().mockResolvedValue({
  id: 'v-1',
  name: 'Maria Silva',
  voter_registration_number: '123456',
  is_active: true,
})
const updateVoterMock = vi.fn().mockResolvedValue({
  id: 'v-1',
  name: 'Maria Silva Editada',
  voter_registration_number: '123456',
  is_active: true,
})
const generateNextVoterNumberMock = vi.fn().mockResolvedValue('123457')

mockNuxtImport('useElectionVoters', () => () => ({
  createVoter: createVoterMock,
  updateVoter: updateVoterMock,
  generateNextVoterNumber: generateNextVoterNumberMock,
}))

describe('ElectionVoterFormModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const createWrapper = () => {
    return shallowMount(ElectionVoterFormModal, {
      global: {
        stubs: {
          UiModal: true,
          UiInput: true,
          UiSwitch: true,
          UiButton: true,
          UiIcon: true,
          UiAlert: true,
          UiSpacer: true,
        },
      },
    })
  }

  it('opens in create mode with empty fields', () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as {
      open: () => void
      isOpen: boolean
      isEditing: boolean
      name: string
      voterRegistrationNumber: string
      isActive: boolean
    }

    vm.open()
    expect(vm.isOpen).toBe(true)
    expect(vm.isEditing).toBe(false)
    expect(vm.name).toBe('')
    expect(vm.voterRegistrationNumber).toBe('')
    expect(vm.isActive).toBe(true)
  })

  it('opens in edit mode prefilled with voter data', () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as {
      open: (v: Record<string, unknown>) => void
      isOpen: boolean
      isEditing: boolean
      name: string
      voterRegistrationNumber: string
      isActive: boolean
    }

    vm.open({
      id: 'voter-1',
      name: 'Carlos Oliveira',
      voter_registration_number: '987654',
      is_active: false,
    })

    expect(vm.isOpen).toBe(true)
    expect(vm.isEditing).toBe(true)
    expect(vm.name).toBe('Carlos Oliveira')
    expect(vm.voterRegistrationNumber).toBe('987654')
    expect(vm.isActive).toBe(false)
  })

  it('generates next sequential voter number on request', async () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as {
      open: () => void
      handleGenerateNumber: () => Promise<void>
      voterRegistrationNumber: string
    }

    vm.open()
    await vm.handleGenerateNumber()

    expect(generateNextVoterNumberMock).toHaveBeenCalled()
    expect(vm.voterRegistrationNumber).toBe('123457')
  })

  it('validates required fields before calling createVoter', async () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as {
      open: () => void
      handleSave: () => Promise<void>
      errors: Record<string, string>
    }

    vm.open()
    await vm.handleSave()

    expect(createVoterMock).not.toHaveBeenCalled()
    expect(vm.errors.name).toBeDefined()
    expect(vm.errors.voter_registration_number).toBeDefined()
  })

  it('calls createVoter and emits saved event on valid payload', async () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as {
      open: () => void
      name: string
      voterRegistrationNumber: string
      handleSave: () => Promise<void>
    }

    vm.open()
    vm.name = 'Maria Silva'
    vm.voterRegistrationNumber = '123456'
    await vm.handleSave()

    expect(createVoterMock).toHaveBeenCalledWith({
      name: 'Maria Silva',
      voter_registration_number: '123456',
      is_active: true,
    })
    expect(toastSuccessMock).toHaveBeenCalled()
    expect(wrapper.emitted('saved')).toBeTruthy()
  })
})
