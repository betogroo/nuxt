import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { ref, defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import { useAdminCrud } from '~/composables/useAdminCrud'

mockNuxtImport('useAsyncData', () => {
  return (_key: string, fn: () => Promise<unknown>) => {
    const data = ref<unknown>(null)
    const pending = ref(false)
    const refresh = vi.fn(async () => {
      data.value = await fn()
    })
    return { data, pending, refresh }
  }
})

mockNuxtImport('useToast', () => {
  return () => ({
    error: vi.fn(),
    confirm: vi.fn().mockResolvedValue(true),
  })
})

function withSetup<T>(composable: () => T) {
  let result: T
  const app = mount(
    defineComponent({
      setup() {
        result = composable()
        return () => {}
      },
    }),
  )
  // @ts-expect-error Mock component needs this
  return [result, app]
}

describe('useAdminCrud Composable', () => {
  const mockConfig = {
    entityName: 'natureza de despesa',
    asyncDataKey: 'test-crud',
    fetchActive: vi.fn().mockResolvedValue({ data: [{ id: '1', name: 'Item 1' }], count: 1 }),
    fetchPending: vi.fn().mockResolvedValue([{ id: '2', name: 'Pending Item', is_pending: true }]),
    fetchAllActive: vi.fn().mockResolvedValue([{ id: '1', name: 'Item 1' }]),
    createItem: vi.fn().mockResolvedValue({}),
    updateItem: vi.fn().mockResolvedValue({}),
    deleteItem: vi.fn().mockResolvedValue({}),
    toggleStatus: vi.fn().mockResolvedValue({}),
    approvePending: vi.fn().mockResolvedValue({}),
    mergePending: vi.fn().mockResolvedValue({}),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize modal state correctly', () => {
    const [crud] = withSetup(() => useAdminCrud(mockConfig))

    expect(crud.isModalOpen.value).toBe(false)
    expect(crud.isEditing.value).toBe(false)

    crud.openAddModal()
    expect(crud.isModalOpen.value).toBe(true)
    expect(crud.isEditing.value).toBe(false)

    crud.openEditModal({ id: '10', name: 'Test' })
    expect(crud.isModalOpen.value).toBe(true)
    expect(crud.isEditing.value).toBe(true)

    crud.closeModal()
    expect(crud.isModalOpen.value).toBe(false)
  })

  it('should manage resolve pending modal state', () => {
    const [crud] = withSetup(() => useAdminCrud(mockConfig))

    expect(crud.isResolveModalOpen.value).toBe(false)

    crud.openResolveModal({ id: '99', name: 'Pending Nature' })
    expect(crud.isResolveModalOpen.value).toBe(true)
    expect(crud.targetPendingItem.value?.name).toBe('Pending Nature')
    expect(crud.rawResolveValues.newName).toBe('Pending Nature')

    crud.closeResolveModal()
    expect(crud.isResolveModalOpen.value).toBe(false)
    expect(crud.targetPendingItem.value).toBeNull()
  })
})
