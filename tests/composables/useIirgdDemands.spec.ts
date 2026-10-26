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

describe('useIirgdDemands', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    supabaseFromMock.select.mockReturnValue(supabaseFromMock)
    supabaseFromMock.order.mockResolvedValue({
      data: [{ id: '1', name: 'Test' }],
      count: 1,
      error: null,
    })
    supabaseFromMock.ilike.mockResolvedValue({
      data: [],
      error: null,
    })
  })

  it('fetchDemands should return data', async () => {
    const { fetchDemands } = useIirgdDemands()
    const result = await fetchDemands()
    expect(supabaseMock.from).toHaveBeenCalledWith('iirgd_demands')
    expect(result).toEqual({ data: [{ id: '1', name: 'Test' }], count: 1 })
  })

  it('fetchDemandCounts should count RGs and Antecedentes separately', async () => {
    supabaseFromMock.select.mockResolvedValueOnce({
      data: [
        { status: 'new', document_type_id: '1', iirgd_document_types: { name: '1ª Via RG' } },
        {
          status: 'confronted',
          document_type_id: '1',
          iirgd_document_types: { name: '1ª Via RG' },
        },
        { status: 'released', document_type_id: '1', iirgd_document_types: { name: '1ª Via RG' } },
        { status: 'issued', document_type_id: '1', iirgd_document_types: { name: '1ª Via RG' } },
        {
          status: 'issued',
          document_type_id: '2',
          iirgd_document_types: { name: 'Antecedentes Numeral' },
        },
        {
          status: 'issued',
          document_type_id: '3',
          iirgd_document_types: { name: 'Antecedentes Nominal' },
        },
        {
          status: 'protocol_cancelled',
          document_type_id: '1',
          iirgd_document_types: { name: '1ª Via RG' },
        },
      ],
      error: null,
    })

    const { fetchDemandCounts } = useIirgdDemands()
    const counts = await fetchDemandCounts()

    expect(counts).toEqual({
      inProgress: 1,
      consulted: 1,
      released: 1,
      issued: 1,
      issuedAntecedents: 2,
      errors: 1,
    })
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

  it('createDemand should check citizen, create citizen if not exists, create demand and log action', async () => {
    // Mock the `eq` call for checking existing citizen to return empty
    supabaseFromMock.eq.mockResolvedValueOnce({ data: [], error: null })
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
    // Mock active demands check to return empty
    supabaseFromMock.in.mockResolvedValueOnce({ data: [], error: null })
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

  it('createDemand should throw error if citizen found by CPF has an active demand', async () => {
    // Mock citizen found by CPF
    supabaseFromMock.eq.mockResolvedValueOnce({
      data: [{ id: 'cit-cpf-1', name: 'JANE DOE', cpf: '000.000.000-00', rg: null }],
      error: null,
    })
    // Mock active demands query to return an active demand
    supabaseFromMock.in.mockResolvedValueOnce({
      data: [{ id: 'active-dem-1', status: 'new' }],
      error: null,
    })

    const { createDemand } = useIirgdDemands()
    await expect(
      createDemand({
        station_code: '1342-5',
        rg: null,
        cpf: '000.000.000-00',
        name: 'Jane Doe',
      }),
    ).rejects.toThrow('Este cidadão já possui uma solicitação em andamento.')
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
    supabaseFromMock.in.mockResolvedValueOnce({ data: [], error: null })
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

  it('updateDemand should update a demand and log action', async () => {
    supabaseFromMock.single.mockResolvedValueOnce({ data: { id: '123' }, error: null })

    const { updateDemand } = useIirgdDemands()
    const result = await updateDemand('123', { status: 'Concluído' })

    expect(supabaseFromMock.update).toHaveBeenCalledWith({ status: 'Concluído' })
    expect(supabaseFromMock.eq).toHaveBeenCalledWith('id', '123')
    expect(logActionMock).toHaveBeenCalledWith(
      'UPDATE_IIRGD_DEMAND',
      'Demanda IIRGD atualizada: ID 123',
    )
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

    it('should update multiple demands in Supabase and log action', async () => {
      const mockUpdated = [
        { id: 'dem-1', status: 'released' },
        { id: 'dem-2', status: 'released' },
      ]
      supabaseFromMock.select.mockResolvedValueOnce({ data: mockUpdated, error: null })

      const { updateDemandsBatch } = useIirgdDemands()
      const result = await updateDemandsBatch(['dem-1', 'dem-2'], { status: 'released' })

      expect(supabaseMock.from).toHaveBeenCalledWith('iirgd_demands')
      expect(supabaseFromMock.update).toHaveBeenCalledWith({ status: 'released' })
      expect(supabaseFromMock.in).toHaveBeenCalledWith('id', ['dem-1', 'dem-2'])
      expect(logActionMock).toHaveBeenCalledWith(
        'BATCH_UPDATE_IIRGD_DEMAND_STATUS',
        "Atualização de status em lote para 'Liberado' em 2 demanda(s).",
      )
      expect(result).toEqual(mockUpdated)
    })

    it('should include observation if provided and not empty', async () => {
      const mockUpdated = [{ id: 'dem-1', status: 'confronted' }]
      supabaseFromMock.select.mockResolvedValueOnce({ data: mockUpdated, error: null })

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
      supabaseFromMock.select.mockResolvedValueOnce({
        data: null,
        error: new Error('DB error'),
      })

      const { updateDemandsBatch } = useIirgdDemands()
      await expect(updateDemandsBatch(['dem-1'], { status: 'released' })).rejects.toThrow(
        'Erro ao atualizar demandas do IIRGD em lote',
      )
    })
  })
})
