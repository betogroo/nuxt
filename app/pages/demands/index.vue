<script setup lang="ts">
  import type { Database } from '~/types/database.types'

  definePageMeta({
    // O @nuxtjs/supabase já protege todas as rotas globalmente por padrão.
  })
  useHead({ title: 'Demandas' })

  const supabase = useSupabaseClient<Database>()
  const user = useSupabaseUser()
  const { profile } = useProfile()
  const { logAction } = useLogger()

  type DemandRow = Database['public']['Tables']['demands']['Row']

  const {
    data: demands,
    pending,
    refresh,
  } = useAsyncData('demands-list', async () => {
    const { data, error } = await supabase
      .from('demands')
      .select('*, profiles!demands_user_id_fkey(name)')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
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
        const { error } = await supabase
          .from('demands')
          .update(payload)
          .eq('id', editingDemand.value.id!)

        if (error) throw error

        await logAction(
          'UPDATE_DEMAND',
          `Usuário atualizou a demanda: ${editingDemand.value.id}`,
          user.value?.id,
        )
      } else {
        const { data, error } = await supabase
          .from('demands')
          .insert([{ ...payload, user_id: profile.value!.id }])
          .select()
          .single()

        if (error) throw error

        await logAction('CREATE_DEMAND', `Usuário criou nova demanda: ${data.id}`, user.value?.id)
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

          <UiTable
            :headers="[
              { text: 'Nome', value: 'name' },
              { text: 'Tipo', value: 'type' },
              { text: 'Status', value: 'status' },
              { text: 'Criado por', value: 'creator' },
              { text: 'Ações', value: 'actions', align: 'right' },
            ]"
            :items="demands || []"
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
