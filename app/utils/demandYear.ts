type DemandYearSource = {
  internal_process_number?: string | null
  dispute_date?: string | null
  created_at?: string | null
}

/**
 * Resolves the fiscal/budget year of a demand.
 * Priority:
 * 1. `internal_process_number` prefix (e.g. "2026-0012" -> 2026)
 * 2. `dispute_date` (e.g. "2025-08-14" -> 2025)
 * 3. `created_at` year
 */
export function resolveDemandYear(demand: DemandYearSource): number {
  if (demand.internal_process_number) {
    const matchInternal = String(demand.internal_process_number)
      .trim()
      .match(/^(\d{4})-/)
    if (matchInternal) {
      const yr = Number(matchInternal[1])
      if (yr >= 1990 && yr <= 2100) return yr
    }
  }

  if (demand.dispute_date) {
    const matchDispute = String(demand.dispute_date)
      .trim()
      .match(/^(\d{4})/)
    if (matchDispute) {
      const yr = Number(matchDispute[1])
      if (yr >= 1990 && yr <= 2100) return yr
    }
  }

  if (demand.created_at) {
    const matchCreated = String(demand.created_at)
      .trim()
      .match(/^(\d{4})/)
    if (matchCreated) {
      const yr = Number(matchCreated[1])
      if (yr >= 1990 && yr <= 2100) return yr
    }
    const parsedDate = new Date(demand.created_at)
    if (!Number.isNaN(parsedDate.getTime())) {
      return parsedDate.getFullYear()
    }
  }

  return new Date().getFullYear()
}
