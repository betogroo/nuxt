import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { ref } from 'vue'
import BallotBoxFormModal from '~/components/elections/BallotBoxFormModal.vue'
import type { BallotBoxRow } from '~/types/ballot-box'

const toastSuccessMock = vi.fn()
const toastErrorMock = vi.fn()
mockNuxtImport('useToast', () => () => ({
  success: toastSuccessMock,
  error: toastErrorMock,
  info: vi.fn(),
}))

const createBallotBoxMock = vi.fn().mockResolvedValue({ id: 'b-1', name: 'Urna Nova' })
const updateBallotBoxMock = vi.fn().mockResolvedValue({ id: 'b-1', name: 'Urna Atualizada' })

mockNuxtImport('useBallotBoxes', () => () => ({
  loading: ref(false),
  error: ref(null),
  createBallotBox: createBallotBoxMock,
  updateBallotBox: updateBallotBoxMock,
}))

describe('BallotBoxFormModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const createWrapper = () => {
    return shallowMount(BallotBoxFormModal, {
      props: {
        electionId: 'elec-1',
      },
      global: {
        stubs: {
          UiModal: true,
          UiInput: true,
          UiButton: true,
          UiIcon: true,
          UiAlert: true,
          UiRow: true,
          UiCol: true,
        },
      },
    })
  }

  it('opens in create mode with empty form and initial values', async () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as {
      open: () => void
      isOpen: boolean
      isEditing: boolean
      name: string
      deviceInfo: string
    }

    vm.open()
    await wrapper.vm.$nextTick()

    expect(vm.isOpen).toBe(true)
    expect(vm.isEditing).toBe(false)
    expect(vm.name).toBe('')
    expect(vm.deviceInfo).toBe('')
  })

  it('opens in edit mode pre-populating existing ballot box fields', async () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as {
      open: (box: BallotBoxRow) => void
      isOpen: boolean
      isEditing: boolean
      name: string
      deviceInfo: string
    }

    const mockBox: BallotBoxRow = {
      id: 'box-123',
      election_id: 'elec-1',
      name: 'Urna Central',
      device_info: 'Notebook Dell Latitude',
      is_active: false,
      created_by: 'user-1',
      deleted_at: null,
      created_at: '2026-10-21T10:00:00Z',
      updated_at: '2026-10-21T10:00:00Z',
    }

    vm.open(mockBox)
    await wrapper.vm.$nextTick()

    expect(vm.isOpen).toBe(true)
    expect(vm.isEditing).toBe(true)
    expect(vm.name).toBe('Urna Central')
    expect(vm.deviceInfo).toBe('Notebook Dell Latitude')
  })

  it('validates required name field on submission', async () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as {
      open: () => void
      name: string
      handleSubmit: () => Promise<void>
      errors: { name?: string }
    }

    vm.open()
    vm.name = ''
    await vm.handleSubmit()

    expect(createBallotBoxMock).not.toHaveBeenCalled()
    expect(vm.errors.name).toBeDefined()
  })

  it('submits valid new ballot box and emits saved event', async () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as {
      open: () => void
      name: string
      deviceInfo: string
      handleSubmit: () => Promise<void>
      isOpen: boolean
    }

    vm.open()
    vm.name = 'Urna 01 - Laboratório'
    vm.deviceInfo = 'Tablet Galaxy Tab A9'

    await vm.handleSubmit()

    expect(createBallotBoxMock).toHaveBeenCalledWith({
      election_id: 'elec-1',
      name: 'Urna 01 - Laboratório',
      device_info: 'Tablet Galaxy Tab A9',
    })
    expect(toastSuccessMock).toHaveBeenCalled()
    expect(wrapper.emitted('saved')).toBeTruthy()
    expect(vm.isOpen).toBe(false)
  })

  it('submits updated ballot box when editing and emits saved event', async () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as {
      open: (box: BallotBoxRow) => void
      name: string
      deviceInfo: string
      handleSubmit: () => Promise<void>
      isOpen: boolean
    }

    const mockBox: BallotBoxRow = {
      id: 'box-123',
      election_id: 'elec-1',
      name: 'Urna Central',
      device_info: null,
      is_active: false,
      created_by: 'user-1',
      deleted_at: null,
      created_at: '2026-10-21T10:00:00Z',
      updated_at: '2026-10-21T10:00:00Z',
    }

    vm.open(mockBox)
    vm.name = 'Urna Central - Alterada'
    vm.deviceInfo = 'Novo iPad 10'

    await vm.handleSubmit()

    expect(updateBallotBoxMock).toHaveBeenCalledWith('box-123', {
      name: 'Urna Central - Alterada',
      device_info: 'Novo iPad 10',
    })
    expect(toastSuccessMock).toHaveBeenCalled()
    expect(wrapper.emitted('saved')).toBeTruthy()
    expect(vm.isOpen).toBe(false)
  })
})
