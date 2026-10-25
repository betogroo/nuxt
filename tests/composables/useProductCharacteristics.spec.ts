import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import {
  useProductCharacteristics,
  type ProductCharacteristicKeyRow,
} from '~/composables/useProductCharacteristics'

const { mockSupabase, mockLogAction, mockUser } = vi.hoisted(() => ({
  mockSupabase: {
    from: vi.fn(),
  },
  mockLogAction: vi.fn(),
  mockUser: { id: 'admin-123' },
}))

mockNuxtImport('useSupabaseClient', () => () => mockSupabase)
mockNuxtImport('useSupabaseUser', () => () => ({ value: mockUser }))
mockNuxtImport('useLogger', () => () => ({ logAction: mockLogAction }))

describe('useProductCharacteristics Composable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetchCharacteristicKeys should return paginated official keys with mapped usage_count', async () => {
    const rangeMock = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'k1',
          name: 'Cor',
          is_active: true,
          is_pending: false,
          created_at: '2026-10-25T10:00:00Z',
          updated_at: '2026-10-25T10:00:00Z',
          product_characteristics: [{ count: 4 }],
        },
      ],
      count: 1,
      error: null,
    })

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: rangeMock,
          }),
        }),
      }),
    })

    const { fetchCharacteristicKeys } = useProductCharacteristics()
    const result = await fetchCharacteristicKeys(1, 10)

    expect(result.count).toBe(1)
    expect(result.data).toHaveLength(1)
    expect(result.data[0]?.name).toBe('Cor')
    expect(result.data[0]?.usage_count).toBe(4)
  })

  it('resolveOrCreateCharacteristicKey should create a pending key when not found', async () => {
    const insertSingleMock = vi.fn().mockResolvedValue({
      data: {
        id: 'k-new',
        name: 'Tipo de Ponta',
        is_active: false,
        is_pending: true,
        created_at: '2026-10-25T10:00:00Z',
        updated_at: '2026-10-25T10:00:00Z',
      },
      error: null,
    })

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        ilike: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: insertSingleMock,
        }),
      }),
    })

    const { resolveOrCreateCharacteristicKey } = useProductCharacteristics()
    const created = await resolveOrCreateCharacteristicKey('Tipo de Ponta')

    expect(created.id).toBe('k-new')
    expect(created.is_pending).toBe(true)
    expect(created.is_active).toBe(false)
    expect(mockLogAction).toHaveBeenCalledWith(
      'CREATE_PENDING_CHARACTERISTIC_KEY',
      expect.stringContaining('Tipo de Ponta'),
      'admin-123',
    )
  })

  it('fetchDistinctValuesForKey should return unique values case-insensitively', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'product_characteristic_keys') {
        return {
          select: vi.fn().mockReturnValue({
            ilike: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'k-cor' }, error: null }),
            }),
          }),
        }
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [{ value: 'Branca' }, { value: 'branca' }, { value: 'Azul' }],
              error: null,
            }),
          }),
        }),
      }
    })

    const { fetchDistinctValuesForKey } = useProductCharacteristics()
    const values = await fetchDistinctValuesForKey('Cor')

    expect(values).toEqual(['Branca', 'Azul'])
  })

  it('approvePendingCharacteristicKey should update key to official when name does not collide', async () => {
    const updateEqMock = vi.fn().mockResolvedValue({ error: null })
    const updateMock = vi.fn().mockReturnValue({ eq: updateEqMock })

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        ilike: vi.fn().mockReturnValue({
          neq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
      update: updateMock,
    })

    const { approvePendingCharacteristicKey } = useProductCharacteristics()
    const pendingKey: ProductCharacteristicKeyRow = {
      id: 'k-pend',
      name: 'luminosidade',
      is_active: false,
      is_pending: true,
      created_at: '2026-10-25T10:00:00Z',
      updated_at: '2026-10-25T10:00:00Z',
    }

    await approvePendingCharacteristicKey(pendingKey, 'Luminosidade (Lumens)')

    expect(updateMock).toHaveBeenCalledWith({
      name: 'Luminosidade (Lumens)',
      is_pending: false,
      is_active: true,
    })
    expect(updateEqMock).toHaveBeenCalledWith('id', 'k-pend')
    expect(mockLogAction).toHaveBeenCalledWith(
      'APPROVE_CHARACTERISTIC_KEY',
      expect.stringContaining('Luminosidade (Lumens)'),
      'admin-123',
    )
  })

  it('mergeCharacteristicKeys should migrate non-conflicting products and concatenate values on conflict', async () => {
    const updateCharEqMock = vi.fn().mockResolvedValue({ error: null })
    const updateCharMock = vi.fn().mockReturnValue({ eq: updateCharEqMock })
    const deleteCharEqMock = vi.fn().mockResolvedValue({ error: null })
    const deleteKeyEqMock = vi.fn().mockResolvedValue({ error: null })

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'product_characteristics') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockImplementation((col: string, val: string) => {
              // First call: .select('*').eq('key_id', sourceKey.id)
              if (col === 'key_id' && val === 'key-tipo-ponta') {
                return Promise.resolve({
                  data: [
                    { id: 'pc-1', product_id: 'prod-1', key_id: 'key-tipo-ponta', value: '1.0mm' },
                    {
                      id: 'pc-2',
                      product_id: 'prod-2',
                      key_id: 'key-tipo-ponta',
                      value: 'Esferográfica',
                    },
                  ],
                  error: null,
                })
              }
              // Second call: .select('*').eq('product_id', ...).eq('key_id', targetKeyId).maybeSingle()
              return {
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockImplementation(() => {
                    if (val === 'prod-1') {
                      // prod-1 does not have targetKeyId yet
                      return Promise.resolve({ data: null, error: null })
                    }
                    // prod-2 already has targetKeyId ('key-ponta') with value 'Média 1.0mm'
                    return Promise.resolve({
                      data: {
                        id: 'pc-target-2',
                        product_id: 'prod-2',
                        key_id: 'key-ponta',
                        value: 'Média 1.0mm',
                      },
                      error: null,
                    })
                  }),
                }),
              }
            }),
          }),
          update: updateCharMock,
          delete: vi.fn().mockReturnValue({ eq: deleteCharEqMock }),
        }
      }
      if (table === 'product_characteristic_keys') {
        return {
          delete: vi.fn().mockReturnValue({ eq: deleteKeyEqMock }),
        }
      }
      return {}
    })

    const { mergeCharacteristicKeys } = useProductCharacteristics()
    const sourceKey: ProductCharacteristicKeyRow = {
      id: 'key-tipo-ponta',
      name: 'Tipo de ponta',
      is_active: false,
      is_pending: true,
      created_at: '2026-10-25T10:00:00Z',
      updated_at: '2026-10-25T10:00:00Z',
    }

    await mergeCharacteristicKeys(sourceKey, 'key-ponta')

    // prod-1 should be migrated to key-ponta
    expect(updateCharMock).toHaveBeenCalledWith({ key_id: 'key-ponta' })
    expect(updateCharEqMock).toHaveBeenCalledWith('id', 'pc-1')

    // prod-2 had a conflict, so its existing target row should be updated with combined value and duplicate deleted
    expect(updateCharMock).toHaveBeenCalledWith({ value: 'Média 1.0mm / Esferográfica' })
    expect(updateCharEqMock).toHaveBeenCalledWith('id', 'pc-target-2')
    expect(deleteCharEqMock).toHaveBeenCalledWith('id', 'pc-2')

    // Source key should be deleted
    expect(deleteKeyEqMock).toHaveBeenCalledWith('id', 'key-tipo-ponta')
    expect(mockLogAction).toHaveBeenCalledWith(
      'MERGE_CHARACTERISTIC_KEY',
      expect.stringContaining('Tipo de ponta'),
      'admin-123',
    )
  })
})
