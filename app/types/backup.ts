export interface BackupSummary {
  profiles: number
  suppliers: number
  expense_natures: number
  product_classes: number
  measurement_units: number
  measurement_unit_aliases: number
  measurement_unit_alias_links?: number
  products: number
  product_units: number
  demands: number
  demand_products: number
  demand_product_bids: number
  demand_responsibles: number
  demand_item_status_history?: number
  iirgd_document_types: number
  iirgd_citizens: number
  iirgd_demands: number
  iirgd_demand_status_history: number
  iirgd_settings: number
  system_settings?: number
  elections?: number
  candidates?: number
  ballot_boxes?: number
  election_voter_attendance?: number
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
  suppliers?: Record<string, unknown>[]
  expense_natures?: Record<string, unknown>[]
  product_classes?: Record<string, unknown>[]
  measurement_units?: Record<string, unknown>[]
  measurement_unit_aliases?: Record<string, unknown>[]
  measurement_unit_alias_links?: Record<string, unknown>[]
  products?: Record<string, unknown>[]
  product_units?: Record<string, unknown>[]
  demands?: Record<string, unknown>[]
  demand_products?: Record<string, unknown>[]
  demand_product_bids?: Record<string, unknown>[]
  demand_responsibles?: Record<string, unknown>[]
  demand_item_status_history?: Record<string, unknown>[]
  iirgd_document_types?: Record<string, unknown>[]
  iirgd_citizens?: Record<string, unknown>[]
  iirgd_demands?: Record<string, unknown>[]
  iirgd_demand_status_history?: Record<string, unknown>[]
  iirgd_settings?: Record<string, unknown>[]
  system_settings?: Record<string, unknown>[]
  elections?: Record<string, unknown>[]
  candidates?: Record<string, unknown>[]
  ballot_boxes?: Record<string, unknown>[]
  election_voter_attendance?: Record<string, unknown>[]
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
