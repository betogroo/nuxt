import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useMeasurementUnits } from '~/composables/useMeasurementUnits'
import type { UnitRow } from '~/composables/useMeasurementUnits'

const mockSupabase = {
  from: vi.fn(),
}
const mockLogAction = vi.fn()
const mockUser = { id: 'user-123' }

mockNuxtImport('useSupabaseClient', () => () => mockSupabase)
mockNuxtImport('useSupabaseUser', () => () => ({ value: mockUser }))
mockNuxtImport('useLogger', () => () => ({ logAction: mockLogAction }))

describe('useMeasurementUnits', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnValue({
        error: null,
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'new-id' }, error: null }),
        }),
      }),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
    })
  })

  it('fetchUnits should return data', async () => {
    const { fetchUnits } = useMeasurementUnits()
    mockSupabase.from('measurement_units').select().order.mockResolvedValueOnce({ data: [], error: null })
    await fetchUnits()
    expect(mockSupabase.from).toHaveBeenCalledWith('measurement_units')
  })

  it('createUnit should insert a new unit and log action', async () => {
    const { createUnit } = useMeasurementUnits()
    await createUnit({ name: 'Caixa', aliases: ['CX', 'Caixa'], is_active: true })
    expect(mockSupabase.from).toHaveBeenCalledWith('measurement_units')
    expect(mockLogAction).toHaveBeenCalledWith(
      'CREATE_UNIT',
      'Nova unidade de medida criada: Caixa',
      'user-123'
    )
  })

  it('updateUnit should update an existing unit and log action', async () => {
    const { updateUnit } = useMeasurementUnits()
    await updateUnit('unit-123', { name: 'Pacote Atualizado', aliases: ['Pct'], is_active: false })
    expect(mockSupabase.from).toHaveBeenCalledWith('measurement_units')
    expect(mockLogAction).toHaveBeenCalledWith(
      'UPDATE_UNIT',
      'Unidade de medida atualizada: Pacote Atualizado',
      'user-123'
    )
  })

  it('toggleUnitStatus should switch status and log action', async () => {
    const { toggleUnitStatus } = useMeasurementUnits()
    const mockEq = vi.fn().mockResolvedValue({ error: null })
    mockSupabase.from.mockImplementation(() => ({ update: vi.fn().mockReturnValue({ eq: mockEq }) }))
    await toggleUnitStatus({ id: '1', name: 'Cx', is_active: true } as UnitRow)
    expect(mockEq).toHaveBeenCalledWith('id', '1')
    expect(mockLogAction).toHaveBeenCalledWith(
      'TOGGLE_UNIT_STATUS',
      'Unidade Cx alterada para INATIVO',
      'user-123'
    )
  })

  it('approvePendingUnit should update unit to active and not pending', async () => {
    const { approvePendingUnit } = useMeasurementUnits()
    const mockEq = vi.fn().mockResolvedValue({ error: null })
    mockSupabase.from.mockImplementation(() => ({ update: vi.fn().mockReturnValue({ eq: mockEq }) }))
    await approvePendingUnit({ id: '2', name: 'Test', is_pending: true } as UnitRow)
    expect(mockEq).toHaveBeenCalledWith('id', '2')
    expect(mockLogAction).toHaveBeenCalledWith(
      'APPROVE_UNIT',
      'Unidade sugerida aprovada: Test',
      'user-123'
    )
  })
})
