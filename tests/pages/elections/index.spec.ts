import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { ref } from 'vue'
import ElectionsIndexPage from '~/pages/elections/index.vue'

mockNuxtImport('useHead', () => vi.fn())
mockNuxtImport('definePageMeta', () => vi.fn())

const profileRef = ref<{ role: string; name: string } | null>({
  role: 'user-election',
  name: 'Eleitor Teste',
})

mockNuxtImport('useProfile', () => () => ({
  profile: profileRef,
}))

describe('Elections Index Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    profileRef.value = {
      role: 'user-election',
      name: 'Eleitor Teste',
    }
  })

  const createWrapper = () => {
    return shallowMount(ElectionsIndexPage, {
      global: {
        stubs: {
          PageHeader: true,
          UiContainer: true,
          UiRow: true,
          UiCol: true,
          UiCard: true,
          UiButton: true,
          UiIcon: true,
          UiAlert: true,
          UiChip: true,
        },
      },
    })
  }

  it('renders successfully', () => {
    const wrapper = createWrapper()
    expect(wrapper.exists()).toBe(true)
  })

  it('displays the current role label for user-election', () => {
    profileRef.value = { role: 'user-election', name: 'Eleitor Teste' }
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as { currentRoleLabel: string }
    expect(vm.currentRoleLabel).toBe('Usuário Eleições')
  })

  it('displays the current role label for manager-election and admin-election', () => {
    profileRef.value = { role: 'manager-election', name: 'Gestor Teste' }
    let wrapper = createWrapper()
    let vm = wrapper.vm as unknown as { currentRoleLabel: string }
    expect(vm.currentRoleLabel).toBe('Gestor Eleições')

    profileRef.value = { role: 'admin-election', name: 'Admin Eleição Teste' }
    wrapper = createWrapper()
    vm = wrapper.vm as unknown as { currentRoleLabel: string }
    expect(vm.currentRoleLabel).toBe('Administrador Eleições')
  })

  it('contains all 4 election modules', () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as { modules: Array<{ title: string }> }
    expect(vm.modules).toHaveLength(4)
    const titles = vm.modules.map((m) => m.title)
    expect(titles).toContain('Processos Eleitorais')
    expect(titles).toContain('Chapas & Candidaturas')
    expect(titles).toContain('Cabine de Votação')
    expect(titles).toContain('Apuração & Resultados')
  })
})
