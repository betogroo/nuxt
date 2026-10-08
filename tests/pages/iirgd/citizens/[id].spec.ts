import { describe, it, expect, vi } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import CitizenDetailPage from '~/pages/iirgd/citizens/[id].vue'

mockNuxtImport('useHead', () => vi.fn())
mockNuxtImport('definePageMeta', () => vi.fn())
mockNuxtImport('useRoute', () => () => ({ params: { id: 'cit-123' } }))
mockNuxtImport('useRouter', () => () => ({ push: vi.fn() }))

mockNuxtImport('useIirgdCitizens', () => {
  return () => ({
    fetchCitizenById: vi.fn(),
    updateCitizen: vi.fn(),
  })
})

mockNuxtImport('useAsyncData', () => {
  return () => ({
    data: {
      value: {
        id: 'cit-123',
        name: 'John Doe',
        rg: '1234',
        cpf: '000',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        iirgd_demands: [],
      },
    },
    pending: { value: false },
    refresh: vi.fn(),
  })
})

mockNuxtImport('useZodForm', () => {
  return () => ({
    errors: {},
    defineField: (_field: string) => [ref(''), {}],
    resetForm: vi.fn(),
    handleSubmit: (fn: unknown) => fn,
  })
})

describe('Citizen Detail Page', () => {
  it('should render successfully', () => {
    const wrapper = shallowMount(CitizenDetailPage, {
      global: {
        stubs: {
          UiButton: true,
          UiIcon: true,
          UiCard: true,
          UiTable: true,
          UiRow: true,
          UiCol: true,
          UiDivider: true,
          UiChip: true,
          UiAlert: true,
          UiModal: true,
          UiInput: true,
          UiCpfInput: true,
          UiRgInput: true,
        },
      },
    })
    expect(wrapper.exists()).toBe(true)
  })
})
