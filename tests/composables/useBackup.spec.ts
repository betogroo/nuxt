import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useBackup } from '~/composables/useBackup'
import type { BackupFileStructure } from '~/types/backup'

const rpcMock = vi.fn()
const fromMock = vi.fn()
const logActionMock = vi.fn()

const supabaseMock = {
  rpc: rpcMock,
  from: fromMock,
}

mockNuxtImport('useSupabaseClient', () => () => supabaseMock)
mockNuxtImport('useLogger', () => () => ({ logAction: logActionMock }))

describe('useBackup Composable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetchCurrentCounts should query table counts and return structured summary', async () => {
    fromMock.mockReturnValue({
      select: vi.fn().mockResolvedValue({ count: 5, error: null }),
    })

    const { fetchCurrentCounts } = useBackup()
    const counts = await fetchCurrentCounts()

    expect(counts).toEqual({
      profiles: 5,
      suppliers: 5,
      expense_natures: 5,
      product_classes: 5,
      measurement_units: 5,
      measurement_unit_aliases: 5,
      measurement_unit_alias_links: 5,
      products: 5,
      product_units: 5,
      demands: 5,
      demand_products: 5,
      demand_product_bids: 5,
      demand_responsibles: 5,
      demand_item_status_history: 5,
      iirgd_citizens: 5,
      iirgd_document_types: 5,
      iirgd_demands: 5,
      iirgd_demand_status_history: 5,
      iirgd_settings: 5,
      system_settings: 5,
      elections: 5,
      candidates: 5,
      ballot_boxes: 5,
      election_voter_attendance: 5,
      logs: 5,
    })
  })

  it('inspectBackupFile should report invalid JSON or missing data structure', async () => {
    const { inspectBackupFile } = useBackup()

    const invalidFile = {
      text: vi.fn().mockResolvedValue('invalid json string'),
    } as unknown as File

    const inspection = await inspectBackupFile(invalidFile)
    expect(inspection.isValid).toBe(false)
    expect(inspection.errorMessage).toBeDefined()

    const missingDataFile = {
      text: vi.fn().mockResolvedValue(JSON.stringify({ version: '1.0' })),
    } as unknown as File

    const inspectionMissing = await inspectBackupFile(missingDataFile)
    expect(inspectionMissing.isValid).toBe(false)
    expect(inspectionMissing.errorMessage).toContain('propriedade "data" não encontrada')
  })

  it('inspectBackupFile should correctly inspect valid backup payload', async () => {
    const { inspectBackupFile } = useBackup()

    const validPayload: BackupFileStructure = {
      system: 'Demandas & IIRGD',
      version: '1.0',
      timestamp: '2026-10-11T12:00:00Z',
      generated_by: { id: 'admin-id', name: 'Admin Test' },
      summary: {
        profiles: 2,
        suppliers: 1,
        expense_natures: 0,
        product_classes: 0,
        measurement_units: 0,
        measurement_unit_aliases: 0,
        products: 1,
        product_units: 0,
        demands: 1,
        demand_products: 0,
        demand_product_bids: 0,
        demand_responsibles: 0,
        demand_item_status_history: 0,
        iirgd_citizens: 3,
        iirgd_document_types: 1,
        iirgd_demands: 2,
        iirgd_demand_status_history: 4,
        iirgd_settings: 0,
        system_settings: 1,
        elections: 2,
        candidates: 3,
        logs: 10,
      },
      data: {
        profiles: [{ id: '1' }, { id: '2' }],
        suppliers: [{ id: 'sup-1', name: 'Fornecedor A' }],
        products: [{ id: 'prod-1', name: 'Item 1' }],
        demands: [{ id: 'dem-1' }],
        system_settings: [{ key: 'bec_catalog_url', value: 'https://test' }],
        demand_item_status_history: [{ id: 'dish-1', status: 'homologated' }],
        elections: [{ id: 'el-1' }, { id: 'el-2' }],
        candidates: [{ id: 'cnd-1' }, { id: 'cnd-2' }, { id: 'cnd-3' }],
        iirgd_citizens: [{ id: 'c-1' }, { id: 'c-2' }, { id: 'c-3' }],
        iirgd_demands: [{ id: 'id-1' }, { id: 'id-2' }],
        logs: [{ id: 'log-1' }],
      },
    }

    const file = {
      text: vi.fn().mockResolvedValue(JSON.stringify(validPayload)),
    } as unknown as File

    const inspection = await inspectBackupFile(file)
    expect(inspection.isValid).toBe(true)
    expect(inspection.counts.profiles).toBe(2)
    expect(inspection.counts.suppliers).toBe(1)
    expect(inspection.counts.products).toBe(1)
    expect(inspection.counts.demands).toBe(1)
    expect(inspection.counts.iirgd_citizens).toBe(3)
    expect(inspection.counts.iirgd_demands).toBe(2)
    expect(inspection.counts.demand_item_status_history).toBe(1)
    expect(inspection.counts.system_settings).toBe(1)
    expect(inspection.counts.elections).toBe(2)
    expect(inspection.counts.candidates).toBe(3)
    expect(inspection.counts.logs).toBe(1)
  })

  it('restoreBackup should call restore_system_backup RPC and log action', async () => {
    const mockResult = {
      success: true,
      restored_at: new Date().toISOString(),
      counts: {
        profiles: 2,
        suppliers: 1,
        expense_natures: 0,
        product_classes: 0,
        measurement_units: 0,
        measurement_unit_aliases: 0,
        products: 1,
        product_units: 0,
        demands: 1,
        demand_products: 0,
        demand_product_bids: 0,
        demand_responsibles: 0,
        iirgd_citizens: 3,
        iirgd_document_types: 0,
        iirgd_demands: 2,
        iirgd_demand_status_history: 0,
        iirgd_settings: 0,
        logs: 0,
      },
    }

    rpcMock.mockResolvedValueOnce({ data: mockResult, error: null })

    const { restoreBackup } = useBackup()
    const payload = {
      system: 'Test',
      version: '1.0',
      timestamp: '2026-10-11T12:00:00Z',
      generated_by: { id: '1', name: 'Admin' },
      summary: mockResult.counts,
      data: { profiles: [{ id: '1' }] },
    }

    const result = await restoreBackup(payload)
    expect(rpcMock).toHaveBeenCalledWith('restore_system_backup', { p_payload: payload })
    expect(logActionMock).toHaveBeenCalledWith('RESTORE_BACKUP', expect.any(String))
    expect(result.success).toBe(true)
  })

  it('restoreBackup should send payload containing citizens with other_document to RPC', async () => {
    const mockResult = {
      success: true,
      restored_at: new Date().toISOString(),
      counts: {
        profiles: 1,
        suppliers: 0,
        expense_natures: 0,
        product_classes: 0,
        measurement_units: 0,
        measurement_unit_aliases: 0,
        products: 0,
        product_units: 0,
        demands: 0,
        demand_products: 0,
        demand_product_bids: 0,
        demand_responsibles: 0,
        iirgd_citizens: 2,
        iirgd_document_types: 0,
        iirgd_demands: 0,
        iirgd_demand_status_history: 0,
        iirgd_settings: 0,
        logs: 0,
      },
    }

    rpcMock.mockResolvedValueOnce({ data: mockResult, error: null })

    const { restoreBackup } = useBackup()
    const payload = {
      system: 'Test',
      version: '1.0',
      timestamp: '2026-10-14T12:00:00Z',
      generated_by: { id: 'admin-id', name: 'Admin' },
      summary: mockResult.counts,
      data: {
        iirgd_citizens: [
          {
            id: '77759679-7108-4400-97c8-154ba1ece5a8',
            name: 'GILSON SOUZA DE OLIVEIRA',
            rg: null,
            cpf: null,
            other_document: '0561015112-BA',
          },
          {
            id: '88888888-7108-4400-97c8-154ba1ece5a8',
            name: 'MARIA APARECIDA',
            rg: '12.345.678-9',
            cpf: null,
            other_document: null,
          },
        ],
      },
    }

    const result = await restoreBackup(payload as unknown as BackupFileStructure)
    expect(rpcMock).toHaveBeenCalledWith('restore_system_backup', { p_payload: payload })
    expect(result.success).toBe(true)
    expect(result.counts.iirgd_citizens).toBe(2)
  })
})
