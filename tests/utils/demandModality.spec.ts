import { describe, it, expect } from 'vitest'
import {
  buildDemandModalityOptions,
  checkDemandClassExceedsAnnualCeiling,
  resolveDemandItemEffectiveTotal,
} from '../../app/utils/demandModality'
import { formatDemandModality } from '../../app/utils/formatters'

describe('demandModality utilities', () => {
  it('formatDemandModality formats dispensation and bidding properly', () => {
    expect(formatDemandModality('dispensation')).toBe('Dispensa')
    expect(formatDemandModality('bidding')).toBe('Pregão')
    expect(formatDemandModality(null)).toBe('Dispensa')
    expect(formatDemandModality(undefined)).toBe('Dispensa')
  })

  it('resolveDemandItemEffectiveTotal calculates quantity * reference_price or falls back to winning bid', () => {
    expect(
      resolveDemandItemEffectiveTotal({
        quantity: 10,
        reference_price: 250.5,
      }),
    ).toBe(2505)

    expect(
      resolveDemandItemEffectiveTotal({
        quantity: 10,
        reference_price: null,
        demand_product_bids: [
          {
            id: 'bid-1',
            supplier_id: 'sup-1',
            amount: 120,
            status: 'classified',
            created_at: '2026-01-01T10:00:00Z',
          },
        ],
      }),
    ).toBe(1200)
  })

  it('checkDemandClassExceedsAnnualCeiling returns isExceeded=false when items are empty or below ceiling per class', () => {
    const emptyRes = checkDemandClassExceedsAnnualCeiling([], 65492.11)
    expect(emptyRes.isExceeded).toBe(false)
    expect(emptyRes.exceedingClasses).toHaveLength(0)

    // Two items of DIFFERENT classes: each class is R$ 40,000 (< R$ 65,492.11), even though grand total is R$ 80,000
    const diffClassesRes = checkDemandClassExceedsAnnualCeiling(
      [
        {
          id: 'item-1',
          quantity: 100,
          reference_price: 400,
          product: {
            name: 'Papel A4',
            product_class_id: '7530',
            product_classes: { id: '7530', name: 'Papelaria' },
          },
        },
        {
          id: 'item-2',
          quantity: 100,
          reference_price: 400,
          product: {
            name: 'Caneta Esferográfica',
            product_class_id: '7510',
            product_classes: { id: '7510', name: 'Artigos de Escritório' },
          },
        },
      ],
      65492.11,
    )

    expect(diffClassesRes.isExceeded).toBe(false)
    expect(diffClassesRes.maxClassTotal).toBe(40000)
    expect(diffClassesRes.exceedingClasses).toHaveLength(0)
  })

  it('checkDemandClassExceedsAnnualCeiling returns isExceeded=true when the sum of items of the SAME class exceeds the annual ceiling', () => {
    const sameClassRes = checkDemandClassExceedsAnnualCeiling(
      [
        {
          id: 'item-1',
          quantity: 100,
          reference_price: 400, // R$ 40,000.00
          product: {
            name: 'Papel Sulfite A4',
            product_class_id: '7530',
            product_classes: { id: '7530', name: 'Papelaria e Papel' },
          },
        },
        {
          id: 'item-2',
          quantity: 100,
          reference_price: 300, // R$ 30,000.00 -> sum for class 7530 = R$ 70,000.00 > R$ 65,492.11
          product: {
            name: 'Papel Sulfite A3',
            product_class_id: '7530',
            product_classes: { id: '7530', name: 'Papelaria e Papel' },
          },
        },
        {
          id: 'item-3',
          quantity: 10,
          reference_price: 500, // R$ 5,000.00 (other class 7510)
          product: {
            name: 'Grampeador',
            product_class_id: '7510',
            product_classes: { id: '7510', name: 'Artigos de Escritório' },
          },
        },
      ],
      65492.11,
    )

    expect(sameClassRes.isExceeded).toBe(true)
    expect(sameClassRes.maxClassTotal).toBe(70000)
    expect(sameClassRes.exceedingClasses).toHaveLength(1)
    expect(sameClassRes.exceedingClasses[0]).toEqual({
      classId: '7530',
      className: 'Papelaria e Papel',
      label: '7530 - Papelaria e Papel',
      itemsCount: 2,
      totalAmount: 70000,
      itemNames: ['Papel Sulfite A4', 'Papel Sulfite A3'],
    })
  })

  it('buildDemandModalityOptions disables dispensation option when isDispensationDisabled is true', () => {
    const enabledOpts = buildDemandModalityOptions(false)
    expect(enabledOpts[0]?.value).toBe('dispensation')
    expect(enabledOpts[0]?.disabled).toBe(false)
    expect(enabledOpts[1]?.value).toBe('bidding')
    expect(enabledOpts[1]?.disabled).toBe(false)

    const disabledOpts = buildDemandModalityOptions(true)
    expect(disabledOpts[0]?.value).toBe('dispensation')
    expect(disabledOpts[0]?.disabled).toBe(true)
    expect(disabledOpts[0]?.props?.disabled).toBe(true)
    expect(disabledOpts[1]?.value).toBe('bidding')
    expect(disabledOpts[1]?.disabled).toBe(false)
  })
})
