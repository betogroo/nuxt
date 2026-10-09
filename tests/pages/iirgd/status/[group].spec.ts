/* eslint-disable */
import { describe, it, expect, vi } from 'vitest'
import { shallowMount, flushPromises } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { ref } from 'vue'
import GroupPage from '~/pages/iirgd/status/[group].vue'

mockNuxtImport('useHead', () => vi.fn())
mockNuxtImport('definePageMeta', () => vi.fn())
mockNuxtImport('useRoute', () => () => ({ params: { group: 'consulted' } }))
mockNuxtImport('useRouter', () => () => ({ push: vi.fn() }))

mockNuxtImport('useIirgdDemands', () => {
  return () => ({
    fetchDemands: vi.fn(),
    updateDemandStatus: vi.fn(),
  })
})

mockNuxtImport('useAsyncData', () => {
  return () => ({
    data: ref({
      data: [
        { id: '1', iirgd_citizens: { rg: '11.111.111-1' } },
        { id: '2', iirgd_citizens: { rg: '22.222.222-2' } },
        { id: '3', iirgd_citizens: { rg: '33.333.333-3' } },
        { id: '4', iirgd_citizens: { rg: '44.444.444-4' } },
        { id: '5', iirgd_citizens: { rg: '55.555.555-5' } },
        { id: '6', iirgd_citizens: { rg: '66.666.666-6' } },
        { id: '7', iirgd_citizens: { rg: '77.777.777-7' } },
        { id: '8', iirgd_citizens: { rg: '88.888.888-8' } },
        { id: '9', iirgd_citizens: { rg: '99.999.999-9' } },
      ],
    }),
    pending: ref(false),
    refresh: vi.fn(),
  })
})

mockNuxtImport('usePagination', () => {
  return () => ({
    currentPage: ref(1),
    itemsPerPage: ref(10),
    totalItems: ref(9),
    totalPages: ref(1),
    resetPage: vi.fn(),
  })
})

mockNuxtImport('useZodForm', () => {
  return () => ({
    errors: {},
    defineField: (field: string) => [ref(''), {}],
    resetForm: vi.fn(),
    handleSubmit: (fn: unknown) => fn,
  })
})

describe('IIRGD Group Status Page', () => {
  it('should render RGs chunked in groups of 8 when group is consulted', async () => {
    const wrapper = shallowMount(GroupPage, {
      global: {
        stubs: {
          NuxtLink: true,
          UiCard: {
            template: '<div><slot name="header" /><slot /></div>',
          },
          UiTabs: true,
          UiTab: true,
          UiInput: true,
          UiTable: true,
          UiPagination: true,
          UiModal: true,
          UiSelect: true,
          UiButton: true,
          UiIcon: true,
          UiList: true,
          UiListItem: true,
        },
      },
    })

    await flushPromises()

    console.log(wrapper.html())
  })
})
