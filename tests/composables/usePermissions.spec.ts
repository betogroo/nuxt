import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { ROLES } from '../../app/constants/roles'
import { usePermissions } from '../../app/composables/usePermissions'

const mockProfile = ref<{ id: string; role: string } | null>(null)
const mockUserId = ref<string | null>(null)

mockNuxtImport('useProfile', () => () => ({
  profile: mockProfile,
}))

mockNuxtImport('useCurrentUserId', () => () => ({
  userId: mockUserId,
}))

describe('composables/usePermissions', () => {
  describe('canEditDemand', () => {
    it('returns false when demand is null or undefined', () => {
      mockProfile.value = { id: 'u1', role: ROLES.ADMIN }
      const { canEditDemand } = usePermissions()
      expect(canEditDemand(null)).toBe(false)
      expect(canEditDemand(undefined)).toBe(false)
    })

    it('returns true for admin users regardless of who created the demand', () => {
      mockProfile.value = { id: 'admin-1', role: ROLES.ADMIN }
      mockUserId.value = 'admin-1'
      const { canEditDemand } = usePermissions()

      expect(canEditDemand({ user_id: 'creator-99' })).toBe(true)
    })

    it('returns true for non-admin creator of the demand', () => {
      mockProfile.value = { id: 'user-1', role: ROLES.UGE }
      mockUserId.value = 'user-1'
      const { canEditDemand } = usePermissions()

      expect(canEditDemand({ user_id: 'user-1' })).toBe(true)
    })

    it('returns false for non-admin who did not create the demand', () => {
      mockProfile.value = { id: 'user-1', role: ROLES.UGE }
      mockUserId.value = 'user-1'
      const { canEditDemand } = usePermissions()

      expect(canEditDemand({ user_id: 'other-user' })).toBe(false)
    })
  })

  describe('canDeleteDemand', () => {
    it('returns false when demand is null or undefined', () => {
      mockProfile.value = { id: 'u1', role: ROLES.ADMIN }
      const { canDeleteDemand } = usePermissions()
      expect(canDeleteDemand(null)).toBe(false)
      expect(canDeleteDemand(undefined)).toBe(false)
    })

    it('returns true for admin users regardless of who created the demand', () => {
      mockProfile.value = { id: 'admin-1', role: ROLES.ADMIN }
      mockUserId.value = 'admin-1'
      const { canDeleteDemand } = usePermissions()

      expect(canDeleteDemand({ user_id: 'creator-99' })).toBe(true)
    })

    it('returns true for non-admin creator of the demand', () => {
      mockProfile.value = { id: 'user-1', role: ROLES.UGE }
      mockUserId.value = 'user-1'
      const { canDeleteDemand } = usePermissions()

      expect(canDeleteDemand({ user_id: 'user-1' })).toBe(true)
    })

    it('returns false for non-admin who did not create the demand', () => {
      mockProfile.value = { id: 'user-1', role: ROLES.UGE }
      mockUserId.value = 'user-1'
      const { canDeleteDemand } = usePermissions()

      expect(canDeleteDemand({ user_id: 'other-user' })).toBe(false)
    })
  })

  describe('canManageElections', () => {
    it('returns true for admin, admin-election, manager-election, and user-election', () => {
      const { canManageElections } = usePermissions()

      mockProfile.value = { id: 'a1', role: ROLES.ADMIN }
      expect(canManageElections()).toBe(true)

      mockProfile.value = { id: 'ae1', role: ROLES.ADMIN_ELECTION }
      expect(canManageElections()).toBe(true)

      mockProfile.value = { id: 'me1', role: ROLES.MANAGER_ELECTION }
      expect(canManageElections()).toBe(true)

      mockProfile.value = { id: 'ue1', role: ROLES.USER_ELECTION }
      expect(canManageElections()).toBe(true)
    })

    it('returns false for uge, user, and unauthenticated', () => {
      const { canManageElections } = usePermissions()

      mockProfile.value = { id: 'u1', role: ROLES.USER }
      expect(canManageElections()).toBe(false)

      mockProfile.value = { id: 'uge1', role: ROLES.UGE }
      expect(canManageElections()).toBe(false)

      mockProfile.value = null
      expect(canManageElections()).toBe(false)
    })
  })

  describe('canDeleteElections', () => {
    it('returns true only for admin and admin-election', () => {
      const { canDeleteElections } = usePermissions()

      mockProfile.value = { id: 'a1', role: ROLES.ADMIN }
      expect(canDeleteElections()).toBe(true)

      mockProfile.value = { id: 'ae1', role: ROLES.ADMIN_ELECTION }
      expect(canDeleteElections()).toBe(true)
    })

    it('returns false for manager-election, user-election, user, etc.', () => {
      const { canDeleteElections } = usePermissions()

      mockProfile.value = { id: 'me1', role: ROLES.MANAGER_ELECTION }
      expect(canDeleteElections()).toBe(false)

      mockProfile.value = { id: 'ue1', role: ROLES.USER_ELECTION }
      expect(canDeleteElections()).toBe(false)

      mockProfile.value = { id: 'u1', role: ROLES.USER }
      expect(canDeleteElections()).toBe(false)
    })
  })
})
