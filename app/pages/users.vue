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
        is_active: editingUser.value.is_active,
      })
      .eq('id', editingUser.value.id)

    if (error) {
      saveError.value = error.message
    } else {
      await logAction(
        'ADMIN_UPDATE_USER',
        `Administrador atualizou o usuário: ${editingUser.value.id}`,
        loggedProfile.value?.id,
      )
      await refresh() // Recarrega a tabela para mostrar os novos dados
      closeEditModal()
    }
    isSaving.value = false
  }

  // 4. Lógica de Criação de Novo Usuário (Admin)
  const isAddModalOpen = ref(false)
  const isCreating = ref(false)
  const createError = ref('')

  const defaultNewUserForm = {
    name: '',
    email: '',
    password: '',
    role: 'user',
  }
  const newUserForm = ref({ ...defaultNewUserForm })

  const openAddModal = () => {
    newUserForm.value = { ...defaultNewUserForm }
    createError.value = ''
    isAddModalOpen.value = true
  }

  const closeAddModal = () => {
    isAddModalOpen.value = false
  }

  const createUser = async () => {
    isCreating.value = true
    createError.value = ''

    try {
      // Faz o POST para a nossa rota segura backend
      await $fetch('/api/admin/users', {
        method: 'POST',
        body: newUserForm.value,
      })

      await logAction(
        'ADMIN_CREATE_USER',
        `Administrador criou novo usuário: ${newUserForm.value.email}`,
        loggedProfile.value?.id,
      )

      await refresh() // Atualiza a tabela
      closeAddModal()
    } catch (err: unknown) {
      const fetchErr = err as { data?: { statusMessage?: string }; message?: string }
      createError.value =
        fetchErr.data?.statusMessage || fetchErr.message || 'Erro ao criar usuário'
    } finally {
      isCreating.value = false
    }
  }
</script>

<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <v-card>
          <!-- Cabeçalho da Tabela -->
          <v-card-title class="d-flex align-center bg-primary text-white pa-4">
            Usuários do Sistema
            <v-spacer />
            <v-btn
              color="white"
              prepend-icon="mdi-account-plus"
              variant="elevated"
              @click="openAddModal"
            >
              Novo Usuário
            </v-btn>
            <v-btn
              class="ml-2"
              color="white"
              icon="mdi-refresh"
              :loading="pending"
              variant="text"
              @click="refresh"
            />
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
                <th class="text-left">Status</th>
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
                <td>
                  <v-chip :color="user.is_active ? 'success' : 'error'" size="small" variant="flat">
                    {{ user.is_active ? 'ATIVO' : 'INATIVO' }}
                  </v-chip>
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

          <v-switch
            v-model="editingUser.is_active"
            class="mt-3"
            color="success"
            :disabled="isSelf"
            hint="Se desmarcado, o usuário não poderá acessar o sistema"
            label="Usuário Ativo"
            persistent-hint
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

    <!-- Modal de Adição (Novo Usuário) -->
    <v-dialog v-model="isAddModalOpen" max-width="500px">
      <v-card>
        <v-card-title class="pa-4"> Criar Novo Usuário </v-card-title>

        <v-divider />

        <v-card-text class="pa-4">
          <v-alert v-if="createError" class="mb-4" density="compact" type="error" variant="tonal">
            {{ createError }}
          </v-alert>

          <v-text-field
            v-model="newUserForm.name"
            class="mb-3"
            density="comfortable"
            label="Nome Completo"
            placeholder="Nome do usuário"
            variant="outlined"
          />

          <v-text-field
            v-model="newUserForm.email"
            class="mb-3"
            density="comfortable"
            label="E-mail"
            placeholder="email@exemplo.com"
            type="email"
            variant="outlined"
          />

          <v-text-field
            v-model="newUserForm.password"
            class="mb-3"
            density="comfortable"
            label="Senha (Inicial)"
            placeholder="Pelo menos 6 caracteres"
            type="password"
            variant="outlined"
          />

          <v-select
            v-model="newUserForm.role"
            density="comfortable"
            :items="['user', 'admin']"
            label="Cargo (Role)"
            variant="outlined"
          />
        </v-card-text>

        <v-divider />

        <v-card-actions class="px-4 py-3 justify-end">
          <v-btn :disabled="isCreating" variant="text" @click="closeAddModal">Cancelar</v-btn>
          <v-btn color="primary" :loading="isCreating" variant="flat" @click="createUser">
            Criar Usuário
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>
