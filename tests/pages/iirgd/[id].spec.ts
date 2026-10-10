import { describe, it, expect, vi } from 'vitest'
import { nextTick } from 'vue'
import { shallowMount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import IirgdDetailPage from '~/pages/iirgd/[id].vue'

mockNuxtImport('useHead', () => vi.fn())
mockNuxtImport('definePageMeta', () => vi.fn())
mockNuxtImport('useRoute', () => () => ({ params: { id: '123' } }))
mockNuxtImport('useRouter', () => () => ({ push: vi.fn(), back: vi.fn() }))
mockNuxtImport('useSupabaseClient', () => () => ({}))
mockNuxtImport('useSupabaseUser', () => () => ({ value: { id: 'test-user' } }))
mockNuxtImport('useProfile', () => () => ({ profile: { value: { role: 'admin' } } }))

mockNuxtImport('useIirgdDemands', () => {
  return () => ({
    fetchDemandById: vi.fn(),
    updateDemand: vi.fn(),
    fetchCitizenHistory: vi.fn(),
    fetchDemandStatusHistory: vi.fn(),
  })
})

mockNuxtImport('useIirgdSettings', () => {
  return () => ({
    fetchSettings: vi.fn(),
    updateSettings: vi.fn(),
    computePriority: vi.fn(() => 'none'),
  })
})

mockNuxtImport('useAsyncData', async () => {
  const { ref } = await import('vue')
  return () => ({
    data: ref({
      id: '123',
      citizen_id: 'c1',
      name: 'John Doe',
      rg: '1234',
      cpf: '000',
      station_code: '1062-9',
      status: 'Novo',
      observation: 'Observação geral de teste',
      iirgd_citizens: { name: 'John Doe', rg: '1234', cpf: null },
      iirgd_document_types: { name: '1ª Via' },
      profiles: { name: 'Admin' },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }),
    pending: ref(false),
    refresh: vi.fn(),
  })
})

interface IirgdDetailPageVm {
  isEditing: boolean
  status: string
  observation: string
  openEditModal: () => void
}

describe('IIRGD Detail Page', () => {
  it('should render successfully', () => {
    const wrapper = shallowMount(IirgdDetailPage)
    expect(wrapper.exists()).toBe(true)
  })

  it('should show general observation, document type and the author', () => {
    const wrapper = shallowMount(IirgdDetailPage, {
      global: { renderStubDefaultSlot: true },
    })
    const html = wrapper.html()
    expect(html).toContain('Observação geral de teste')
    expect(html).toContain('1ª Via')
    expect(html).toContain('Admin')
    expect(html).toContain('Acompanhe a situação do atendimento')
  })

  it('should open edit modal with prefilled data', async () => {
    const wrapper = shallowMount(IirgdDetailPage)
    const vm = wrapper.vm as unknown as IirgdDetailPageVm

    expect(vm.isEditing).toBe(false)

    vm.openEditModal()
    await nextTick()

    expect(vm.isEditing).toBe(true)
    expect(vm.status).toBe('Novo')
  })
})

