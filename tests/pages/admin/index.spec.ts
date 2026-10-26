import { describe, it, expect, vi } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { ref } from 'vue'
import AdminIndexPage from '~/pages/admin/index.vue'

mockNuxtImport('useHead', () => vi.fn())
mockNuxtImport('definePageMeta', () => vi.fn())

const mockMetrics = {
  usersCount: 15,
  productsCount: 40,
  demandsCount: 22,
  iirgdDemandsCount: 65,
  suppliersCount: 8,
  recentLogs: [
    {
      id: 'log-1',
      action: 'CREATE_DEMAND',
      description: 'Demanda teste criada',
      created_at: '2026-10-11T12:00:00Z',
      profiles: { name: 'Admin Teste' },
    },
  ],
  pendingReturnDemands: [],
}

mockNuxtImport('useAdminDashboard', () => () => ({
  fetchDashboardMetrics: vi.fn().mockResolvedValue(mockMetrics),
  getLogColor: vi.fn().mockReturnValue('primary'),
}))

mockNuxtImport('useAsyncData', () => () => ({
  data: ref(mockMetrics),
  pending: ref(false),
  refresh: vi.fn().mockResolvedValue(mockMetrics),
}))

mockNuxtImport('usePendingTasks', () => () => ({
  pendingUnitsCount: ref(2),
  pendingExpenseNaturesCount: ref(1),
  pendingProductClassesCount: ref(0),
  pendingIirgdDocumentTypesCount: ref(3),
  pendingReturnsCount: ref(0),
  totalPending: ref(6),
  refreshAll: vi.fn().mockResolvedValue(undefined),
}))

describe('Admin Index Page', () => {
  const createWrapper = () =>
    shallowMount(AdminIndexPage, {
      global: {
        stubs: {
          PageHeader: true,
          UiRow: true,
          UiCol: true,
          UiCard: true,
          UiButton: true,
          UiIcon: true,
          UiAvatar: true,
          UiAlert: true,
          UiChip: true,
          UiInput: true,
          UiTimeline: true,
          UiTimelineItem: true,
          UiExpandTransition: true,
          UiSkeletonLoader: true,
          UiProgressCircular: true,
        },
      },
    })

  it('should render successfully', () => {
    const wrapper = createWrapper()
    expect(wrapper.exists()).toBe(true)
  })

  it('should compute metric cards including IIRGD and suppliers', () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as {
      metricCards: Array<{ id: string; label: string; value: number }>
    }

    expect(vm.metricCards).toHaveLength(6)
    const labels = vm.metricCards.map((c) => c.label)
    expect(labels).toContain('Usuários')
    expect(labels).toContain('Demandas Gerais')
    expect(labels).toContain('Demandas IIRGD')
    expect(labels).toContain('Produtos Ativos')
    expect(labels).toContain('Fornecedores')
    expect(labels).toContain('Tarefas Pendentes')
  })

  it('should filter modules dynamically based on search query', async () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as {
      searchQuery: string
      filteredModules: Array<{ id: string; title: string }>
    }

    expect(vm.filteredModules.length).toBeGreaterThan(5)

    vm.searchQuery = 'SLA'
    expect(vm.filteredModules).toHaveLength(1)
    expect(vm.filteredModules[0].id).toBe('iirgd-settings')

    vm.searchQuery = 'backup'
    expect(vm.filteredModules).toHaveLength(1)
    expect(vm.filteredModules[0].id).toBe('backup')
  })

  it('should filter modules by category filter chip', async () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as {
      activeCategoryFilter: 'all' | 'catalog' | 'iirgd' | 'governance'
      filteredModules: Array<{ id: string; category: string }>
    }

    vm.activeCategoryFilter = 'iirgd'
    expect(vm.filteredModules.every((m) => m.category === 'iirgd')).toBe(true)

    vm.activeCategoryFilter = 'governance'
    expect(vm.filteredModules.every((m) => m.category === 'governance')).toBe(true)
  })

  it('should execute handleRefresh without error', async () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as { handleRefresh: () => Promise<void> }

    await expect(vm.handleRefresh()).resolves.toBeUndefined()
  })
})
