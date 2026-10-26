import { ref, computed } from 'vue'

export interface PaginationOptions {
  defaultItemsPerPage?: number
}

export function usePagination(options: PaginationOptions = {}) {
  const currentPage = ref(1)
  const itemsPerPage = ref(options.defaultItemsPerPage ?? 10)
  const totalItems = ref(0)

  const totalPages = computed(() => {
    const limit = itemsPerPage.value > 0 ? itemsPerPage.value : 10
    return Math.ceil((totalItems.value || 0) / limit)
  })

  const resetPage = () => {
    currentPage.value = 1
  }

  const setTotal = (total: number) => {
    totalItems.value = total
  }

  return {
    currentPage,
    itemsPerPage,
    totalItems,
    totalPages,
    resetPage,
    setTotal,
  }
}
