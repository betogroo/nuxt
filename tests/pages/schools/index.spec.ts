import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { ref } from 'vue'
import SchoolsIndexPage from '~/pages/schools/index.vue'

mockNuxtImport('useHead', () => vi.fn())
mockNuxtImport('definePageMeta', () => vi.fn())

const profileRef = ref<{ role: string; name: string } | null>({
  role: 'school-manager',
  name: 'Gestor Escola',
})

mockNuxtImport('useProfile', () => () => ({
  profile: profileRef,
}))

mockNuxtImport('usePermissions', () => () => ({
  isAdmin: { value: profileRef.value?.role === 'admin' },
  canManageSchools: () =>
    profileRef.value?.role === 'admin' || profileRef.value?.role === 'school-manager',
  canDeleteSchools: () => profileRef.value?.role === 'admin',
}))

mockNuxtImport('useSchoolIncidents', () => () => ({
  incidents: ref([]),
  fetchIncidents: vi.fn().mockResolvedValue([]),
}))

describe('Schools Module Index Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    profileRef.value = {
      role: 'school-manager',
      name: 'Gestor Escola',
    }
  })

  const createWrapper = () => {
    return shallowMount(SchoolsIndexPage, {
      global: {
        stubs: {
          UiPageHeader: true,
          UiCard: true,
          UiRow: true,
          UiCol: true,
          UiAvatar: true,
          UiIcon: true,
          UiChip: true,
          UiDivider: true,
          UiAlert: true,
        },
      },
    })
  }

  it('renders page header and welcome card', () => {
    const wrapper = createWrapper()
    expect(wrapper.exists()).toBe(true)
    const vm = wrapper.vm as unknown as { currentRole: string; roleConfig: { label: string } }
    expect(vm.currentRole).toBe('school-manager')
    expect(vm.roleConfig.label).toBe('Gestor Escola')
  })

  it('renders correct description for admin role', () => {
    profileRef.value = { role: 'admin', name: 'Admin' }
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as { roleDescription: string }
    expect(vm.roleDescription).toContain('Administrador')
  })

  it('renders correct description for school-manager role', () => {
    profileRef.value = { role: 'school-manager', name: 'Gestor' }
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as { roleDescription: string }
    expect(vm.roleDescription).toContain('Gestor Escolar')
  })

  it('renders correct description for school-user role', () => {
    profileRef.value = { role: 'school-user', name: 'Usuário' }
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as { roleDescription: string }
    expect(vm.roleDescription).toContain('Usuário')
  })
})
