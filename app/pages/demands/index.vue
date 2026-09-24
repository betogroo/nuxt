<script setup lang="ts">
  import type { DemandRow } from '~/composables/useDemands'

  definePageMeta({
    // O @nuxtjs/supabase já protege todas as rotas globalmente por padrão.
  })
  useHead({ title: 'Demandas' })

  const user = useSupabaseUser()
  const { profile } = useProfile()
  
  const { fetchDemands, createDemand, updateDemand } = useDemands()
  const route = useRoute()

  const currentPage = ref(1)
  const itemsPerPage = ref(10)
  const totalItems = ref(0)
  const statusFilter = ref<string | null>((route.query.filter as string) || null)
  const searchQuery = ref('')
  
  const totalPages = computed(() => Math.ceil(totalItems.value / itemsPerPage.value))

  const {
    data: demands,
    pending,
    refresh,
  } = useAsyncData(
    'demands-list',
    async () => {
      const result = await fetchDemands(
        currentPage.value,
        itemsPerPage.value,
        statusFilter.value,
        searchQuery.value
      )
      totalItems.value = result.count
      return result.data
    },
    {
      watch: [currentPage, statusFilter, searchQuery],
    }
  )

  watch([statusFilter, searchQuery], () => {
    currentPage.value = 1
  })

  const isModalOpen = ref(false)
  const isSaving = ref(false)
  const saveError = ref('')

  const defaultDemand = {
    id: '',
    name: '',
    type: 'consumption' as const,
  }

  const editingDemand = ref<Partial<DemandRow>>({ ...defaultDemand })

  const openModal = (demand?: DemandRow) => {
    if (demand) {
      editingDemand.value = { ...demand }
    } else {
      editingDemand.value = { ...defaultDemand }
    }
    saveError.value = ''
    isModalOpen.value = true
  }

  const closeModal = () => {
    isModalOpen.value = false
    editingDemand.value = { ...defaultDemand }
  }

  const canEdit = (demand: DemandRow) => {
    const currentUserId = user.value?.id || profile.value?.id
    return profile.value?.role === 'admin' || demand.user_id === currentUserId
  }

  const formatType = (type: string) => {
    return type === 'consumption' ? 'Consumo' : 'Permanente'
  }

  const formatStatus = (status: string) => {
    const map: Record<string, string> = {
      planning: 'Planejamento',
      bidding_notice: 'Aviso de Contratação',
      dispute: 'Disputa',
      homologation: 'Homologação',
      completed: 'Concluído',
      cancelled: 'Cancelado',
    }
    return map[status] || status
  }

  const getStatusColor = (status: string) => {
    const map: Record<string, string> = {
      planning: 'grey',
      bidding_notice: 'info',
      dispute: 'warning',
      homologation: 'primary',
      completed: 'success',
      cancelled: 'error',
    }
    return map[status] || 'grey'
  }

  const saveDemand = async () => {
    isSaving.value = true
    saveError.value = ''

    try {
      const isEditing = !!editingDemand.value.id

      const payload = {
        name: editingDemand.value.name!,
        type: editingDemand.value.type!,
      }

      if (isEditing) {
        await updateDemand(editingDemand.value.id!, payload)
      } else {
        await createDemand({ ...payload, user_id: profile.value!.id })
      }

      await refresh()
      closeModal()
    } catch (err: unknown) {
      if (err instanceof Error) {
        saveError.value = err.message
      } else if (typeof err === 'object' && err !== null && 'message' in err) {
        saveError.value = String((err as Record<string, unknown>).message)
      } else {
        saveError.value = 'Ocorreu um erro desconhecido.'
      }
    } finally {
      isSaving.value = false
    }
  }
</script>

<template>
  <div>
    <PageHeader subtitle="Gerencie as demandas e processos" title="Demandas" />

    <v-row>
      <v-col cols="12">
        <UiCard>
          <template #header>
            <span class="text-subtitle-1 font-weight-bold">Lista de Demandas</span>
            <v-spacer />
            <UiButton
              class="mr-2"
              color="secondary"
              icon="mdi-refresh"
              :loading="pending"
              size="small"
              variant="tonal"
              @click="refresh"
            />
            <UiButton color="primary" prepend-icon="mdi-plus" @click="openModal()">
              Nova Demanda
            </UiButton>
          </template>

          <div class="bg-grey-lighten-4 py-3 px-4 border-bottom">
            <v-row align="center" no-gutters>
              <v-col class="pr-sm-2 mb-2 mb-sm-0" cols="12" md="6" sm="6">
                <UiInput
                  v-model="searchQuery"
                  append-inner-icon="mdi-magnify"
                  class="mb-0"
                  clearable
                  hide-details
                  label="Buscar demanda..."
                />
              </v-col>
              <v-col class="pl-sm-2" cols="12" md="4" sm="6">
                <UiSelect
                  v-model="statusFilter"
                  class="mb-0"
                  clearable
                  hide-details
                  item-title="title"
                  item-value="value"
                  :items="[
                    { title: 'Planejamento', value: 'planning' },
                    { title: 'Aviso de Contratação', value: 'bidding_notice' },
                    { title: 'Disputa', value: 'dispute' },
                    { title: 'Homologação', value: 'homologation' },
                    { title: 'Concluído', value: 'completed' },
                    { title: 'Cancelado', value: 'cancelled' },
                    { title: 'Aguardando Retorno (Admin)', value: 'returns' },
                  ]"
                  label="Status"
                />
              </v-col>
            </v-row>
          </div>

          <v-divider />

          <UiTable
            :headers="[
              { text: 'Nome', value: 'name' },
              { text: 'Tipo', value: 'type' },
              { text: 'Status', value: 'status' },
              { text: 'Criado por', value: 'creator' },
              { text: 'Ações', value: 'actions', align: 'right' },
            ]"
            :items="demands || []"
            :loading="pending"
          >
            <template v-if="!demands?.length && !pending" #empty>
              Nenhuma demanda encontrada.
            </template>
            <template #item-name="{ item }">
              <NuxtLink
                class="text-decoration-none text-primary font-weight-bold"
                :to="`/demands/${item.id}`"
              >
                {{ item.name }}
              </NuxtLink>
            </template>
            <template #item-type="{ item }">
              <v-chip
                :color="item.type === 'consumption' ? 'info' : 'warning'"
                size="small"
                variant="flat"
              >
                {{ formatType(item.type) }}
              </v-chip>
            </template>
            <template #item-status="{ item }">
              <v-chip :color="getStatusColor(item.status)" size="small" variant="outlined">
                {{ formatStatus(item.status) }}
              </v-chip>
              <v-chip v-if="item.is_return_requested" class="ml-2" color="warning" size="small" variant="flat">
                <v-icon left size="small">mdi-keyboard-return</v-icon>
                Retorno Solicitado
              </v-chip>
            </template>
            <template #item-creator="{ item }">
              <span class="text-caption text-grey">
                {{ item.profiles?.name || `Usuário (${item.user_id.split('-')[0]})` }}
              </span>
            </template>
            <template #item-actions="{ item }">
              <UiButton
                color="primary"
                icon="mdi-arrow-right"
                size="small"
                :to="`/demands/${item.id}`"
                variant="text"
              />
              <UiButton
                v-if="canEdit(item)"
                color="grey"
                icon="mdi-pencil"
                size="small"
                variant="text"
                @click="openModal(item)"
              />
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

    <!-- Modal Form -->
    <v-dialog v-model="isModalOpen" max-width="500px">
      <UiCard :title="editingDemand.id ? 'Editar Demanda' : 'Nova Demanda'" transparent-header>
        <v-alert v-if="saveError" class="mb-4" density="compact" type="error" variant="tonal">
          {{ saveError }}
        </v-alert>

        <UiInput v-model="editingDemand.name" label="Nome da Demanda" />

        <UiSelect
          v-model="editingDemand.type"
          item-title="title"
          item-value="value"
          :items="[
            { title: 'Consumo', value: 'consumption' },
            { title: 'Permanente', value: 'permanent' },
          ]"
          label="Tipo"
        />

        <template #actions>
          <UiButton :disabled="isSaving" variant="text" @click="closeModal">Cancelar</UiButton>
          <UiButton color="primary" :loading="isSaving" @click="saveDemand"> Salvar </UiButton>
        </template>
      </UiCard>
    </v-dialog>
  </div>
</template>
