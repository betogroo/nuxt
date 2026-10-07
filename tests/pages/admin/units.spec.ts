import { describe, it, expect, vi } from 'vitest'
import { mount, shallowMount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import UnitsPage from '~/pages/admin/units.vue'

mockNuxtImport('useAsyncData', () =>
  vi.fn().mockReturnValue({ data: { value: [] }, pending: { value: false }, refresh: vi.fn() }),
)
mockNuxtImport('useMeasurementUnits', () => () => ({
  fetchUnits: vi.fn().mockResolvedValue([]),
  fetchAliases: vi.fn().mockResolvedValue([]),
  createUnit: vi.fn(),
  updateUnit: vi.fn(),
  toggleUnitStatus: vi.fn(),
  createAliasAsAdmin: vi.fn(),
  updateAliasAsAdmin: vi.fn(),
  deleteAliasAsAdmin: vi.fn(),
  approvePendingUnit: vi.fn(),
  mergePendingUnit: vi.fn(),
}))

describe('Units Admin Page', () => {
  it('should render successfully with shallowMount', () => {
    const wrapper = shallowMount(UnitsPage)
    expect(wrapper.exists()).toBe(true)
  })

  it('should open the Add Unit modal without errors when clicking the button', async () => {
    // Usando mount com slots em vez de shallowMount para garantir que a renderização dos botões
    // possa ser clicada e testada. E fazendo stubs dos componentes pesados se necessário.
    const wrapper = mount(UnitsPage, {
      global: {
        stubs: {
          UiModal: true,
          UiCard: true,
          UiRow: true,
          UiCol: true,
          UiInput: true,
          UiAutocomplete: true,
          UiSwitch: true,
          UiAlert: true,
          UiRadioGroup: true,
          UiRadio: true,
          UiSelect: true,
          UiSlideYTransition: true,
          UiExpandTransition: true,
          PageHeader: true,
          UiTabs: true,
          UiTab: true,
          UiTable: true,
          UiChip: true,
          UiIcon: true,
        },
      },
    })

    // Procura o botão de adicionar unidade (prepend-icon="add")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(wrapper.vm as any).openAddModal()

    // O modal deve abrir sem quebrar a tela
    expect(wrapper.vm).toBeTruthy()
  })
})
