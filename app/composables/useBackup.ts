import { ref } from 'vue'
import { useSupabaseClient } from '#imports'
import { useLogger } from './useLogger'
import type {
  BackupFileStructure,
  BackupInspection,
  BackupSummary,
  RestoreResult,
} from '~/types/backup'

export const useBackup = () => {
  const supabase = useSupabaseClient()
  const { logAction } = useLogger()
  const isGenerating = ref(false)
  const isRestoring = ref(false)
  const isFetchingCounts = ref(false)

  const fetchCurrentCounts = async (): Promise<BackupSummary> => {
    isFetchingCounts.value = true
    try {
      const [
        { count: profilesCount },
        { count: suppliersCount },
        { count: expenseNaturesCount },
        { count: productClassesCount },
        { count: measurementUnitsCount },
        { count: unitAliasesCount },
        { count: unitAliasLinksCount },
        { count: productsCount },
        { count: productUnitsCount },
        { count: demandsCount },
        { count: demandProductsCount },
        { count: demandBidsCount },
        { count: demandResponsiblesCount },
        { count: demandItemHistoryCount },
        { count: citizensCount },
        { count: docTypesCount },
        { count: iirgdDemandsCount },
        { count: iirgdHistoryCount },
        { count: iirgdSettingsCount },
        { count: systemSettingsCount },
        { count: electionsCount },
        { count: candidatesCount },
        { count: logsCount },
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('suppliers').select('id', { count: 'exact', head: true }),
        supabase.from('expense_natures').select('id', { count: 'exact', head: true }),
        supabase.from('product_classes').select('id', { count: 'exact', head: true }),
        supabase.from('measurement_units').select('id', { count: 'exact', head: true }),
        supabase.from('measurement_unit_aliases').select('id', { count: 'exact', head: true }),
        supabase.from('measurement_unit_alias_links').select('id', { count: 'exact', head: true }),
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase.from('product_units').select('id', { count: 'exact', head: true }),
        supabase.from('demands').select('id', { count: 'exact', head: true }),
        supabase.from('demand_products').select('id', { count: 'exact', head: true }),
        supabase.from('demand_product_bids').select('id', { count: 'exact', head: true }),
        supabase.from('demand_responsibles').select('id', { count: 'exact', head: true }),
        supabase.from('demand_item_status_history').select('id', { count: 'exact', head: true }),
        supabase.from('iirgd_citizens').select('id', { count: 'exact', head: true }),
        supabase.from('iirgd_document_types').select('id', { count: 'exact', head: true }),
        supabase.from('iirgd_demands').select('id', { count: 'exact', head: true }),
        supabase.from('iirgd_demand_status_history').select('id', { count: 'exact', head: true }),
        supabase.from('iirgd_settings').select('id', { count: 'exact', head: true }),
        supabase.from('system_settings').select('key', { count: 'exact', head: true }),
        supabase.from('elections').select('id', { count: 'exact', head: true }),
        supabase.from('candidates').select('id', { count: 'exact', head: true }),
        supabase.from('logs').select('id', { count: 'exact', head: true }),
      ])

      return {
        profiles: profilesCount || 0,
        suppliers: suppliersCount || 0,
        expense_natures: expenseNaturesCount || 0,
        product_classes: productClassesCount || 0,
        measurement_units: measurementUnitsCount || 0,
        measurement_unit_aliases: unitAliasesCount || 0,
        measurement_unit_alias_links: unitAliasLinksCount || 0,
        products: productsCount || 0,
        product_units: productUnitsCount || 0,
        demands: demandsCount || 0,
        demand_products: demandProductsCount || 0,
        demand_product_bids: demandBidsCount || 0,
        demand_responsibles: demandResponsiblesCount || 0,
        demand_item_status_history: demandItemHistoryCount || 0,
        iirgd_citizens: citizensCount || 0,
        iirgd_document_types: docTypesCount || 0,
        iirgd_demands: iirgdDemandsCount || 0,
        iirgd_demand_status_history: iirgdHistoryCount || 0,
        iirgd_settings: iirgdSettingsCount || 0,
        system_settings: systemSettingsCount || 0,
        elections: electionsCount || 0,
        candidates: candidatesCount || 0,
        logs: logsCount || 0,
      }
    } finally {
      isFetchingCounts.value = false
    }
  }

  const generateBackup = async (): Promise<BackupFileStructure> => {
    isGenerating.value = true
    try {
      const { data, error } = await supabase.rpc('generate_system_backup')
      if (error) {
        console.error('Erro na RPC generate_system_backup:', error)
        throw new Error(error.message || 'Falha ao gerar o arquivo de backup.')
      }

      const backup = data as unknown as BackupFileStructure
      const now = new Date()
      const timestampStr = now.toISOString().replace(/[:.]/g, '-').slice(0, 19)
      const filename = `backup_sistema_${timestampStr}.json`

      downloadJson(backup, filename)

      await logAction('GENERATE_BACKUP', `Backup do sistema gerado com sucesso: ${filename}`)
      return backup
    } finally {
      isGenerating.value = false
    }
  }

  const inspectBackupFile = async (file: File): Promise<BackupInspection> => {
    try {
      const content = await file.text()
      const parsed = JSON.parse(content)

      if (!parsed || typeof parsed !== 'object') {
        return {
          isValid: false,
          errorMessage: 'O arquivo selecionado não contém um JSON válido.',
          counts: {},
        }
      }

      if (!parsed.data || typeof parsed.data !== 'object') {
        return {
          isValid: false,
          errorMessage: 'Estrutura inválida: propriedade "data" não encontrada.',
          counts: {},
        }
      }

      const data = parsed.data as Record<string, unknown[]>
      const counts: Partial<BackupSummary> = {
        profiles: Array.isArray(data.profiles) ? data.profiles.length : 0,
        suppliers: Array.isArray(data.suppliers) ? data.suppliers.length : 0,
        expense_natures: Array.isArray(data.expense_natures) ? data.expense_natures.length : 0,
        product_classes: Array.isArray(data.product_classes) ? data.product_classes.length : 0,
        measurement_units: Array.isArray(data.measurement_units)
          ? data.measurement_units.length
          : 0,
        measurement_unit_aliases: Array.isArray(data.measurement_unit_aliases)
          ? data.measurement_unit_aliases.length
          : 0,
        measurement_unit_alias_links: Array.isArray(data.measurement_unit_alias_links)
          ? data.measurement_unit_alias_links.length
          : 0,
        products: Array.isArray(data.products) ? data.products.length : 0,
        product_units: Array.isArray(data.product_units) ? data.product_units.length : 0,
        demands: Array.isArray(data.demands) ? data.demands.length : 0,
        demand_products: Array.isArray(data.demand_products) ? data.demand_products.length : 0,
        demand_product_bids: Array.isArray(data.demand_product_bids)
          ? data.demand_product_bids.length
          : 0,
        demand_responsibles: Array.isArray(data.demand_responsibles)
          ? data.demand_responsibles.length
          : 0,
        demand_item_status_history: Array.isArray(data.demand_item_status_history)
          ? data.demand_item_status_history.length
          : 0,
        iirgd_citizens: Array.isArray(data.iirgd_citizens) ? data.iirgd_citizens.length : 0,
        iirgd_document_types: Array.isArray(data.iirgd_document_types)
          ? data.iirgd_document_types.length
          : 0,
        iirgd_demands: Array.isArray(data.iirgd_demands) ? data.iirgd_demands.length : 0,
        iirgd_demand_status_history: Array.isArray(data.iirgd_demand_status_history)
          ? data.iirgd_demand_status_history.length
          : 0,
        iirgd_settings: Array.isArray(data.iirgd_settings) ? data.iirgd_settings.length : 0,
        system_settings: Array.isArray(data.system_settings) ? data.system_settings.length : 0,
        elections: Array.isArray(data.elections) ? data.elections.length : 0,
        candidates: Array.isArray(data.candidates) ? data.candidates.length : 0,
        logs: Array.isArray(data.logs) ? data.logs.length : 0,
      }

      return {
        isValid: true,
        system: parsed.system || 'Sistema de Demandas',
        version: parsed.version || '1.0',
        timestamp: parsed.timestamp,
        generatedBy: parsed.generated_by?.name,
        counts,
        payload: parsed as BackupFileStructure,
      }
    } catch (e: unknown) {
      return {
        isValid: false,
        errorMessage: e instanceof Error ? e.message : 'Falha ao processar o arquivo.',
        counts: {},
      }
    }
  }

  const restoreBackup = async (payload: BackupFileStructure): Promise<RestoreResult> => {
    isRestoring.value = true
    try {
      const { data, error } = await supabase.rpc('restore_system_backup', {
        p_payload: payload as unknown as Record<string, unknown>,
      })

      if (error) {
        console.error('Erro na RPC restore_system_backup:', error)
        throw new Error(error.message || 'Falha ao restaurar o backup.')
      }

      const result = data as unknown as RestoreResult
      await logAction('RESTORE_BACKUP', 'Restauração de backup concluída com sucesso.')
      return result
    } finally {
      isRestoring.value = false
    }
  }

  return {
    isGenerating,
    isRestoring,
    isFetchingCounts,
    fetchCurrentCounts,
    generateBackup,
    inspectBackupFile,
    restoreBackup,
  }
}
