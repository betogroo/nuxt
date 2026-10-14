import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useCurrentUserId } from '../../app/composables/useCurrentUserId'

const mockUser = ref<{ id?: string; sub?: string } | null>(null)

mockNuxtImport('useSupabaseUser', () => () => mockUser)

describe('composables/useCurrentUserId', () => {
  it('returns null if user is null', () => {
    mockUser.value = null
    const { userId } = useCurrentUserId()
    expect(userId.value).toBeNull()
  })

  it('returns user.id when id is present', () => {
    mockUser.value = { id: 'user-uuid-123' }
    const { userId } = useCurrentUserId()
    expect(userId.value).toBe('user-uuid-123')
  })

  it('returns user.sub when id is missing but sub is present', () => {
    mockUser.value = { sub: 'jwt-sub-456' }
    const { userId } = useCurrentUserId()
    expect(userId.value).toBe('jwt-sub-456')
  })
})
