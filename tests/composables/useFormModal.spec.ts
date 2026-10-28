import { describe, it, expect, vi } from 'vitest'
import { useFormModal } from '~/composables/useFormModal'

describe('composables/useFormModal', () => {
  it('manages add, edit, and close states cleanly', () => {
    const modal = useFormModal<{ id: string; name: string }>()
    const onBeforeAdd = vi.fn()
    const onBeforeEdit = vi.fn()

    modal.openAdd(onBeforeAdd)
    expect(onBeforeAdd).toHaveBeenCalledOnce()
    expect(modal.isOpen.value).toBe(true)
    expect(modal.isEditing.value).toBe(false)
    expect(modal.target.value).toBeNull()

    const item = { id: '1', name: 'Item A' }
    modal.openEdit(item, onBeforeEdit)
    expect(onBeforeEdit).toHaveBeenCalledWith(item)
    expect(modal.isOpen.value).toBe(true)
    expect(modal.isEditing.value).toBe(true)
    expect(modal.target.value).toEqual(item)

    modal.close()
    expect(modal.isOpen.value).toBe(false)
    expect(modal.target.value).toBeNull()
  })

  it('manages openForTarget and executeSave error handling', async () => {
    const modal = useFormModal<{ id: string }>()
    await modal.openForTarget({ id: 't-1' })
    expect(modal.isOpen.value).toBe(true)
    expect(modal.target.value).toEqual({ id: 't-1' })

    await modal.executeSave(async () => {
      expect(modal.isSaving.value).toBe(true)
      throw new Error('Falha ao salvar')
    })

    expect(modal.isSaving.value).toBe(false)
    expect(modal.error.value).toBe('Falha ao salvar')
  })
})
