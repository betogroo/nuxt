import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import ElectionVoterCardModal from '~/components/elections/ElectionVoterCardModal.vue'

const toastSuccessMock = vi.fn()
const toastErrorMock = vi.fn()
mockNuxtImport('useToast', () => () => ({
  success: toastSuccessMock,
  error: toastErrorMock,
}))

const printVoterCardsMock = vi.fn().mockResolvedValue(undefined)
const exportVoterCardsToPdfMock = vi.fn().mockResolvedValue(undefined)

mockNuxtImport('useElectionVoterCards', () => () => ({
  printVoterCards: printVoterCardsMock,
  exportVoterCardsToPdf: exportVoterCardsToPdfMock,
}))

describe('ElectionVoterCardModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockVoter = {
    id: 'v-1',
    name: 'Ana Carolina',
    voter_registration_number: '554433',
    is_active: true,
    created_at: '2026-10-24T10:00:00Z',
    updated_at: '2026-10-24T10:00:00Z',
  }

  const createWrapper = () => {
    return shallowMount(ElectionVoterCardModal, {
      global: {
        stubs: {
          UiModal: true,
          UiInput: true,
          UiButton: true,
          UiIcon: true,
          UiAlert: true,
          UiChip: true,
          UiSpacer: true,
          UiRow: true,
          UiCol: true,
          ElectionVoterCard: true,
        },
      },
    })
  }

  it('opens in single mode when one voter passed', () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as {
      open: (v: typeof mockVoter) => void
      isOpen: boolean
      isBatch: boolean
      totalCount: number
      issueDate: string
    }

    vm.open(mockVoter)

    expect(vm.isOpen).toBe(true)
    expect(vm.isBatch).toBe(false)
    expect(vm.totalCount).toBe(1)
    expect(vm.issueDate).toBeDefined()
  })

  it('opens in batch mode when multiple voters passed', () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as {
      open: (v: (typeof mockVoter)[]) => void
      isOpen: boolean
      isBatch: boolean
      totalCount: number
    }

    vm.open([mockVoter, { ...mockVoter, id: 'v-2', voter_registration_number: '667788' }])

    expect(vm.isOpen).toBe(true)
    expect(vm.isBatch).toBe(true)
    expect(vm.totalCount).toBe(2)
  })

  it('triggers printVoterCards with configured issue date', async () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as {
      open: (v: typeof mockVoter) => void
      issueDate: string
      handlePrint: () => Promise<void>
    }

    vm.open(mockVoter)
    vm.issueDate = '2026-11-01'
    await vm.handlePrint()

    expect(printVoterCardsMock).toHaveBeenCalledWith({
      issueDate: '2026-11-01',
      voters: [mockVoter],
    })
    expect(toastSuccessMock).toHaveBeenCalled()
  })

  it('triggers exportVoterCardsToPdf with configured issue date', async () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as {
      open: (v: typeof mockVoter) => void
      issueDate: string
      handleDownloadPdf: () => Promise<void>
    }

    vm.open(mockVoter)
    vm.issueDate = '2026-11-01'
    await vm.handleDownloadPdf()

    expect(exportVoterCardsToPdfMock).toHaveBeenCalledWith({
      issueDate: '2026-11-01',
      voters: [mockVoter],
    })
    expect(toastSuccessMock).toHaveBeenCalled()
  })
})
