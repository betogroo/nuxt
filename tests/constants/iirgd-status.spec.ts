import { describe, it, expect } from 'vitest'
import {
  IIRGD_ACTIVE_STATUSES,
  IIRGD_SLA_IGNORED_STATUSES,
  IIRGD_STATUS_BY_GROUP,
  IIRGD_STATUS_COLORS,
  IIRGD_STATUS_GROUPS,
  IIRGD_STATUS_GROUP_TITLES,
  IIRGD_STATUS_LABELS,
  getIirgdStatusSelectOptions,
} from '~/constants/iirgd-status'
import { Constants } from '~/types/database.types'

describe('iirgd-status constants', () => {
  const allDbStatuses = [...Constants.public.Enums.iirgd_demand_status]

  it('maps every database status to a label and color', () => {
    for (const status of allDbStatuses) {
      expect(IIRGD_STATUS_LABELS[status]).toBeTruthy()
      expect(IIRGD_STATUS_COLORS[status]).toBeTruthy()
    }
  })

  it('includes every database status in IIRGD_STATUS_GROUPS exactly once', () => {
    const grouped = IIRGD_STATUS_GROUPS.flatMap((g) => g.options)
    expect(grouped.sort()).toEqual([...allDbStatuses].sort())
  })

  it('derives active and SLA-ignored statuses consistently from groups', () => {
    expect(IIRGD_ACTIVE_STATUSES).toEqual([
      ...IIRGD_STATUS_BY_GROUP['in-progress'],
      ...IIRGD_STATUS_BY_GROUP.consulted,
      ...IIRGD_STATUS_BY_GROUP.released,
    ])
    expect(IIRGD_SLA_IGNORED_STATUSES).toEqual([
      ...IIRGD_STATUS_BY_GROUP.issued,
      ...IIRGD_STATUS_BY_GROUP.errors,
    ])
    expect(IIRGD_STATUS_BY_GROUP.errors).toContain('unknown_error')
  })

  it('defines titles for all status route groups', () => {
    expect(Object.keys(IIRGD_STATUS_GROUP_TITLES).sort()).toEqual(
      Object.keys(IIRGD_STATUS_BY_GROUP).sort(),
    )
  })

  it('builds formatted select options with group labels', () => {
    const options = getIirgdStatusSelectOptions()
    expect(options).toHaveLength(allDbStatuses.length)
    expect(options.find((o) => o.value === 'unknown_error')).toEqual({
      title: 'Erro Desconhecido (Erros e Cancelamentos)',
      value: 'unknown_error',
    })
  })
})
