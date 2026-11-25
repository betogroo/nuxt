import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useIirgdDemands } from '~/composables/useIirgdDemands'

const supabaseFromMock: Record<string, unknown> = {}
Object.assign(supabaseFromMock, {
  select: vi.fn(() => supabaseFromMock),
  order: vi.fn(() => supabaseFromMock),
  insert: vi.fn(() => supabaseFromMock),
  update: vi.fn(() => supabaseFromMock),
  eq: vi.fn(() => supabaseFromMock),
  neq: vi.fn(() => supabaseFromMock),
  lt: vi.fn(() => supabaseFromMock),
  limit: vi.fn(() => supabaseFromMock),
  not: vi.fn(() => supabaseFromMock),
  or: vi.fn(() => supabaseFromMock),
  in: vi.fn(() => supabaseFromMock),
  ilike: vi.fn().mockResolvedValue({ data: [], error: null }),
  range: vi.fn(() => supabaseFromMock),
  gte: vi.fn(() => supabaseFromMock),
  single: vi.fn().mockResolvedValue({ data: { id: 'new-id' }, error: null }),
})

const supabaseMock = {
  from: vi.fn(() => supabaseFromMock),
}

mockNuxtImport('useSupabaseClient', () => () => supabaseMock)
mockNuxtImport('useSupabaseUser', () => () => ({ value: { id: 'test-user-id' } }))

const logActionMock = vi.fn()
mockNuxtImport('useLogger', () => () => ({
  logAction: logActionMock,
}))

let thenQueue: Array<{ data?: unknown; count?: number; error?: unknown }> = []
const queueSupabaseResults = (
  ...results: Array<{ data?: unknown; count?: number; error?: unknown }>
) => {
  thenQueue.push(...results)
}

describe('useIirgdDemands', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    thenQueue = []
    supabaseFromMock.then = (onfulfilled: (res: unknown) => unknown) => {
      const result =
        thenQueue.length > 0
          ? thenQueue.shift()
          : { data: [{ id: '1', name: 'Test' }], count: 1, error: null }
      return Promise.resolve(result).then(onfulfilled)
    }
    supabaseFromMock.select = vi.fn(() => supabaseFromMock)
    supabaseFromMock.update = vi.fn(() => supabaseFromMock)
    supabaseFromMock.order = vi.fn(() => supabaseFromMock)
    supabaseFromMock.ilike = vi.fn().mockResolvedValue({
      data: [],
      error: null,
    })
    supabaseFromMock.in = vi.fn(() => supabaseFromMock)
    supabaseFromMock.not = vi.fn(() => supabaseFromMock)
    supabaseFromMock.eq = vi.fn(() => supabaseFromMock)
    supabaseFromMock.neq = vi.fn(() => supabaseFromMock)
    supabaseFromMock.lt = vi.fn(() => supabaseFromMock)
    supabaseFromMock.limit = vi.fn().mockResolvedValue({ data: [], error: null })
    supabaseFromMock.single = vi.fn().mockResolvedValue({ data: { id: 'new-id' }, error: null })
  })

  it('fetchDemands should return data', async () => {
    const { fetchDemands } = useIirgdDemands()
    const result = await fetchDemands()
    expect(supabaseMock.from).toHaveBeenCalledWith('iirgd_demands')
    expect(result).toEqual({ data: [{ id: '1', name: 'Test' }], count: 1 })
  })

  it('fetchDemandCounts should count RGs and Antecedentes separately via head requests', async () => {
    supabaseFromMock.ilike.mockResolvedValueOnce({
      data: [{ id: 'doc-ant-1' }],
      error: null,
    })

    const inMock = vi.fn()
    inMock
      .mockResolvedValueOnce({ count: 1, error: null }) // inProgress
      .mockResolvedValueOnce({ count: 1, error: null }) // pendencies
      .mockResolvedValueOnce({ count: 1, error: null }) // consulted
      .mockResolvedValueOnce({ count: 1, error: null }) // released
      .mockResolvedValueOnce({ count: 2, error: null }) // errors
      .mockResolvedValueOnce({ count: 2, error: null }) // issuedAntecedents

    supabaseFromMock.in = inMock
    supabaseFromMock.not = vi.fn().mockResolvedValueOnce({ count: 1, error: null }) // issued RGs

    const { fetchDemandCounts } = useIirgdDemands()
    const counts = await fetchDemandCounts()

    expect(counts).toEqual({
      inProgress: 1,
      pendencies: 1,
      consulted: 1,
      released: 1,
      issued: 1,
      issuedAntecedents: 2,
      errors: 2,
    })
  })

  it('fetchDemandCounts should handle zero antecedent types gracefully', async () => {
    supabaseFromMock.ilike.mockResolvedValueOnce({
      data: [],
      error: null,
    })

    const inMock = vi.fn()
    inMock
      .mockResolvedValueOnce({ count: 5, error: null }) // inProgress
      .mockResolvedValueOnce({ count: 2, error: null }) // pendencies
      .mockResolvedValueOnce({ count: 0, error: null }) // consulted
      .mockResolvedValueOnce({ count: 3, error: null }) // released
      .mockResolvedValueOnce({ count: 1, error: null }) // errors

    supabaseFromMock.in = inMock
    supabaseFromMock.eq = vi.fn().mockResolvedValueOnce({ count: 4, error: null }) // issued RGs

    const { fetchDemandCounts } = useIirgdDemands()
    const counts = await fetchDemandCounts()

    expect(counts).toEqual({
      inProgress: 5,
      pendencies: 2,
      consulted: 0,
      released: 3,
      issued: 4,
      issuedAntecedents: 0,
      errors: 1,
    })
  })

  it('fetchDemands should support querying all demands without statusGroup', async () => {
    const { fetchDemands } = useIirgdDemands()
    await fetchDemands({ page: 2, itemsPerPage: 20 })
    expect(supabaseFromMock.in).not.toHaveBeenCalledWith('status', expect.anything())
    expect(supabaseFromMock.order).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(supabaseFromMock.range).toHaveBeenCalledWith(20, 39)
  })

  it('fetchDemands should filter by single status when provided', async () => {
    const { fetchDemands } = useIirgdDemands()
    await fetchDemands({ status: 'new' })
    expect(supabaseFromMock.eq).toHaveBeenCalledWith('status', 'new')
  })

  it('fetchDemands should filter by documentTypeId when provided', async () => {
    const { fetchDemands } = useIirgdDemands()
    await fetchDemands({ documentTypeId: 'doc-123' })
    expect(supabaseFromMock.eq).toHaveBeenCalledWith('document_type_id', 'doc-123')
  })

  it('fetchDemands should exclude antecedent types when statusGroup is issued', async () => {
    supabaseFromMock.ilike.mockResolvedValueOnce({
      data: [{ id: 'ant-1' }, { id: 'ant-2' }],
      error: null,
    })

    const { fetchDemands } = useIirgdDemands()
    await fetchDemands({ statusGroup: 'issued' })

    expect(supabaseFromMock.in).toHaveBeenCalledWith('status', ['issued'])
    expect(supabaseFromMock.not).toHaveBeenCalledWith('document_type_id', 'in', '(ant-1,ant-2)')
  })

  it('fetchDemands should filter only antecedent types when statusGroup is issued-antecedents', async () => {
    supabaseFromMock.ilike.mockResolvedValueOnce({
      data: [{ id: 'ant-1' }, { id: 'ant-2' }],
      error: null,
    })

    const { fetchDemands } = useIirgdDemands()
    await fetchDemands({ statusGroup: 'issued-antecedents' })

    expect(supabaseFromMock.in).toHaveBeenCalledWith('status', ['issued'])
    expect(supabaseFromMock.in).toHaveBeenCalledWith('document_type_id', ['ant-1', 'ant-2'])
  })

  it('fetchDemands should return empty when statusGroup is issued-antecedents and no antecedent types exist', async () => {
    supabaseFromMock.ilike.mockResolvedValueOnce({
      data: [],
      error: null,
    })

    const { fetchDemands } = useIirgdDemands()
    const result = await fetchDemands({ statusGroup: 'issued-antecedents' })

    expect(result).toEqual({ data: [], count: 0 })
  })

  it('fetchDemands should filter error statuses including unknown_error when statusGroup is errors', async () => {
    const { fetchDemands } = useIirgdDemands()
    await fetchDemands({ statusGroup: 'errors' })

    expect(supabaseFromMock.in).toHaveBeenCalledWith('status', [
      'protocol_cancelled',
      'awaiting_collection',
      'confrontation_failed',
      'unknown_error',
    ])
  })

  it('createDemand should check citizen, create citizen if not exists, create demand and log action', async () => {
    // Mock checking existing citizen by RG and then by CPF to return empty
    queueSupabaseResults({ data: [], error: null }, { data: [], error: null })
    // Mock the insert for citizen
    supabaseFromMock.single.mockResolvedValueOnce({ data: { id: 'cit-123' }, error: null })
    // Mock the insert for demand
    supabaseFromMock.single.mockResolvedValueOnce({ data: { id: 'dem-123' }, error: null })

    const { createDemand } = useIirgdDemands()
    const payload = {
      station_code: '1342-5',
      rg: '00012345-6',
      cpf: '000.000.000-00',
      name: 'John Doe',
      document_type_id: 'doc-123',
      observation: 'Obs',
    }

    const result = await createDemand(payload)

    // Checked if citizen exists
    expect(supabaseMock.from).toHaveBeenCalledWith('iirgd_citizens')
    expect(supabaseFromMock.eq).toHaveBeenCalledWith('rg', '00012345-6')

    // Inserted citizen
    expect(supabaseFromMock.insert).toHaveBeenCalledWith([
      {
        name: 'JOHN DOE',
        rg: '00012345-6',
        cpf: '000.000.000-00',
        other_document: null,
        created_by: 'test-user-id',
      },
    ])

    // Inserted demand
    expect(supabaseMock.from).toHaveBeenCalledWith('iirgd_demands')
    expect(supabaseFromMock.insert).toHaveBeenCalledWith([
      {
        citizen_id: 'cit-123',
        document_type_id: 'doc-123',
        station_code: '1342-5',
        observation: 'Obs',
        status: 'new',
        created_by: 'test-user-id',
      },
    ])

    expect(logActionMock).toHaveBeenCalledWith(
      'CREATE_IIRGD_DEMAND',
      `Nova demanda IIRGD criada para JOHN DOE (Posto: 1342-5)`,
    )
    expect(result).toEqual({ id: 'dem-123' })
  })

  it('createDemand should find existing citizen by CPF when RG is not provided', async () => {
    // Mock eq call for checking existing citizen by CPF to return existing citizen
    supabaseFromMock.eq.mockResolvedValueOnce({
      data: [{ id: 'cit-cpf-1', name: 'JANE DOE', cpf: '000.000.000-00', rg: null }],
      error: null,
    })
    // Mock demand insert
    supabaseFromMock.single.mockResolvedValueOnce({ data: { id: 'dem-cpf-1' }, error: null })

    const { createDemand } = useIirgdDemands()
    const payload = {
      station_code: '1342-5',
      rg: null,
      cpf: '000.000.000-00',
      name: 'Jane Doe',
      document_type_id: 'doc-ant-1',
    }

    const result = await createDemand(payload)

    // Checked if citizen exists by CPF
    expect(supabaseMock.from).toHaveBeenCalledWith('iirgd_citizens')
    expect(supabaseFromMock.eq).toHaveBeenCalledWith('cpf', '000.000.000-00')

    // Demand inserted with citizen_id from existing citizen
    expect(supabaseMock.from).toHaveBeenCalledWith('iirgd_demands')
    expect(supabaseFromMock.insert).toHaveBeenCalledWith([
      {
        citizen_id: 'cit-cpf-1',
        document_type_id: 'doc-ant-1',
        station_code: '1342-5',
        observation: undefined,
        status: 'new',
        created_by: 'test-user-id',
      },
    ])
    expect(result).toEqual({ id: 'dem-cpf-1' })
  })

  it('createDemand should allow creating demand even if citizen found by CPF has an active demand', async () => {
    // Mock citizen found by CPF
    supabaseFromMock.eq.mockResolvedValueOnce({
      data: [{ id: 'cit-cpf-1', name: 'JANE DOE', cpf: '000.000.000-00', rg: null }],
      error: null,
    })
    // Mock demand insert
    supabaseFromMock.single.mockResolvedValueOnce({ data: { id: 'dem-cpf-new' }, error: null })

    const { createDemand } = useIirgdDemands()
    const result = await createDemand({
      station_code: '1342-5',
      rg: null,
      cpf: '000.000.000-00',
      name: 'Jane Doe',
    })
    expect(result).toEqual({ id: 'dem-cpf-new' })
  })

  it('createDemand should throw error if neither RG, CPF nor other_document is provided', async () => {
    const { createDemand } = useIirgdDemands()
    await expect(
      createDemand({
        station_code: '1342-5',
        rg: null,
        cpf: null,
        other_document: null,
        name: 'No Docs',
      }),
    ).rejects.toThrow('É necessário informar ao menos o RG, o CPF ou um Documento de Outro Estado.')
  })

  it('createDemand should find existing citizen by other_document when RG and CPF are not provided', async () => {
    supabaseFromMock.eq.mockResolvedValueOnce({
      data: [
        {
          id: 'cit-other-1',
          name: 'BAHIAN CITIZEN',
          other_document: '0561015112-BA',
          rg: null,
          cpf: null,
        },
      ],
      error: null,
    })
    supabaseFromMock.single.mockResolvedValueOnce({ data: { id: 'dem-other-1' }, error: null })

    const { createDemand } = useIirgdDemands()
    const result = await createDemand({
      station_code: '1342-5',
      name: 'Bahian Citizen',
      other_document: '0561015112-BA',
    })

    expect(supabaseMock.from).toHaveBeenCalledWith('iirgd_citizens')
    expect(supabaseFromMock.eq).toHaveBeenCalledWith('other_document', '0561015112-BA')
    expect(supabaseMock.from).toHaveBeenCalledWith('iirgd_demands')
    expect(supabaseFromMock.insert).toHaveBeenCalledWith([
      {
        citizen_id: 'cit-other-1',
        document_type_id: null,
        station_code: '1342-5',
        observation: undefined,
        status: 'new',
        created_by: 'test-user-id',
      },
    ])
    expect(result).toEqual({ id: 'dem-other-1' })
  })

  it('createDemand should create new citizen with other_document when not found', async () => {
    // Check by other_document returns empty
    supabaseFromMock.eq.mockResolvedValueOnce({ data: [], error: null })
    // Insert citizen
    supabaseFromMock.single.mockResolvedValueOnce({ data: { id: 'cit-new-ba' }, error: null })
    // Insert demand
    supabaseFromMock.single.mockResolvedValueOnce({ data: { id: 'dem-new-ba' }, error: null })

    const { createDemand } = useIirgdDemands()
    const result = await createDemand({
      station_code: '1342-5',
      name: 'New Citizen BA',
      other_document: '0561015112-BA',
    })

    expect(supabaseMock.from).toHaveBeenCalledWith('iirgd_citizens')
    expect(supabaseFromMock.insert).toHaveBeenCalledWith([
      {
        name: 'NEW CITIZEN BA',
        rg: null,
        cpf: null,
        other_document: '0561015112-BA',
        created_by: 'test-user-id',
      },
    ])
    expect(result).toEqual({ id: 'dem-new-ba' })
  })

  it('fetchDemandById should return a single demand', async () => {
    supabaseFromMock.single.mockResolvedValueOnce({ data: { id: 'new-id' }, error: null })
    const { fetchDemandById } = useIirgdDemands()
    const result = await fetchDemandById('123')

    expect(supabaseMock.from).toHaveBeenCalledWith('iirgd_demands')
    expect(supabaseFromMock.select).toHaveBeenCalledWith(
      '*, iirgd_citizens(*), iirgd_document_types(name), profiles(name)',
    )
    expect(supabaseFromMock.eq).toHaveBeenCalledWith('id', '123')
    expect(result).toEqual({ id: 'new-id' })
  })

  it('updateDemand should update non-status fields without status checks', async () => {
    supabaseFromMock.single.mockResolvedValueOnce({ data: { id: '123' }, error: null })

    const { updateDemand } = useIirgdDemands()
    const result = await updateDemand('123', { observation: 'Nova observação' })

    expect(supabaseFromMock.update).toHaveBeenCalledWith({ observation: 'Nova observação' })
    expect(supabaseFromMock.eq).toHaveBeenCalledWith('id', '123')
    expect(logActionMock).toHaveBeenCalledWith(
      'UPDATE_IIRGD_DEMAND',
      'Demanda IIRGD atualizada: ID 123',
    )
    expect(result).toEqual({ id: '123' })
  })

  it('updateDemand should throw error if older unconcluded demand exists when changing status', async () => {
    // Current demand
    supabaseFromMock.single.mockResolvedValueOnce({
      data: { id: '123', citizen_id: 'cit-1', created_at: '2026-10-10T12:00:00Z', status: 'new' },
      error: null,
    })
    // Older unconcluded demand lookup returns an older demand
    supabaseFromMock.limit = vi.fn().mockResolvedValueOnce({
      data: [{ id: 'older-dem', created_at: '2026-10-09T10:00:00Z', status: 'new' }],
      error: null,
    })

    const { updateDemand } = useIirgdDemands()
    await expect(updateDemand('123', { status: 'confronted' })).rejects.toThrow(
      'Não é possível alterar o status desta demanda pois o cidadão possui uma solicitação anterior ainda não concluída.',
    )
  })

  it('updateDemand should update demand when changing status if no older unconcluded demand exists', async () => {
    // Current demand
    supabaseFromMock.single.mockResolvedValueOnce({
      data: { id: '123', citizen_id: 'cit-1', created_at: '2026-10-10T12:00:00Z', status: 'new' },
      error: null,
    })
    // Older unconcluded demand lookup returns empty
    supabaseFromMock.limit = vi.fn().mockResolvedValueOnce({
      data: [],
      error: null,
    })
    // Update call
    supabaseFromMock.single.mockResolvedValueOnce({ data: { id: '123' }, error: null })

    const { updateDemand } = useIirgdDemands()
    const result = await updateDemand('123', { status: 'confronted' })

    expect(supabaseFromMock.update).toHaveBeenCalledWith({ status: 'confronted' })
    expect(result).toEqual({ id: '123' })
  })

  it('fetchDemandStatusHistory should query iirgd_demand_status_history with profile name', async () => {
    const mockHistory = [
      {
        id: 'hist-1',
        demand_id: '123',
        status: 'new',
        created_at: '2026-10-10T10:00:00Z',
        profiles: { name: 'Admin' },
      },
    ]
    supabaseFromMock.order.mockResolvedValueOnce({ data: mockHistory, error: null })

    const { fetchDemandStatusHistory } = useIirgdDemands()
    const result = await fetchDemandStatusHistory('123')

    expect(supabaseMock.from).toHaveBeenCalledWith('iirgd_demand_status_history')
    expect(supabaseFromMock.select).toHaveBeenCalledWith('*, profiles(name)')
    expect(supabaseFromMock.eq).toHaveBeenCalledWith('demand_id', '123')
    expect(result).toEqual(mockHistory)
  })

  it('fetchIssuedDemandsTrend should aggregate issued demands over given days', async () => {
    const todayStr = new Date().toISOString().split('T')[0]
    const mockIssued = [{ created_at: `${todayStr}T12:00:00Z` }]
    supabaseFromMock.order.mockResolvedValueOnce({ data: mockIssued, error: null })

    const { fetchIssuedDemandsTrend } = useIirgdDemands()
    const result = await fetchIssuedDemandsTrend(7)

    expect(supabaseMock.from).toHaveBeenCalledWith('iirgd_demand_status_history')
    expect(supabaseFromMock.eq).toHaveBeenCalledWith('status', 'issued')
    expect(result.labels).toHaveLength(7)
    expect(result.series).toHaveLength(7)
    expect(result.labels).toContain(todayStr)
    expect(result.series[result.labels.indexOf(todayStr)]).toBe(1)
  })

  describe('updateDemandsBatch', () => {
    it('should throw an error if no ids are provided', async () => {
      const { updateDemandsBatch } = useIirgdDemands()
      await expect(updateDemandsBatch([], { status: 'released' })).rejects.toThrow(
        'Nenhuma demanda selecionada para atualização.',
      )
    })

    it('should throw error when any demand in batch has an older unconcluded demand', async () => {
      queueSupabaseResults(
        {
          data: [
            {
              id: 'dem-2',
              citizen_id: 'cit-1',
              created_at: '2026-10-10T15:00:00Z',
              status: 'new',
              iirgd_citizens: { name: 'JOÃO SILVA' },
            },
          ],
          error: null,
        },
        {
          data: [
            {
              id: 'dem-1',
              citizen_id: 'cit-1',
              created_at: '2026-10-10T10:00:00Z',
              status: 'new',
            },
          ],
          error: null,
        },
      )

      const { updateDemandsBatch } = useIirgdDemands()
      await expect(updateDemandsBatch(['dem-2'], { status: 'confronted' })).rejects.toThrow(
        'Não é possível atualizar em lote: a solicitação de JOÃO SILVA possui uma demanda anterior ainda não concluída.',
      )
    })

    it('should update multiple demands in Supabase and log action', async () => {
      const mockUpdated = [
        { id: 'dem-1', status: 'released' },
        { id: 'dem-2', status: 'released' },
      ]

      queueSupabaseResults(
        {
          data: [
            {
              id: 'dem-1',
              citizen_id: 'cit-1',
              created_at: '2026-10-10T10:00:00Z',
              status: 'new',
              iirgd_citizens: { name: 'CIT 1' },
            },
            {
              id: 'dem-2',
              citizen_id: 'cit-2',
              created_at: '2026-10-10T11:00:00Z',
              status: 'new',
              iirgd_citizens: { name: 'CIT 2' },
            },
          ],
          error: null,
        },
        { data: [], error: null },
        { data: mockUpdated, error: null },
      )

      const { updateDemandsBatch } = useIirgdDemands()
      const result = await updateDemandsBatch(['dem-1', 'dem-2'], { status: 'released' })

      expect(supabaseMock.from).toHaveBeenCalledWith('iirgd_demands')
      expect(supabaseFromMock.update).toHaveBeenCalledWith({ status: 'released' })
      expect(logActionMock).toHaveBeenCalledWith(
        'BATCH_UPDATE_IIRGD_DEMAND_STATUS',
        "Atualização de status em lote para 'Liberado' em 2 demanda(s).",
      )
      expect(result).toEqual(mockUpdated)
    })

    it('should include observation if provided and not empty', async () => {
      const mockUpdated = [{ id: 'dem-1', status: 'confronted' }]

      queueSupabaseResults(
        {
          data: [
            {
              id: 'dem-1',
              citizen_id: 'cit-1',
              created_at: '2026-10-10T10:00:00Z',
              status: 'new',
              iirgd_citizens: { name: 'CIT 1' },
            },
          ],
          error: null,
        },
        { data: [], error: null },
        { data: mockUpdated, error: null },
      )

      const { updateDemandsBatch } = useIirgdDemands()
      await updateDemandsBatch(['dem-1'], {
        status: 'confronted',
        observation: '  Lote processado em conjunto  ',
      })

      expect(supabaseFromMock.update).toHaveBeenCalledWith({
        status: 'confronted',
        observation: 'Lote processado em conjunto',
      })
      expect(logActionMock).toHaveBeenCalledWith(
        'BATCH_UPDATE_IIRGD_DEMAND_STATUS',
        "Atualização de status em lote para 'Consultado' em 1 demanda(s).",
      )
    })

    it('should throw error when Supabase fails', async () => {
      queueSupabaseResults({
        data: null,
        error: new Error('DB error'),
      })

      const { updateDemandsBatch } = useIirgdDemands()
      await expect(updateDemandsBatch(['dem-1'], { status: 'released' })).rejects.toThrow(
        'Erro ao validar demandas para atualização em lote.',
      )
    })
  })

  describe('checkBlockedDemands', () => {
    it('should identify demands with older unconcluded demands for the same citizen', async () => {
      const demandsList = [
        {
          id: 'dem-1',
          citizen_id: 'cit-1',
          created_at: '2026-10-10T10:00:00Z',
          station_code: '1342-5',
        },
        {
          id: 'dem-2',
          citizen_id: 'cit-1',
          created_at: '2026-10-10T12:00:00Z',
          station_code: '1342-5',
        },
        {
          id: 'dem-3',
          citizen_id: 'cit-2',
          created_at: '2026-10-10T11:00:00Z',
          station_code: '1342-5',
        },
      ]

      queueSupabaseResults({
        data: [
          { id: 'dem-1', citizen_id: 'cit-1', created_at: '2026-10-10T10:00:00Z', status: 'new' },
        ],
        error: null,
      })

      const { checkBlockedDemands } = useIirgdDemands()
      const blockedMap = await checkBlockedDemands(demandsList)

      expect(blockedMap.get('dem-1')?.isBlocked).toBeFalsy()
      expect(blockedMap.get('dem-2')?.isBlocked).toBe(true)
      expect(blockedMap.get('dem-2')?.olderDemandId).toBe('dem-1')
      expect(blockedMap.get('dem-3')?.isBlocked).toBeFalsy()
    })
  })

  describe('checkExistingCitizensAndActiveDemands', () => {
    it('returns empty maps when no rgs or cpfs are provided', async () => {
      const { checkExistingCitizensAndActiveDemands } = useIirgdDemands()
      const res = await checkExistingCitizensAndActiveDemands({ rgs: [], cpfs: [] })
      expect(res.byRg.size).toBe(0)
      expect(res.byCpf.size).toBe(0)
    })

    it('maps existing citizens by RG and CPF and flags active demands', async () => {
      const inMock = vi.fn()
      inMock
        .mockResolvedValueOnce({
          data: [
            { id: 'cit-1', name: 'CAROLINA', rg: '49770365-8', cpf: null },
            { id: 'cit-2', name: 'ANTONIO', rg: '11864903-6', cpf: '529.982.247-25' },
          ],
          error: null,
        }) // rg query
        .mockResolvedValueOnce({
          data: [{ id: 'cit-2', name: 'ANTONIO', rg: '11864903-6', cpf: '529.982.247-25' }],
          error: null,
        }) // cpf query
        .mockReturnValueOnce({
          in: vi.fn().mockResolvedValueOnce({
            data: [{ citizen_id: 'cit-1', status: 'new' }],
            error: null,
          }),
        }) // active demands query (.in('citizen_id', ...).in('status', ...))

      supabaseFromMock.in = inMock

      const { checkExistingCitizensAndActiveDemands } = useIirgdDemands()
      const res = await checkExistingCitizensAndActiveDemands({
        rgs: ['49770365-8', '11864903-6'],
        cpfs: ['529.982.247-25'],
      })

      expect(res.byRg.get('49770365-8')?.hasActiveDemand).toBe(true)
      expect(res.byRg.get('11864903-6')?.hasActiveDemand).toBe(false)
      expect(res.byCpf.get('529.982.247-25')?.citizen.id).toBe('cit-2')
      expect(res.byCpf.get('529.982.247-25')?.hasActiveDemand).toBe(false)
    })
  })

  describe('createDemandsBatch', () => {
    it('creates new citizens when needed, inserts demands in batch, and logs action', async () => {
      const selectMock = vi.fn()
      selectMock
        .mockResolvedValueOnce({
          data: [{ id: 'new-cit-1', name: 'CAROLINA SANTOS', rg: '49770365-8', cpf: null }],
          error: null,
        }) // created citizens
        .mockResolvedValueOnce({
          data: [
            {
              id: 'dem-1',
              citizen_id: 'new-cit-1',
              station_code: '1342-5',
              document_type_id: 'doc-1',
              status: 'new',
            },
            {
              id: 'dem-2',
              citizen_id: 'existing-cit-2',
              station_code: '1062-9',
              document_type_id: 'doc-2',
              status: 'new',
            },
          ],
          error: null,
        }) // created demands

      supabaseFromMock.insert = vi.fn(() => ({ select: selectMock }))

      const { createDemandsBatch } = useIirgdDemands()
      const result = await createDemandsBatch([
        {
          station_code: '1342-5',
          name: 'CAROLINA SANTOS',
          rg: '49770365-8',
          cpf: null,
          document_type_id: 'doc-1',
        },
        {
          station_code: '1062-9',
          name: 'MARIA FERNANDA',
          rg: '73271119-8',
          cpf: null,
          document_type_id: 'doc-2',
          existingCitizenId: 'existing-cit-2',
        },
      ])

      expect(result).toHaveLength(2)
      expect(supabaseFromMock.insert).toHaveBeenCalledTimes(2)
      expect(logActionMock).toHaveBeenCalledWith(
        'BATCH_CREATE_IIRGD_DEMANDS',
        'Cadastro em lote de 2 demanda(s) do IIRGD.',
      )
    })

    it('assigns sequential created_at timestamps (+1ms per item) and preserves exact input order even if DB returns rows shuffled', async () => {
      const selectMock = vi.fn()
      // DB returns demands in reverse order (cit-3, cit-2, cit-1)
      selectMock.mockResolvedValueOnce({
        data: [
          {
            id: 'dem-3',
            citizen_id: 'cit-3',
            station_code: '1062-9',
            document_type_id: 'doc-2',
            status: 'new',
          },
          {
            id: 'dem-2',
            citizen_id: 'cit-2',
            station_code: '1062-9',
            document_type_id: 'doc-1',
            status: 'new',
          },
          {
            id: 'dem-1',
            citizen_id: 'cit-1',
            station_code: '1342-5',
            document_type_id: 'doc-3',
            status: 'new',
          },
        ],
        error: null,
      })

      const insertSpy = vi.fn(() => ({ select: selectMock }))
      supabaseFromMock.insert = insertSpy

      const { createDemandsBatch } = useIirgdDemands()
      const result = await createDemandsBatch([
        {
          station_code: '1342-5',
          name: 'PRIMEIRO CIDADAO',
          rg: '49770365-8',
          document_type_id: 'doc-3',
          existingCitizenId: 'cit-1',
        },
        {
          station_code: '1062-9',
          name: 'SEGUNDO CIDADAO',
          rg: '73271119-8',
          document_type_id: 'doc-1',
          existingCitizenId: 'cit-2',
        },
        {
          station_code: '1062-9',
          name: 'TERCEIRO CIDADAO',
          rg: '11864903-6',
          document_type_id: 'doc-2',
          existingCitizenId: 'cit-3',
        },
      ])

      // Verify sequential timestamps sent to insert
      expect(insertSpy).toHaveBeenCalledTimes(1)
      const insertedPayloads = insertSpy.mock.calls[0]?.[0] as unknown as Array<{
        citizen_id: string
        created_at: string
        updated_at: string
      }>
      expect(insertedPayloads).toHaveLength(3)
      const t0 = new Date(insertedPayloads[0]!.created_at).getTime()
      const t1 = new Date(insertedPayloads[1]!.created_at).getTime()
      const t2 = new Date(insertedPayloads[2]!.created_at).getTime()
      expect(t1 - t0).toBe(1)
      expect(t2 - t1).toBe(1)

      // Verify returned array matches the presentation order (dem-1, dem-2, dem-3)
      expect(result.map((d) => d.id)).toEqual(['dem-1', 'dem-2', 'dem-3'])
    })
  })
})
