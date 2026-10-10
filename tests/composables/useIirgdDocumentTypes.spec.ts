import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

const { fromMock, logActionMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
  logActionMock: vi.fn(),
}))

mockNuxtImport('useSupabaseClient', () => () => ({ from: fromMock }))
mockNuxtImport('useLogger', () => () => ({ logAction: logActionMock }))

import { useIirgdDocumentTypes } from '~/composables/useIirgdDocumentTypes'

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
})
