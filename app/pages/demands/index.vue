<script setup lang="ts">
  import type { DemandRow } from '~/composables/useDemands'

  definePageMeta({
    // O @nuxtjs/supabase já protege todas as rotas globalmente por padrão.
  })
  useHead({ title: 'Demandas' })

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
        searchQuery.value,
      )
      totalItems.value = result.count
      return result.data
    },
    {
      watch: [currentPage, statusFilter, searchQuery],
    },
  )

  watch([statusFilter, searchQuery], () => {
    currentPage.value = 1
  })

  const modal = useModal<Partial<DemandRow>>({
    id: '',
    name: '',
    type: 'consumption',
    process_number: '',
    id_pca: '',
    contract_number: '',
  })

  const canEdit = (demand: DemandRow) => {
    const currentUserId = profile.value?.id
    return profile.value?.role === 'admin' || demand.user_id === currentUserId
  }

  const saveDemand = async () => {
    modal.startSaving()

    try {
      const isEditing = !!modal.payload.value.id

      const payload = {
        name: modal.payload.value.name!,
        type: modal.payload.value.type!,
        process_number: modal.payload.value.process_number || null,
        id_pca: modal.payload.value.id_pca || null,
        contract_number: modal.payload.value.contract_number
          ? String(modal.payload.value.contract_number)
          : null,
      }

      if (isEditing) {
        await updateDemand(modal.payload.value.id!, payload)
      } else {
        await createDemand({ ...payload, user_id: profile.value!.id })
      }

      await refresh()
      modal.close()
    } catch (err: unknown) {
      if (err instanceof Error) {
        modal.error.value = err.message
      } else if (typeof err === 'object' && err !== null && 'message' in err) {
        modal.error.value = String((err as Record<string, unknown>).message)
      } else {
        modal.error.value = 'Ocorreu um erro desconhecido.'
      }
    } finally {
      modal.stopSaving()
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
            <UiButton color="primary" prepend-icon="mdi-plus" @click="modal.open()">
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
              { text: 'Processo', value: 'internal_process_number' },
              { text: 'Nome', value: 'name' },
              { text: 'Tipo', value: 'type' },
              { text: 'Status', value: 'status' },
              { text: 'Criado por', value: 'creator' },
              { text: 'Ações', value: 'actions', align: 'right' },
            ]"
            :items="demands || []"
            :loading="pending"
          >
            <template #item-internal_process_number="{ item }">
              <div v-if="item.process_number" class="font-weight-bold text-primary">
                {{ item.process_number }}
              </div>
              <div v-else class="text-caption text-grey font-italic">Sem nº oficial</div>
              <div class="text-caption text-grey-darken-1">
                Interno: {{ item.internal_process_number || '-' }}
              </div>
            </template>
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
              <UiChip
                :color="item.type === 'consumption' ? 'info' : 'warning'"
                size="small"
                variant="flat"
              >
                {{ formatDemandType(item.type) }}
              </UiChip>
            </template>
            <template #item-status="{ item }">
              <UiChip :color="getDemandStatusColor(item.status)" size="small" variant="outlined">
                {{ formatDemandStatus(item.status) }}
              </UiChip>
              <UiChip
                v-if="item.is_return_requested"
                class="ml-2"
                color="warning"
                size="small"
                variant="flat"
              >
                <v-icon left size="small">mdi-keyboard-return</v-icon>
                Retorno Solicitado
              </UiChip>
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
                @click="modal.open(item)"
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
    <UiModal
      v-model="modal.isOpen.value"
      max-width="500px"
      :title="modal.payload.value.id ? 'Editar Demanda' : 'Nova Demanda'"
      transparent-header
    >
      <UiAlert v-if="modal.error.value" class="mb-4" density="compact" type="error" variant="tonal">
        {{ modal.error.value }}
      </UiAlert>

      <UiInput v-model="modal.payload.value.name" label="Nome da Demanda*" required />

      <UiSelect
        v-model="modal.payload.value.type"
        item-title="title"
        item-value="value"
        :items="[
          { title: 'Consumo', value: 'consumption' },
          { title: 'Permanente', value: 'permanent' },
        ]"
        label="Tipo*"
        required
      />

      <UiInput
        v-model="modal.payload.value.process_number"
        hint="Opcional. Padrão: XXX.XXXXXXXX/YYYY-ZZ"
        label="Nº do Processo (Oficial)"
        placeholder="Ex: 058.00100793/2026-21"
      />

      <UiInput
        v-model="modal.payload.value.id_pca"
        hint="Opcional. ID do Plano de Contratações Anual"
        label="ID PCA"
        placeholder="Ex: 46377800000127-0-000132/2026"
      />

      <UiInput
        v-model="modal.payload.value.contract_number"
        hint="Opcional. Número da contratação."
        label="Nº da Contratação"
        placeholder="Apenas números"
        type="number"
      />

      <template #actions>
        <UiButton :disabled="modal.isSaving.value" variant="text" @click="modal.close"
          >Cancelar</UiButton
        >
        <UiButton color="primary" :loading="modal.isSaving.value" @click="saveDemand">
          Salvar
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>
