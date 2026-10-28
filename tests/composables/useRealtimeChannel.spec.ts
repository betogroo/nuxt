import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useRealtimeChannel } from '~/composables/useRealtimeChannel'

const onMock = vi.fn().mockReturnThis()
const subscribeMock = vi.fn().mockReturnThis()
const channelMock = vi.fn(() => ({
  on: onMock,
  subscribe: subscribeMock,
}))
const removeChannelMock = vi.fn()

mockNuxtImport('useSupabaseClient', () => () => ({
  channel: channelMock,
  removeChannel: removeChannelMock,
}))

describe('composables/useRealtimeChannel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('subscribes to multiple postgres_changes listeners and removes channel cleanly', () => {
    const { subscribeToPostgresChanges, removeRealtimeChannel } = useRealtimeChannel()
    const cb1 = vi.fn()
    const cb2 = vi.fn()

    const channel = subscribeToPostgresChanges('test_channel', [
      { table: 'ballot_boxes', filter: 'id=eq.1', callback: cb1 },
      { event: 'UPDATE', table: 'elections', filter: 'id=eq.2', callback: cb2 },
    ])

    expect(channelMock).toHaveBeenCalledWith('test_channel')
    expect(onMock).toHaveBeenCalledTimes(2)
    expect(subscribeMock).toHaveBeenCalledOnce()

    removeRealtimeChannel(channel)
    expect(removeChannelMock).toHaveBeenCalledWith(channel)

    removeRealtimeChannel(null)
    expect(removeChannelMock).toHaveBeenCalledTimes(1)
  })
})
