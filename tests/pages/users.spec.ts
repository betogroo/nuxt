import { describe, it, expect, vi } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import UsersPage from '~/pages/users.vue'
import { ref } from 'vue'

mockNuxtImport('useProfile', () => {
  return () => ({
    profile: ref({ role: 'admin', id: '1', name: 'Admin' }),
  })
})

mockNuxtImport('useUsers', () => {
  return () => ({
    users: ref([
      { id: '1', name: 'Admin User', role: 'admin', is_active: true, created_at: '2023-01-01' },
      { id: '2', name: 'Normal User', role: 'user', is_active: true, created_at: '2023-01-02' },
    ]),
    isLoading: ref(false),
    fetchUsers: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    toggleUserStatus: vi.fn(),
  })
})

mockNuxtImport('useSupabaseUser', () => {
  return () => ref({ id: '1' })
})

mockNuxtImport('useLogger', () => {
  return () => ({
    logAction: vi.fn(),
  })
})

mockNuxtImport('useAsyncData', () => {
  return () => ({ data: ref([]), pending: ref(false), refresh: vi.fn() })
})
mockNuxtImport('useHead', () => vi.fn())
mockNuxtImport('definePageMeta', () => vi.fn())
mockNuxtImport('$fetch', () => vi.fn())

describe('Users Page', () => {
  it('should render successfully', () => {
    // Using shallowMount stubs all child components automatically,
    // avoiding the "Could not find defaults instance" Vuetify error
    const wrapper = shallowMount(UsersPage)
    expect(wrapper.exists()).toBe(true)
  })
})
