import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { ref } from 'vue'
import CandidateFormModal from '~/components/elections/CandidateFormModal.vue'

const toastSuccessMock = vi.fn()
const toastErrorMock = vi.fn()
mockNuxtImport('useToast', () => () => ({
  success: toastSuccessMock,
  error: toastErrorMock,
  info: vi.fn(),
}))

const createCandidateMock = vi
  .fn()
  .mockResolvedValue({ id: 'c-1', name: 'Chapa 1', candidate_number: '10' })
const updateCandidateMock = vi
  .fn()
  .mockResolvedValue({ id: 'c-1', name: 'Chapa Atualizada', candidate_number: '10' })
const generateRandomPhotoUrlMock = vi
  .fn()
  .mockReturnValue('https://picsum.photos/seed/test/300/300')

mockNuxtImport('useCandidates', () => () => ({
  loading: ref(false),
  error: ref(null),
  createCandidate: createCandidateMock,
  updateCandidate: updateCandidateMock,
  generateRandomPhotoUrl: generateRandomPhotoUrlMock,
}))

describe('CandidateFormModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const createWrapper = (props = {}) => {
    return shallowMount(CandidateFormModal, {
      props: {
        electionId: 'elec-123',
        digitsCount: 2,
        isUppercase: false,
        ...props,
      },
      global: {
        stubs: {
          UiModal: true,
          UiInput: true,
          UiButton: true,
          UiAvatar: true,
          UiIcon: true,
          UiAlert: true,
        },
      },
    })
  }

  it('initializes and opens for new candidate registration', () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as {
      open: () => void
      isOpen: boolean
      isEditing: boolean
      name: string
      candidateNumber: string
      photoUrl: string
    }

    vm.open()
    expect(vm.isOpen).toBe(true)
    expect(vm.isEditing).toBe(false)
    expect(vm.name).toBe('')
    expect(vm.candidateNumber).toBe('')
    expect(vm.photoUrl).toBe('https://picsum.photos/seed/test/300/300')
  })

  it('opens in edit mode with candidate existing data', () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as {
      open: (c: Record<string, unknown>) => void
      isOpen: boolean
      isEditing: boolean
      name: string
      candidateNumber: string
      photoUrl: string
    }

    vm.open({
      id: 'c-10',
      election_id: 'elec-123',
      name: 'Chapa Esperança',
      candidate_number: '99',
      photo_url: 'http://custom/photo.png',
    })

    expect(vm.isOpen).toBe(true)
    expect(vm.isEditing).toBe(true)
    expect(vm.name).toBe('Chapa Esperança')
    expect(vm.candidateNumber).toBe('99')
    expect(vm.photoUrl).toBe('http://custom/photo.png')
  })

  it('limits candidate number to digitsCount and strips non-digits', () => {
    const wrapper = createWrapper({ digitsCount: 2 })
    const vm = wrapper.vm as unknown as {
      handleCandidateNumberInput: (v: string) => void
      candidateNumber: string
    }

    vm.handleCandidateNumberInput('1234')
    expect(vm.candidateNumber).toBe('12')

    vm.handleCandidateNumberInput('a5b8c')
    expect(vm.candidateNumber).toBe('58')
  })

  it('validates and submits new candidate successfully, emitting saved', async () => {
    const wrapper = createWrapper({ digitsCount: 2, isUppercase: true })
    const vm = wrapper.vm as unknown as {
      open: () => void
      name: string
      candidateNumber: string
      photoUrl: string
      handleSubmit: () => Promise<void>
      isOpen: boolean
    }

    vm.open()
    vm.name = 'chapa vitória'
    vm.candidateNumber = '15'
    vm.photoUrl = 'https://picsum.photos/300'

    await vm.handleSubmit()

    expect(createCandidateMock).toHaveBeenCalledWith('elec-123', {
      name: 'CHAPA VITÓRIA',
      candidate_number: '15',
      photo_url: 'https://picsum.photos/300',
    })
    expect(toastSuccessMock).toHaveBeenCalled()
    expect(wrapper.emitted('saved')).toBeTruthy()
    expect(vm.isOpen).toBe(false)
  })

  it('fails validation when candidate number does not match digitsCount', async () => {
    const wrapper = createWrapper({ digitsCount: 2 })
    const vm = wrapper.vm as unknown as {
      open: () => void
      name: string
      candidateNumber: string
      handleSubmit: () => Promise<void>
      errors: { candidate_number?: string }
    }

    vm.open()
    vm.name = 'Chapa Teste'
    vm.candidateNumber = '1'

    await vm.handleSubmit()

    expect(createCandidateMock).not.toHaveBeenCalled()
    expect(vm.errors.candidate_number).toBeDefined()
  })
})
