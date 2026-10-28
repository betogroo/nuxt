import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { useSupabaseClient } from '#imports'

export interface PostgresChangeListener<
  TRow extends Record<string, unknown> = Record<string, unknown>,
> {
  event?: '*' | 'INSERT' | 'UPDATE' | 'DELETE'
  schema?: string
  table: string
  filter?: string
  callback: (payload: RealtimePostgresChangesPayload<TRow>) => void
}

/**
 * Composable for subscribing and unsubscribing to Supabase Realtime `postgres_changes` channels
 * without scattering raw `supabase.channel(...)` calls across pages.
 */
export function useRealtimeChannel() {
  const supabase = useSupabaseClient()

  const subscribeToPostgresChanges = (
    channelName: string,
    listeners: PostgresChangeListener[],
  ): RealtimeChannel => {
    const channel = supabase.channel(channelName)

    for (const listener of listeners) {
      channel.on(
        'postgres_changes',
        {
          event: listener.event || '*',
          schema: listener.schema || 'public',
          table: listener.table,
          filter: listener.filter,
        },
        listener.callback,
      )
    }

    return channel.subscribe()
  }

  const removeRealtimeChannel = (channel: RealtimeChannel | null | undefined): void => {
    if (channel) {
      supabase.removeChannel(channel)
    }
  }

  return {
    subscribeToPostgresChanges,
    removeRealtimeChannel,
  }
}
