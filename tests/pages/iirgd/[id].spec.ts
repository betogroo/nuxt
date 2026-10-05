import { describe, it, expect, vi } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import IirgdDetailPage from '~/pages/iirgd/[id].vue'

mockNuxtImport('useHead', () => vi.fn())
mockNuxtImport('definePageMeta', () => vi.fn())
mockNuxtImport('useRoute', () => () => ({ params: { id: '123' } }))
mockNuxtImport('useRouter', () => () => ({ push: vi.fn(), back: vi.fn() }))

mockNuxtImport('useIirgdDemands', () => {
  return () => ({
    fetchDemandById: vi.fn(),
    updateDemand: vi.fn(),
  })
})

mockNuxtImport('useAsyncData', () => {
  return () => ({
    data: {
      value: {
        id: '123',
        name: 'John Doe',
        rg: '1234',
        cpf: '000',
        station_code: '1062-9',
        status: 'Novo',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    },
    pending: { value: false },
    refresh: vi.fn(),
  })
})

interface IirgdDetailPageVm {
  isEditing: boolean
  editPayload: {
    status: string
    observation: string
  }
  openEditModal: () => void
}

describe('IIRGD Detail Page', () => {
  it('should render successfully', () => {
    const wrapper = shallowMount(IirgdDetailPage)
    expect(wrapper.exists()).toBe(true)
  })

  it('should open edit modal with prefilled data', async () => {
    const wrapper = shallowMount(IirgdDetailPage)
    const vm = wrapper.vm as unknown as IirgdDetailPageVm

    expect(vm.isEditing).toBe(false)

    vm.openEditModal()

    expect(vm.isEditing).toBe(true)
    expect(vm.editPayload.status).toBe('Novo')
  })
})
