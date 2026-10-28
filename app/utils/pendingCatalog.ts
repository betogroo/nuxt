/**
 * Shared helpers for the "pending catalog item" rule: whenever a user types a new
 * catalog entry (expense nature, product class, document type...), it is stored with
 * `is_pending = true` and `is_active = false` so an administrator can review it later.
 */

/** Flags applied to every catalog entry suggested by a regular user. */
export const PENDING_ITEM_FLAGS = { is_pending: true, is_active: false } as const

/** Flags applied when an administrator approves a pending catalog entry. */
export const APPROVED_ITEM_FLAGS = { is_pending: false, is_active: true } as const

interface SingleRowResult<TRow> {
  data: TRow | null
  error: { message: string } | null
}

/**
 * Runs the insert of a pending catalog item, throws on database error and runs the
 * `afterInsert` hook (typically `logAction`) before returning the inserted row.
 */
export async function registerPendingItem<TRow>(
  insert: () => PromiseLike<SingleRowResult<TRow>>,
  afterInsert: (row: TRow) => Promise<void>,
): Promise<TRow> {
  const { data, error } = await insert()
  if (error) throw error

  const row = data as TRow
  await afterInsert(row)
  return row
}

/**
 * Builds the update payload used to approve a pending item, optionally renaming it.
 * Blank names are ignored (the original name is kept).
 */
export function buildApprovePayload(newName?: string): {
  is_pending: false
  is_active: true
  name?: string
} {
  const payload: { is_pending: false; is_active: true; name?: string } = {
    ...APPROVED_ITEM_FLAGS,
  }
  if (newName && newName.trim() !== '') {
    payload.name = newName.trim()
  }
  return payload
}
