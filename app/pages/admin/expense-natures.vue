<script setup lang="ts">
  import type { ExpenseNatureRow } from '~/composables/useExpenseNatures'

  definePageMeta({
    middleware: ['admin'],
  })

  useHead({ title: 'Gerenciar Naturezas de Despesa' })

  const {
    fetchExpenseNatures,
    fetchPendingExpenseNatures,
    fetchAllActiveExpenseNatures,
    createExpenseNature,
    updateExpenseNature,
    deleteExpenseNature,
    toggleExpenseNatureStatus,
    approvePendingExpenseNature,
    mergePendingExpenseNature,
  } = useExpenseNatures()

  const activeTab = ref('active')

  // Pagination and Search State (Active Natures)
  const currentPage = ref(1)
  const itemsPerPage = ref(10)
  const searchQuery = ref('')
  const totalItems = ref(0)
  const totalPages = computed(() => Math.ceil(totalItems.value / itemsPerPage.value))

  const {
    data: expenseNatures,
    pending,
    refresh,
  } = useAsyncData(
    'expense-natures-admin',
    async () => {
      const result = await fetchExpenseNatures(
        currentPage.value,
        itemsPerPage.value,
        searchQuery.value,
      )
      totalItems.value = result.count
      return result.data
    },
    { watch: [currentPage, itemsPerPage] },
  )

  const { data: pendingNatures, refresh: refreshPending } = useAsyncData(
    'expense-natures-pending',
    fetchPendingExpenseNatures,
  )

  const { data: allActiveNatures } = useAsyncData(
    'expense-natures-all-active',
    fetchAllActiveExpenseNatures,
  )

  let timeout: ReturnType<typeof setTimeout> | null = null
  const handleSearch = () => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => {
      currentPage.value = 1
      refresh()
    }, 500)
  }

  // Modal State
  const isModalOpen = ref(false)
  const isEditing = ref(false)
  const isSaving = ref(false)
  const saveError = ref('')

  const form = ref<{
    id: string
    name: string
    is_active: boolean
  }>({
    id: '',
    name: '',
    is_active: true,
  })

  const openAddModal = () => {
    form.value = {
      id: '',
      name: '',
      is_active: true,
    }
    isEditing.value = false
    saveError.value = ''
    isModalOpen.value = true
  }

  const openEditModal = (expenseNature: ExpenseNatureRow) => {
    form.value = {
      id: expenseNature.id,
      name: expenseNature.name,
      is_active: expenseNature.is_active,
    }
    isEditing.value = true
    saveError.value = ''
    isModalOpen.value = true
  }

  const closeModal = () => {
    isModalOpen.value = false
  }

  const saveExpenseNature = async () => {
    if (!form.value.name) {
      saveError.value = 'O Nome da Natureza é obrigatório.'
      return
    }
    if (!form.value.id && !isEditing.value) {
      saveError.value = 'O Código (ID) é obrigatório.'
      return
    }

    isSaving.value = true
    saveError.value = ''

    try {
      const payload = {
        name: form.value.name,
        id: form.value.id,
        is_active: form.value.is_active,
        is_pending: false,
      }

      if (isEditing.value) {
        await updateExpenseNature(form.value.id, payload)
      } else {
        await createExpenseNature(payload)
      }

      await refresh()
      closeModal()
    } catch (e: unknown) {
      saveError.value = e instanceof Error ? e.message : String(e)
    } finally {
      isSaving.value = false
    }
  }

  const toggleStatus = async (item: ExpenseNatureRow) => {
    try {
      await toggleExpenseNatureStatus(item)
      await refresh()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : String(e))
    }
  }

  const deleteNature = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta Natureza de Despesa?')) return
    try {
      await deleteExpenseNature(id)
      await refresh()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : String(e))
    }
  }

  // --- Resolve Pending Modal ---
  const isResolveModalOpen = ref(false)
  const isResolving = ref(false)
  const resolveError = ref('')
  const resolveMode = ref<'approve' | 'merge'>('approve')
  const targetPendingNature = ref<ExpenseNatureRow | null>(null)

  const resolveForm = ref({
    newName: '',
    finalNatureId: '',
  })

  const openResolveModal = (nature: ExpenseNatureRow) => {
    targetPendingNature.value = nature
    resolveForm.value = {
      newName: nature.name,
      finalNatureId: '',
    }
    resolveMode.value = 'approve'
    resolveError.value = ''
    isResolveModalOpen.value = true
  }

  const closeResolveModal = () => {
    isResolveModalOpen.value = false
    targetPendingNature.value = null
  }

  const submitResolve = async () => {
    if (!targetPendingNature.value) return
    isResolving.value = true
    resolveError.value = ''

    try {
      if (resolveMode.value === 'approve') {
        await approvePendingExpenseNature(targetPendingNature.value, resolveForm.value.newName)
      } else {
        await mergePendingExpenseNature(targetPendingNature.value, resolveForm.value.finalNatureId)
      }
      await refreshPending()
      await refresh()
      closeResolveModal()
    } catch (e: unknown) {
      resolveError.value = e instanceof Error ? e.message : String(e)
    } finally {
      isResolving.value = false
    }
  }
</script>

<template>
  <div>
    <PageHeader subtitle="Gerencie as Naturezas de Despesa do sistema" title="Naturezas de Despesa">
      <template #actions>
        <UiButton
          color="secondary"
          icon="mdi-refresh"
          :loading="pending"
          size="small"
          variant="tonal"
          @click="refresh"
        />
        <UiButton
          v-if="activeTab === 'active'"
          color="primary"
          prepend-icon="mdi-plus"
          variant="flat"
          @click="openAddModal"
        >
          Nova Natureza
        </UiButton>
      </template>
    </PageHeader>

    <v-tabs v-model="activeTab" class="mb-5" color="primary" density="compact">
      <v-tab value="active">
        <v-icon class="mr-2" size="18">mdi-cash-multiple</v-icon>
        Naturezas Oficiais
      </v-tab>
      <v-tab value="pending">
        <v-icon class="mr-2" size="18">mdi-clock-outline</v-icon>
        Pendentes
        <v-badge
          v-if="pendingNatures && pendingNatures.length > 0"
          class="ml-2"
          color="error"
          :content="pendingNatures.length"
          inline
        />
      </v-tab>
    </v-tabs>

    <!-- Aba Ativas -->
    <div v-if="activeTab === 'active'">
      <UiCard>
        <template #header>
          <v-icon class="mr-2" color="primary" icon="mdi-cash-multiple" />
          Lista de Naturezas de Despesa
          <v-chip v-if="totalItems > 0" class="ml-2" label size="x-small" variant="tonal">
            {{ totalItems }}
          </v-chip>
          <v-spacer />
          <v-text-field
            v-model="searchQuery"
            clearable
            density="compact"
            hide-details
            label="Buscar..."
            prepend-inner-icon="mdi-magnify"
            rounded="lg"
            style="max-width: 260px"
            variant="outlined"
            @update:model-value="handleSearch"
          />
        </template>

        <UiTable
          :headers="[
            { text: 'Código', value: 'id' },
            { text: 'Nome', value: 'name' },
            { text: 'Status', value: 'is_active', align: 'center' },
            { text: 'Ações', value: 'actions', align: 'right' },
          ]"
          :items="expenseNatures || []"
          :loading="pending"
        >
          <template #item-id="{ item }">
            <v-chip v-if="item.id" color="info" label size="small" variant="tonal">
              {{ item.id }}
            </v-chip>
            <span v-else class="text-medium-emphasis">—</span>
          </template>
          <template #item-is_active="{ item }">
            <v-switch
              color="success"
              density="compact"
              hide-details
              :model-value="item.is_active"
              @update:model-value="toggleStatus(item)"
            />
          </template>
          <template #item-actions="{ item }">
            <UiButton
              class="mr-1"
              color="primary"
              icon="mdi-pencil-outline"
              size="small"
              variant="text"
              @click="openEditModal(item)"
            />
            <UiButton
              color="error"
              icon="mdi-delete-outline"
              size="small"
              variant="text"
              @click="deleteNature(item.id)"
            />
          </template>
        </UiTable>

        <div v-if="totalPages > 1" class="d-flex justify-center pa-4">
          <v-pagination
            v-model="currentPage"
            active-color="primary"
            :length="totalPages"
            rounded="lg"
            total-visible="7"
          />
        </div>
      </UiCard>
    </div>

    <!-- Aba Pendentes -->
    <div v-if="activeTab === 'pending'">
      <v-expand-transition>
        <div v-if="pendingNatures && pendingNatures.length > 0" class="mb-4">
          <v-alert
            border="start"
            color="warning"
            density="compact"
            icon="mdi-clock-alert-outline"
            rounded="xl"
            :title="`${pendingNatures.length} natureza(s) aguardando revisão`"
            variant="tonal"
          >
            <div class="d-flex flex-column gap-2 mt-3">
              <div
                v-for="nature in pendingNatures"
                :key="nature.id"
                class="d-flex align-center justify-space-between pa-3 rounded-lg bg-surface"
              >
                <div>
                  <div class="text-caption text-medium-emphasis">Código: {{ nature.id }}</div>
                  <div class="text-body-2 font-weight-medium">{{ nature.name }}</div>
                </div>
                <UiButton
                  color="warning"
                  size="small"
                  variant="tonal"
                  @click="openResolveModal(nature)"
                >
                  Resolver
                </UiButton>
              </div>
            </div>
          </v-alert>
        </div>
        <div v-else>
          <UiCard>
            <div class="d-flex flex-column align-center py-10 text-medium-emphasis">
              <v-icon class="mb-3" icon="mdi-check-circle-outline" size="40" />
              <span class="text-body-2">Nenhuma natureza pendente no momento.</span>
            </div>
          </UiCard>
        </div>
      </v-expand-transition>
    </div>

    <!-- Modal Add/Edit -->
    <UiModal
      v-model="isModalOpen"
      max-width="500px"
      :title="isEditing ? 'Editar Natureza de Despesa' : 'Nova Natureza de Despesa'"
    >
      <UiAlert v-if="saveError" class="mb-4" density="compact" type="error" variant="tonal">
        {{ saveError }}
      </UiAlert>

      <UiInput
        v-model="form.id"
        :disabled="isEditing"
        label="Código (ID) *"
        placeholder="Ex: 33903000"
      />
      <UiInput v-model="form.name" label="Nome da Natureza *" />

      <UiSwitch v-model="form.is_active" color="success" label="Ativo no sistema" />

      <template #actions>
        <UiButton variant="text" @click="closeModal">Cancelar</UiButton>
        <UiButton color="primary" :loading="isSaving" variant="flat" @click="saveExpenseNature">
          Salvar
        </UiButton>
      </template>
    </UiModal>

    <!-- Modal Resolver Pendência -->
    <UiModal v-model="isResolveModalOpen" max-width="600px" title="Resolver Natureza Pendente">
      <UiAlert v-if="resolveError" class="mb-4" density="compact" type="error" variant="tonal">
        {{ resolveError }}
      </UiAlert>

      <div class="pa-3 mb-4 rounded-lg bg-surface-variant d-flex align-center gap-3">
        <v-icon color="warning" icon="mdi-cash-multiple" />
        <div>
          <div class="text-caption text-medium-emphasis">Natureza Sugerida</div>
          <div class="text-subtitle-2 font-weight-bold text-warning">
            {{ targetPendingNature?.name }}
          </div>
          <div class="text-caption text-medium-emphasis">Código: {{ targetPendingNature?.id }}</div>
        </div>
      </div>

      <v-radio-group v-model="resolveMode" class="mb-4">
        <v-radio label="Aprovar como Nova Natureza Oficial" value="approve" />
        <v-radio label="Rejeitar e Mesclar para Natureza Existente" value="merge" />
      </v-radio-group>

      <div v-if="resolveMode === 'approve'">
        <UiInput
          v-model="resolveForm.newName"
          hint="Você pode ajustar o nome antes de aprovar."
          label="Nome Oficial"
          persistent-hint
        />
      </div>

      <div v-if="resolveMode === 'merge'">
        <p class="text-body-2 text-medium-emphasis mb-3">
          Todos os produtos vinculados à "{{ targetPendingNature?.name }}" serão transferidos para a
          natureza selecionada e a sugerida será excluída.
        </p>
        <v-autocomplete
          v-model="resolveForm.finalNatureId"
          density="comfortable"
          :item-title="(item) => `${item.id} - ${item.name}`"
          item-value="id"
          :items="allActiveNatures || []"
          label="Natureza Oficial de Destino"
          rounded="lg"
          variant="outlined"
        />
      </div>

      <template #actions>
        <UiButton :disabled="isResolving" variant="text" @click="closeResolveModal"
          >Cancelar</UiButton
        >
        <UiButton color="primary" :loading="isResolving" variant="flat" @click="submitResolve">
          Confirmar
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>
