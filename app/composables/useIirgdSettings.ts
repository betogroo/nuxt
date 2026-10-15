import { useSupabaseClient } from '#imports'
import { useLogger } from './useLogger'

export interface IirgdSettings {
  id: string
  alert_days: number
  delay_days: number
}

export const useIirgdSettings = () => {
  const supabase = useSupabaseClient()
  const { logAction } = useLogger()

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from('iirgd_settings')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error(error)
      throw new Error('Erro ao carregar configurações do IIRGD')
    }

    if (!data) {
      const { data: created, error: insertError } = await supabase
        .from('iirgd_settings')
        .insert({ alert_days: 10, delay_days: 15, singleton_key: true })
        .select()
        .maybeSingle()

      if (!insertError && created) {
        return created as IirgdSettings
      }
      return { id: '', alert_days: 10, delay_days: 15 } as IirgdSettings
    }

    return data as IirgdSettings
  }

  const updateSettings = async (id: string, updates: Partial<IirgdSettings>) => {
    let query = supabase.from('iirgd_settings').update(updates)
    if (id) {
      query = query.eq('id', id)
    } else {
      query = query.eq('singleton_key', true)
    }

    const { data, error } = await query.select().maybeSingle()

    if (error) {
      console.error(error)
      throw new Error('Erro ao atualizar configurações do IIRGD')
    }

    if (data) {
      await logAction('UPDATE_IIRGD_SETTINGS', 'Configurações de SLA atualizadas')
    }
    return data as IirgdSettings
  }

  const computePriority = (
    demand: { status?: string; created_at?: string },
    settings: IirgdSettings | null,
  ): 'alert' | 'delay' | 'normal' | 'none' => {
    if (!settings || !demand.status || !demand.created_at) return 'none'
    const ignoreStatuses = [
      'issued',
      'awaiting_collection',
      'confrontation_failed',
      'protocol_cancelled',
    ]
    if (ignoreStatuses.includes(demand.status)) return 'none'

    const createdDate = new Date(demand.created_at)
    const today = new Date()
    const diffTime = Math.abs(today.getTime() - createdDate.getTime())
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays >= settings.delay_days) return 'delay'
    if (diffDays >= settings.alert_days) return 'alert'
    return 'normal'
  }

  return {
    fetchSettings,
    updateSettings,
    computePriority,
  }
}
