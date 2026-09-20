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

      const payload = {
        name: editingDemand.value.name!,
        type: editingDemand.value.type!,
        dispute_date: editingDemand.value.dispute_date || null,
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
        <v-card>
          <v-card-title class="d-flex align-center">
            Demandas
            <v-spacer />
            <v-btn color="primary" prepend-icon="mdi-plus" @click="openModal()">
              Nova Demanda
            </v-btn>
            <v-btn
              class="ml-2"
              icon="mdi-refresh"
              :loading="pending"
              variant="text"
              @click="refresh"
            />
          </v-card-title>

          <v-divider />

          <v-table hover>
            <thead>
              <tr>
                <th class="text-left">Nome</th>
                <th class="text-left">Tipo</th>
                <th class="text-left">Data da Disputa</th>
                <th class="text-left">Criado por</th>
                <th class="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="demand in demands" :key="demand.id">
                <td>{{ demand.name }}</td>
                <td>
                  <v-chip
                    :color="demand.type === 'consumption' ? 'info' : 'warning'"
                    size="small"
                    variant="flat"
                  >
                    {{ formatType(demand.type) }}
                  </v-chip>
                </td>
                <td>
                  {{
                    demand.dispute_date ? new Date(demand.dispute_date).toLocaleDateString() : '-'
                  }}
                </td>
                <td class="text-caption text-grey">
                  {{ demand.profiles?.name || `Usuário (${demand.user_id.split('-')[0]})` }}
                </td>
                <td class="text-right">
                  <v-btn
                    v-if="canEdit(demand)"
                    color="primary"
                    icon="mdi-pencil"
                    size="small"
                    variant="text"
                    @click="openModal(demand)"
                  />
                </td>
              </tr>
            </tbody>
          </v-table>

          <v-card-text v-if="!demands?.length && !pending" class="text-center text-grey">
            Nenhuma demanda encontrada.
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Modal Form -->
    <v-dialog v-model="isModalOpen" max-width="500px">
      <v-card>
        <v-card-title class="pa-4">
          {{ editingDemand.id ? 'Editar Demanda' : 'Nova Demanda' }}
        </v-card-title>

        <v-divider />

        <v-card-text class="pa-4">
          <v-alert v-if="saveError" class="mb-4" density="compact" type="error" variant="tonal">
            {{ saveError }}
          </v-alert>

          <v-text-field
            v-model="editingDemand.name"
            class="mb-3"
            density="comfortable"
            label="Nome da Demanda"
            variant="outlined"
          />

          <v-select
            v-model="editingDemand.type"
            class="mb-3"
            density="comfortable"
            item-title="title"
            item-value="value"
            :items="[
              { title: 'Consumo', value: 'consumption' },
              { title: 'Permanente', value: 'permanent' },
            ]"
            label="Tipo"
            variant="outlined"
          />

          <v-text-field
            v-model="editingDemand.dispute_date"
            clearable
            density="comfortable"
            label="Data da Disputa"
            type="date"
            variant="outlined"
          />
        </v-card-text>

        <v-divider />

        <v-card-actions class="px-4 py-3 justify-end">
          <v-btn :disabled="isSaving" variant="text" @click="closeModal">Cancelar</v-btn>
          <v-btn color="primary" :loading="isSaving" variant="flat" @click="saveDemand">
            Salvar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>
