import { computed, ref, type Ref } from 'vue'

/**
 * Composable reutilizável para gerenciamento de seleção de linhas em tabelas paginadas,
 * suportando seleção por ID ou por item completo (preservando instâncias entre páginas).
 */
export function useRowSelection<T>(
  pageItems: Ref<T[]>,
  getId: (item: T) => string | undefined = (item: T) => (item as { id?: string })?.id,
) {
  const selectedIds = ref<string[]>([])
  const selectedItemsMap = ref<Map<string, T>>(new Map()) as Ref<Map<string, T>>

  const selectedIdSet = computed(() => new Set(selectedIds.value))

  const isAllPageSelected = computed(() => {
    const list = pageItems.value
    if (!list || list.length === 0) return false
    return list.every((item) => {
      const id = getId(item)
      return Boolean(id && selectedIdSet.value.has(id))
    })
  })

  const isSomePageSelected = computed(() => {
    const list = pageItems.value
    if (!list || list.length === 0) return false
    const selectedCount = list.filter((item) => {
      const id = getId(item)
      return Boolean(id && selectedIdSet.value.has(id))
    }).length
    return selectedCount > 0 && selectedCount < list.length
  })

  const isRowSelected = (id?: string): boolean => {
    return id ? selectedIdSet.value.has(id) : false
  }

  const deselectRow = (id?: string) => {
    if (!id) return
    const idx = selectedIds.value.indexOf(id)
    if (idx > -1) {
      selectedIds.value.splice(idx, 1)
    }
    if (selectedItemsMap.value.has(id)) {
      const nextMap = new Map(selectedItemsMap.value)
      nextMap.delete(id)
      selectedItemsMap.value = nextMap
    }
  }

  const toggleSelectRow = (id?: string) => {
    if (!id) return
    const idx = selectedIds.value.indexOf(id)
    if (idx > -1) {
      deselectRow(id)
    } else {
      selectedIds.value.push(id)
      const matched = pageItems.value?.find((item) => getId(item) === id)
      if (matched) {
        const nextMap = new Map(selectedItemsMap.value)
        nextMap.set(id, matched)
        selectedItemsMap.value = nextMap
      }
    }
  }

  const toggleSelectItem = (item: T) => {
    const id = getId(item)
    if (!id) return
    if (selectedIdSet.value.has(id)) {
      deselectRow(id)
    } else {
      selectedIds.value = [...selectedIds.value, id]
      const nextMap = new Map(selectedItemsMap.value)
      nextMap.set(id, item)
      selectedItemsMap.value = nextMap
    }
  }

  const toggleSelectAllPage = (forceValue?: boolean | null) => {
    const list = pageItems.value || []
    const shouldSelect = typeof forceValue === 'boolean' ? forceValue : !isAllPageSelected.value
    const pageIds = list.map((item) => getId(item)).filter((id): id is string => Boolean(id))
    const nextMap = new Map(selectedItemsMap.value)

    if (shouldSelect) {
      const set = new Set([...selectedIds.value, ...pageIds])
      selectedIds.value = Array.from(set)
      for (const item of list) {
        const id = getId(item)
        if (id) nextMap.set(id, item)
      }
    } else {
      selectedIds.value = selectedIds.value.filter((id) => !pageIds.includes(id))
      for (const id of pageIds) {
        nextMap.delete(id)
      }
    }

    selectedItemsMap.value = nextMap
  }

  const clearSelection = () => {
    selectedIds.value = []
    selectedItemsMap.value = new Map()
  }

  return {
    selectedIds,
    selectedIdSet,
    selectedItemsMap,
    isAllPageSelected,
    isSomePageSelected,
    isRowSelected,
    deselectRow,
    toggleSelectRow,
    toggleSelectItem,
    toggleSelectAllPage,
    clearSelection,
  }
}
