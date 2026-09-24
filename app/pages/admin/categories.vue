<script setup lang="ts">
  import type { CategoryRow } from '~/composables/useCategories'

  definePageMeta({
    middleware: ['admin'],
  })
  useHead({ title: 'Gerenciar Categorias' })

  const {
    fetchCategories,
    fetchAllActiveCategories,
    fetchPendingSuggestions,
    createCategory,
    updateCategory,
    resolveSuggestion,
    toggleCategoryStatus,
  } = useCategories()

  const currentPage = ref(1)
  const itemsPerPage = ref(10)
  const totalItems = ref(0)

  const totalPages = computed(() => Math.ceil(totalItems.value / itemsPerPage.value))

  const {
    data: categories,
    pending,
    refresh,
  } = useAsyncData(
    'admin-categories',
    async () => {
      const result = await fetchCategories(currentPage.value, itemsPerPage.value)
      totalItems.value = result.count
      return result.data
    },
    { watch: [currentPage] },
  )

  const activeCategories = computed(() => categories.value?.filter((c) => c.is_active) || [])
  const inactiveCategories = computed(() => categories.value?.filter((c) => !c.is_active) || [])

  const toggleStatus = async (category: CategoryRow) => {
    try {
      await toggleCategoryStatus(category)
      await refresh()
    } catch (e: unknown) {
      alert(`Erro ao alterar status: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  const { data: allActiveCategories } = useAsyncData(
    'all-active-categories',
    fetchAllActiveCategories,
  )

  const {
    data: pendingSuggestions,
    pending: pendingSuggestionsPending,
    refresh: refreshSuggestions,
  } = useAsyncData('admin-suggestions', fetchPendingSuggestions)

  onMounted(() => {
    refresh()
    refreshSuggestions()
  })

  // Resolve Modal State
  const isResolveModalOpen = ref(false)
  const resolveTarget = ref('')
  const resolveMode = ref<'new' | 'existing'>('new')
  const resolveNewName = ref('')
  const resolveExistingId = ref<string | null>(null)
  const isResolving = ref(false)
  const resolveError = ref('')

  const openResolveModal = (suggestion: string) => {
    resolveTarget.value = suggestion
    resolveMode.value = 'new'
    resolveNewName.value = suggestion
    resolveExistingId.value = null
    resolveError.value = ''
    isResolveModalOpen.value = true
  }

  const closeResolveModal = () => {
    isResolveModalOpen.value = false
  }

  const submitResolve = async () => {
    resolveError.value = ''
    isResolving.value = true
    try {
      await resolveSuggestion(
        resolveTarget.value,
        resolveMode.value,
        resolveNewName.value,
        resolveExistingId.value,
      )

      await refreshSuggestions()
      if (resolveMode.value === 'new') {
        await refresh()
        await refreshNuxtData('all-active-categories')
      }
      await refreshNuxtData('pending-categories-count')

      closeResolveModal()
    } catch (e: unknown) {
      resolveError.value = e instanceof Error ? e.message : String(e)
    } finally {
      isResolving.value = false
    }
  }

  const isModalOpen = ref(false)
  const isSaving = ref(false)
  const saveError = ref('')
  const isEditing = ref(false)

  const defaultForm = {
    id: '',
    name: '',
    is_active: true,
  }
  const form = ref({ ...defaultForm })

  const openAddModal = () => {
    form.value = { ...defaultForm }
    isEditing.value = false
    saveError.value = ''
    isModalOpen.value = true
  }

  const openEditModal = (cat: CategoryRow) => {
    form.value = { ...cat }
    isEditing.value = true
    saveError.value = ''
    isModalOpen.value = true
  }

  const closeModal = () => {
    isModalOpen.value = false
  }

  const saveCategory = async () => {
    if (!form.value.name.trim()) {
      saveError.value = 'O nome da categoria é obrigatório.'
      return
    }

    isSaving.value = true
    saveError.value = ''

    try {
      if (isEditing.value) {
        await updateCategory(form.value.id, form.value.name, form.value.is_active)
      } else {
        await createCategory(form.value.name, form.value.is_active)
      }

      await refresh()
      closeModal()
    } catch (err: unknown) {
      saveError.value = err instanceof Error ? err.message : String(err)
    } finally {
      isSaving.value = false
    }
  }
</script>

<template>
  <div>
    <PageHeader
      subtitle="Gerencie as categorias disponíveis e avalie sugestões"
      title="Categorias de Produtos"
    />

    <v-row>
      <v-col cols="12">
        <!-- Tabela de Sugestões Pendentes -->
        <UiCard
          v-if="pendingSuggestions && pendingSuggestions.length > 0"
          class="mb-6"
          title="Sugestões Pendentes"
        >
          <template #header>
            Sugestões Pendentes ({{ pendingSuggestions.length }})
            <v-spacer />
            <UiButton
              color="primary"
              icon="mdi-refresh"
              :loading="pendingSuggestionsPending"
              size="small"
              variant="text"
              @click="refreshSuggestions"
            />
          </template>
          <UiTable
            :headers="[
              { text: 'Sugestão', value: 'name' },
              { text: 'Produtos aguardando', value: 'count', align: 'center' },
              { text: 'Ações', value: 'actions', align: 'right' },
            ]"
            :items="pendingSuggestions"
          >
            <template #item-name="{ item }">
              <span class="font-weight-medium text-warning">{{ item.name }}</span>
            </template>
            <template #item-count="{ item }">
              <v-chip size="small">{{ item.count }}</v-chip>
            </template>
            <template #item-actions="{ item }">
              <UiButton
                color="primary"
                size="small"
                variant="tonal"
                @click="openResolveModal(item.name)"
              >
                Resolver
              </UiButton>
            </template>
          </UiTable>
        </UiCard>

        <!-- Tabela Principal de Categorias -->
        <UiCard>
          <template #header>
            <span class="text-subtitle-1 font-weight-bold">Categorias de Produtos</span>
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
            <UiButton color="primary" prepend-icon="mdi-plus" @click="openAddModal">
              Nova Categoria
            </UiButton>
          </template>

          <UiTable
            :headers="[
              { text: 'Nome da Categoria', value: 'name' },
              { text: 'Status', value: 'is_active', align: 'center' },
              { text: 'Ações', value: 'actions', align: 'right' },
            ]"
            :items="activeCategories"
          >
            <template v-if="!activeCategories?.length && !pending" #empty>
              Nenhuma categoria encontrada.
            </template>
            <template #item-name="{ item }">
              <span class="font-weight-medium">{{ item.name }}</span>
            </template>
            <template #item-is_active="{ item }">
              <v-chip
                class="cursor-pointer"
                :color="item.is_active ? 'success' : 'error'"
                size="small"
                variant="flat"
                @click="toggleStatus(item)"
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

      <v-col v-if="inactiveCategories.length > 0" cols="12">
        <UiCard>
          <template #header>
            <span class="text-subtitle-1 font-weight-bold text-grey">Categorias Desativadas</span>
          </template>

          <UiTable
            :headers="[
              { text: 'Nome da Categoria', value: 'name' },
              { text: 'Status', value: 'is_active', align: 'center' },
              { text: 'Ações', value: 'actions', align: 'right' },
            ]"
            :items="inactiveCategories"
            :loading="pending"
          >
            <template #item-name="{ item }">
              <span class="font-weight-medium">{{ item.name }}</span>
            </template>
            <template #item-is_active="{ item }">
              <v-chip
                class="cursor-pointer"
                :color="item.is_active ? 'success' : 'error'"
                size="small"
                variant="flat"
                @click="toggleStatus(item)"
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

    <!-- Modal Form -->
    <v-dialog v-model="isModalOpen" max-width="500px">
      <UiCard :title="isEditing ? 'Editar Categoria' : 'Nova Categoria'" transparent-header>
        <v-alert v-if="saveError" class="mb-4" density="compact" type="error" variant="tonal">
          {{ saveError }}
        </v-alert>

        <UiInput v-model="form.name" label="Nome da Categoria (Ex: Papelaria)" />

        <v-switch
          v-model="form.is_active"
          color="success"
          hint="Determina se os usuários podem escolher esta categoria ao cadastrar novos produtos"
          label="Categoria Ativa"
          persistent-hint
        />

        <template #actions>
          <UiButton :disabled="isSaving" variant="text" @click="closeModal">Cancelar</UiButton>
          <UiButton color="primary" :loading="isSaving" @click="saveCategory"> Salvar </UiButton>
        </template>
      </UiCard>
    </v-dialog>

    <!-- Resolve Modal -->
    <v-dialog v-model="isResolveModalOpen" max-width="550px" persistent>
      <UiCard title="Resolver Sugestão de Categoria" transparent-header>
        <v-alert v-if="resolveError" class="mb-4" density="compact" type="error" variant="tonal">
          {{ resolveError }}
        </v-alert>

        <p class="mb-4 text-body-2">
          Resolvendo a sugestão: <strong class="text-warning">{{ resolveTarget }}</strong>
        </p>

        <v-radio-group v-model="resolveMode" class="mb-2">
          <v-radio label="Criar Nova Categoria" value="new" />
          <v-radio label="Vincular a Categoria Existente" value="existing" />
        </v-radio-group>

        <v-slide-y-transition leave-absolute>
          <div v-if="resolveMode === 'new'">
            <UiInput
              v-model="resolveNewName"
              hint="Você pode ajustar o texto digitado pelo usuário para o padrão oficial."
              label="Nome da Nova Categoria"
              persistent-hint
            />
          </div>
          <div v-else>
            <UiSelect
              v-model="resolveExistingId"
              item-title="name"
              item-value="id"
              :items="allActiveCategories || []"
              label="Selecione a Categoria"
            />
          </div>
        </v-slide-y-transition>

        <template #actions>
          <UiButton :disabled="isResolving" variant="text" @click="closeResolveModal"
            >Cancelar</UiButton
          >
          <UiButton color="primary" :loading="isResolving" @click="submitResolve"
            >Confirmar</UiButton
          >
        </template>
      </UiCard>
    </v-dialog>
  </div>
</template>
