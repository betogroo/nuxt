import { shallowMount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { ref } from 'vue'
import DemandsIndexPage from '~/pages/demands/index.vue'

mockNuxtImport('useHead', () => vi.fn())
mockNuxtImport('definePageMeta', () => vi.fn())
mockNuxtImport('useRoute', () => () => ({ query: {} }))
mockNuxtImport('useAsyncData', () => () => ({
  data: ref([]),
  pending: ref(false),
  refresh: vi.fn(),
}))

const toastSuccessMock = vi.fn()
const toastErrorMock = vi.fn()
mockNuxtImport('useToast', () => () => ({
  success: toastSuccessMock,
  error: toastErrorMock,
  info: vi.fn(),
  warning: vi.fn(),
}))

const deleteDemandMock = vi.fn().mockResolvedValue({})
const fetchDemandsMock = vi.fn().mockResolvedValue({
  data: [
    {
      id: 'dem-1',
      name: 'Demanda Material de Escritório',
      type: 'consumption',
      status: 'planning',
      user_id: 'user-123',
      process_number: '058.001/2026',
      internal_process_number: 'INT-001',
    },
  ],
  count: 1,
})

mockNuxtImport('useDemands', () => () => ({
  fetchDemands: fetchDemandsMock,
  createDemand: vi.fn().mockResolvedValue({}),
  updateDemand: vi.fn().mockResolvedValue({}),
  deleteDemand: deleteDemandMock,
  restoreDemand: vi.fn().mockResolvedValue({}),
}))

const canEditDemandMock = vi.fn().mockReturnValue(true)
const canDeleteDemandMock = vi.fn().mockReturnValue(true)
mockNuxtImport('usePermissions', () => () => ({
  canEditDemand: canEditDemandMock,
  canDeleteDemand: canDeleteDemandMock,
}))

mockNuxtImport('useProfile', () => () => ({
  profile: ref({ id: 'user-123', role: 'admin' }),
}))

describe('Demands Index Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders successfully with shallowMount', () => {
    const wrapper = shallowMount(DemandsIndexPage, {
      global: {
        stubs: {
          PageHeader: true,
          UiCard: true,
          UiIcon: true,
          UiChip: true,
          UiSpacer: true,
          UiInput: true,
          UiSelect: true,
          UiDivider: true,
          UiActionButton: true,
          UiButton: true,
          UiTable: true,
          UiPagination: true,
          UiModal: true,
          UiAlert: true,
          NuxtLink: true,
        },
      },
    })

    expect(wrapper.exists()).toBe(true)
  })

  it('opens delete modal and sets demandToDelete correctly', () => {
    const wrapper = shallowMount(DemandsIndexPage, {
      global: {
        stubs: {
          PageHeader: true,
          UiCard: true,
          UiIcon: true,
          UiChip: true,
          UiSpacer: true,
          UiInput: true,
          UiSelect: true,
          UiDivider: true,
          UiActionButton: true,
          UiButton: true,
          UiTable: true,
          UiPagination: true,
          UiModal: true,
          UiAlert: true,
          NuxtLink: true,
        },
      },
    })

    const vm = wrapper.vm as unknown as {
      openDeleteModal: (demand: Record<string, unknown>) => void
      closeDeleteModal: () => void
      isDeleteModalOpen: boolean
      demandToDelete: Record<string, unknown> | null
    }

    const testDemand = {
      id: 'dem-1',
      name: 'Demanda de Teste',
      process_number: '123/2026',
    }

    vm.openDeleteModal(testDemand)
    expect(vm.isDeleteModalOpen).toBe(true)
    expect(vm.demandToDelete).toEqual(testDemand)

    vm.closeDeleteModal()
    expect(vm.isDeleteModalOpen).toBe(false)
    expect(vm.demandToDelete).toBeNull()
  })

  it('handleConfirmDelete calls deleteDemand and shows success toast', async () => {
    const wrapper = shallowMount(DemandsIndexPage, {
      global: {
        stubs: {
          PageHeader: true,
          UiCard: true,
          UiIcon: true,
          UiChip: true,
          UiSpacer: true,
          UiInput: true,
          UiSelect: true,
          UiDivider: true,
          UiActionButton: true,
          UiButton: true,
          UiTable: true,
          UiPagination: true,
          UiModal: true,
          UiAlert: true,
          NuxtLink: true,
        },
      },
    })

    const vm = wrapper.vm as unknown as {
      openDeleteModal: (demand: Record<string, unknown>) => void
      handleConfirmDelete: () => Promise<void>
      isDeleteModalOpen: boolean
      isDeleting: boolean
      demandToDelete: Record<string, unknown> | null
    }

    const testDemand = {
      id: 'dem-99',
      name: 'Demanda para Excluir',
    }

    vm.openDeleteModal(testDemand)
    await vm.handleConfirmDelete()

    expect(deleteDemandMock).toHaveBeenCalledWith('dem-99')
    expect(toastSuccessMock).toHaveBeenCalledWith(
      expect.stringContaining('Demanda "Demanda para Excluir" excluída com sucesso!'),
    )
    expect(vm.isDeleteModalOpen).toBe(false)
    expect(vm.demandToDelete).toBeNull()
  })

  it('checks canDelete correctly via usePermissions', () => {
    const wrapper = shallowMount(DemandsIndexPage, {
      global: {
        stubs: {
          PageHeader: true,
          UiCard: true,
          UiIcon: true,
          UiChip: true,
          UiSpacer: true,
          UiInput: true,
          UiSelect: true,
          UiDivider: true,
          UiActionButton: true,
          UiButton: true,
          UiTable: true,
          UiPagination: true,
          UiModal: true,
          UiAlert: true,
          NuxtLink: true,
        },
      },
    })

    const vm = wrapper.vm as unknown as {
      canDelete: (demand: Record<string, unknown>) => boolean
    }

    const testDemand = { id: 'dem-1', user_id: 'user-123' }
    expect(vm.canDelete(testDemand)).toBe(true)
    expect(canDeleteDemandMock).toHaveBeenCalledWith(testDemand)
  })
})
