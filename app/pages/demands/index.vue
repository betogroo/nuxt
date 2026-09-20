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
      .select('*, profiles(name)')
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
    dispute_date: null,
    offer_opening_date: null as string | null,
  }

  const editingDemand = ref<Partial<DemandRow>>({ ...defaultDemand })

  const openModal = (demand?: DemandRow) => {
    if (demand) {
      editingDemand.value = { ...demand }
      // Convert timestamptz to datetime-local format if present
      if (editingDemand.value.offer_opening_date) {
        editingDemand.value.offer_opening_date = editingDemand.value.offer_opening_date.slice(0, 16)
      }
      // Convert timestamptz/date to YYYY-MM-DD for date input
      if (editingDemand.value.dispute_date) {
        editingDemand.value.dispute_date = editingDemand.value.dispute_date.slice(0, 10)
      }
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
    return profile.value?.role === 'admin' || demand.user_id === user.value?.id
  }

  const formatType = (type: string) => {
    return type === 'consumption' ? 'Consumo' : 'Permanente'
  }

  const saveDemand = async () => {
    isSaving.value = true
    saveError.value = ''

    try {
      const isEditing = !!editingDemand.value.id

      // Formatar date-time-local string to ISO para o Supabase (timestamptz)
      let offerOpening = editingDemand.value.offer_opening_date || null
      if (offerOpening && offerOpening.length === 16) {
        // Se vier do datetime-local type YYYY-MM-DDThh:mm, converte pra ISO
        offerOpening = new Date(offerOpening).toISOString()
      }

      const payload = {
        name: editingDemand.value.name!,
        type: editingDemand.value.type!,
        dispute_date: editingDemand.value.dispute_date || null,
        offer_opening_date: offerOpening,
        user_id: profile.value!.id,
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
        const { data, error } = await supabase.from('demands').insert([payload]).select().single()

        if (error) throw error

        await logAction('CREATE_DEMAND', `Usuário criou nova demanda: ${data.id}`, user.value?.id)
      }

      await refresh()
      closeModal()
    } catch (err: unknown) {
      if (err instanceof Error) {
        saveError.value = err.message
      } else {
        saveError.value = 'Ocorreu um erro desconhecido.'
      }
    } finally {
      isSaving.value = false
    }
  }
</script>

<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <UiCard>
          <template #header>
            Demandas
            <v-spacer />
            <UiButton color="primary" prepend-icon="mdi-plus" @click="openModal()">
              Nova Demanda
            </UiButton>
            <UiButton
              class="ml-2"
              color="white"
              icon="mdi-refresh"
              :loading="pending"
              variant="text"
              @click="refresh"
            />
          </template>

          <UiTable
            :headers="[
              { text: 'Nome', value: 'name' },
              { text: 'Tipo', value: 'type' },
              { text: 'Data da Disputa', value: 'dispute_date' },
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
            <template #item-dispute_date="{ item }">
              {{ item.dispute_date ? new Date(item.dispute_date).toLocaleDateString() : '-' }}
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

        <UiInput
          v-model="editingDemand.dispute_date"
          clearable
          label="Data da Disputa"
          type="date"
        />

        <UiInput
          v-model="editingDemand.offer_opening_date"
          clearable
          label="Abertura das Ofertas"
          type="datetime-local"
        />

        <template #actions>
          <UiButton :disabled="isSaving" variant="text" @click="closeModal">Cancelar</UiButton>
          <UiButton color="primary" :loading="isSaving" @click="saveDemand"> Salvar </UiButton>
        </template>
      </UiCard>
    </v-dialog>
  </v-container>
</template>
