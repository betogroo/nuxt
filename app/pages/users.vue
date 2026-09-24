<script setup lang="ts">
  import type { ProfileRow } from '~/composables/useUsers'

  // 1. Aplica a Regra (Middleware) criada
  definePageMeta({
    middleware: ['admin'],
  })
  useHead({ title: 'Gerenciar Usuários' })

  const { fetchUsers, updateUser, toggleUserStatus: toggleStatus } = useUsers()
  const { logAction } = useLogger()
  const { profile: loggedProfile } = useProfile()

  // 2. Busca todos os usuários no banco
  const {
    data: users,
    pending,
    refresh,
  } = useAsyncData('admin-users', fetchUsers)

  // 3. Lógica de Edição de Usuário
  const isEditModalOpen = ref(false)
  const editingUser = ref<ProfileRow | null>(null)
  const isSaving = ref(false)
  const saveError = ref('')

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

  const saveUser = async () => {
    if (!editingUser.value) return
    isSaving.value = true
    saveError.value = ''

    try {
      await updateUser(editingUser.value.id, {
        name: editingUser.value.name,
        role: editingUser.value.role,
        is_active: editingUser.value.is_active,
      })

      await logAction(
        'ADMIN_UPDATE_USER',
        `Administrador atualizou o usuário: ${editingUser.value.id}`,
        loggedProfile.value?.id,
      )
      await refresh() // Recarrega a tabela para mostrar os novos dados
      closeEditModal()
    } catch (e: unknown) {
      saveError.value = e instanceof Error ? e.message : String(e)
    } finally {
      isSaving.value = false
    }
  }

  const activeUsers = computed(() => users.value?.filter((u) => u.is_active) || [])
  const inactiveUsers = computed(() => users.value?.filter((u) => !u.is_active) || [])

  const toggleUserStatus = async (user: ProfileRow) => {
    if (user.id === loggedProfile.value?.id) {
      alert('Você não pode desativar seu próprio usuário.')
      return
    }

    try {
      const newStatus = !user.is_active
      await toggleStatus(user.id, newStatus)

      await logAction(
        'ADMIN_TOGGLE_USER_STATUS',
        `Administrador alterou status do usuário ${user.id} para ${newStatus ? 'ATIVO' : 'INATIVO'}`,
        loggedProfile.value?.id,
      )
      await refresh()
    } catch (e: unknown) {
      const err = e as Error
      alert(`Erro ao alterar status: ${err.message}`)
    }
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
  <div>
    <PageHeader subtitle="Administração de acesso e contas" title="Gerenciar Usuários" />

    <v-row>
      <v-col cols="12">
        <UiCard>
          <template #header>
            <span class="text-subtitle-1 font-weight-bold">Lista de Usuários</span>
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
            <UiButton color="primary" prepend-icon="mdi-account-plus" @click="openAddModal">
              Novo Usuário
            </UiButton>
          </template>

          <UiTable
            :headers="[
              { text: 'ID', value: 'id' },
              { text: 'Usuário', value: 'name' },
              { text: 'Cargo', value: 'role' },
              { text: 'Membro desde', value: 'created_at' },
              { text: 'Status', value: 'is_active' },
              { text: 'Ações', value: 'actions', align: 'right' },
            ]"
            :items="activeUsers"
          >
            <template v-if="!activeUsers?.length && !pending" #empty>
              Nenhum usuário ativo encontrado.
            </template>
            <template #item-id="{ item }">
              <span class="text-grey text-caption font-weight-mono">
                {{ item.id.split('-')[0] }}
              </span>
            </template>
            <template #item-name="{ item }">
              <div class="d-flex align-center py-2">
                <v-avatar class="mr-3" color="surface-variant" size="32">
                  <v-img v-if="item.avatar_url" :src="item.avatar_url" />
                  <v-icon v-else>mdi-account</v-icon>
                </v-avatar>
                <span>{{ item.name || 'Sem nome' }}</span>
              </div>
            </template>
            <template #item-role="{ item }">
              <v-chip
                :color="item.role === 'admin' ? 'primary' : 'grey'"
                size="small"
                :variant="item.role === 'admin' ? 'flat' : 'outlined'"
              >
                {{ item.role.toUpperCase() }}
              </v-chip>
            </template>
            <template #item-created_at="{ item }">
              {{ new Date(item.created_at).toLocaleDateString() }}
            </template>
            <template #item-is_active="{ item }">
              <v-chip
                class="cursor-pointer"
                :color="item.is_active ? 'success' : 'error'"
                size="small"
                variant="flat"
                @click="toggleUserStatus(item)"
              >
                {{ item.is_active ? 'ATIVO' : 'INATIVO' }}
              </v-chip>
            </template>
            <template #item-actions="{ item }">
              <UiButton
                color="primary"
                icon="mdi-pencil"
                size="small"
                variant="text"
                @click="openEditModal(item)"
              />
            </template>
          </UiTable>
        </UiCard>
      </v-col>

      <v-col v-if="inactiveUsers.length > 0" cols="12">
        <UiCard>
          <template #header>
            <span class="text-subtitle-1 font-weight-bold text-grey">Usuários Desativados</span>
          </template>

          <UiTable
            :headers="[
              { text: 'ID', value: 'id' },
              { text: 'Usuário', value: 'name' },
              { text: 'Cargo', value: 'role' },
              { text: 'Membro desde', value: 'created_at' },
              { text: 'Status', value: 'is_active' },
              { text: 'Ações', value: 'actions', align: 'right' },
            ]"
            :items="inactiveUsers"
          >
            <template #item-id="{ item }">
              <span class="text-grey text-caption font-weight-mono">
                {{ item.id.split('-')[0] }}
              </span>
            </template>
            <template #item-name="{ item }">
              <div class="d-flex align-center py-2">
                <v-avatar class="mr-3" color="surface-variant" size="32">
                  <v-img v-if="item.avatar_url" :src="item.avatar_url" />
                  <v-icon v-else>mdi-account</v-icon>
                </v-avatar>
                <span>{{ item.name || 'Sem nome' }}</span>
              </div>
            </template>
            <template #item-role="{ item }">
              <v-chip
                :color="item.role === 'admin' ? 'primary' : 'grey'"
                size="small"
                :variant="item.role === 'admin' ? 'flat' : 'outlined'"
              >
                {{ item.role.toUpperCase() }}
              </v-chip>
            </template>
            <template #item-created_at="{ item }">
              {{ new Date(item.created_at).toLocaleDateString() }}
            </template>
            <template #item-is_active="{ item }">
              <v-chip
                class="cursor-pointer"
                :color="item.is_active ? 'success' : 'error'"
                size="small"
                variant="flat"
                @click="toggleUserStatus(item)"
              >
                {{ item.is_active ? 'ATIVO' : 'INATIVO' }}
              </v-chip>
            </template>
            <template #item-actions="{ item }">
              <UiButton
                color="primary"
                icon="mdi-pencil"
                size="small"
                variant="text"
                @click="openEditModal(item)"
              />
            </template>
          </UiTable>
        </UiCard>
      </v-col>
    </v-row>

    <!-- Modal de Edição -->
    <v-dialog v-model="isEditModalOpen" max-width="500px">
      <UiCard v-if="editingUser" title="Editar Usuário" transparent-header>
        <v-alert v-if="saveError" class="mb-4" density="compact" type="error" variant="tonal">
          {{ saveError }}
        </v-alert>

        <UiInput v-model="editingUser.name" label="Nome" placeholder="Nome do usuário" />

        <!-- Using native v-select for disabled prop since UiSelect doesnt have it yet, actually I should add it -->
        <v-select
          v-model="editingUser.role"
          class="mb-3"
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

        <template #actions>
          <UiButton :disabled="isSaving" variant="text" @click="closeEditModal">Cancelar</UiButton>
          <UiButton color="primary" :loading="isSaving" @click="saveUser">
            Salvar Alterações
          </UiButton>
        </template>
      </UiCard>
    </v-dialog>

    <!-- Modal de Adição (Novo Usuário) -->
    <v-dialog v-model="isAddModalOpen" max-width="500px">
      <UiCard title="Criar Novo Usuário" transparent-header>
        <v-alert v-if="createError" class="mb-4" density="compact" type="error" variant="tonal">
          {{ createError }}
        </v-alert>

        <UiInput v-model="newUserForm.name" label="Nome Completo" placeholder="Nome do usuário" />

        <UiInput
          v-model="newUserForm.email"
          label="E-mail"
          placeholder="email@exemplo.com"
          type="email"
        />

        <UiInput
          v-model="newUserForm.password"
          label="Senha (Inicial)"
          placeholder="Pelo menos 6 caracteres"
          type="password"
        />

        <UiSelect v-model="newUserForm.role" :items="['user', 'admin']" label="Cargo (Role)" />

        <template #actions>
          <UiButton :disabled="isCreating" variant="text" @click="closeAddModal">Cancelar</UiButton>
          <UiButton color="primary" :loading="isCreating" @click="createUser">
            Criar Usuário
          </UiButton>
        </template>
      </UiCard>
    </v-dialog>
  </div>
</template>
