import { describe, expect, it } from 'vitest'
import {
  formatMailtoRecipients,
  formatSupplierEmails,
  getFirstSupplierEmail,
  isValidEmail,
  parseSupplierEmails,
  validateSupplierEmails,
} from '~/utils/supplierEmail'

describe('supplierEmail Utility', () => {
  describe('isValidEmail', () => {
    it('should validate valid emails', () => {
      expect(isValidEmail('contato@empresa.com')).toBe(true)
      expect(isValidEmail('licitacao@fornecedor.com.br')).toBe(true)
      expect(isValidEmail('user.name+tag@sub.domain.org')).toBe(true)
    })

    it('should reject invalid emails', () => {
      expect(isValidEmail('')).toBe(false)
      expect(isValidEmail(null)).toBe(false)
      expect(isValidEmail(undefined)).toBe(false)
      expect(isValidEmail('sem-arroba')).toBe(false)
      expect(isValidEmail('sem-dominio@')).toBe(false)
      expect(isValidEmail('@sem-usuario.com')).toBe(false)
      expect(isValidEmail('invalido@dominio')).toBe(false)
    })
  })

  describe('parseSupplierEmails', () => {
    it('should parse single email string', () => {
      expect(parseSupplierEmails('contato@empresa.com')).toEqual(['contato@empresa.com'])
    })

    it('should parse emails separated by comma', () => {
      expect(parseSupplierEmails('a@a.com, b@b.com')).toEqual(['a@a.com', 'b@b.com'])
    })

    it('should parse emails separated by semicolon, spaces, and newlines', () => {
      const input = 'a@a.com; b@b.com \n c@c.com,  d@d.com'
      expect(parseSupplierEmails(input)).toEqual(['a@a.com', 'b@b.com', 'c@c.com', 'd@d.com'])
    })

    it('should deduplicate emails and normalize to lowercase', () => {
      expect(parseSupplierEmails('A@A.COM, a@a.com, B@B.COM')).toEqual(['a@a.com', 'b@b.com'])
    })

    it('should parse array input', () => {
      expect(parseSupplierEmails(['a@a.com', 'b@b.com', 'A@A.COM'])).toEqual(['a@a.com', 'b@b.com'])
    })

    it('should return empty array for null/empty', () => {
      expect(parseSupplierEmails('')).toEqual([])
      expect(parseSupplierEmails(null)).toEqual([])
      expect(parseSupplierEmails(undefined)).toEqual([])
    })
  })

  describe('validateSupplierEmails', () => {
    it('should report valid for empty input', () => {
      const res = validateSupplierEmails('')
      expect(res.isValid).toBe(true)
      expect(res.validEmails).toEqual([])
      expect(res.invalidEmails).toEqual([])
    })

    it('should report valid when all emails are valid', () => {
      const res = validateSupplierEmails('a@a.com, b@b.com.br')
      expect(res.isValid).toBe(true)
      expect(res.validEmails).toEqual(['a@a.com', 'b@b.com.br'])
      expect(res.invalidEmails).toEqual([])
    })

    it('should identify invalid emails correctly', () => {
      const res = validateSupplierEmails('a@a.com, email-errado, b@b.com, outro@invalido')
      expect(res.isValid).toBe(false)
      expect(res.validEmails).toEqual(['a@a.com', 'b@b.com'])
      expect(res.invalidEmails).toEqual(['email-errado', 'outro@invalido'])
    })
  })

  describe('formatSupplierEmails', () => {
    it('should format multiple emails with comma and space', () => {
      expect(formatSupplierEmails('a@a.com; b@b.com')).toBe('a@a.com, b@b.com')
      expect(formatSupplierEmails(['a@a.com', 'b@b.com'])).toBe('a@a.com, b@b.com')
    })

    it('should return null if no valid emails', () => {
      expect(formatSupplierEmails('')).toBeNull()
      expect(formatSupplierEmails(null)).toBeNull()
      expect(formatSupplierEmails('invalido')).toBeNull()
    })
  })

  describe('getFirstSupplierEmail', () => {
    it('should return first email in list', () => {
      expect(getFirstSupplierEmail('a@a.com, b@b.com')).toBe('a@a.com')
      expect(getFirstSupplierEmail(['first@a.com', 'second@b.com'])).toBe('first@a.com')
    })

    it('should return null for empty', () => {
      expect(getFirstSupplierEmail('')).toBeNull()
      expect(getFirstSupplierEmail(null)).toBeNull()
    })
  })

  describe('formatMailtoRecipients', () => {
    it('should format recipients joined by comma without spaces for mailto: header', () => {
      expect(formatMailtoRecipients('a@a.com, b@b.com')).toBe('a@a.com,b@b.com')
      expect(formatMailtoRecipients(['a@a.com', 'b@b.com'])).toBe('a@a.com,b@b.com')
    })
  })
})
