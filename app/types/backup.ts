export interface BackupSummary {
  profiles: number
  demands: number
  demand_products: number
  demand_product_bids: number
  demand_responsibles: number
  iirgd_citizens: number
  iirgd_document_types: number
  iirgd_demands: number
  iirgd_demand_status_history: number
  logs: number
}

export interface BackupMetadata {
  system: string
  version: string
  timestamp: string
  generated_by: {
    id: string
    name: string
  }
  summary: BackupSummary
}

export interface BackupData {
  profiles?: Record<string, unknown>[]
  demands?: Record<string, unknown>[]
  demand_products?: Record<string, unknown>[]
  demand_product_bids?: Record<string, unknown>[]
  demand_responsibles?: Record<string, unknown>[]
  iirgd_citizens?: Record<string, unknown>[]
  iirgd_document_types?: Record<string, unknown>[]
  iirgd_demands?: Record<string, unknown>[]
  iirgd_demand_status_history?: Record<string, unknown>[]
  logs?: Record<string, unknown>[]
}

export interface BackupFileStructure extends BackupMetadata {
  data: BackupData
}

export interface BackupInspection {
  isValid: boolean
  errorMessage?: string
  system?: string
  version?: string
  timestamp?: string
  generatedBy?: string
  counts: Partial<BackupSummary>
  payload?: BackupFileStructure
}

export interface RestoreResult {
  success: boolean
  restored_at: string
  counts: BackupSummary
}
