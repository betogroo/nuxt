import { describe, it, expect } from 'vitest'
import { usePagination } from '~/composables/usePagination'

describe('usePagination Composable', () => {
  it('should initialize with default values', () => {
    const { currentPage, itemsPerPage, totalItems, totalPages } = usePagination()

    expect(currentPage.value).toBe(1)
    expect(itemsPerPage.value).toBe(10)
    expect(totalItems.value).toBe(0)
    expect(totalPages.value).toBe(0)
  })

  it('should allow custom defaultItemsPerPage', () => {
    const { itemsPerPage } = usePagination({ defaultItemsPerPage: 25 })
    expect(itemsPerPage.value).toBe(25)
  })

  it('should correctly calculate totalPages', () => {
    const { totalItems, itemsPerPage, totalPages } = usePagination({ defaultItemsPerPage: 10 })

    totalItems.value = 25
    expect(totalPages.value).toBe(3)

    totalItems.value = 20
    expect(totalPages.value).toBe(2)

    totalItems.value = 0
    expect(totalPages.value).toBe(0)

    itemsPerPage.value = 5
    totalItems.value = 21
    expect(totalPages.value).toBe(5)
  })

  it('should reset currentPage to 1', () => {
    const { currentPage, resetPage } = usePagination()

    currentPage.value = 4
    expect(currentPage.value).toBe(4)

    resetPage()
    expect(currentPage.value).toBe(1)
  })

  it('should set total items via setTotal', () => {
    const { totalItems, setTotal } = usePagination()

    setTotal(42)
    expect(totalItems.value).toBe(42)
  })
})
