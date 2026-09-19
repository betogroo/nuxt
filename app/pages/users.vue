<script setup lang="ts">
  import type { Database } from '~/types/database.types'

  // 1. Aplica a Regra (Middleware) criada
  definePageMeta({
    middleware: ['admin'],
  })
  useHead({ title: 'Gerenciar Usuários' })

  const supabase = useSupabaseClient<Database>()

  // 2. Busca todos os usuários no banco
  const {
    data: users,
    pending,
    refresh,
  } = useAsyncData('admin-users', async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  })

  // 3. Lógica de Edição de Usuário
  type ProfileRow = Database['public']['Tables']['profiles']['Row']

  const isEditModalOpen = ref(false)
  const editingUser = ref<ProfileRow | null>(null)
  const isSaving = ref(false)
  const saveError = ref('')

  const { profile: loggedProfile } = useProfile()
  const isSelf = computed(() => editingUser.value?.id === loggedProfile.value?.id)

  const openEditModal = (user: ProfileRow) => {
    // Clonamos o objeto para não alterar a tabela antes de salvar
    editingUser.value = { ...user }
    saveError.value = ''
    isEditModalOpen.value = true
  }

  const closeEditModal = () => {
    isEditModalOpen.value = false
    editingUser.value = null
  }

  const { logAction } = useLogger()

  const saveUser = async () => {
    if (!editingUser.value) return
    isSaving.value = true
    saveError.value = ''

    const { error } = await supabase
      .from('profiles')
      .update({
        name: editingUser.value.name,
        role: editingUser.value.role,
      })
      .eq('id', editingUser.value.id)

    if (error) {
      saveError.value = error.message
    } else {
      await logAction(
        'ADMIN_UPDATE_USER',
        `Administrador atualizou o usuário: ${editingUser.value.id}`,
      )
      await refresh() // Recarrega a tabela para mostrar os novos dados
      closeEditModal()
    }
    isSaving.value = false
  }
</script>

<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <v-card>
          <!-- Cabeçalho da Tabela -->
          <v-card-title class="d-flex align-center">
            Usuários do Sistema
            <v-spacer />
            <v-btn icon="mdi-refresh" :loading="pending" variant="text" @click="refresh" />
          </v-card-title>

          <v-divider />

          <!-- Tabela de Listagem -->
          <v-table hover>
            <thead>
              <tr>
                <th class="text-left">ID</th>
                <th class="text-left">Usuário</th>
                <th class="text-left">Cargo</th>
                <th class="text-left">Membro desde</th>
                <th class="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in users" :key="user.id">
                <td class="text-grey text-caption font-weight-mono">
                  {{ user.id.split('-')[0] }}
                </td>
                <td>
                  <div class="d-flex align-center py-2">
                    <v-avatar class="mr-3" color="surface-variant" size="32">
                      <v-img v-if="user.avatar_url" :src="user.avatar_url" />
                      <v-icon v-else>mdi-account</v-icon>
                    </v-avatar>
                    <span>{{ user.name || 'Sem nome' }}</span>
                  </div>
                </td>
                <td>
                  <v-chip
                    :color="user.role === 'admin' ? 'primary' : 'grey'"
                    size="small"
                    :variant="user.role === 'admin' ? 'flat' : 'outlined'"
                  >
                    {{ user.role.toUpperCase() }}
                  </v-chip>
                </td>
                <td>
                  {{ new Date(user.created_at).toLocaleDateString() }}
                </td>
                <td class="text-right">
                  <v-btn
                    color="primary"
                    icon="mdi-pencil"
                    size="small"
                    variant="text"
                    @click="openEditModal(user)"
                  />
                </td>
              </tr>
            </tbody>
          </v-table>

          <!-- Estado Vazio / Loading -->
          <v-card-text v-if="!users?.length && !pending" class="text-center text-grey">
            Nenhum usuário encontrado.
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Modal de Edição -->
    <v-dialog v-model="isEditModalOpen" max-width="500px">
      <v-card v-if="editingUser">
        <v-card-title class="pa-4"> Editar Usuário </v-card-title>

        <v-divider />

        <v-card-text class="pa-4">
          <v-alert v-if="saveError" class="mb-4" density="compact" type="error" variant="tonal">
            {{ saveError }}
          </v-alert>

          <v-text-field
            v-model="editingUser.name"
            class="mb-3"
            density="comfortable"
            label="Nome"
            placeholder="Nome do usuário"
            variant="outlined"
          />

          <v-select
            v-model="editingUser.role"
            density="comfortable"
            :disabled="isSelf"
            :hint="
              isSelf
                ? 'Por medida de segurança, você não pode rebaixar a si mesmo.'
                : 'Cuidado ao promover usuários a Administrador. Eles terão acesso a este painel.'
            "
            :items="['user', 'admin']"
            label="Cargo (Role)"
            persistent-hint
            variant="outlined"
          />
        </v-card-text>

        <v-divider />

        <v-card-actions class="px-4 py-3 justify-end">
          <v-btn :disabled="isSaving" variant="text" @click="closeEditModal">Cancelar</v-btn>
          <v-btn color="primary" :loading="isSaving" variant="flat" @click="saveUser"
            >Salvar Alterações</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>
