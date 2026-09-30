<script setup lang="ts">
  import type { ProfileRow } from '~/composables/useUsers'

  // 1. Aplica a Regra (Middleware) criada
  definePageMeta({
    icon: 'mdi-account-group-outline',
    middleware: ['admin'],
    navLabel: 'Usuários',
    navSubtitle: 'Gerenciar contas e permissões',
    navColor: 'primary',
    navGroup: 'admin',
    navOrder: 60,
    roles: ['admin'],
    showIn: ['drawer', 'home', 'admin-shortcuts'],
  })
  useHead({ title: 'Gerenciar Usuários' })

  const { fetchUsers, updateUser, toggleUserStatus: toggleStatus } = useUsers()
  const { logAction } = useLogger()
  const { profile: loggedProfile } = useProfile()

  // 2. Busca todos os usuários no banco
  const { data: users, pending, refresh } = useAsyncData('admin-users', fetchUsers)

  // Filtro de busca
  const searchQuery = ref('')

  const filteredActiveUsers = computed(() => {
    const q = searchQuery.value.toLowerCase()
    return (
      users.value
        ?.filter((u) => u.is_active)
        .filter((u) => !q || u.name?.toLowerCase().includes(q) || u.id.toLowerCase().includes(q)) ||
      []
    )
  })

  const inactiveUsers = computed(() => users.value?.filter((u) => !u.is_active) || [])

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

  const roleConfig: Record<
    string,
    { color: string; label: string; variant: 'flat' | 'tonal' | 'outlined' }
  > = {
    admin: { color: 'primary', label: 'Admin', variant: 'flat' },
    uge: { color: 'warning', label: 'UGE', variant: 'tonal' },
    iirgd: { color: 'info', label: 'IIRGD', variant: 'tonal' },
    user: { color: 'default', label: 'Usuário', variant: 'outlined' },
  }
</script>

<template>
  <div>
    <PageHeader subtitle="Administração de acesso e contas" title="Gerenciar Usuários">
    </PageHeader>

    <!-- Card de usuários ativos -->
    <UiCard class="mb-6">
      <template #header>
        <v-icon class="mr-2" color="primary" icon="mdi-account-group-outline" />
        Usuários Ativos
        <v-chip class="ml-2" color="primary" label size="x-small" variant="tonal">
          {{ filteredActiveUsers.length }}
        </v-chip>
        <v-spacer />
        <!-- Busca inline -->
        <v-text-field
          v-model="searchQuery"
          class="mt-0 mb-0"
          clearable
          density="compact"
          hide-details
          label="Buscar..."
          prepend-inner-icon="mdi-magnify"
          rounded="lg"
          style="max-width: 260px"
          variant="outlined"
        />
        <UiButton
          class="ml-4 mr-2"
          color="secondary"
          icon="mdi-refresh"
          :loading="pending"
          size="small"
          variant="tonal"
          @click="refresh"
        />
        <UiButton color="primary" prepend-icon="mdi-account-plus" @click="openAddModal"
          >Novo Usuário</UiButton
        >
      </template>

      <UiTable
        :headers="[
          { text: 'Usuário', value: 'name' },
          { text: 'Cargo', value: 'role' },
          { text: 'Membro desde', value: 'created_at' },
          { text: 'Status', value: 'is_active', align: 'center' },
          { text: 'Ações', value: 'actions', align: 'right' },
        ]"
        :items="filteredActiveUsers"
        :loading="pending"
      >
        <template v-if="!filteredActiveUsers?.length && !pending" #empty>
          Nenhum usuário ativo encontrado.
        </template>
        <template #item-name="{ item }">
          <div class="d-flex align-center py-2 gap-3">
            <v-avatar color="primary" size="34" variant="tonal">
              <v-img v-if="item.avatar_url" :src="item.avatar_url" />
              <span v-else class="text-caption font-weight-bold">
                {{ (item.name || 'U').charAt(0).toUpperCase() }}
              </span>
            </v-avatar>
            <div>
              <div class="text-body-2 font-weight-medium">{{ item.name || 'Sem nome' }}</div>
              <div class="text-caption text-medium-emphasis font-weight-mono">
                {{ item.id.split('-')[0] }}
              </div>
            </div>
          </div>
        </template>
        <template #item-role="{ item }">
          <v-chip
            :color="roleConfig[item.role]?.color || 'default'"
            label
            size="small"
            :variant="roleConfig[item.role]?.variant || 'outlined'"
          >
            {{ roleConfig[item.role]?.label || item.role.toUpperCase() }}
          </v-chip>
        </template>
        <template #item-created_at="{ item }">
          <span class="text-body-2 text-medium-emphasis">
            {{ new Date(item.created_at).toLocaleDateString('pt-BR') }}
          </span>
        </template>
        <template #item-is_active="{ item }">
          <v-switch
            color="success"
            density="compact"
            :disabled="item.id === loggedProfile?.id"
            hide-details
            :model-value="item.is_active"
            @update:model-value="toggleUserStatus(item)"
          />
        </template>
        <template #item-actions="{ item }">
          <UiButton
            color="primary"
            icon="mdi-pencil-outline"
            size="small"
            variant="text"
            @click="openEditModal(item)"
          />
        </template>
      </UiTable>
    </UiCard>

    <!-- Card de usuários desativados (colapsável) -->
    <v-expand-transition>
      <UiCard v-if="inactiveUsers.length > 0">
        <template #header>
          <v-icon class="mr-2" color="error" icon="mdi-account-off-outline" />
          <span class="text-medium-emphasis">Usuários Desativados</span>
          <v-chip class="ml-2" color="error" label size="x-small" variant="tonal">
            {{ inactiveUsers.length }}
          </v-chip>
        </template>

        <UiTable
          :headers="[
            { text: 'Usuário', value: 'name' },
            { text: 'Cargo', value: 'role' },
            { text: 'Membro desde', value: 'created_at' },
            { text: 'Status', value: 'is_active', align: 'center' },
            { text: 'Ações', value: 'actions', align: 'right' },
          ]"
          :items="inactiveUsers"
        >
          <template #item-name="{ item }">
            <div class="d-flex align-center py-2 gap-3">
              <v-avatar color="default" size="34" variant="tonal">
                <span class="text-caption font-weight-bold text-medium-emphasis">
                  {{ (item.name || 'U').charAt(0).toUpperCase() }}
                </span>
              </v-avatar>
              <div>
                <div class="text-body-2 font-weight-medium text-medium-emphasis">
                  {{ item.name || 'Sem nome' }}
                </div>
                <div class="text-caption text-medium-emphasis font-weight-mono">
                  {{ item.id.split('-')[0] }}
                </div>
              </div>
            </div>
          </template>
          <template #item-role="{ item }">
            <v-chip
              :color="roleConfig[item.role]?.color || 'default'"
              disabled
              label
              size="small"
              variant="outlined"
            >
              {{ roleConfig[item.role]?.label || item.role.toUpperCase() }}
            </v-chip>
          </template>
          <template #item-created_at="{ item }">
            <span class="text-body-2 text-medium-emphasis">
              {{ new Date(item.created_at).toLocaleDateString('pt-BR') }}
            </span>
          </template>
          <template #item-is_active="{ item }">
            <v-switch
              color="success"
              density="compact"
              hide-details
              :model-value="item.is_active"
              @update:model-value="toggleUserStatus(item)"
            />
          </template>
          <template #item-actions="{ item }">
            <UiButton
              color="primary"
              icon="mdi-pencil-outline"
              size="small"
              variant="text"
              @click="openEditModal(item)"
            />
          </template>
        </UiTable>
      </UiCard>
    </v-expand-transition>

    <!-- Modal de Edição -->
    <UiModal v-if="editingUser" v-model="isEditModalOpen" max-width="500px" title="Editar Usuário">
      <template #header>
        <div class="d-flex align-center gap-3">
          <v-avatar color="primary" size="36" variant="tonal">
            <span class="text-caption font-weight-bold">
              {{ (editingUser.name || 'U').charAt(0).toUpperCase() }}
            </span>
          </v-avatar>
          <div>
            <div class="text-subtitle-2 font-weight-bold">{{ editingUser.name || 'Usuário' }}</div>
          </div>
        </div>
        <v-spacer />
        <v-btn density="compact" icon="mdi-close" variant="text" @click="closeEditModal" />
      </template>

      <UiAlert v-if="saveError" class="mb-4" density="compact" type="error" variant="tonal">
        {{ saveError }}
      </UiAlert>

      <UiInput v-model="editingUser.name" label="Nome" placeholder="Nome do usuário" />

      <v-select
        v-model="editingUser.role"
        class="mb-3"
        density="comfortable"
        :disabled="isSelf"
        :hint="
          isSelf
            ? 'Por medida de segurança, você não pode rebaixar a si mesmo.'
            : 'Cuidado ao promover usuários a Administrador.'
        "
        item-title="title"
        item-value="value"
        :items="[
          { title: 'Usuário', value: 'user' },
          { title: 'UGE', value: 'uge' },
          { title: 'Administrador', value: 'admin' },
          { title: 'IIRGD', value: 'iirgd' },
        ]"
        label="Cargo (Role)"
        persistent-hint
        rounded="lg"
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
        <UiButton color="primary" :loading="isSaving" variant="flat" @click="saveUser">
          Salvar Alterações
        </UiButton>
      </template>
    </UiModal>

    <!-- Modal de Adição (Novo Usuário) -->
    <UiModal v-model="isAddModalOpen" max-width="500px" title="Criar Novo Usuário">
      <UiAlert v-if="createError" class="mb-4" density="compact" type="error" variant="tonal">
        {{ createError }}
      </UiAlert>

      <UiInput v-model="newUserForm.name" label="Nome Completo" placeholder="Nome do usuário" />

      <UiInput
        v-model="newUserForm.email"
        label="E-mail"
        placeholder="email@exemplo.com"
        prepend-inner-icon="mdi-email-outline"
        type="email"
      />

      <UiInput
        v-model="newUserForm.password"
        label="Senha (Inicial)"
        placeholder="Pelo menos 6 caracteres"
        prepend-inner-icon="mdi-lock-outline"
        type="password"
      />

      <v-select
        v-model="newUserForm.role"
        class="mb-3"
        density="comfortable"
        item-title="title"
        item-value="value"
        :items="[
          { title: 'Usuário', value: 'user' },
          { title: 'UGE', value: 'uge' },
          { title: 'Administrador', value: 'admin' },
          { title: 'IIRGD', value: 'iirgd' },
        ]"
        label="Cargo (Role)"
        rounded="lg"
        variant="outlined"
      />

      <template #actions>
        <UiButton :disabled="isCreating" variant="text" @click="closeAddModal">Cancelar</UiButton>
        <UiButton color="primary" :loading="isCreating" variant="flat" @click="createUser">
          Criar Usuário
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>
