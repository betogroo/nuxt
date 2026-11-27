import { describe, it, expect } from 'vitest'
import { DEMAND_BUDGET_DEFAULTS, resolveDemandBudgetCodes } from '~/constants/demand-budget'

describe('demand-budget', () => {
  it('has official SIAFEM default constants for consumption and permanent', () => {
    expect(DEMAND_BUDGET_DEFAULTS.consumption.workProgram).toBe('06181180149890000')
    expect(DEMAND_BUDGET_DEFAULTS.consumption.ptres).toBe('180205')
    expect(DEMAND_BUDGET_DEFAULTS.consumption.label).toBe('Consumo')

    expect(DEMAND_BUDGET_DEFAULTS.permanent.workProgram).toBe('06181181862960000')
    expect(DEMAND_BUDGET_DEFAULTS.permanent.ptres).toBe('180211')
    expect(DEMAND_BUDGET_DEFAULTS.permanent.label).toBe('Permanente')
  })

  it('resolves standard consumption defaults when demand is consumption or undefined', () => {
    const resolvedNull = resolveDemandBudgetCodes(null)
    expect(resolvedNull.workProgram).toBe('06181180149890000')
    expect(resolvedNull.ptres).toBe('180205')
    expect(resolvedNull.isCustom).toBe(false)
    expect(resolvedNull.typeLabel).toBe('Consumo')

    const resolvedConsumption = resolveDemandBudgetCodes({ type: 'consumption' })
    expect(resolvedConsumption.workProgram).toBe('06181180149890000')
    expect(resolvedConsumption.ptres).toBe('180205')
    expect(resolvedConsumption.isCustom).toBe(false)
    expect(resolvedConsumption.typeLabel).toBe('Consumo')
  })

  it('resolves standard permanent defaults when demand is permanent', () => {
    const resolved = resolveDemandBudgetCodes({ type: 'permanent' })
    expect(resolved.workProgram).toBe('06181181862960000')
    expect(resolved.ptres).toBe('180211')
    expect(resolved.isCustom).toBe(false)
    expect(resolved.typeLabel).toBe('Permanente')
  })

  it('resolves custom overrides when provided and marks as custom', () => {
    const resolved = resolveDemandBudgetCodes({
      type: 'consumption',
      work_program: '06181189999990000',
      ptres: '180299',
    })

    expect(resolved.workProgram).toBe('06181189999990000')
    expect(resolved.ptres).toBe('180299')
    expect(resolved.isCustom).toBe(true)
    expect(resolved.isCustomWorkProgram).toBe(true)
    expect(resolved.isCustomPtres).toBe(true)
    expect(resolved.defaultWorkProgram).toBe('06181180149890000')
    expect(resolved.defaultPtres).toBe('180205')
  })

  it('handles partial override (e.g. only PTRES is exceptional)', () => {
    const resolved = resolveDemandBudgetCodes({
      type: 'permanent',
      ptres: '180299',
    })

    expect(resolved.workProgram).toBe('06181181862960000')
    expect(resolved.ptres).toBe('180299')
    expect(resolved.isCustom).toBe(true)
    expect(resolved.isCustomWorkProgram).toBe(false)
    expect(resolved.isCustomPtres).toBe(true)
  })
})
