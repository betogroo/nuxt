import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { ref } from 'vue'

mockNuxtImport('useSupabaseClient', () => () => ({}))
mockNuxtImport('useSupabaseUser', () => () => ref(null))
mockNuxtImport('useAsyncData', () => () => ({
  data: ref([{ id: '1', name: 'Primeira Via', is_active: true, is_pending: false }]),
  pending: ref(false),
  refresh: vi.fn(),
}))
mockNuxtImport('useHead', () => vi.fn())
mockNuxtImport('definePageMeta', () => vi.fn())

import IirgdDocumentTypesPage from '~/pages/admin/iirgd-document-types.vue'

describe('IIRGD Document Types Admin Page', () => {
  it('renders using only existing Ui wrappers (no unresolved components)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const wrapper = mount(IirgdDocumentTypesPage, {
      global: {
        stubs: {
          PageHeader: true,
          UiTabs: true,
          UiTab: true,
          UiIcon: true,
          UiBadge: true,
          UiCard: true,
          UiChip: true,
          UiSpacer: true,
          UiInput: true,
          UiButton: true,
          UiTable: true,
          UiSwitch: true,
          UiPagination: true,
          UiModal: true,
          UiAlert: true,
          UiForm: true,
          UiRadioGroup: true,
          UiRadio: true,
          UiAutocomplete: true,
        },
      },
    })

    expect(wrapper.exists()).toBe(true)
    const unresolved = warn.mock.calls.filter((c) => String(c[0]).includes('Failed to resolve'))
    expect(unresolved).toEqual([])
    warn.mockRestore()
  })
})
