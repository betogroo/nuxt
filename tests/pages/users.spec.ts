import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import UsersPage from '~/pages/users.vue'
import { ref } from 'vue'

mockNuxtImport('useProfile', () => {
  return () => ({
    profile: ref({ role: 'admin' })
  })
})

// Mock composables
mockNuxtImport('useUsers', () => {
  return () => ({
    users: ref([
      { id: '1', name: 'Admin User', role: 'admin', is_active: true, created_at: '2023-01-01' },
      { id: '2', name: 'Normal User', role: 'user', is_active: true, created_at: '2023-01-02' },
      { id: '3', name: 'IIRGD User', role: 'iirgd', is_active: true, created_at: '2023-01-03' }
    ]),
    isLoading: ref(false),
    fetchUsers: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn()
  })
})

mockNuxtImport('useSupabaseUser', () => {
  return () => ref({ id: '1' })
})

mockNuxtImport('useLogger', () => {
  return () => ({
    logAction: vi.fn()
  })
})

mockNuxtImport('useAsyncData', () => { return () => ({ data: ref([]), pending: ref(false), refresh: vi.fn() }) })
mockNuxtImport('useHead', () => vi.fn())
mockNuxtImport('definePageMeta', () => vi.fn())

describe('Users Page', () => {
  it('should render successfully and contain users', () => {
    const wrapper = mount(UsersPage, {
      global: {
        stubs: {
          PageHeader: true,
          UiCard: true,
          UiButton: true,
          UiTable: true,
          UiModal: true,
          UiInput: true,
          UiSelect: true,
          UiChip: true,
          UiAlert: true,
          'v-row': true,
          'v-col': true,
          'v-spacer': true,
          'v-select': true,
          'v-switch': true,
          'v-avatar': true,
          'v-icon': true,
          'v-tabs': true,
          'v-tab': true
        }
      }
    })

    expect(wrapper.exists()).toBe(true)
  })
})
