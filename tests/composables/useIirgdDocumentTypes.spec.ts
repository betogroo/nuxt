import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

import { useIirgdDocumentTypes } from '~/composables/useIirgdDocumentTypes'

const { fromMock, logActionMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
  logActionMock: vi.fn(),
}))

mockNuxtImport('useSupabaseClient', () => () => ({ from: fromMock }))
mockNuxtImport('useLogger', () => () => ({ logAction: logActionMock }))

describe('useIirgdDocumentTypes', () => {
  beforeEach(() => {
    fromMock.mockReset()
    logActionMock.mockReset()
  })

  it('createPendingDocumentType inserts as pending and inactive, then logs', async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: 'uuid-1', name: 'Novo' }, error: null })
    const select = vi.fn().mockReturnValue({ single })
    const insert = vi.fn().mockReturnValue({ select })
    fromMock.mockReturnValue({ insert })

    const { createPendingDocumentType } = useIirgdDocumentTypes()
    const result = await createPendingDocumentType('  Novo  ')

    expect(fromMock).toHaveBeenCalledWith('iirgd_document_types')
    expect(insert).toHaveBeenCalledWith({ name: 'Novo', is_pending: true, is_active: false })
    expect(result.id).toBe('uuid-1')
    expect(logActionMock).toHaveBeenCalledWith(
      'CREATE_PENDING_IIRGD_DOCUMENT_TYPE',
      expect.stringContaining('Novo'),
    )
  })

  it('createPendingDocumentType throws on supabase error', async () => {
    const single = vi.fn().mockResolvedValue({ data: null, error: new Error('boom') })
    fromMock.mockReturnValue({
      insert: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single }) }),
    })

    const { createPendingDocumentType } = useIirgdDocumentTypes()
    await expect(createPendingDocumentType('x')).rejects.toThrow('boom')
    expect(logActionMock).not.toHaveBeenCalled()
  })

  it('mergePendingDocumentType re-points demands, deletes pending item and logs', async () => {
    const demandsEq = vi.fn().mockResolvedValue({ error: null })
    const demandsUpdate = vi.fn().mockReturnValue({ eq: demandsEq })
    const typesEq = vi.fn().mockResolvedValue({ error: null })
    const typesDelete = vi.fn().mockReturnValue({ eq: typesEq })
    fromMock.mockImplementation((table: string) =>
      table === 'iirgd_demands' ? { update: demandsUpdate } : { delete: typesDelete },
    )

    const { mergePendingDocumentType } = useIirgdDocumentTypes()
    await mergePendingDocumentType({ id: 'p1', name: 'Pend' } as never, 'target')

    expect(demandsUpdate).toHaveBeenCalledWith({ document_type_id: 'target' })
    expect(demandsEq).toHaveBeenCalledWith('document_type_id', 'p1')
    expect(typesEq).toHaveBeenCalledWith('id', 'p1')
    expect(logActionMock).toHaveBeenCalledWith('MERGE_IIRGD_DOCUMENT_TYPE', expect.any(String))
  })

  it('toggleDocumentTypeStatus flips is_active', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null })
    const update = vi.fn().mockReturnValue({ eq })
    fromMock.mockReturnValue({ update })

    const { toggleDocumentTypeStatus } = useIirgdDocumentTypes()
    await toggleDocumentTypeStatus({ id: 'a', name: 'A', is_active: true } as never)

    expect(update).toHaveBeenCalledWith({ is_active: false })
    expect(eq).toHaveBeenCalledWith('id', 'a')
  })

  describe('fetchActiveDocumentTypesByUsage', () => {
    it('orders by usage_count desc, then name asc, and flags top 3 frequent items', async () => {
      const mockData = [
        {
          id: '1',
          name: 'Zebra Doc',
          is_active: true,
          is_pending: false,
          iirgd_demands: [{ count: 10 }],
        },
        {
          id: '2',
          name: 'Alpha Doc',
          is_active: true,
          is_pending: false,
          iirgd_demands: [{ count: 25 }],
        },
        {
          id: '3',
          name: 'Beta Doc',
          is_active: true,
          is_pending: false,
          iirgd_demands: [{ count: 5 }],
        },
        {
          id: '4',
          name: 'Delta Doc',
          is_active: true,
          is_pending: false,
          iirgd_demands: [{ count: 2 }],
        },
        {
          id: '5',
          name: 'Gamma Doc',
          is_active: true,
          is_pending: false,
          iirgd_demands: [{ count: 0 }],
        },
        { id: '6', name: 'Charlie Doc', is_active: true, is_pending: false, iirgd_demands: [] },
      ]

      const eqPending = vi.fn().mockResolvedValue({ data: mockData, error: null })
      const eqActive = vi.fn().mockReturnValue({ eq: eqPending })
      const select = vi.fn().mockReturnValue({ eq: eqActive })
      fromMock.mockReturnValue({ select })

      const { fetchActiveDocumentTypesByUsage } = useIirgdDocumentTypes()
      const result = await fetchActiveDocumentTypesByUsage()

      expect(fromMock).toHaveBeenCalledWith('iirgd_document_types')
      expect(select).toHaveBeenCalledWith('*, iirgd_demands(count)')
      expect(eqActive).toHaveBeenCalledWith('is_active', true)
      expect(eqPending).toHaveBeenCalledWith('is_pending', false)

      // Expected order:
      // 1. Alpha Doc (25 uses) -> is_frequent: true
      // 2. Zebra Doc (10 uses) -> is_frequent: true
      // 3. Beta Doc (5 uses) -> is_frequent: true
      // 4. Delta Doc (2 uses) -> is_frequent: false
      // 5. Charlie Doc (0 uses) -> is_frequent: false
      // 6. Gamma Doc (0 uses) -> is_frequent: false
      expect(
        result.map((r) => ({ name: r.name, usage: r.usage_count, freq: r.is_frequent })),
      ).toEqual([
        { name: 'Alpha Doc', usage: 25, freq: true },
        { name: 'Zebra Doc', usage: 10, freq: true },
        { name: 'Beta Doc', usage: 5, freq: true },
        { name: 'Delta Doc', usage: 2, freq: false },
        { name: 'Charlie Doc', usage: 0, freq: false },
        { name: 'Gamma Doc', usage: 0, freq: false },
      ])
    })

    it('preserves alphabetical order and leaves is_frequent false when all counts are zero', async () => {
      const mockData = [
        { id: '1', name: 'Zebra Doc', is_active: true, is_pending: false, iirgd_demands: [] },
        { id: '2', name: 'Alpha Doc', is_active: true, is_pending: false, iirgd_demands: [] },
        {
          id: '3',
          name: 'Beta Doc',
          is_active: true,
          is_pending: false,
          iirgd_demands: [{ count: 0 }],
        },
      ]

      const eqPending = vi.fn().mockResolvedValue({ data: mockData, error: null })
      const eqActive = vi.fn().mockReturnValue({ eq: eqPending })
      const select = vi.fn().mockReturnValue({ eq: eqActive })
      fromMock.mockReturnValue({ select })

      const { fetchActiveDocumentTypesByUsage } = useIirgdDocumentTypes()
      const result = await fetchActiveDocumentTypesByUsage()

      expect(result.map((r) => ({ name: r.name, freq: r.is_frequent }))).toEqual([
        { name: 'Alpha Doc', freq: false },
        { name: 'Beta Doc', freq: false },
        { name: 'Zebra Doc', freq: false },
      ])
    })

    it('throws error when supabase query fails', async () => {
      const eqPending = vi.fn().mockResolvedValue({ data: null, error: new Error('db error') })
      const eqActive = vi.fn().mockReturnValue({ eq: eqPending })
      const select = vi.fn().mockReturnValue({ eq: eqActive })
      fromMock.mockReturnValue({ select })

      const { fetchActiveDocumentTypesByUsage } = useIirgdDocumentTypes()
      await expect(fetchActiveDocumentTypesByUsage()).rejects.toThrow('db error')
    })
  })
})
