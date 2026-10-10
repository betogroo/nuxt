import { describe, it, expect, vi } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { ref } from 'vue'

const profileMock = ref<{ role: string }>({ role: 'admin' })

mockNuxtImport('useProfile', () => () => ({ profile: profileMock }))
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
        rg: '12345678X',
        cpf: '12345678901',
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

import CitizenDetailPage from '~/pages/iirgd/citizens/[id].vue'

const commonStubs = {
  UiButton: true,
  UiIcon: true,
  UiCard: true,
  UiTable: true,
  UiRow: true,
  UiCol: true,
  UiDivider: true,
  UiChip: true,
  UiAlert: true,
  UiModal: { template: '<div><slot /></div>' },
  UiInput: true,
  UiCpfInput: {
    name: 'UiCpfInput',
    props: ['disabled'],
    template: '<div class="cpf-input" :data-disabled="disabled" />',
  },
  UiRgInput: {
    name: 'UiRgInput',
    props: ['disabled'],
    template: '<div class="rg-input" :data-disabled="disabled" />',
  },
}

describe('Citizen Detail Page', () => {
  it('should allow admin to edit all citizen fields including RG', () => {
    profileMock.value = { role: 'admin' }
    const wrapper = shallowMount(CitizenDetailPage, {
      global: {
        stubs: commonStubs,
      },
    })
    expect(wrapper.exists()).toBe(true)
    const vm = wrapper.vm as unknown as { isAdmin: boolean }
    expect(vm.isAdmin).toBe(true)

    const rgInput = wrapper.findComponent({ name: 'UiRgInput' })
    expect(rgInput.exists()).toBe(true)
    expect(rgInput.props('disabled')).toBe(false)

    const cpfInput = wrapper.findComponent({ name: 'UiCpfInput' })
    expect(cpfInput.exists()).toBe(true)
    expect(cpfInput.props('disabled')).toBeFalsy()
  })

  it('should restrict RG editing for iirgd_manager and iirgd_user', () => {
    profileMock.value = { role: 'iirgd_manager' }
    const wrapper = shallowMount(CitizenDetailPage, {
      global: {
        stubs: commonStubs,
      },
    })
    const vm = wrapper.vm as unknown as { isAdmin: boolean }
    expect(vm.isAdmin).toBe(false)

    const rgInput = wrapper.findComponent({ name: 'UiRgInput' })
    expect(rgInput.exists()).toBe(true)
    expect(rgInput.props('disabled')).toBe(true)

    const cpfInput = wrapper.findComponent({ name: 'UiCpfInput' })
    expect(cpfInput.exists()).toBe(true)
    expect(cpfInput.props('disabled')).toBeFalsy()
  })
})
