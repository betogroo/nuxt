import { ref, type Ref } from 'vue'
import { getErrorMessage } from '~/utils/errorHandler'

/**
 * Reusable modal state controller for CRUD (Add/Edit) and Target-based (Resolve/Merge) modals.
 * Eliminates repetitive `isModalOpen / isEditing / isSaving / saveError / try-catch-finally` boilerplate.
 */
export function useFormModal<TTarget = unknown>() {
  const isOpen = ref(false)
  const isEditing = ref(false)
  const isSaving = ref(false)
  const error = ref('')
  const target = ref<TTarget | null>(null) as Ref<TTarget | null>

  const openAdd = (beforeOpen?: () => void) => {
    beforeOpen?.()
    target.value = null
    isEditing.value = false
    error.value = ''
    isOpen.value = true
  }

  const openEdit = (item: TTarget, beforeOpen?: (item: TTarget) => void) => {
    beforeOpen?.(item)
    target.value = item
    isEditing.value = true
    error.value = ''
    isOpen.value = true
  }

  const openForTarget = async (
    item: TTarget,
    beforeOpen?: (item: TTarget) => void | Promise<void>,
  ) => {
    target.value = item
    error.value = ''
    await beforeOpen?.(item)
    isOpen.value = true
  }

  const close = () => {
    isOpen.value = false
    target.value = null
  }

  const executeSave = async (
    action: () => Promise<void>,
    formatError: (err: unknown) => string = getErrorMessage,
  ): Promise<void> => {
    try {
      isSaving.value = true
      error.value = ''
      await action()
    } catch (err: unknown) {
      error.value = formatError(err)
    } finally {
      isSaving.value = false
    }
  }

  return {
    isOpen,
    isEditing,
    isSaving,
    error,
    target,
    openAdd,
    openEdit,
    openForTarget,
    close,
    executeSave,
  }
}
