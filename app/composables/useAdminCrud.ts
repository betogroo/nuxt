import { ref } from 'vue'
import { usePagination } from '~/composables/usePagination'
import { useToast } from '~/composables/useToast'
import { getErrorMessage } from '~/utils/errorHandler'

export interface AdminCrudItem {
  id: string
  name: string
  is_active?: boolean
  is_pending?: boolean
}

export interface AdminCrudConfig<T extends AdminCrudItem> {
  entityName: string
  asyncDataKey: string
  fetchActive: (
    page: number,
    limit: number,
    search?: string,
  ) => Promise<{ data: T[]; count: number }>
  fetchPending: () => Promise<T[]>
  fetchAllActive?: () => Promise<T[]>
  createItem: (payload: {
    id: string
    name: string
    is_active: boolean
    is_pending: boolean
  }) => Promise<unknown>
  updateItem: (id: string, payload: { name: string; is_active: boolean }) => Promise<unknown>
  deleteItem: (id: string) => Promise<unknown>
  toggleStatus: (item: T) => Promise<unknown>
  approvePending: (item: T, newName: string) => Promise<unknown>
  mergePending: (item: T, targetId: string) => Promise<unknown>
}

export function useAdminCrud<T extends AdminCrudItem>(config: AdminCrudConfig<T>) {
  const toast = useToast()
  const activeTab = ref<'active' | 'pending'>('active')

  // Pagination & Search
  const pagination = usePagination()
  const searchQuery = ref('')

  const {
    data: items,
    pending: isLoadingActive,
    refresh: refreshActive,
  } = useAsyncData(
    `${config.asyncDataKey}-active`,
    async () => {
      const result = await config.fetchActive(
        pagination.currentPage.value,
        pagination.itemsPerPage.value,
        searchQuery.value,
      )
      pagination.totalItems.value = result.count
      return result.data
    },
    { watch: [pagination.currentPage, pagination.itemsPerPage] },
  )

  const { data: pendingItems, refresh: refreshPending } = useAsyncData(
    `${config.asyncDataKey}-pending`,
    config.fetchPending,
  )

  const { data: allActiveItems, refresh: refreshAllActive } = useAsyncData(
    `${config.asyncDataKey}-all-active`,
    config.fetchAllActive ?? (async () => []),
  )

  let searchTimeout: ReturnType<typeof setTimeout> | null = null
  const handleSearch = () => {
    if (searchTimeout) clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => {
      pagination.resetPage()
      refreshActive()
    }, 500)
  }

  // Add / Edit Modal State
  const isModalOpen = ref(false)
  const isEditing = ref(false)
  const isSaving = ref(false)
  const saveError = ref('')

  const form = ref<{
    id: string
    name: string
    is_active: boolean
  }>({
    id: '',
    name: '',
    is_active: true,
  })

  const openAddModal = () => {
    form.value = {
      id: '',
      name: '',
      is_active: true,
    }
    isEditing.value = false
    saveError.value = ''
    isModalOpen.value = true
  }

  const openEditModal = (item: T) => {
    form.value = {
      id: item.id,
      name: item.name,
      is_active: item.is_active ?? true,
    }
    isEditing.value = true
    saveError.value = ''
    isModalOpen.value = true
  }

  const closeModal = () => {
    isModalOpen.value = false
  }

  const saveItem = async () => {
    if (!form.value.name) {
      saveError.value = `O Nome de ${config.entityName} é obrigatório.`
      return
    }
    if (!form.value.id && !isEditing.value) {
      saveError.value = 'O Código (ID) é obrigatório.'
      return
    }

    isSaving.value = true
    saveError.value = ''

    try {
      const payload = {
        name: form.value.name,
        id: form.value.id,
        is_active: form.value.is_active,
        is_pending: false,
      }

      if (isEditing.value) {
        await config.updateItem(form.value.id, {
          name: form.value.name,
          is_active: form.value.is_active,
        })
      } else {
        await config.createItem(payload)
      }

      await refreshActive()
      if (config.fetchAllActive) await refreshAllActive()
      closeModal()
    } catch (e: unknown) {
      saveError.value = getErrorMessage(e, config.entityName)
    } finally {
      isSaving.value = false
    }
  }

  const handleToggleStatus = async (item: T) => {
    try {
      await config.toggleStatus(item)
      await refreshActive()
      if (config.fetchAllActive) await refreshAllActive()
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, config.entityName))
    }
  }

  const handleDelete = async (id: string) => {
    if (!(await toast.confirm(`Tem certeza que deseja excluir ${config.entityName}?`))) return
    try {
      await config.deleteItem(id)
      await refreshActive()
      if (config.fetchAllActive) await refreshAllActive()
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, config.entityName))
    }
  }

  // Resolve Pending Modal
  const isResolveModalOpen = ref(false)
  const isResolving = ref(false)
  const resolveError = ref('')
  const resolveMode = ref<'approve' | 'merge'>('approve')
  const targetPendingItem = ref<T | null>(null)

  const resolveForm = ref({
    newName: '',
    finalTargetId: '',
    finalNatureId: '',
    finalClassId: '',
  })

  const openResolveModal = (item: T) => {
    targetPendingItem.value = item
    resolveForm.value = {
      newName: item.name,
      finalTargetId: '',
      finalNatureId: '',
      finalClassId: '',
    }
    resolveMode.value = 'approve'
    resolveError.value = ''
    isResolveModalOpen.value = true
  }

  const closeResolveModal = () => {
    isResolveModalOpen.value = false
    targetPendingItem.value = null
  }

  const executeResolve = async () => {
    if (!targetPendingItem.value) return
    isResolving.value = true
    resolveError.value = ''

    try {
      if (resolveMode.value === 'approve') {
        await config.approvePending(targetPendingItem.value, resolveForm.value.newName)
      } else {
        const targetId =
          resolveForm.value.finalTargetId ||
          resolveForm.value.finalNatureId ||
          resolveForm.value.finalClassId
        await config.mergePending(targetPendingItem.value, targetId)
      }
      await refreshPending()
      await refreshActive()
      if (config.fetchAllActive) await refreshAllActive()
      closeResolveModal()
    } catch (e: unknown) {
      resolveError.value = getErrorMessage(e, config.entityName)
    } finally {
      isResolving.value = false
    }
  }

  return {
    activeTab,
    pagination,
    searchQuery,
    handleSearch,

    items,
    pendingItems,
    allActiveItems,
    isLoadingActive,
    refreshActive,
    refreshPending,

    // Modal
    isModalOpen,
    isEditing,
    isSaving,
    saveError,
    form,
    openAddModal,
    openEditModal,
    closeModal,
    saveItem,

    // Actions
    handleToggleStatus,
    handleDelete,

    // Resolve Pending
    isResolveModalOpen,
    isResolving,
    resolveError,
    resolveMode,
    targetPendingItem,
    resolveForm,
    openResolveModal,
    closeResolveModal,
    executeResolve,
  }
}
