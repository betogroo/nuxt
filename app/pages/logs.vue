<script setup lang="ts">
  definePageMeta({
    middleware: ['admin'],
  })
  useHead({ title: 'Registros de Acessos e Ações' })

  const { fetchLogs } = useLogger()

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
      try {
        const result = await fetchLogs(currentPage.value, itemsPerPage.value)
        totalItems.value = result.count
        return result.data
      } catch (e) {
        console.error(e)
        return []
      }
    },
    {
      watch: [currentPage],
    },
  )
</script>

<template>
  <div>
    <PageHeader subtitle="Trilha de auditoria e atividades no sistema" title="Registros (Logs)">
      <template #actions>
        <UiButton
          color="secondary"
          icon="mdi-refresh"
          :loading="pending"
          variant="tonal"
          @click="refresh"
        />
      </template>
    </PageHeader>

    <v-row>
      <v-col cols="12">
        <UiCard>
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
  </div>
</template>
