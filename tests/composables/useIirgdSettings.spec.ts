import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useIirgdSettings, type IirgdSettings } from '~/composables/useIirgdSettings'

const mockSupabase = {
  from: vi.fn(),
}

const mockLogAction = vi.fn()

mockNuxtImport('useSupabaseClient', () => {
  return () => mockSupabase
})

mockNuxtImport('useLogger', () => {
  return () => ({ logAction: mockLogAction })
})

describe('useIirgdSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('fetchSettings', () => {
    it('returns the settings row using limit(1) and maybeSingle', async () => {
      const fakeSetting: IirgdSettings = {
        id: 'settings-123',
        alert_days: 10,
        delay_days: 15,
      }

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: fakeSetting, error: null }),
      }

      mockSupabase.from.mockReturnValue(mockQuery)

      const { fetchSettings } = useIirgdSettings()
      const result = await fetchSettings()

      expect(mockSupabase.from).toHaveBeenCalledWith('iirgd_settings')
      expect(mockQuery.order).toHaveBeenCalledWith('updated_at', { ascending: false })
      expect(mockQuery.limit).toHaveBeenCalledWith(1)
      expect(mockQuery.maybeSingle).toHaveBeenCalled()
      expect(result).toEqual(fakeSetting)
    })

    it('auto-inserts and returns default settings when table is empty', async () => {
      const defaultSetting: IirgdSettings = {
        id: 'new-singleton-id',
        alert_days: 10,
        delay_days: 15,
      }

      const mockFetchQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      }

      const mockInsertQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: defaultSetting, error: null }),
      }

      mockSupabase.from.mockReturnValueOnce(mockFetchQuery).mockReturnValueOnce(mockInsertQuery)

      const { fetchSettings } = useIirgdSettings()
      const result = await fetchSettings()

      expect(mockInsertQuery.insert).toHaveBeenCalledWith({
        alert_days: 10,
        delay_days: 15,
        singleton_key: true,
      })
      expect(result).toEqual(defaultSetting)
    })

    it('throws error when database query fails', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: new Error('DB Error') }),
      }

      mockSupabase.from.mockReturnValue(mockQuery)

      const { fetchSettings } = useIirgdSettings()
      await expect(fetchSettings()).rejects.toThrow('Erro ao carregar configurações do IIRGD')
    })
  })

  describe('updateSettings', () => {
    it('updates settings by id and logs action', async () => {
      const updatedSetting: IirgdSettings = {
        id: 'settings-123',
        alert_days: 12,
        delay_days: 20,
      }

      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: updatedSetting, error: null }),
      }

      mockSupabase.from.mockReturnValue(mockUpdateQuery)

      const { updateSettings } = useIirgdSettings()
      const result = await updateSettings('settings-123', { alert_days: 12, delay_days: 20 })

      expect(mockUpdateQuery.update).toHaveBeenCalledWith({ alert_days: 12, delay_days: 20 })
      expect(mockUpdateQuery.eq).toHaveBeenCalledWith('id', 'settings-123')
      expect(mockLogAction).toHaveBeenCalledWith(
        'UPDATE_IIRGD_SETTINGS',
        'Configurações de SLA atualizadas',
      )
      expect(result).toEqual(updatedSetting)
    })

    it('throws error when database update fails', async () => {
      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: new Error('Update failed') }),
      }

      mockSupabase.from.mockReturnValue(mockUpdateQuery)

      const { updateSettings } = useIirgdSettings()
      await expect(updateSettings('settings-123', { alert_days: 12 })).rejects.toThrow(
        'Erro ao atualizar configurações do IIRGD',
      )
    })
  })

  describe('computePriority', () => {
    const settings: IirgdSettings = {
      id: 'settings-123',
      alert_days: 10,
      delay_days: 15,
    }

    it('returns "none" when settings is null', () => {
      const { computePriority } = useIirgdSettings()
      expect(
        computePriority({ status: 'in_progress', created_at: new Date().toISOString() }, null),
      ).toBe('none')
    })

    it('returns "none" for ignored statuses', () => {
      const { computePriority } = useIirgdSettings()
      const oldDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      expect(computePriority({ status: 'issued', created_at: oldDate }, settings)).toBe('none')
      expect(
        computePriority({ status: 'awaiting_collection', created_at: oldDate }, settings),
      ).toBe('none')
      expect(
        computePriority({ status: 'confrontation_failed', created_at: oldDate }, settings),
      ).toBe('none')
      expect(computePriority({ status: 'protocol_cancelled', created_at: oldDate }, settings)).toBe(
        'none',
      )
    })

    it('returns "delay" when elapsed days >= delay_days', () => {
      const { computePriority } = useIirgdSettings()
      const delayDate = new Date(Date.now() - 16 * 24 * 60 * 60 * 1000).toISOString()
      expect(computePriority({ status: 'in_progress', created_at: delayDate }, settings)).toBe(
        'delay',
      )
    })

    it('returns "alert" when elapsed days >= alert_days and < delay_days', () => {
      const { computePriority } = useIirgdSettings()
      const alertDate = new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toISOString()
      expect(computePriority({ status: 'in_progress', created_at: alertDate }, settings)).toBe(
        'alert',
      )
    })

    it('returns "normal" when elapsed days < alert_days', () => {
      const { computePriority } = useIirgdSettings()
      const normalDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      expect(computePriority({ status: 'in_progress', created_at: normalDate }, settings)).toBe(
        'normal',
      )
    })
  })
})
