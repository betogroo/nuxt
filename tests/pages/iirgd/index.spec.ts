import { describe, it, expect, vi } from 'vitest'
import { mount, shallowMount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import IirgdPage from '~/pages/iirgd/index.vue'

mockNuxtImport('useHead', () => vi.fn())
mockNuxtImport('definePageMeta', () => vi.fn())

mockNuxtImport('useIirgdDemands', () => {
  return () => ({
    fetchDemands: vi.fn(),
    createDemand: vi.fn(),
  })
})

mockNuxtImport('useAsyncData', () => {
  return () => ({ data: { value: [] }, pending: { value: false }, refresh: vi.fn() })
})

interface IirgdPageVm {
  modal: {
    isOpen: boolean
    payload: {
      station_code: string
      rg: string
      cpf: string
      name: string
      observation: string
      status: string
    }
  }
  openAddModal: () => void
}

describe('IIRGD Page', () => {
  it('should render successfully', () => {
    const wrapper = shallowMount(IirgdPage)
    expect(wrapper.exists()).toBe(true)
  })

  it('should initialize and reset modal with status "Novo"', () => {
    const wrapper = shallowMount(IirgdPage)
    const vm = wrapper.vm as unknown as IirgdPageVm

    expect(vm.modal.payload.status).toBe('new')

    vm.openAddModal()
    expect(vm.modal.payload.status).toBe('new')
    expect(vm.modal.isOpen).toBe(true)
  })

  it('should not contain a status selector in the modal form', () => {
    const wrapper = mount(IirgdPage, {
      global: {
        stubs: {
          PageHeader: true,
          UiCard: true,
          UiTable: true,
          UiButton: true,
          UiInput: true,
          UiSelect: true,
          UiModal: true,
          UiAlert: true,
          'v-row': true,
          'v-col': true,
          'v-spacer': true,
          'v-textarea': true,
          'v-chip': true,
          'v-icon': true,
        },
      },
    })

    const selects = wrapper.findAllComponents({ name: 'UiSelect' })
    // Only station_code should be rendered as a select
    const statusSelect = selects.find((sel) => sel.attributes('label') === 'Status *')
    expect(statusSelect).toBeUndefined()
  })
})
