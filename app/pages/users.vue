<script setup lang="ts">
  import { useToast } from '~/composables/useToast'
  import type { ProfileRow } from '~/composables/useUsers'
  import { useZodForm } from '~/composables/useZodForm'
  import {
    adminUserEditSchema,
    adminUserCreateSchema,
    type AdminUserEditInput,
    type AdminUserCreateInput,
  } from '~/schemas/forms/user'
  const toast = useToast()

  // 1. Aplica a Regra (Middleware) criada
  definePageMeta({
    icon: 'usersGroup',
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
  const {
    errors: editErrors,
    defineField: defineEditField,
    handleSubmit: handleEditSubmit,
    resetForm: resetEditForm,
  } = useZodForm(adminUserEditSchema, { id: '', name: '', role: 'user', is_active: true })

  const [editName, editNameProps] = defineEditField('name')
  const [editRole, editRoleProps] = defineEditField('role')
  const [editIsActive, editIsActiveProps] = defineEditField('is_active')
  const isSaving = ref(false)
  const saveError = ref('')

  const isSelf = computed(() => editingUser.value?.id === loggedProfile.value?.id)

  const openEditModal = (user: ProfileRow) => {
    // Clonamos o objeto para não alterar a tabela antes de salvar
    editingUser.value = { ...user }
    resetEditForm({
      values: { id: user.id, name: user.name, role: user.role as never, is_active: user.is_active },
    })
    saveError.value = ''
    isEditModalOpen.value = true
  }

  const closeEditModal = () => {
    isEditModalOpen.value = false
    editingUser.value = null
  }

  const saveUser = handleEditSubmit(async (values: AdminUserEditInput) => {
    if (!editingUser.value) return
    isSaving.value = true
    saveError.value = ''

    try {
      await updateUser(values.id, {
        name: values.name,
        role: values.role,
        is_active: values.is_active,
      })

      await logAction(
        'ADMIN_UPDATE_USER',
        `Administrador atualizou o usuário: ${values.id}`,
        loggedProfile.value?.id,
      )
      await refresh()
      closeEditModal()
    } catch (e: unknown) {
      saveError.value = e instanceof Error ? e.message : String(e)
    } finally {
      isSaving.value = false
    }
  })

  const toggleUserStatus = async (user: ProfileRow) => {
    if (user.id === loggedProfile.value?.id) {
      toast.warning('Você não pode desativar seu próprio usuário.')
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
      toast.error(`Erro ao alterar status: ${err.message}`)
    }
  }

  // 4. Lógica de Criação de Novo Usuário (Admin)
  const isAddModalOpen = ref(false)
  const isCreating = ref(false)
  const createError = ref('')

  const {
    errors: createErrors,
    defineField: defineCreateField,
    handleSubmit: handleCreateSubmit,
    resetForm: resetCreateForm,
  } = useZodForm(adminUserCreateSchema, { name: '', email: '', password: '', role: 'user' })

  const [createName, createNameProps] = defineCreateField('name')
  const [createEmail, createEmailProps] = defineCreateField('email')
  const [createPassword, createPasswordProps] = defineCreateField('password')
  const [createRole, createRoleProps] = defineCreateField('role')

  const openAddModal = () => {
    resetCreateForm({ values: { name: '', email: '', password: '', role: 'user' } })
    createError.value = ''
    isAddModalOpen.value = true
  }

  const closeAddModal = () => {
    isAddModalOpen.value = false
  }

  const createUser = handleCreateSubmit(async (values: AdminUserCreateInput) => {
    isCreating.value = true
    createError.value = ''

    try {
      await $fetch('/api/admin/users', {
        method: 'POST',
        body: values,
      })

      await logAction(
        'ADMIN_CREATE_USER',
        `Administrador criou novo usuário: ${values.email}`,
        loggedProfile.value?.id,
      )

      await refresh()
      closeAddModal()
    } catch (err: unknown) {
      const fetchErr = err as { data?: { statusMessage?: string }; message?: string }
      createError.value =
        fetchErr.data?.statusMessage || fetchErr.message || 'Erro ao criar usuário'
    } finally {
      isCreating.value = false
    }
  })

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
        <UiIcon class="mr-2" color="primary" name="usersGroup" />
        Usuários Ativos
        <UiChip class="ml-2" color="primary" label size="xs" variant="soft">
          {{ filteredActiveUsers.length }}
        </UiChip>
        <UiSpacer />
        <!-- Busca inline -->
        <UiInput
          v-model="searchQuery"
          class="mt-0 mb-0"
          clearable
          density="compact"
          hide-details
          label="Buscar..."
          prepend-inner-icon="search"
          rounded="lg"
          style="max-width: 260px"
          variant="outlined"
        />
        <UiButton
          class="ml-4 mr-2"
          color="secondary"
          icon="refresh"
          :loading="pending"
          size="small"
          variant="tonal"
          @click="refresh"
        />
        <UiButton color="primary" prepend-icon="addUserSolid" @click="openAddModal"
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
            <UiAvatar color="primary" size="34" variant="tonal">
              <UiImg v-if="item.avatar_url" :src="item.avatar_url" />
              <span v-else class="text-caption font-weight-bold">
                {{ (item.name || 'U').charAt(0).toUpperCase() }}
              </span>
            </UiAvatar>
            <div>
              <div class="text-body-2 font-weight-medium">{{ item.name || 'Sem nome' }}</div>
              <div class="text-caption text-medium-emphasis font-weight-mono">
                {{ item.id.split('-')[0] }}
              </div>
            </div>
          </div>
        </template>
        <template #item-role="{ item }">
          <UiChip
            :color="roleConfig[item.role]?.color || 'default'"
            label
            size="sm"
            :variant="roleConfig[item.role]?.variant || 'outlined'"
          >
            {{ roleConfig[item.role]?.label || item.role.toUpperCase() }}
          </UiChip>
        </template>
        <template #item-created_at="{ item }">
          <span class="text-body-2 text-medium-emphasis">
            {{ new Date(item.created_at).toLocaleDateString('pt-BR') }}
          </span>
        </template>
        <template #item-is_active="{ item }">
          <UiSwitch
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
            icon="editOutline"
            size="small"
            variant="text"
            @click="openEditModal(item)"
          />
        </template>
      </UiTable>
    </UiCard>

    <!-- Card de usuários desativados (colapsável) -->
    <UiExpandTransition>
      <UiCard v-if="inactiveUsers.length > 0">
        <template #header>
          <UiIcon class="mr-2" color="error" name="disableUser" />
          <span class="text-medium-emphasis">Usuários Desativados</span>
          <UiChip class="ml-2" color="error" label size="xs" variant="soft">
            {{ inactiveUsers.length }}
          </UiChip>
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
              <UiAvatar color="default" size="34" variant="tonal">
                <span class="text-caption font-weight-bold text-medium-emphasis">
                  {{ (item.name || 'U').charAt(0).toUpperCase() }}
                </span>
              </UiAvatar>
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
            <UiChip
              :color="roleConfig[item.role]?.color || 'default'"
              disabled
              label
              size="sm"
              variant="outline"
            >
              {{ roleConfig[item.role]?.label || item.role.toUpperCase() }}
            </UiChip>
          </template>
          <template #item-created_at="{ item }">
            <span class="text-body-2 text-medium-emphasis">
              {{ new Date(item.created_at).toLocaleDateString('pt-BR') }}
            </span>
          </template>
          <template #item-is_active="{ item }">
            <UiSwitch
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
              icon="editOutline"
              size="small"
              variant="text"
              @click="openEditModal(item)"
            />
          </template>
        </UiTable>
      </UiCard>
    </UiExpandTransition>

    <!-- Modal de Edição -->
    <UiModal v-if="editingUser" v-model="isEditModalOpen" max-width="500px" title="Editar Usuário">
      <template #header>
        <div class="d-flex align-center gap-3">
          <UiAvatar color="primary" size="36" variant="tonal">
            <span class="text-caption font-weight-bold">
              {{ (editingUser.name || 'U').charAt(0).toUpperCase() }}
            </span>
          </UiAvatar>
          <div>
            <div class="text-subtitle-2 font-weight-bold">{{ editingUser.name || 'Usuário' }}</div>
          </div>
        </div>
        <UiSpacer />
        <UiButton density="compact" icon="close" variant="text" @click="closeEditModal" />
      </template>

      <UiAlert v-if="saveError" class="mb-4" size="sm" type="error" variant="soft">
        {{ saveError }}
      </UiAlert>

      <UiInput
        v-model="editName"
        v-bind="editNameProps"
        :error-messages="editErrors.name"
        label="Nome"
        placeholder="Nome do usuário"
      />

      <UiSelect
        v-model="editRole"
        v-bind="editRoleProps"
        class="mb-3"
        density="comfortable"
        :disabled="isSelf"
        :error-messages="editErrors.role"
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

      <UiSwitch
        v-model="editIsActive"
        v-bind="editIsActiveProps"
        class="mt-3"
        color="success"
        :disabled="isSelf"
        :error-messages="editErrors.is_active"
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
      <UiAlert v-if="createError" class="mb-4" size="sm" type="error" variant="soft">
        {{ createError }}
      </UiAlert>

      <UiInput
        v-model="createName"
        v-bind="createNameProps"
        :error-messages="createErrors.name"
        label="Nome Completo"
        placeholder="Nome do usuário"
      />

      <UiInput
        v-model="createEmail"
        v-bind="createEmailProps"
        :error-messages="createErrors.email"
        label="E-mail"
        placeholder="email@exemplo.com"
        prepend-inner-icon="emailAlt"
        type="email"
      />

      <UiInput
        v-model="createPassword"
        v-bind="createPasswordProps"
        :error-messages="createErrors.password"
        label="Senha (Inicial)"
        placeholder="Pelo menos 6 caracteres"
        prepend-inner-icon="security"
        type="password"
      />

      <UiSelect
        v-model="createRole"
        v-bind="createRoleProps"
        class="mb-3"
        density="comfortable"
        :error-messages="createErrors.role"
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
