import { describe, it, expect } from 'vitest'
import {
  adminUnitFormSchema,
  adminUnitAliasFormSchema,
  adminUnitResolveSchema,
} from '~/schemas/forms/admin-unit'

describe('adminUnitFormSchema', () => {
  it('validates a valid unit form input', () => {
    const validData = {
      name: 'Pacote 100 Unidade',
      aliasIds: ['alias-1', 'alias-2'],
      is_active: true,
    }
    const result = adminUnitFormSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('fails when aliasIds is empty (requires at least 1 alias)', () => {
    const invalidData = {
      name: 'Pacote 100 Unidade',
      aliasIds: [],
      is_active: true,
    }
    const result = adminUnitFormSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        'A unidade de medida deve possuir pelo menos um registro alternativo (alias).',
      )
    }
  })

  it('fails when name is empty', () => {
    const invalidData = {
      name: '',
      aliasIds: ['alias-1'],
      is_active: true,
    }
    const result = adminUnitFormSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('O Nome da Unidade é obrigatório.')
    }
  })
})

describe('adminUnitAliasFormSchema', () => {
  it('validates valid alias with unitIds', () => {
    const validData = {
      code: 36,
      name: 'Cento',
      unitIds: ['unit-1', 'unit-2'],
    }
    const result = adminUnitAliasFormSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('defaults unitIds to empty array when omitted', () => {
    const validData = {
      code: 36,
      name: 'Cento',
    }
    const result = adminUnitAliasFormSchema.safeParse(validData)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.unitIds).toEqual([])
    }
  })

  it('fails when code is not a number', () => {
    const invalidData = {
      code: 'abc',
      name: 'Cento',
    }
    const result = adminUnitAliasFormSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })
})

describe('adminUnitResolveSchema', () => {
  it('validates new unit mode with new name', () => {
    const validData = {
      resolveMode: 'new',
      resolveNewName: 'Nova Unidade',
    }
    const result = adminUnitResolveSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('validates link unit mode with target unit ID', () => {
    const validData = {
      resolveMode: 'link',
      resolveLinkUnitId: 'unit-123',
    }
    const result = adminUnitResolveSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('fails when new name is missing in new mode', () => {
    const invalidData = {
      resolveMode: 'new',
      resolveNewName: '',
    }
    const result = adminUnitResolveSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })

  it('fails when target unit ID is missing in link mode', () => {
    const invalidData = {
      resolveMode: 'link',
      resolveLinkUnitId: '',
    }
    const result = adminUnitResolveSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })
})
