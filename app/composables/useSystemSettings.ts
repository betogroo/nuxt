import { ref } from 'vue'
import type { Database } from '~/types/database.types'
import {
  DEFAULT_BEC_CATALOG_URL,
  DEFAULT_CLASS_CEILING_2026,
  DEFAULT_PRODUCT_CLASS_ANNUAL_CEILINGS,
} from '~/schemas/forms/system-settings'

export const SYSTEM_SETTING_KEYS = {
  BEC_CATALOG_URL: 'bec_catalog_url',
  PRODUCT_CLASS_ANNUAL_CEILINGS: 'product_class_annual_ceilings',
} as const

const becCatalogUrl = ref<string>(DEFAULT_BEC_CATALOG_URL)
const productClassAnnualCeilings = ref<Record<string, number>>({
  ...DEFAULT_PRODUCT_CLASS_ANNUAL_CEILINGS,
})

export function parseAnnualCeilingsJson(raw: string | null | undefined): Record<string, number> {
  const result: Record<string, number> = {
    ...DEFAULT_PRODUCT_CLASS_ANNUAL_CEILINGS,
  }
  if (!raw || typeof raw !== 'string') return result

  try {
    const parsed = JSON.parse(raw) as unknown
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
        const yearNum = Number(k)
        const valNum = Number(v)
        if (
          Number.isInteger(yearNum) &&
          yearNum >= 1990 &&
          yearNum <= 2100 &&
          Number.isFinite(valNum) &&
          valNum > 0
        ) {
          result[String(yearNum)] = Number(valNum.toFixed(2))
        }
      }
    }
  } catch {
    // Keep defaults on malformed JSON
  }

  return result
}

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

  const fetchProductClassAnnualCeilings = async (): Promise<Record<string, number>> => {
    try {
      const supabase = useSupabaseClient<Database>()
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', SYSTEM_SETTING_KEYS.PRODUCT_CLASS_ANNUAL_CEILINGS)
        .maybeSingle()

      if (error) {
        console.error('Erro ao buscar tetos anuais por classe:', error)
        return productClassAnnualCeilings.value
      }

      if (data?.value) {
        productClassAnnualCeilings.value = parseAnnualCeilingsJson(data.value)
      } else {
        productClassAnnualCeilings.value = { ...DEFAULT_PRODUCT_CLASS_ANNUAL_CEILINGS }
      }
      return productClassAnnualCeilings.value
    } catch (err) {
      console.error('Erro inesperado ao buscar tetos anuais por classe:', err)
      return productClassAnnualCeilings.value
    }
  }

  const saveProductClassAnnualCeilingsMap = async (
    nextMap: Record<string, number>,
    actionDescription: string,
  ): Promise<Record<string, number>> => {
    const supabase = useSupabaseClient<Database>()
    const user = useSupabaseUser()
    const { logAction } = useLogger()

    const now = new Date().toISOString()
    const serialized = JSON.stringify(nextMap)

    const { error } = await supabase.from('system_settings').upsert({
      key: SYSTEM_SETTING_KEYS.PRODUCT_CLASS_ANNUAL_CEILINGS,
      value: serialized,
      description:
        'Tetos anuais de gastos por classe de produtos (em R$) cadastrados ano a ano para controle de dispensa/licitação.',
      updated_at: now,
      updated_by: user.value?.id || null,
    })

    if (error) throw error

    productClassAnnualCeilings.value = { ...nextMap }

    await logAction('UPDATE_SYSTEM_SETTING', actionDescription, user.value?.id)

    return productClassAnnualCeilings.value
  }

  const upsertProductClassAnnualCeiling = async (
    year: number | string,
    amount: number,
  ): Promise<Record<string, number>> => {
    const yearInt = Number(year)
    const numericAmount = Number(amount)

    if (!Number.isInteger(yearInt) || yearInt < 1990 || yearInt > 2100) {
      throw new Error('Informe um ano válido entre 1990 e 2100.')
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      throw new Error('O valor do teto por classe deve ser maior que zero.')
    }

    const current = await fetchProductClassAnnualCeilings()
    const roundedAmount = Number(numericAmount.toFixed(2))
    const nextMap: Record<string, number> = {
      ...current,
      [String(yearInt)]: roundedAmount,
    }

    return await saveProductClassAnnualCeilingsMap(
      nextMap,
      `Teto anual por classe de produtos para o exercício ${yearInt} configurado em R$ ${roundedAmount.toFixed(2)}`,
    )
  }

  const removeProductClassAnnualCeiling = async (
    year: number | string,
  ): Promise<Record<string, number>> => {
    const yearKey = String(Number(year))
    if (yearKey === '2026') {
      throw new Error(
        'O ano de 2026 possui valor padrão de referência e não pode ser removido, apenas editado ou restaurado para R$ 65.492,11.',
      )
    }

    const current = await fetchProductClassAnnualCeilings()
    const nextMap: Record<string, number> = Object.fromEntries(
      Object.entries(current).filter(([key]) => key !== yearKey),
    )

    return await saveProductClassAnnualCeilingsMap(
      nextMap,
      `Configuração de teto anual por classe removida para o exercício ${yearKey}`,
    )
  }

  const getCeilingForYear = (
    yearOrMap: number | string | Record<string, number>,
    mapOrYear?: Record<string, number> | number | string,
  ): { amount: number; isConfigured: boolean } => {
    const isFirstArgMap = typeof yearOrMap === 'object' && yearOrMap !== null
    const map = isFirstArgMap
      ? (yearOrMap as Record<string, number>)
      : (mapOrYear as Record<string, number> | undefined) || productClassAnnualCeilings.value
    const rawYear = isFirstArgMap ? mapOrYear : yearOrMap
    const yearKey = String(Number(rawYear))

    if (map && typeof map[yearKey] === 'number' && map[yearKey] > 0) {
      return { amount: map[yearKey], isConfigured: true }
    }
    if (yearKey === '2026') {
      return { amount: DEFAULT_CLASS_CEILING_2026, isConfigured: true }
    }
    return { amount: DEFAULT_CLASS_CEILING_2026, isConfigured: false }
  }

  return {
    becCatalogUrl,
    fetchBecCatalogUrl,
    updateBecCatalogUrl,
    resetBecCatalogUrl,
    getBecProductUrl,
    productClassAnnualCeilings,
    fetchProductClassAnnualCeilings,
    upsertProductClassAnnualCeiling,
    removeProductClassAnnualCeiling,
    getCeilingForYear,
  }
}
