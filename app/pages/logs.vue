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
        <UiCard>
          <template #header>
            Registros de Sistema (Acessos e Ações)
            <v-spacer />
            <UiButton
              color="white"
              icon="mdi-refresh"
              :loading="pending"
              variant="text"
              @click="refresh"
            />
          </template>

          <UiTable
            :headers="[
              { text: 'Data/Hora', value: 'created_at' },
              { text: 'Usuário', value: 'user' },
              { text: 'Ação', value: 'action' },
              { text: 'Descrição', value: 'description' },
            ]"
            :items="logs || []"
          >
            <template v-if="!logs?.length && !pending" #empty>
              Nenhum registro encontrado.
            </template>
            <template #item-created_at="{ item }">
              {{ new Date(item.created_at).toLocaleString() }}
            </template>
            <template #item-user="{ item }">
              <div v-if="item.profiles" class="d-flex align-center py-2">
                <v-avatar class="mr-3" color="surface-variant" size="32">
                  <v-img v-if="item.profiles.avatar_url" :src="item.profiles.avatar_url" />
                  <v-icon v-else>mdi-account</v-icon>
                </v-avatar>
                <span>{{ item.profiles.name || 'Sem nome' }}</span>
              </div>
              <span v-else class="text-grey text-caption">Sistema / Desconhecido</span>
            </template>
            <template #item-action="{ item }">
              <v-chip color="primary" size="small" variant="outlined">
                {{ item.action }}
              </v-chip>
            </template>
            <template #item-description="{ item }">
              {{ item.description || '-' }}
            </template>
          </UiTable>

          <!-- Paginação -->
          <div v-if="totalPages > 1" class="d-flex justify-center py-4 w-100">
            <v-pagination
              v-model="currentPage"
              density="comfortable"
              :length="totalPages"
              :total-visible="7"
            />
          </div>
        </UiCard>
      </v-col>
    </v-row>
  </v-container>
</template>
