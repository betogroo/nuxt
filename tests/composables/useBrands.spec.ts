import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useBrands } from '~/composables/useBrands'
import type { BrandRow } from '~/composables/useBrands'

const mockSupabase = {
  from: vi.fn(),
}
const mockLogAction = vi.fn()
const mockUser = { id: 'user-123' }
let mockIsAdmin = true

mockNuxtImport('useSupabaseClient', () => {
  return vi.fn(() => mockSupabase)
})

mockNuxtImport('useSupabaseUser', () => {
  return vi.fn(() => ({ value: mockUser }))
})

mockNuxtImport('useLogger', () => {
  return () => ({ logAction: mockLogAction })
})

mockNuxtImport('usePermissions', () => {
  return () => ({
    isAdmin: {
      get value() {
        return mockIsAdmin
      },
    },
  })
})

describe('useBrands', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsAdmin = true
  })

  describe('fetchBrands', () => {
    it('should query active/non-pending brands with pagination and order', async () => {
      const mockData = [{ id: 'b-1', name: 'BIC', is_active: true, is_pending: false }]
      const rangeMock = vi.fn().mockResolvedValue({ data: mockData, count: 1, error: null })
      const orderMock = vi.fn().mockReturnValue({ range: rangeMock })
      const eqPendingMock = vi.fn().mockReturnValue({ order: orderMock })
      const selectMock = vi.fn().mockReturnValue({ eq: eqPendingMock })
      mockSupabase.from.mockReturnValue({ select: selectMock })

      const { fetchBrands } = useBrands()
      const result = await fetchBrands(1, 10)

      expect(mockSupabase.from).toHaveBeenCalledWith('brands')
      expect(selectMock).toHaveBeenCalledWith('*', { count: 'exact' })
      expect(eqPendingMock).toHaveBeenCalledWith('is_pending', false)
      expect(orderMock).toHaveBeenCalledWith('name', { ascending: true })
      expect(rangeMock).toHaveBeenCalledWith(0, 9)
      expect(result).toEqual({ data: mockData, count: 1 })
    })

    it('should apply ilike filter when search query is passed', async () => {
      const mockData = [{ id: 'b-1', name: 'BIC', is_active: true, is_pending: false }]
      const rangeMock = vi.fn().mockResolvedValue({ data: mockData, count: 1, error: null })
      const orderMock = vi.fn().mockReturnValue({ range: rangeMock })
      const ilikeMock = vi.fn().mockReturnValue({ order: orderMock })
      const eqPendingMock = vi.fn().mockReturnValue({ ilike: ilikeMock })
      const selectMock = vi.fn().mockReturnValue({ eq: eqPendingMock })
      mockSupabase.from.mockReturnValue({ select: selectMock })

      const { fetchBrands } = useBrands()
      const result = await fetchBrands(1, 10, 'BI')

      expect(ilikeMock).toHaveBeenCalledWith('name', '%BI%')
      expect(orderMock).toHaveBeenCalledWith('name', { ascending: true })
      expect(rangeMock).toHaveBeenCalledWith(0, 9)
      expect(result.data).toEqual(mockData)
    })
  })

  describe('fetchPendingBrands', () => {
    it('should query pending brands without pagination and return array', async () => {
      const mockData = [{ id: 'b-pending', name: 'Acme', is_pending: true }]
      const orderMock = vi.fn().mockResolvedValue({ data: mockData, error: null })
      const eqPendingMock = vi.fn().mockReturnValue({ order: orderMock })
      const selectMock = vi.fn().mockReturnValue({ eq: eqPendingMock })
      mockSupabase.from.mockReturnValue({ select: selectMock })

      const { fetchPendingBrands } = useBrands()
      const result = await fetchPendingBrands()

      expect(mockSupabase.from).toHaveBeenCalledWith('brands')
      expect(selectMock).toHaveBeenCalledWith('*')
      expect(eqPendingMock).toHaveBeenCalledWith('is_pending', true)
      expect(orderMock).toHaveBeenCalledWith('created_at', { ascending: false })
      expect(result).toEqual(mockData)
    })
  })

  describe('fetchAllActiveBrands', () => {
    it('should return all active, non-pending brands ordered by name', async () => {
      const mockData = [
        { id: 'b-1', name: '3M' },
        { id: 'b-2', name: 'BIC' },
      ]
      const orderMock = vi.fn().mockResolvedValue({ data: mockData, error: null })
      const eqPendingMock = vi.fn().mockReturnValue({ order: orderMock })
      const eqActiveMock = vi.fn().mockReturnValue({ eq: eqPendingMock })
      const selectMock = vi.fn().mockReturnValue({ eq: eqActiveMock })
      mockSupabase.from.mockReturnValue({ select: selectMock })

      const { fetchAllActiveBrands } = useBrands()
      const result = await fetchAllActiveBrands()

      expect(selectMock).toHaveBeenCalledWith('*')
      expect(eqActiveMock).toHaveBeenCalledWith('is_active', true)
      expect(eqPendingMock).toHaveBeenCalledWith('is_pending', false)
      expect(orderMock).toHaveBeenCalledWith('name', { ascending: true })
      expect(result).toEqual(mockData)
    })
  })

  describe('ensureBrand', () => {
    it('should throw if brand name is empty or blank', async () => {
      const { ensureBrand } = useBrands()
      await expect(ensureBrand('   ')).rejects.toThrow('O nome da marca é obrigatório.')
      expect(mockSupabase.from).not.toHaveBeenCalled()
    })

    it('should return existing brand if found case-insensitively without inserting', async () => {
      const existing = { id: 'b-1', name: 'BIC', is_active: true, is_pending: false }
      const maybeSingleMock = vi.fn().mockResolvedValue({ data: existing, error: null })
      const ilikeMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock })
      const selectMock = vi.fn().mockReturnValue({ ilike: ilikeMock })
      mockSupabase.from.mockReturnValue({ select: selectMock })

      const { ensureBrand } = useBrands()
      const result = await ensureBrand('bic')

      expect(ilikeMock).toHaveBeenCalledWith('name', 'bic')
      expect(result).toEqual(existing)
      expect(mockLogAction).not.toHaveBeenCalled()
    })

    it('should insert active brand when admin and not found', async () => {
      mockIsAdmin = true
      const created = { id: 'b-new', name: 'Chamex', is_active: true, is_pending: false }

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'brands') {
          return {
            select: vi.fn().mockReturnValue({
              ilike: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: created, error: null }),
              }),
            }),
          }
        }
        return {}
      })

      const { ensureBrand } = useBrands()
      const result = await ensureBrand('Chamex')

      expect(result).toEqual(created)
      expect(mockLogAction).toHaveBeenCalledWith(
        'CREATE_BRAND',
        expect.stringContaining('Chamex'),
        'user-123',
      )
    })

    it('should insert pending brand when non-admin and not found', async () => {
      mockIsAdmin = false
      const created = { id: 'b-pending', name: 'Marca Nova', is_active: false, is_pending: true }

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'brands') {
          return {
            select: vi.fn().mockReturnValue({
              ilike: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: created, error: null }),
              }),
            }),
          }
        }
        return {}
      })

      const { ensureBrand } = useBrands()
      const result = await ensureBrand('Marca Nova')

      expect(result).toEqual(created)
      expect(mockLogAction).toHaveBeenCalledWith(
        'CREATE_PENDING_BRAND',
        expect.stringContaining('Marca Nova'),
        'user-123',
      )
    })
  })

  describe('createBrand', () => {
    it('should throw if name is empty', async () => {
      const { createBrand } = useBrands()
      await expect(createBrand({ name: '   ' })).rejects.toThrow('O nome da marca é obrigatório.')
    })

    it('should insert active brand and log action', async () => {
      const inserted = { id: 'b-1', name: 'Pilot', is_active: true, is_pending: false }
      const singleMock = vi.fn().mockResolvedValue({ data: inserted, error: null })
      const selectMock = vi.fn().mockReturnValue({ single: singleMock })
      const insertMock = vi.fn().mockReturnValue({ select: selectMock })
      mockSupabase.from.mockReturnValue({ insert: insertMock })

      const { createBrand } = useBrands()
      const result = await createBrand({ name: ' Pilot ' })

      expect(insertMock).toHaveBeenCalledWith({
        name: 'Pilot',
        is_active: true,
        is_pending: false,
        created_by: 'user-123',
      })
      expect(result).toEqual(inserted)
      expect(mockLogAction).toHaveBeenCalledWith(
        'CREATE_BRAND',
        expect.stringContaining('Pilot'),
        'user-123',
      )
    })
  })

  describe('updateBrand', () => {
    it('should throw if name is empty string', async () => {
      const { updateBrand } = useBrands()
      await expect(updateBrand('b-1', { name: '   ' })).rejects.toThrow(
        'O nome da marca não pode ser vazio.',
      )
    })

    it('should update name, sync real_products, return updated brand and log action', async () => {
      const updated = { id: 'b-1', name: 'BIC Brasil' }
      const singleMock = vi.fn().mockResolvedValue({ data: updated, error: null })
      const selectMock = vi.fn().mockReturnValue({ single: singleMock })
      const eqBrandMock = vi.fn().mockReturnValue({ select: selectMock })
      const updateBrandMock = vi.fn().mockReturnValue({ eq: eqBrandMock })

      const eqProductsMock = vi.fn().mockResolvedValue({ error: null })
      const updateProductsMock = vi.fn().mockReturnValue({ eq: eqProductsMock })

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'brands') {
          return { update: updateBrandMock }
        }
        if (table === 'real_products') {
          return { update: updateProductsMock }
        }
        return {}
      })

      const { updateBrand } = useBrands()
      const result = await updateBrand('b-1', { name: 'BIC Brasil' })

      expect(updateBrandMock).toHaveBeenCalledWith({ name: 'BIC Brasil' })
      expect(eqBrandMock).toHaveBeenCalledWith('id', 'b-1')
      expect(updateProductsMock).toHaveBeenCalledWith({ brand: 'BIC Brasil' })
      expect(eqProductsMock).toHaveBeenCalledWith('brand_id', 'b-1')
      expect(result).toEqual(updated)
      expect(mockLogAction).toHaveBeenCalledWith(
        'UPDATE_BRAND',
        expect.stringContaining('b-1'),
        'user-123',
      )
    })
  })

  describe('toggleBrandStatus', () => {
    it('should toggle status from active to inactive and log action', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: null })
      const updateMock = vi.fn().mockReturnValue({ eq: eqMock })
      mockSupabase.from.mockReturnValue({ update: updateMock })

      const brand: BrandRow = {
        id: 'b-1',
        name: 'BIC',
        is_active: true,
        is_pending: false,
        created_at: '',
        updated_at: '',
        created_by: null,
      }

      const { toggleBrandStatus } = useBrands()
      await toggleBrandStatus(brand)

      expect(updateMock).toHaveBeenCalledWith({ is_active: false })
      expect(eqMock).toHaveBeenCalledWith('id', 'b-1')
      expect(mockLogAction).toHaveBeenCalledWith(
        'TOGGLE_BRAND_STATUS',
        expect.stringContaining('Inativa'),
        'user-123',
      )
    })

    it('should toggle status from inactive to active and log action', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: null })
      const updateMock = vi.fn().mockReturnValue({ eq: eqMock })
      mockSupabase.from.mockReturnValue({ update: updateMock })

      const brand: BrandRow = {
        id: 'b-1',
        name: 'BIC',
        is_active: false,
        is_pending: false,
        created_at: '',
        updated_at: '',
        created_by: null,
      }

      const { toggleBrandStatus } = useBrands()
      await toggleBrandStatus(brand)

      expect(updateMock).toHaveBeenCalledWith({ is_active: true })
      expect(eqMock).toHaveBeenCalledWith('id', 'b-1')
      expect(mockLogAction).toHaveBeenCalledWith(
        'TOGGLE_BRAND_STATUS',
        expect.stringContaining('Ativa'),
        'user-123',
      )
    })
  })

  describe('deleteBrand', () => {
    it('should throw error when brand is in use by real_products', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'real_products') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ count: 3, error: null }),
            }),
          }
        }
        return {}
      })

      const { deleteBrand } = useBrands()
      await expect(deleteBrand('b-1', 'BIC')).rejects.toThrow(
        'Não é possível excluir esta marca pois ela possui 3 produto(s) real(is) vinculado(s). Inative a marca se não desejar novas utilizações.',
      )
    })

    it('should delete brand and log action when not in use', async () => {
      const eqDeleteMock = vi.fn().mockResolvedValue({ error: null })
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'real_products') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
            }),
          }
        }
        if (table === 'brands') {
          return {
            delete: vi.fn().mockReturnValue({
              eq: eqDeleteMock,
            }),
          }
        }
        return {}
      })

      const { deleteBrand } = useBrands()
      await deleteBrand('b-1', 'BIC')

      expect(eqDeleteMock).toHaveBeenCalledWith('id', 'b-1')
      expect(mockLogAction).toHaveBeenCalledWith(
        'DELETE_BRAND',
        expect.stringContaining('BIC'),
        'user-123',
      )
    })
  })

  describe('approvePendingBrand', () => {
    it('should approve pending brand with active flags and log action', async () => {
      const updated = { id: 'b-p1', name: 'Faber-Castell', is_pending: false, is_active: true }
      const singleMock = vi.fn().mockResolvedValue({ data: updated, error: null })
      const selectMock = vi.fn().mockReturnValue({ single: singleMock })
      const eqBrandMock = vi.fn().mockReturnValue({ select: selectMock })
      const updateBrandMock = vi.fn().mockReturnValue({ eq: eqBrandMock })

      const eqProductsMock = vi.fn().mockResolvedValue({ error: null })
      const updateProductsMock = vi.fn().mockReturnValue({ eq: eqProductsMock })

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'brands') {
          return { update: updateBrandMock }
        }
        if (table === 'real_products') {
          return { update: updateProductsMock }
        }
        return {}
      })

      const brand: BrandRow = {
        id: 'b-p1',
        name: 'faber',
        is_pending: true,
        is_active: false,
        created_at: '',
        updated_at: '',
        created_by: null,
      }

      const { approvePendingBrand } = useBrands()
      const result = await approvePendingBrand(brand, 'Faber-Castell')

      expect(updateBrandMock).toHaveBeenCalledWith(
        expect.objectContaining({
          is_pending: false,
          is_active: true,
          name: 'Faber-Castell',
        }),
      )
      expect(updateProductsMock).toHaveBeenCalledWith({ brand: 'Faber-Castell' })
      expect(eqProductsMock).toHaveBeenCalledWith('brand_id', 'b-p1')
      expect(result).toEqual(updated)
      expect(mockLogAction).toHaveBeenCalledWith(
        'APPROVE_PENDING_BRAND',
        expect.stringContaining('Faber-Castell'),
        'user-123',
      )
    })
  })

  describe('mergePendingBrand', () => {
    it('should update real_products to target brand and delete pending brand', async () => {
      const targetBrand = { id: 'b-target', name: 'BIC' }
      const singleMock = vi.fn().mockResolvedValue({ data: targetBrand, error: null })
      const eqTargetMock = vi.fn().mockReturnValue({ single: singleMock })
      const selectTargetMock = vi.fn().mockReturnValue({ eq: eqTargetMock })

      const eqUpdateProductsMock = vi.fn().mockResolvedValue({ error: null })
      const updateProductsMock = vi.fn().mockReturnValue({ eq: eqUpdateProductsMock })

      const eqDeleteBrandMock = vi.fn().mockResolvedValue({ error: null })
      const deleteBrandMock = vi.fn().mockReturnValue({ eq: eqDeleteBrandMock })

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'brands') {
          return {
            select: selectTargetMock,
            delete: deleteBrandMock,
          }
        }
        if (table === 'real_products') {
          return {
            update: updateProductsMock,
          }
        }
        return {}
      })

      const pendingBrand: BrandRow = {
        id: 'b-pending',
        name: 'bic cristal',
        is_pending: true,
        is_active: false,
        created_at: '',
        updated_at: '',
        created_by: null,
      }

      const { mergePendingBrand } = useBrands()
      await mergePendingBrand(pendingBrand, 'b-target')

      expect(selectTargetMock).toHaveBeenCalledWith('id, name')
      expect(eqTargetMock).toHaveBeenCalledWith('id', 'b-target')
      expect(updateProductsMock).toHaveBeenCalledWith({
        brand_id: 'b-target',
        brand: 'BIC',
      })
      expect(eqUpdateProductsMock).toHaveBeenCalledWith('brand_id', 'b-pending')
      expect(deleteBrandMock).toHaveBeenCalled()
      expect(eqDeleteBrandMock).toHaveBeenCalledWith('id', 'b-pending')
      expect(mockLogAction).toHaveBeenCalledWith(
        'MERGE_PENDING_BRAND',
        expect.stringContaining('bic cristal'),
        'user-123',
      )
    })
  })

  describe('fetchBrandById', () => {
    it('should query brand by id and return row', async () => {
      const mockBrand = { id: 'b-1', name: 'BIC', is_active: true, is_pending: false }
      const maybeSingleMock = vi.fn().mockResolvedValue({ data: mockBrand, error: null })
      const eqMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock })
      const selectMock = vi.fn().mockReturnValue({ eq: eqMock })
      mockSupabase.from.mockReturnValue({ select: selectMock })

      const { fetchBrandById } = useBrands()
      const result = await fetchBrandById('b-1')

      expect(mockSupabase.from).toHaveBeenCalledWith('brands')
      expect(selectMock).toHaveBeenCalledWith('*')
      expect(eqMock).toHaveBeenCalledWith('id', 'b-1')
      expect(result).toEqual(mockBrand)
    })

    it('should return null when brand not found', async () => {
      const maybeSingleMock = vi.fn().mockResolvedValue({ data: null, error: null })
      const eqMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock })
      const selectMock = vi.fn().mockReturnValue({ eq: eqMock })
      mockSupabase.from.mockReturnValue({ select: selectMock })

      const { fetchBrandById } = useBrands()
      const result = await fetchBrandById('b-non-existent')

      expect(result).toBeNull()
    })
  })

  describe('fetchBrandProducts', () => {
    it('should query real_products by brand_id and join products relation', async () => {
      const mockItems = [
        {
          id: 'rp-1',
          name: 'Cristal 1.0mm',
          brand: 'BIC',
          brand_id: 'b-1',
          link: 'https://bic.com',
          created_at: '2026-11-25T10:00:00Z',
          product: {
            id: 'prod-1',
            name: 'Caneta Esferográfica',
            cat_mat: 1234,
            cat_bec: 5678,
            is_active: true,
            expense_natures: { id: '339030', name: 'Material de Consumo' },
            product_classes: { id: '7510', name: 'Material de Escritório' },
          },
        },
      ]

      const orderMock = vi.fn().mockResolvedValue({ data: mockItems, error: null })
      const eqMock = vi.fn().mockReturnValue({ order: orderMock })
      const selectMock = vi.fn().mockReturnValue({ eq: eqMock })
      mockSupabase.from.mockReturnValue({ select: selectMock })

      const { fetchBrandProducts } = useBrands()
      const result = await fetchBrandProducts('b-1')

      expect(mockSupabase.from).toHaveBeenCalledWith('real_products')
      expect(selectMock).toHaveBeenCalledWith(expect.stringContaining('product:products'))
      expect(eqMock).toHaveBeenCalledWith('brand_id', 'b-1')
      expect(orderMock).toHaveBeenCalledWith('created_at', { ascending: false })
      expect(result).toEqual(mockItems)
    })

    it('should apply or filter with brand_id and brand name fallback when brandName is provided', async () => {
      const mockItems = [
        {
          id: 'rp-1',
          name: 'Cristal 1.0mm',
          brand: 'BIC',
          brand_id: 'b-1',
          link: null,
          created_at: '2026-11-25T10:00:00Z',
          product: null,
        },
      ]

      const orderMock = vi.fn().mockResolvedValue({ data: mockItems, error: null })
      const orMock = vi.fn().mockReturnValue({ order: orderMock })
      const selectMock = vi.fn().mockReturnValue({ or: orMock })
      mockSupabase.from.mockReturnValue({ select: selectMock })

      const { fetchBrandProducts } = useBrands()
      const result = await fetchBrandProducts('b-1', 'BIC')

      expect(mockSupabase.from).toHaveBeenCalledWith('real_products')
      expect(orMock).toHaveBeenCalledWith('brand_id.eq.b-1,brand.ilike.BIC')
      expect(orderMock).toHaveBeenCalledWith('created_at', { ascending: false })
      expect(result).toEqual(mockItems)
    })
  })
})
