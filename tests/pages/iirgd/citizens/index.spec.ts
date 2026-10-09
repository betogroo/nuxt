import { describe, it, expect, vi } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { ref } from 'vue'
import CitizensPage from '~/pages/iirgd/citizens/index.vue'

mockNuxtImport('useHead', () => vi.fn())
mockNuxtImport('definePageMeta', () => vi.fn())

mockNuxtImport('useIirgdCitizens', () => {
  return () => ({
    fetchCitizens: vi.fn(),
    createCitizen: vi.fn(),
  })
})

mockNuxtImport('useAsyncData', () => {
  return () => ({
    data: ref([{ id: 'cit-1', name: 'John Doe', rg: '123', created_at: new Date().toISOString() }]),
    pending: ref(false),
    refresh: vi.fn(),
  })
})

mockNuxtImport('usePagination', () => {
  return () => ({
    currentPage: ref(1),
    itemsPerPage: ref(10),
    totalItems: ref(1),
    totalPages: ref(1),
    resetPage: vi.fn(),
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

describe('Citizens Index Page', () => {
  it('should render successfully', () => {
    const wrapper = shallowMount(CitizensPage, {
      global: {
        stubs: {
          NuxtLink: true,
          UiPageHeader: true,
          UiCard: true,
          UiTable: true,
          UiIcon: true,
          UiChip: true,
          UiButton: true,
          UiModal: true,
          UiInput: true,
          UiCpfInput: true,
          UiRgInput: true,
          UiPagination: true,
        },
      },
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('should render standardized title in header', () => {
    const wrapper = shallowMount(CitizensPage, {
      global: {
        stubs: {
          NuxtLink: true,
          UiPageHeader: true,
          UiCard: {
            template: '<div><slot name="header" /><slot /></div>',
          },
          UiTable: true,
          UiIcon: true,
          UiChip: true,
          UiButton: true,
          UiModal: true,
          UiInput: true,
          UiCpfInput: true,
          UiRgInput: true,
          UiPagination: true,
        },
      },
    })

    expect(wrapper.html()).toContain('Cidadãos Cadastrados')
  })
})
