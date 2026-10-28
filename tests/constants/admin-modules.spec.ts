import { describe, it, expect } from 'vitest'
import { buildAdminMetricCards, buildAdminModules } from '~/constants/admin-modules'

describe('admin-modules constants', () => {
  it('builds metric cards with warning highlight when there are pending tasks', () => {
    const cardsWithPending = buildAdminMetricCards(
      {
        usersCount: 10,
        demandsCount: 4,
        iirgdDemandsCount: 25,
        productsCount: 50,
        suppliersCount: 8,
      },
      3,
    )

    expect(cardsWithPending).toHaveLength(6)
    const pendingCard = cardsWithPending.find((c) => c.id === 'pending')
    expect(pendingCard).toMatchObject({
      value: 3,
      color: 'warning',
      highlight: true,
    })

    const cardsWithoutPending = buildAdminMetricCards(null, 0)
    const cleanPendingCard = cardsWithoutPending.find((c) => c.id === 'pending')
    expect(cleanPendingCard).toMatchObject({
      value: 0,
      color: 'default',
      highlight: false,
    })
  })

  it('builds all admin modules and attaches reactive badge counts', () => {
    const modules = buildAdminModules({
      pendingUnitsCount: 2,
      pendingExpenseNaturesCount: 1,
      pendingProductClassesCount: 0,
      pendingCharacteristicKeysCount: 4,
      pendingIirgdDocumentTypesCount: 5,
    })

    expect(modules).toHaveLength(12)
    expect(modules.find((m) => m.id === 'units')?.badge).toBe(2)
    expect(modules.find((m) => m.id === 'expense-natures')?.badge).toBe(1)
    expect(modules.find((m) => m.id === 'product-characteristics')?.badge).toBe(4)
    expect(modules.find((m) => m.id === 'iirgd-doc-types')?.badge).toBe(5)
  })
})
