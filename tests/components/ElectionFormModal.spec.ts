import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { ref } from 'vue'
import ElectionFormModal from '~/components/elections/ElectionFormModal.vue'

const toastSuccessMock = vi.fn()
const toastErrorMock = vi.fn()
mockNuxtImport('useToast', () => () => ({
  success: toastSuccessMock,
  error: toastErrorMock,
  info: vi.fn(),
}))

const createElectionMock = vi.fn().mockResolvedValue({ id: 'e-1', name: 'Nova Eleição' })
const updateElectionMock = vi.fn().mockResolvedValue({ id: 'e-1', name: 'Eleição Atualizada' })

mockNuxtImport('useElections', () => () => ({
  loading: ref(false),
  error: ref(null),
  createElection: createElectionMock,
  updateElection: updateElectionMock,
}))

const fromMock = vi.fn()
const supabaseMock = {
  from: fromMock,
}
mockNuxtImport('useSupabaseClient', () => () => supabaseMock)

describe('ElectionFormModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fromMock.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockResolvedValue({ count: 0, error: null }),
        }),
      }),
    })
  })

  const createWrapper = () => {
    return shallowMount(ElectionFormModal, {
      global: {
        stubs: {
          UiModal: true,
          UiInput: true,
          UiSelect: true,
          UiSwitch: true,
          UiButton: true,
          UiIcon: true,
          UiAlert: true,
          UiSpacer: true,
        },
      },
    })
  }

  it('opens in create mode with digits unlocked and default values', async () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as {
      open: () => Promise<void>
      isOpen: boolean
      isEditing: boolean
      hasCandidates: boolean
    }

    await vm.open()
    expect(vm.isOpen).toBe(true)
    expect(vm.isEditing).toBe(false)
    expect(vm.hasCandidates).toBe(false)
  })

  it('detects when an election already has candidates and locks digitsCount', async () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as {
      open: (e: Record<string, unknown>, hasCandidatesParam?: boolean) => Promise<void>
      isOpen: boolean
      isEditing: boolean
      hasCandidates: boolean
    }

    await vm.open(
      {
        id: 'elec-with-cand',
        name: 'Eleição Conselho',
        election_date: '2026-11-20',
        digits_count: 2,
        is_uppercase: false,
        status: 'awaiting_release',
        candidates_count: 3,
      },
      true,
    )

    expect(vm.isOpen).toBe(true)
    expect(vm.isEditing).toBe(true)
    expect(vm.hasCandidates).toBe(true)
  })

  it('queries Supabase if hasCandidatesParam is omitted but election has candidates in DB', async () => {
    const isMock = vi.fn().mockResolvedValue({ count: 2, error: null })
    const eqMock = vi.fn().mockReturnValue({ is: isMock })
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock })
    fromMock.mockReturnValue({ select: selectMock })

    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as {
      open: (e: Record<string, unknown>) => Promise<void>
      hasCandidates: boolean
    }

    await vm.open({
      id: 'elec-db-check',
      name: 'Eleição Teste',
      election_date: '2026-11-20',
      digits_count: 2,
      is_uppercase: false,
      status: 'awaiting_release',
    })

    expect(fromMock).toHaveBeenCalledWith('candidates')
    expect(vm.hasCandidates).toBe(true)
  })

  it('submits update successfully and emits saved event', async () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as {
      open: (e: Record<string, unknown>) => Promise<void>
      onSubmit: () => Promise<void>
      isOpen: boolean
    }

    await vm.open({
      id: 'elec-edit',
      name: 'Eleição Modificada',
      election_date: '2026-11-20',
      digits_count: 2,
      is_uppercase: false,
      status: 'awaiting_release',
    })

    await vm.onSubmit()

    expect(updateElectionMock).toHaveBeenCalled()
    expect(toastSuccessMock).toHaveBeenCalled()
    expect(wrapper.emitted('saved')).toBeTruthy()
    expect(vm.isOpen).toBe(false)
  })

  it('handles isAnonymous field defaulting to true and allows false when monitored', async () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as {
      open: (e?: Record<string, unknown>) => Promise<void>
      isAnonymous: boolean
      votingMode: string
      name: string
      electionDate: string
      onSubmit: () => Promise<void>
    }

    await vm.open()
    expect(vm.isAnonymous).toBe(true)

    vm.name = 'Eleição Monitorada Aberta'
    vm.electionDate = '2026-11-20'
    vm.votingMode = 'monitored'
    vm.isAnonymous = false
    await vm.onSubmit()

    expect(createElectionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        is_anonymous: false,
        voting_mode: 'monitored',
      }),
    )
  })
})
