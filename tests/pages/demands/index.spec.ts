import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import DemandsIndexPage from '~/pages/demands/index.vue'

// Mocking dependencies
vi.mock('~/composables/useDemands', () => ({
  useDemands: () => ({
    demands: ref([]),
    totalItems: ref(0),
    pending: ref(false),
    fetchDemands: vi.fn().mockResolvedValue({ data: [], count: 0 }),
    createDemand: vi.fn().mockResolvedValue({}),
    updateDemand: vi.fn().mockResolvedValue({}),
  }),
}))

vi.mock('~/composables/useAuth', () => ({
  useAuth: () => ({
    profile: ref({ id: 'user-123', role: 'admin' }),
  }),
}))

const mockRefresh = vi.fn()
vi.mock('#app', () => ({
  useAsyncData: () => ({
    data: ref([]),
    pending: ref(false),
    refresh: mockRefresh,
  }),
}))

describe('Demands Index Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it.skip('renders correctly and opens the modal', async () => {
    const wrapper = mount(DemandsIndexPage, {
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

    // Find "Nova Demanda" button
    const buttons = wrapper.findAllComponents({ name: 'UiButton' })
    const newButton = buttons.find((b) => b.text().includes('Nova Demanda'))
    expect(newButton).toBeDefined()

    // Trigger modal open
    await newButton?.trigger('click')

    // Check if modal becomes open
    const vm = wrapper.vm as unknown as { modal: { isOpen: { value: boolean } } }
    expect(vm.modal.isOpen.value).toBe(true)
  })
})
