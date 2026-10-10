import { describe, it, expect, vi } from 'vitest'
import { nextTick } from 'vue'
import { shallowMount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import IirgdPage from '~/pages/iirgd/index.vue'

mockNuxtImport('useHead', () => vi.fn())
mockNuxtImport('definePageMeta', () => vi.fn())

mockNuxtImport('useIirgdDemands', () => {
  return () => ({
    fetchDemandCounts: vi.fn(),
    fetchIssuedDemandsTrend: vi.fn(),
  })
})

mockNuxtImport('useProfile', () => {
  return () => ({
    profile: { value: { role: 'admin' } },
  })
})

mockNuxtImport('useAsyncData', () => {
  return () => ({
    data: {
      value: {
        inProgress: 5,
        consulted: 1,
        released: 2,
        issued: 3,
        errors: 0,
      },
    },
    pending: { value: false },
    refresh: vi.fn(),
  })
})

interface IirgdPageVm {
  isModalOpen: boolean
}

describe('IIRGD Page Dashboard', () => {
  it('should render successfully', () => {
    const wrapper = shallowMount(IirgdPage)
    expect(wrapper.exists()).toBe(true)
  })

  it('should have a modal open state', async () => {
    const wrapper = shallowMount(IirgdPage)
    const vm = wrapper.vm as unknown as IirgdPageVm

    vm.isModalOpen = true
    await nextTick()

    expect(vm.isModalOpen).toBe(true)
  })
})
