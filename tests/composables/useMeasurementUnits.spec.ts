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
      in: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnValue({
        error: null,
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'new-id' }, error: null }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          error: null,
        }),
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          error: null,
        }),
      }),
    })
  })

  it('fetchUnits should return data mapped with measurement_unit_aliases from links', async () => {
    const { fetchUnits } = useMeasurementUnits()
    const mockData = [
      {
        id: 'unit-1',
        name: 'Pacote 100 Unidade',
        is_active: true,
        measurement_unit_alias_links: [
          { alias: { id: 'alias-1', code: 201, name: 'Pacote 100 Unidade' } },
          { alias: { id: 'alias-2', code: 36, name: 'Cento' } },
        ],
      },
    ]

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValueOnce({ data: mockData, error: null }),
      }),
    })

    const result = await fetchUnits()
    expect(mockSupabase.from).toHaveBeenCalledWith('measurement_units')
    expect(result[0].measurement_unit_aliases).toHaveLength(2)
    expect(result[0].measurement_unit_aliases?.[0].code).toBe(201)
    expect(result[0].measurement_unit_aliases?.[1].code).toBe(36)
  })

  it('createUnit should insert unit and its links into measurement_unit_alias_links', async () => {
    const { createUnit } = useMeasurementUnits()
    const mockInsert = vi.fn().mockReturnValue({
      error: null,
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: 'unit-abc' }, error: null }),
      }),
    })

    mockSupabase.from.mockReturnValue({
      insert: mockInsert,
    })

    await createUnit({
      name: 'Pacote 100 Unidade',
      aliasIds: ['alias-1', 'alias-2'],
      is_active: true,
    })

    expect(mockSupabase.from).toHaveBeenCalledWith('measurement_units')
    expect(mockSupabase.from).toHaveBeenCalledWith('measurement_unit_alias_links')
    expect(mockInsert).toHaveBeenCalledWith([
      { unit_id: 'unit-abc', alias_id: 'alias-1' },
      { unit_id: 'unit-abc', alias_id: 'alias-2' },
    ])
    expect(mockLogAction).toHaveBeenCalledWith(
      'CREATE_UNIT',
      'Nova unidade de medida criada: Pacote 100 Unidade',
      'user-123',
    )
  })

  it('updateUnit should update unit, delete old links, and insert new links', async () => {
    const { updateUnit } = useMeasurementUnits()
    const mockDeleteEq = vi.fn().mockResolvedValue({ error: null })
    const mockUpdateEq = vi.fn().mockResolvedValue({ error: null })
    const mockInsert = vi.fn().mockResolvedValue({ error: null })

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'measurement_units') {
        return {
          update: vi.fn().mockReturnValue({ eq: mockUpdateEq }),
        }
      }
      if (table === 'measurement_unit_alias_links') {
        return {
          delete: vi.fn().mockReturnValue({ eq: mockDeleteEq }),
          insert: mockInsert,
        }
      }
      return {}
    })

    await updateUnit('unit-123', {
      name: 'Caixa 100 Unidade',
      aliasIds: ['alias-36', 'alias-38'],
      is_active: true,
    })

    expect(mockDeleteEq).toHaveBeenCalledWith('unit_id', 'unit-123')
    expect(mockInsert).toHaveBeenCalledWith([
      { unit_id: 'unit-123', alias_id: 'alias-36' },
      { unit_id: 'unit-123', alias_id: 'alias-38' },
    ])
    expect(mockLogAction).toHaveBeenCalledWith(
      'UPDATE_UNIT',
      'Unidade de medida atualizada: Caixa 100 Unidade',
      'user-123',
    )
  })

  it('fetchAliases should return data mapped with measurement_units from links', async () => {
    const { fetchAliases } = useMeasurementUnits()
    const mockData = [
      {
        id: 'alias-36',
        code: 36,
        name: 'Cento',
        measurement_unit_alias_links: [
          { unit: { id: 'unit-1', name: 'Pacote 100 Unidade' } },
          { unit: { id: 'unit-2', name: 'Caixa 100 Unidade' } },
        ],
      },
    ]

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValueOnce({ data: mockData, error: null }),
      }),
    })

    const result = await fetchAliases()
    expect(mockSupabase.from).toHaveBeenCalledWith('measurement_unit_aliases')
    expect(result[0].measurement_units).toHaveLength(2)
    expect(result[0].measurement_units?.[0].name).toBe('Pacote 100 Unidade')
    expect(result[0].measurement_units?.[1].name).toBe('Caixa 100 Unidade')
  })

  it('createAliasAsAdmin should insert alias and links if unitIds provided', async () => {
    const { createAliasAsAdmin } = useMeasurementUnits()
    const mockInsert = vi.fn().mockReturnValue({
      error: null,
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: 'alias-new' }, error: null }),
      }),
    })

    mockSupabase.from.mockReturnValue({
      insert: mockInsert,
    })

    await createAliasAsAdmin({
      code: 99,
      name: 'Grosa',
      unitIds: ['unit-1', 'unit-2'],
    })

    expect(mockSupabase.from).toHaveBeenCalledWith('measurement_unit_aliases')
    expect(mockSupabase.from).toHaveBeenCalledWith('measurement_unit_alias_links')
    expect(mockInsert).toHaveBeenCalledWith([
      { unit_id: 'unit-1', alias_id: 'alias-new' },
      { unit_id: 'unit-2', alias_id: 'alias-new' },
    ])
  })

  it('getAliasesByUnitId should return linked aliases for a given unit', async () => {
    const { getAliasesByUnitId } = useMeasurementUnits()
    const mockData = [
      { alias: { id: 'a1', code: 36, name: 'Cento' } },
      { alias: { id: 'a2', code: 201, name: 'Pacote 100 Unidade' } },
    ]

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      }),
    })

    const result = await getAliasesByUnitId('unit-1')
    expect(result).toHaveLength(2)
    expect(result[0].name).toBe('Cento')
    expect(result[1].code).toBe(201)
  })

  it('toggleUnitStatus should switch status and log action', async () => {
    const { toggleUnitStatus } = useMeasurementUnits()
    const mockEq = vi.fn().mockResolvedValue({ error: null })
    mockSupabase.from.mockImplementation(() => ({
      update: vi.fn().mockReturnValue({ eq: mockEq }),
    }))
    await toggleUnitStatus({ id: '1', name: 'Cx', is_active: true } as UnitRow)
    expect(mockEq).toHaveBeenCalledWith('id', '1')
    expect(mockLogAction).toHaveBeenCalledWith(
      'TOGGLE_UNIT_STATUS',
      'Unidade Cx alterada para INATIVO',
      'user-123',
    )
  })

  it('approvePendingUnit should update unit to active and unpend linked aliases', async () => {
    const { approvePendingUnit } = useMeasurementUnits()
    const mockUpdateEq = vi.fn().mockResolvedValue({ error: null })
    const mockIn = vi.fn().mockResolvedValue({ error: null })

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'measurement_units') {
        return {
          update: vi.fn().mockReturnValue({ eq: mockUpdateEq }),
        }
      }
      if (table === 'measurement_unit_alias_links') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [{ alias_id: 'alias-10' }], error: null }),
          }),
        }
      }
      if (table === 'measurement_unit_aliases') {
        return {
          update: vi.fn().mockReturnValue({ in: mockIn }),
        }
      }
      return {}
    })

    await approvePendingUnit({ id: '2', name: 'Test', is_pending: true } as UnitRow)
    expect(mockUpdateEq).toHaveBeenCalledWith('id', '2')
    expect(mockIn).toHaveBeenCalledWith('id', ['alias-10'])
    expect(mockLogAction).toHaveBeenCalledWith(
      'APPROVE_UNIT',
      'Unidade sugerida aprovada: Test',
      'user-123',
    )
  })

  it('resolveOrCreateUnit should return existing unit id if found', async () => {
    const { resolveOrCreateUnit } = useMeasurementUnits()
    const mockMaybeSingle = vi.fn().mockResolvedValue({ data: { id: 'existing-unit-id' } })
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        ilike: vi.fn().mockReturnValue({
          maybeSingle: mockMaybeSingle,
        }),
      }),
    })

    const unitId = await resolveOrCreateUnit('Caixa')
    expect(unitId).toBe('existing-unit-id')
  })

  it('resolveOrCreateUnit should insert a new pending unit with is_pending: true and is_active: false if not found', async () => {
    const { resolveOrCreateUnit } = useMeasurementUnits()
    const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null })
    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: 'brand-new-unit-id' }, error: null }),
      }),
    })

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        ilike: vi.fn().mockReturnValue({
          maybeSingle: mockMaybeSingle,
        }),
      }),
      insert: mockInsert,
    })

    const unitId = await resolveOrCreateUnit('Nova Caixa Especial')
    expect(mockInsert).toHaveBeenCalledWith({
      name: 'Nova Caixa Especial',
      is_pending: true,
      is_active: false,
    })
    expect(unitId).toBe('brand-new-unit-id')
  })

  it('resolveOrCreateUnit should fallback to Unidade when search string is empty', async () => {
    const { resolveOrCreateUnit } = useMeasurementUnits()
    const mockMaybeSingle = vi.fn().mockResolvedValue({ data: { id: 'default-unidade-id' } })
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: mockMaybeSingle,
        }),
      }),
    })

    const unitId = await resolveOrCreateUnit('')
    expect(unitId).toBe('default-unidade-id')
  })
})
