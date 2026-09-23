import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

import { useMeasurementUnits } from '~/composables/useMeasurementUnits'

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

describe('useMeasurementUnits', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
      insert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
      delete: vi.fn().mockReturnThis(),
    })
  })

  it('fetchUnits should return data', async () => {
    const mockData = [{ id: '1', name: 'Unit 1' }]

    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
    })

    const { fetchUnits } = useMeasurementUnits()
    const result = await fetchUnits()

    expect(mockSupabase.from).toHaveBeenCalledWith('measurement_units')
    expect(result).toEqual(mockData)
  })

  it('createUnit should insert a new unit and log action', async () => {
    const { createUnit } = useMeasurementUnits()

    const payload = { name: 'Kg', legacy_alias: 'Quilograma', is_active: true }
    await createUnit(payload)

    expect(mockSupabase.from).toHaveBeenCalledWith('measurement_units')
    expect(mockLogAction).toHaveBeenCalledWith(
      'CREATE_UNIT',
      'Nova unidade de medida criada: Kg',
      'user-123',
    )
  })

  it('updateUnit should update an existing unit and log action', async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: null })
    mockSupabase.from.mockReturnValueOnce({
      update: vi.fn().mockReturnThis(),
      eq: mockEq,
    })

    const { updateUnit } = useMeasurementUnits()

    const payload = { name: 'L', legacy_alias: 'Litro', is_active: true }
    await updateUnit('123', payload)

    expect(mockEq).toHaveBeenCalledWith('id', '123')
    expect(mockLogAction).toHaveBeenCalledWith(
      'UPDATE_UNIT',
      'Unidade de medida atualizada: L',
      'user-123',
    )
  })

  it('toggleUnitStatus should switch status and log action', async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: null })
    mockSupabase.from.mockReturnValueOnce({
      update: vi.fn().mockReturnThis(),
      eq: mockEq,
    })

    const { toggleUnitStatus } = useMeasurementUnits()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockUnit: any = { id: '1', name: 'Metro', is_active: true }
    await toggleUnitStatus(mockUnit)

    expect(mockEq).toHaveBeenCalledWith('id', '1')
    expect(mockLogAction).toHaveBeenCalledWith(
      'TOGGLE_UNIT_STATUS',
      'Unidade Metro alterada para INATIVO',
      'user-123',
    )
  })

  it('approvePendingUnit should update unit to active and not pending', async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: null })
    mockSupabase.from.mockReturnValueOnce({
      update: vi.fn().mockReturnThis(),
      eq: mockEq,
    })

    const { approvePendingUnit } = useMeasurementUnits()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockUnit: any = { id: '2', name: 'Pend' }
    await approvePendingUnit(mockUnit)

    expect(mockEq).toHaveBeenCalledWith('id', '2')
    expect(mockLogAction).toHaveBeenCalledWith(
      'APPROVE_UNIT',
      'Unidade sugerida aprovada: Pend',
      'user-123',
    )
  })
})
