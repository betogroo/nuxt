import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { useRowSelection } from '~/composables/useRowSelection'

interface SampleRow {
  id: string
  name: string
}

describe('useRowSelection', () => {
  const samplePage1: SampleRow[] = [
    { id: '1', name: 'Item 1' },
    { id: '2', name: 'Item 2' },
    { id: '3', name: 'Item 3' },
  ]

  it('starts with empty selection and false flags', () => {
    const items = ref<SampleRow[]>(samplePage1)
    const selection = useRowSelection(items)

    expect(selection.selectedIds.value).toEqual([])
    expect(selection.selectedIdSet.value.size).toBe(0)
    expect(selection.isAllPageSelected.value).toBe(false)
    expect(selection.isSomePageSelected.value).toBe(false)
    expect(selection.isRowSelected('1')).toBe(false)
  })

  it('toggles single row by ID and updates indeterminate/all flags', () => {
    const items = ref<SampleRow[]>(samplePage1)
    const selection = useRowSelection(items)

    selection.toggleSelectRow('1')
    expect(selection.selectedIds.value).toEqual(['1'])
    expect(selection.isRowSelected('1')).toBe(true)
    expect(selection.isSomePageSelected.value).toBe(true)
    expect(selection.isAllPageSelected.value).toBe(false)

    selection.toggleSelectRow('1')
    expect(selection.selectedIds.value).toEqual([])
    expect(selection.isSomePageSelected.value).toBe(false)
  })

  it('toggles single item and stores instance in selectedItemsMap across pages', () => {
    const items = ref<SampleRow[]>(samplePage1)
    const selection = useRowSelection(items)

    selection.toggleSelectItem(samplePage1[0])
    expect(selection.selectedIdSet.value.has('1')).toBe(true)
    expect(selection.selectedItemsMap.value.get('1')).toEqual(samplePage1[0])

    // Switch to page 2 while preserving page 1 item in map
    items.value = [{ id: '4', name: 'Item 4' }]
    expect(selection.selectedItemsMap.value.get('1')).toEqual(samplePage1[0])
    expect(selection.isAllPageSelected.value).toBe(false)
  })

  it('selects and deselects all items on current page', () => {
    const items = ref<SampleRow[]>(samplePage1)
    const selection = useRowSelection(items)

    selection.toggleSelectAllPage()
    expect(selection.selectedIds.value).toEqual(['1', '2', '3'])
    expect(selection.isAllPageSelected.value).toBe(true)
    expect(selection.isSomePageSelected.value).toBe(false)

    selection.toggleSelectAllPage()
    expect(selection.selectedIds.value).toEqual([])
    expect(selection.isAllPageSelected.value).toBe(false)
  })

  it('supports explicit boolean argument on toggleSelectAllPage and clearSelection', () => {
    const items = ref<SampleRow[]>(samplePage1)
    const selection = useRowSelection(items)

    selection.toggleSelectAllPage(true)
    expect(selection.selectedIds.value).toHaveLength(3)

    selection.deselectRow('2')
    expect(selection.selectedIds.value).toEqual(['1', '3'])

    selection.clearSelection()
    expect(selection.selectedIds.value).toEqual([])
    expect(selection.selectedItemsMap.value.size).toBe(0)
  })
})
