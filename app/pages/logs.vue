<script setup lang="ts">
  import type { Database } from '~/types/database.types'

  definePageMeta({
    middleware: ['admin'],
  })
  useHead({ title: 'Registros de Acessos e Ações' })

  const supabase = useSupabaseClient<Database>()

  const {
    data: logs,
    pending,
    refresh,
  } = useAsyncData('admin-logs', async () => {
    // Need to join with profiles to get user name
    const { data, error } = await supabase
      .from('logs')
      .select(
        `
        id,
        action,
        description,
        created_at,
        profiles (
          id,
          name,
          avatar_url
        )
      `,
      )
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  })
</script>

<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title class="d-flex align-center">
            Registros de Sistema (Acessos e Ações)
            <v-spacer />
            <v-btn icon="mdi-refresh" :loading="pending" variant="text" @click="refresh" />
          </v-card-title>

          <v-divider />

          <v-table hover>
            <thead>
              <tr>
                <th class="text-left">Data/Hora</th>
                <th class="text-left">Usuário</th>
                <th class="text-left">Ação</th>
                <th class="text-left">Descrição</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="log in logs" :key="log.id">
                <td>
                  {{ new Date(log.created_at).toLocaleString() }}
                </td>
                <td>
                  <div v-if="log.profiles" class="d-flex align-center py-2">
                    <v-avatar class="mr-3" color="surface-variant" size="32">
                      <v-img v-if="log.profiles.avatar_url" :src="log.profiles.avatar_url" />
                      <v-icon v-else>mdi-account</v-icon>
                    </v-avatar>
                    <span>{{ log.profiles.name || 'Sem nome' }}</span>
                  </div>
                  <span v-else class="text-grey text-caption">Sistema / Desconhecido</span>
                </td>
                <td>
                  <v-chip color="primary" size="small" variant="outlined">
                    {{ log.action }}
                  </v-chip>
                </td>
                <td>
                  {{ log.description || '-' }}
                </td>
              </tr>
            </tbody>
          </v-table>

          <v-card-text v-if="!logs?.length && !pending" class="text-center text-grey">
            Nenhum registro encontrado.
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
