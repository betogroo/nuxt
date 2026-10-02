<script setup lang="ts">
  definePageMeta({
    icon: 'searchDocument',
    middleware: ['admin'],
    navLabel: 'Logs',
    navSubtitle: 'Auditoria de ações do sistema',
    navColor: 'blue-grey',
    navGroup: 'admin',
    navOrder: 70,
    roles: ['admin'],
    showIn: ['drawer', 'admin-shortcuts'],
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
          size="small"
          variant="tonal"
          @click="refresh"
        />
      </template>
    </PageHeader>

    <UiCard>
      <template #header>
        <UiIcon class="mr-2" color="primary" name="searchDocument" />
        Auditoria de Logs
        <v-chip v-if="totalItems > 0" class="ml-2" label size="x-small" variant="tonal">
          {{ totalItems }}
        </v-chip>
      </template>

      <UiTable
        :headers="[
          { text: 'Data/Hora', value: 'created_at' },
          { text: 'Usuário', value: 'user' },
          { text: 'Ação', value: 'action' },
          { text: 'Descrição', value: 'description' },
        ]"
        :items="logs || []"
        :loading="pending"
      >
        <template v-if="!logs?.length && !pending" #empty> Nenhum registro encontrado. </template>
        <template #item-created_at="{ item }">
          <span class="text-body-2 text-medium-emphasis">
            {{ new Date(item.created_at).toLocaleString('pt-BR') }}
          </span>
        </template>
        <template #item-user="{ item }">
          <div v-if="item.profiles" class="d-flex align-center py-2 gap-3">
            <v-avatar color="primary" size="30" variant="tonal">
              <v-img v-if="item.profiles.avatar_url" :src="item.profiles.avatar_url" />
              <span v-else class="text-caption font-weight-bold">
                {{ (item.profiles.name || 'U').charAt(0).toUpperCase() }}
              </span>
            </v-avatar>
            <span class="text-body-2">{{ item.profiles.name || 'Sem nome' }}</span>
          </div>
          <span v-else class="text-medium-emphasis text-caption">Sistema</span>
        </template>
        <template #item-action="{ item }">
          <v-chip color="primary" label size="small" variant="tonal">
            {{ item.action.replace(/_/g, ' ') }}
          </v-chip>
        </template>
        <template #item-description="{ item }">
          <span class="text-body-2">{{ item.description || '—' }}</span>
        </template>
      </UiTable>

      <!-- Paginação -->
      <div v-if="totalPages > 1" class="d-flex justify-center py-4 w-100">
        <v-pagination
          v-model="currentPage"
          density="comfortable"
          :length="totalPages"
          rounded="lg"
          :total-visible="7"
        />
      </div>
    </UiCard>
  </div>
</template>
