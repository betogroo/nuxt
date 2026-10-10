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
    const { data, error } = await supabase.from('iirgd_settings').select('*').single()
    if (error) {
      console.error(error)
      throw new Error('Erro ao carregar configurações do IIRGD')
    }
    return data as IirgdSettings
  }

  const updateSettings = async (id: string, updates: Partial<IirgdSettings>) => {
    const { data, error } = await supabase
      .from('iirgd_settings')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error(error)
      throw new Error('Erro ao atualizar configurações do IIRGD')
    }

    if (data) {
      await logAction('UPDATE_IIRGD_SETTINGS', 'Configurações de SLA atualizadas')
    }
    return data as IirgdSettings
  }

  const computePriority = (demand: { status?: string, created_at?: string }, settings: IirgdSettings | null): 'alert' | 'delay' | 'normal' | 'none' => {
    if (!settings || !demand.status || !demand.created_at) return 'none'
    const ignoreStatuses = ['issued', 'awaiting_collection', 'confrontation_failed', 'protocol_cancelled']
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
