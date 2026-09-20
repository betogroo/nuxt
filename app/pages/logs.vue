<script setup lang="ts">
  import type { Database } from '~/types/database.types'

  definePageMeta({
    middleware: ['admin'],
  })
  useHead({ title: 'Registros de Acessos e Ações' })

  const supabase = useSupabaseClient<Database>()

  const currentPage = ref(1)
  const itemsPerPage = ref(15)
  const totalItems = ref(0)

  const totalPages = computed(() => Math.ceil(totalItems.value / itemsPerPage.value))

  const {
    data: logs,
    pending,
    refresh,
  } = useAsyncData(
    'admin-logs',
    async () => {
      const from = (currentPage.value - 1) * itemsPerPage.value
      const to = from + itemsPerPage.value - 1

      const { data, count, error } = await supabase
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
          { count: 'exact' },
        )
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) {
        console.error(error)
        return []
      }

      totalItems.value = count || 0
      return data
    },
    {
      watch: [currentPage],
    },
  )
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

          <!-- Paginação -->
          <v-card-actions v-if="totalPages > 1" class="justify-center py-4">
            <v-pagination
              v-model="currentPage"
              density="comfortable"
              :length="totalPages"
              :total-visible="7"
            />
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
