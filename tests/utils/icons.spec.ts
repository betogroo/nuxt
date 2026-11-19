import { describe, it, expect } from 'vitest'
import { iconMap } from '../../app/components/ui/icons'

describe('components/ui/icons', () => {
  describe('iconMap', () => {
    it('maps clipboardClock to mdi-clipboard-clock-outline', () => {
      expect(iconMap.clipboardClock).toBe('mdi-clipboard-clock-outline')
    })

    it('contains valid mdi mappings for demands dashboard KPI cards', () => {
      const demandKpiIcons = ['recordsList', 'clipboardClock', 'balance', 'check'] as const
      for (const icon of demandKpiIcons) {
        expect(iconMap[icon]).toBeDefined()
        expect(iconMap[icon]).toMatch(/^mdi-/)
        expect(iconMap[icon].length).toBeGreaterThan(4)
      }
    })

    it('ensures all mapped icons follow the mdi- prefix convention', () => {
      for (const [key, iconClass] of Object.entries(iconMap)) {
        expect(iconClass, `Icon mapping for "${key}" should start with "mdi-"`).toMatch(/^mdi-/)
      }
    })
  })
})
