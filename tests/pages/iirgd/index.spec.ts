import { describe, it, expect, vi } from 'vitest'
import { nextTick, ref } from 'vue'
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

const mockCountsData = ref<Record<string, number> | null>({
  inProgress: 5,
  consulted: 1,
  released: 2,
  issued: 3,
  errors: 0,
})

mockNuxtImport('useAsyncData', () => {
  return (key: string) => {
    if (key === 'iirgd-demand-counts') {
      return {
        data: mockCountsData,
        pending: ref(false),
        refresh: vi.fn(),
      }
    }
    return {
      data: ref({ labels: [] as string[], series: [] as number[] }),
      pending: ref(false),
      refresh: vi.fn(),
    }
  }
})

interface IirgdPageVm {
  isModalOpen: boolean
  statusChartSeries: number[]
  cards: Array<{ group: string; count: number }>
}

describe('IIRGD Page Dashboard', () => {
  it('should render successfully with counts', () => {
    mockCountsData.value = {
      inProgress: 5,
      consulted: 1,
      released: 2,
      issued: 3,
      errors: 0,
    }
    const wrapper = shallowMount(IirgdPage)
    expect(wrapper.exists()).toBe(true)
    const vm = wrapper.vm as unknown as IirgdPageVm
    expect(vm.statusChartSeries).toEqual([5, 1, 2, 3, 0])
    expect(vm.cards[0].count).toBe(5)
  })

  it('should handle null counts gracefully without throwing', () => {
    mockCountsData.value = null
    const wrapper = shallowMount(IirgdPage)
    expect(wrapper.exists()).toBe(true)
    const vm = wrapper.vm as unknown as IirgdPageVm
    expect(vm.statusChartSeries).toEqual([0, 0, 0, 0, 0])
    expect(vm.cards[0].count).toBe(0)
  })

  it('should have a modal open state', async () => {
    mockCountsData.value = {
      inProgress: 5,
      consulted: 1,
      released: 2,
      issued: 3,
      errors: 0,
    }
    const wrapper = shallowMount(IirgdPage)
    const vm = wrapper.vm as unknown as IirgdPageVm

    vm.isModalOpen = true
    await nextTick()

    expect(vm.isModalOpen).toBe(true)
  })
})
