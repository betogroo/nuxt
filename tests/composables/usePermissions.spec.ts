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
})
