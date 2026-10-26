import { describe, it, expect } from 'vitest'
import { adminCatalogFormSchema, adminCatalogResolveSchema } from '~/schemas/forms/admin-catalog'

describe('adminCatalogFormSchema', () => {
  it('should validate correctly with valid data', () => {
    const result = adminCatalogFormSchema.safeParse({
      id: 'ID123',
      name: 'Item Name',
      is_active: true,
    })
    expect(result.success).toBe(true)
  })

  it('should fail if id is missing', () => {
    const result = adminCatalogFormSchema.safeParse({
      id: '',
      name: 'Item Name',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('O Código (ID) é obrigatório.')
    }
  })
})

describe('adminCatalogResolveSchema', () => {
  it('should validate approve mode with name', () => {
    const result = adminCatalogResolveSchema.safeParse({
      resolveMode: 'approve',
      newName: 'New Name',
    })
    expect(result.success).toBe(true)
  })

  it('should fail approve mode without name', () => {
    const result = adminCatalogResolveSchema.safeParse({
      resolveMode: 'approve',
      newName: '',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path[0]).toBe('newName')
    }
  })

  it('should validate merge mode with target id', () => {
    const result = adminCatalogResolveSchema.safeParse({
      resolveMode: 'merge',
      finalTargetId: 'target-123',
    })
    expect(result.success).toBe(true)
  })

  it('should fail merge mode without target id', () => {
    const result = adminCatalogResolveSchema.safeParse({
      resolveMode: 'merge',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path[0]).toBe('finalTargetId')
    }
  })
})
