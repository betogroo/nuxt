import { describe, it, expect, vi } from 'vitest'
import {
  APPROVED_ITEM_FLAGS,
  PENDING_ITEM_FLAGS,
  buildApprovePayload,
  registerPendingItem,
} from '~/utils/pendingCatalog'

describe('utils/pendingCatalog', () => {
  it('exposes standard pending and approved flag constants', () => {
    expect(PENDING_ITEM_FLAGS).toEqual({ is_pending: true, is_active: false })
    expect(APPROVED_ITEM_FLAGS).toEqual({ is_pending: false, is_active: true })
  })

  it('registerPendingItem executes insert, invokes afterInsert, and returns the row', async () => {
    const afterInsert = vi.fn().mockResolvedValue(undefined)
    const row = { id: '339030', name: 'Material de Consumo', is_pending: true, is_active: false }

    const result = await registerPendingItem(async () => ({ data: row, error: null }), afterInsert)

    expect(result).toEqual(row)
    expect(afterInsert).toHaveBeenCalledWith(row)
  })

  it('registerPendingItem throws error and skips afterInsert when insert fails', async () => {
    const afterInsert = vi.fn()
    const dbError = { message: 'duplicate key value' }

    await expect(
      registerPendingItem(async () => ({ data: null, error: dbError }), afterInsert),
    ).rejects.toEqual(dbError)

    expect(afterInsert).not.toHaveBeenCalled()
  })

  it('buildApprovePayload trims non-empty names and ignores blank names', () => {
    expect(buildApprovePayload()).toEqual({ is_pending: false, is_active: true })
    expect(buildApprovePayload('   ')).toEqual({ is_pending: false, is_active: true })
    expect(buildApprovePayload('  Nome Oficial  ')).toEqual({
      is_pending: false,
      is_active: true,
      name: 'Nome Oficial',
    })
  })
})
