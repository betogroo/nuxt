import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { ref } from 'vue'
import { useDemandDetail } from '../../app/composables/useDemandDetail'
import type { DemandRow } from '../../app/composables/useDemands'

const mockDemand = ref<Partial<DemandRow> | null>(null)

mockNuxtImport('useDemands', () => () => ({
  fetchDemandById: vi.fn().mockImplementation(async () => mockDemand.value),
  fetchDemandResponsibles: vi.fn().mockResolvedValue([]),
  addResponsible: vi.fn().mockResolvedValue(true),
  removeResponsible: vi.fn().mockResolvedValue(true),
  updateDemand: vi.fn().mockResolvedValue(true),
}))

mockNuxtImport('useDemandProducts', () => () => ({
  fetchDemandProducts: vi.fn().mockResolvedValue([]),
  removeDemandProduct: vi.fn().mockResolvedValue(true),
  reorderDemandItems: vi.fn().mockResolvedValue(true),
}))

mockNuxtImport('useToast', () => () => ({
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
}))

mockNuxtImport('useAsyncData', () => (key: string, fn: () => Promise<unknown>) => {
  return {
    data: mockDemand,
    refresh: vi.fn().mockImplementation(fn),
  }
})

describe('useDemandDetail - isPlanningIncomplete', () => {
  beforeEach(() => {
    mockDemand.value = {
      id: 'demand-1',
      status: 'planning',
      process_number: '058.001/2026',
      internal_process_number: 'INT-01',
      id_pca: 'PCA-100',
      type: 'consumption',
      contract_number: '12345',
      siafem_number: '2026NE0001',
    }
  })

  it('returns false when all planning fields including siafem_number are present', () => {
    const { isPlanningIncomplete } = useDemandDetail('demand-1')
    expect(isPlanningIncomplete.value).toBe(false)
  })

  it('returns true when siafem_number is null', () => {
    mockDemand.value!.siafem_number = null
    const { isPlanningIncomplete } = useDemandDetail('demand-1')
    expect(isPlanningIncomplete.value).toBe(true)
  })

  it('returns true when siafem_number is empty string', () => {
    mockDemand.value!.siafem_number = ''
    const { isPlanningIncomplete } = useDemandDetail('demand-1')
    expect(isPlanningIncomplete.value).toBe(true)
  })

  it('returns true when any other planning field is missing', () => {
    mockDemand.value!.process_number = null
    const { isPlanningIncomplete } = useDemandDetail('demand-1')
    expect(isPlanningIncomplete.value).toBe(true)
  })

  it('returns false when demand status is not planning, even if fields are missing', () => {
    mockDemand.value!.status = 'quotation'
    mockDemand.value!.siafem_number = null
    const { isPlanningIncomplete } = useDemandDetail('demand-1')
    expect(isPlanningIncomplete.value).toBe(false)
  })
})
