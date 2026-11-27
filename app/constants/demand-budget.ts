export interface DemandBudgetConfig {
  workProgram: string
  ptres: string
  label: string
}

export const DEMAND_BUDGET_DEFAULTS: Record<'consumption' | 'permanent', DemandBudgetConfig> = {
  consumption: {
    workProgram: '06181180149890000',
    ptres: '180205',
    label: 'Consumo',
  },
  permanent: {
    workProgram: '06181181862960000',
    ptres: '180211',
    label: 'Permanente',
  },
}

export interface DemandForBudgetResolution {
  type?: 'consumption' | 'permanent' | string | null
  work_program?: string | null
  ptres?: string | null
  workProgram?: string | null
}

export function resolveDemandBudgetCodes(demand?: DemandForBudgetResolution | null): {
  workProgram: string
  ptres: string
  isCustom: boolean
  isCustomWorkProgram: boolean
  isCustomPtres: boolean
  defaultWorkProgram: string
  defaultPtres: string
  typeLabel: string
} {
  const demandType = demand?.type === 'permanent' ? 'permanent' : 'consumption'
  const defaults = DEMAND_BUDGET_DEFAULTS[demandType]

  const customWorkProgram = (demand?.work_program ?? demand?.workProgram)?.trim() || null
  const customPtres = demand?.ptres?.trim() || null

  const isCustomWorkProgram = Boolean(
    customWorkProgram && customWorkProgram !== defaults.workProgram,
  )
  const isCustomPtres = Boolean(customPtres && customPtres !== defaults.ptres)
  const isCustom = isCustomWorkProgram || isCustomPtres

  const workProgram = customWorkProgram || defaults.workProgram
  const ptres = customPtres || defaults.ptres

  return {
    workProgram,
    ptres,
    isCustom,
    isCustomWorkProgram,
    isCustomPtres,
    defaultWorkProgram: defaults.workProgram,
    defaultPtres: defaults.ptres,
    typeLabel: defaults.label,
  }
}
