import { ref } from 'vue'
import type { Database } from '~/types/database.types'
import { DEFAULT_BEC_CATALOG_URL } from '~/schemas/forms/system-settings'

export const SYSTEM_SETTING_KEYS = {
  BEC_CATALOG_URL: 'bec_catalog_url',
} as const

const becCatalogUrl = ref<string>(DEFAULT_BEC_CATALOG_URL)

export const useSystemSettings = () => {
  const fetchBecCatalogUrl = async (): Promise<string> => {
    try {
      const supabase = useSupabaseClient<Database>()
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', SYSTEM_SETTING_KEYS.BEC_CATALOG_URL)
        .maybeSingle()

      if (error) {
        console.error('Erro ao buscar URL do catálogo BEC:', error)
        return becCatalogUrl.value
      }

      if (data?.value) {
        becCatalogUrl.value = data.value
      }
      return becCatalogUrl.value
    } catch (err) {
      console.error('Erro inesperado ao buscar URL do catálogo BEC:', err)
      return becCatalogUrl.value
    }
  }

  const updateBecCatalogUrl = async (newUrl: string): Promise<void> => {
    const supabase = useSupabaseClient<Database>()
    const user = useSupabaseUser()
    const { logAction } = useLogger()

    const trimmed = newUrl.trim()
    const now = new Date().toISOString()

    const { error } = await supabase.from('system_settings').upsert({
      key: SYSTEM_SETTING_KEYS.BEC_CATALOG_URL,
      value: trimmed,
      description: 'URL base do catálogo BEC para redirecionamento direto aos produtos.',
      updated_at: now,
      updated_by: user.value?.id || null,
    })

    if (error) throw error

    becCatalogUrl.value = trimmed

    await logAction(
      'UPDATE_SYSTEM_SETTING',
      `URL base do catálogo BEC atualizada para "${trimmed}"`,
      user.value?.id,
    )
  }

  const resetBecCatalogUrl = async (): Promise<void> => {
    await updateBecCatalogUrl(DEFAULT_BEC_CATALOG_URL)
  }

  const getBecProductUrl = (catBec: string | number | null | undefined): string | null => {
    if (catBec === null || catBec === undefined) return null
    const str = String(catBec).trim()
    if (!str || str === '-') return null

    const base = becCatalogUrl.value || DEFAULT_BEC_CATALOG_URL
    return `${base}${str}`
  }

  return {
    becCatalogUrl,
    fetchBecCatalogUrl,
    updateBecCatalogUrl,
    resetBecCatalogUrl,
    getBecProductUrl,
  }
}
