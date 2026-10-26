import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useProductClasses } from '~/composables/useProductClasses'
import type { ProductClassRow, ProductClassInsert } from '~/composables/useProductClasses'

const mockSupabase = {
  from: vi.fn(),
}

const mockLogAction = vi.fn()
const mockUser = { id: 'user-123' }

mockNuxtImport('useSupabaseClient', () => {
  return () => mockSupabase
})

mockNuxtImport('useSupabaseUser', () => {
  return () => ({ value: mockUser })
})

mockNuxtImport('useLogger', () => {
  return () => ({ logAction: mockLogAction })
})

describe('useProductClasses', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'new-id' }, error: null }),
      range: vi.fn().mockResolvedValue({ data: [], count: 0, error: null }),
      eq: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
    })
  })

  it('fetchProductClasses should return paginated data', async () => {
    const fakeData: ProductClassRow[] = [
      {
        id: '5915',
        name: 'Filtros e redes',
        is_active: true,
        is_pending: false,
        created_at: '2026-10-01T00:00:00Z',
        updated_at: '2026-10-01T00:00:00Z',
      },
    ]
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: fakeData, count: 1, error: null }),
    })

    const { fetchProductClasses } = useProductClasses()
    const result = await fetchProductClasses(1, 10)
    expect(result.data).toEqual(fakeData)
    expect(result.count).toBe(1)
    expect(mockSupabase.from).toHaveBeenCalledWith('product_classes')
  })

  it('fetchAllActiveProductClasses should fetch active classes ordered by id', async () => {
    const fakeData: ProductClassRow[] = [
      {
        id: '5915',
        name: 'Filtros e redes',
        is_active: true,
        is_pending: false,
        created_at: '2026-10-01T00:00:00Z',
        updated_at: '2026-10-01T00:00:00Z',
      },
    ]
    const mockOrder = vi.fn().mockResolvedValue({ data: fakeData, error: null })
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder })
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
    mockSupabase.from.mockReturnValue({ select: mockSelect })

    const { fetchAllActiveProductClasses } = useProductClasses()
    const result = await fetchAllActiveProductClasses()
    expect(result).toEqual(fakeData)
    expect(mockSupabase.from).toHaveBeenCalledWith('product_classes')
    expect(mockEq).toHaveBeenCalledWith('is_active', true)
  })

  it('fetchPendingProductClasses should fetch pending classes', async () => {
    const fakeData: ProductClassRow[] = [
      {
        id: '9999',
        name: 'Classe Sugerida',
        is_active: false,
        is_pending: true,
        created_at: '2026-10-01T00:00:00Z',
        updated_at: '2026-10-01T00:00:00Z',
      },
    ]
    const mockOrder = vi.fn().mockResolvedValue({ data: fakeData, error: null })
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder })
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
    mockSupabase.from.mockReturnValue({ select: mockSelect })

    const { fetchPendingProductClasses } = useProductClasses()
    const result = await fetchPendingProductClasses()
    expect(result).toEqual(fakeData)
    expect(mockSupabase.from).toHaveBeenCalledWith('product_classes')
    expect(mockEq).toHaveBeenCalledWith('is_pending', true)
  })

  it('createProductClass should insert and log action', async () => {
    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
    })

    const { createProductClass } = useProductClasses()
    const payload: ProductClassInsert = {
      id: '5915',
      name: 'Filtros e redes',
      is_active: true,
      is_pending: false,
    }
    await createProductClass(payload)

    expect(mockSupabase.from).toHaveBeenCalledWith('product_classes')
    expect(mockLogAction).toHaveBeenCalledWith(
      'CREATE_PRODUCT_CLASS',
      'Nova classe de produto cadastrada: Filtros e redes',
      'user-123',
    )
  })

  it('updateProductClass should update and log action', async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: null })
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
    mockSupabase.from.mockReturnValue({ update: mockUpdate })

    const { updateProductClass } = useProductClasses()
    await updateProductClass('5915', { name: 'Filtros Atualizados' })

    expect(mockSupabase.from).toHaveBeenCalledWith('product_classes')
    expect(mockUpdate).toHaveBeenCalledWith({ name: 'Filtros Atualizados' })
    expect(mockEq).toHaveBeenCalledWith('id', '5915')
    expect(mockLogAction).toHaveBeenCalledWith(
      'UPDATE_PRODUCT_CLASS',
      'Classe de produto atualizada: 5915',
      'user-123',
    )
  })

  it('deleteProductClass should delete and log action', async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: null })
    const mockDelete = vi.fn().mockReturnValue({ eq: mockEq })
    mockSupabase.from.mockReturnValue({ delete: mockDelete })

    const { deleteProductClass } = useProductClasses()
    await deleteProductClass('5915')

    expect(mockSupabase.from).toHaveBeenCalledWith('product_classes')
    expect(mockDelete).toHaveBeenCalled()
    expect(mockEq).toHaveBeenCalledWith('id', '5915')
    expect(mockLogAction).toHaveBeenCalledWith(
      'DELETE_PRODUCT_CLASS',
      'Classe de produto removida: 5915',
      'user-123',
    )
  })

  it('toggleProductClassStatus should invert is_active and log action', async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: null })
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
    mockSupabase.from.mockReturnValue({ update: mockUpdate })

    const { toggleProductClassStatus } = useProductClasses()
    const targetClass: ProductClassRow = {
      id: '5915',
      name: 'Filtros e redes',
      is_active: true,
      is_pending: false,
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-01T00:00:00Z',
    }
    await toggleProductClassStatus(targetClass)

    expect(mockSupabase.from).toHaveBeenCalledWith('product_classes')
    expect(mockUpdate).toHaveBeenCalledWith({ is_active: false })
    expect(mockEq).toHaveBeenCalledWith('id', '5915')
    expect(mockLogAction).toHaveBeenCalledWith(
      'TOGGLE_PRODUCT_CLASS_STATUS',
      expect.stringContaining('Inativo'),
      'user-123',
    )
  })

  it('registerPendingProductClass should insert with is_pending true and is_active false', async () => {
    const fakeCreated: ProductClassRow = {
      id: '9999',
      name: 'Nova Sugestão',
      is_active: false,
      is_pending: true,
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-01T00:00:00Z',
    }
    const mockSingle = vi.fn().mockResolvedValue({ data: fakeCreated, error: null })
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect })
    mockSupabase.from.mockReturnValue({ insert: mockInsert })

    const { registerPendingProductClass } = useProductClasses()
    const result = await registerPendingProductClass({ id: '9999', name: 'Nova Sugestão' })

    expect(mockInsert).toHaveBeenCalledWith({
      id: '9999',
      name: 'Nova Sugestão',
      is_pending: true,
      is_active: false,
    })
    expect(result).toEqual(fakeCreated)
    expect(mockLogAction).toHaveBeenCalledWith(
      'CREATE_PENDING_PRODUCT_CLASS',
      expect.stringContaining('Nova Sugestão'),
      'user-123',
    )
  })

  it('approvePendingProductClass should update is_pending to false and is_active to true', async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: null })
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
    mockSupabase.from.mockReturnValue({ update: mockUpdate })

    const { approvePendingProductClass } = useProductClasses()
    const targetClass: ProductClassRow = {
      id: '9999',
      name: 'Sugestão Original',
      is_active: false,
      is_pending: true,
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-01T00:00:00Z',
    }
    await approvePendingProductClass(targetClass, 'Nome Ajustado')

    expect(mockUpdate).toHaveBeenCalledWith({
      is_pending: false,
      is_active: true,
      name: 'Nome Ajustado',
    })
    expect(mockEq).toHaveBeenCalledWith('id', '9999')
    expect(mockLogAction).toHaveBeenCalledWith(
      'APPROVE_PRODUCT_CLASS',
      expect.stringContaining('Sugestão Original'),
      'user-123',
    )
  })

  it('mergePendingProductClass should reassign products and delete the pending class', async () => {
    const mockProductEq = vi.fn().mockResolvedValue({
      data: [{ id: 'prod-1' }, { id: 'prod-2' }],
      error: null,
    })
    const mockProductSelect = vi.fn().mockReturnValue({ eq: mockProductEq })

    const mockUpdateEq = vi.fn().mockResolvedValue({ error: null })
    const mockProductUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq })

    const mockDeleteEq = vi.fn().mockResolvedValue({ error: null })
    const mockClassDelete = vi.fn().mockReturnValue({ eq: mockDeleteEq })

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'products') {
        return {
          select: mockProductSelect,
          update: mockProductUpdate,
        }
      }
      if (table === 'product_classes') {
        return {
          delete: mockClassDelete,
        }
      }
      return {}
    })

    const { mergePendingProductClass } = useProductClasses()
    const targetClass: ProductClassRow = {
      id: '9999',
      name: 'Classe Temporaria',
      is_active: false,
      is_pending: true,
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-01T00:00:00Z',
    }
    await mergePendingProductClass(targetClass, '5915')

    expect(mockClassDelete).toHaveBeenCalled()
    expect(mockDeleteEq).toHaveBeenCalledWith('id', '9999')
    expect(mockLogAction).toHaveBeenCalledWith(
      'MERGE_PRODUCT_CLASS',
      expect.stringContaining('5915'),
      'user-123',
    )
  })
})
