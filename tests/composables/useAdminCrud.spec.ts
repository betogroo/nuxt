import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { ref } from 'vue'
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
    const crud = useAdminCrud(mockConfig)

    expect(crud.isModalOpen.value).toBe(false)
    expect(crud.isEditing.value).toBe(false)
    expect(crud.form.value.name).toBe('')

    crud.openAddModal()
    expect(crud.isModalOpen.value).toBe(true)
    expect(crud.isEditing.value).toBe(false)

    crud.openEditModal({ id: '10', name: 'Test' })
    expect(crud.isModalOpen.value).toBe(true)
    expect(crud.isEditing.value).toBe(true)
    expect(crud.form.value.id).toBe('10')
    expect(crud.form.value.name).toBe('Test')

    crud.closeModal()
    expect(crud.isModalOpen.value).toBe(false)
  })

  it('should manage resolve pending modal state', () => {
    const crud = useAdminCrud(mockConfig)

    expect(crud.isResolveModalOpen.value).toBe(false)

    crud.openResolveModal({ id: '99', name: 'Pending Nature' })
    expect(crud.isResolveModalOpen.value).toBe(true)
    expect(crud.resolveMode.value).toBe('approve')
    expect(crud.targetPendingItem.value?.name).toBe('Pending Nature')
    expect(crud.resolveForm.value.newName).toBe('Pending Nature')

    crud.closeResolveModal()
    expect(crud.isResolveModalOpen.value).toBe(false)
    expect(crud.targetPendingItem.value).toBeNull()
  })

  it('should execute resolve in approve mode', async () => {
    const crud = useAdminCrud(mockConfig)
    crud.openResolveModal({ id: '99', name: 'Pending Nature' })

    crud.resolveForm.value.newName = 'Approved Nature'
    await crud.executeResolve()

    expect(mockConfig.approvePending).toHaveBeenCalledWith(
      expect.objectContaining({ id: '99' }),
      'Approved Nature',
    )
    expect(crud.isResolveModalOpen.value).toBe(false)
  })

  it('should execute resolve in merge mode', async () => {
    const crud = useAdminCrud(mockConfig)
    crud.openResolveModal({ id: '99', name: 'Pending Nature' })

    crud.resolveMode.value = 'merge'
    crud.resolveForm.value.finalTargetId = 'target-1'
    await crud.executeResolve()

    expect(mockConfig.mergePending).toHaveBeenCalledWith(
      expect.objectContaining({ id: '99' }),
      'target-1',
    )
    expect(crud.isResolveModalOpen.value).toBe(false)
  })
})
