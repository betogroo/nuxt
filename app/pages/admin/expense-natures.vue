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
    mergePendingExpenseNature
  } = useExpenseNatures()

  const activeTab = ref('active')

  // Pagination and Search State (Active Natures)
  const currentPage = ref(1)
  const itemsPerPage = ref(10)
  const searchQuery = ref('')
  const totalItems = ref(0)
  const totalPages = computed(() => Math.ceil(totalItems.value / itemsPerPage.value))

  const { data: expenseNatures, pending, refresh } = useAsyncData(
    'expense-natures-admin',
    async () => {
      const result = await fetchExpenseNatures(
        currentPage.value,
        itemsPerPage.value,
        searchQuery.value
      )
      totalItems.value = result.count
      return result.data
    },
    { watch: [currentPage, itemsPerPage] }
  )

  const {
    data: pendingNatures,
    pending: pendingPending,
    refresh: refreshPending,
  } = useAsyncData('expense-natures-pending', fetchPendingExpenseNatures)

  const { data: allActiveNatures } = useAsyncData('expense-natures-all-active', fetchAllActiveExpenseNatures)

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
        is_pending: false
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
    <PageHeader
      subtitle="Gerencie as Naturezas de Despesa do sistema"
      title="Naturezas de Despesa"
    />

    <v-tabs v-model="activeTab" class="mb-4" color="primary">
      <v-tab value="active">Naturezas Oficiais</v-tab>
      <v-tab value="pending">
        Naturezas Pendentes
        <v-badge v-if="pendingNatures && pendingNatures.length > 0" :content="pendingNatures.length" color="error" inline class="ml-2" />
      </v-tab>
    </v-tabs>

    <div class="mt-4">
      <!-- Aba Ativas -->
      <div v-if="activeTab === 'active'">
        <v-row>
          <v-col cols="12">
            <UiCard>
              <template #header>
                <span class="text-subtitle-1 font-weight-bold">Lista de Naturezas de Despesa</span>
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
                  Nova Natureza
                </UiButton>
              </template>

              <div class="pa-4 pb-0">
                <v-row>
                  <v-col cols="12" sm="8" md="6">
                    <UiInput
                      v-model="searchQuery"
                      append-inner-icon="mdi-magnify"
                      clearable
                      hide-details
                      label="Buscar por Código ou Nome"
                      placeholder="Ex: 33903000 ou Consumo..."
                      @update:model-value="handleSearch"
                    />
                  </v-col>
                </v-row>
              </div>

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
                  <UiChip v-if="item.id" color="info" size="small" variant="tonal">
                    {{ item.id }}
                  </UiChip>
                  <span v-else class="text-grey">-</span>
                </template>
                <template #item-is_active="{ item }">
                  <v-tooltip text="Clique para ativar/desativar" location="top">
                    <template #activator="{ props }">
                      <span v-bind="props">
                        <UiChip
                          :color="item.is_active ? 'success' : 'error'"
                          size="small"
                          style="cursor: pointer"
                          @click="toggleStatus(item)"
                        >
                          {{ item.is_active ? 'Ativo' : 'Inativo' }}
                        </UiChip>
                      </span>
                    </template>
                  </v-tooltip>
                </template>
                <template #item-actions="{ item }">
                  <UiButton
                    class="mr-2"
                    color="primary"
                    icon="mdi-pencil"
                    size="small"
                    variant="text"
                    @click="openEditModal(item)"
                  />
                  <UiButton
                    color="error"
                    icon="mdi-delete"
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
                  rounded="circle"
                  total-visible="7"
                />
              </div>
            </UiCard>
          </v-col>
        </v-row>
      </div>

      <!-- Aba Pendentes -->
      <div v-if="activeTab === 'pending'">
        <v-row>
          <v-col cols="12">
            <UiCard>
              <template #header>
                <span class="text-subtitle-1 font-weight-bold">Naturezas de Despesa Pendentes</span>
                <v-spacer />
                <UiButton
                  color="secondary"
                  icon="mdi-refresh"
                  :loading="pendingPending"
                  size="small"
                  variant="tonal"
                  @click="refreshPending"
                />
              </template>

              <UiTable
                :headers="[
                  { text: 'Código Criado', value: 'id' },
                  { text: 'Nome Sugerido', value: 'name' },
                  { text: 'Ações', value: 'actions', align: 'right' },
                ]"
                :items="pendingNatures || []"
                :loading="pendingPending"
              >
                <template #item-id="{ item }">
                  <span class="font-weight-medium">{{ item.id }}</span>
                </template>
                <template #item-actions="{ item }">
                  <UiButton color="primary" size="small" @click="openResolveModal(item)">
                    Resolver
                  </UiButton>
                </template>
              </UiTable>

              <div v-if="!pendingNatures?.length" class="text-center pa-4 text-grey">
                Nenhuma natureza de despesa pendente no momento.
              </div>
            </UiCard>
          </v-col>
        </v-row>
      </div>
    </div>

    <!-- Add/Edit Modal (Active) -->
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
        label="Código (ID)*"
        placeholder="Ex: 33903000"
      />
      <UiInput v-model="form.name" label="Nome da Natureza*" />

      <UiSwitch
        v-model="form.is_active"
        color="success"
        label="Ativo no sistema"
      />

      <template #actions>
        <UiButton variant="text" @click="closeModal">Cancelar</UiButton>
        <UiButton color="primary" :loading="isSaving" @click="saveExpenseNature">
          Salvar
        </UiButton>
      </template>
    </UiModal>

    <!-- Modal Resolve Suggestion -->
    <UiModal v-model="isResolveModalOpen" max-width="600px" title="Resolver Natureza Pendente" transparent-header>
      <UiAlert v-if="resolveError" class="mb-4" density="compact" type="error" variant="tonal">{{ resolveError }}</UiAlert>

      <v-radio-group v-model="resolveMode" class="mb-4">
        <v-radio label="Aprovar como Nova Natureza Oficial" value="approve"></v-radio>
        <v-radio label="Rejeitar e Mesclar para Natureza Existente (ex: Outros)" value="merge"></v-radio>
      </v-radio-group>

      <div v-if="resolveMode === 'approve'">
        <UiInput v-model="resolveForm.newName" hint="Você pode ajustar o nome antes de aprovar." label="Nome Oficial" persistent-hint />
      </div>

      <div v-if="resolveMode === 'merge'">
        <p class="text-body-2 mb-2">
          Selecione uma natureza oficial existente. Todos os produtos vinculados à "{{ targetPendingNature?.name }}"
          serão transferidos para a natureza selecionada, e a "{{ targetPendingNature?.name }}" será excluída.
        </p>
        <v-autocomplete
          v-model="resolveForm.finalNatureId"
          :items="allActiveNatures || []"
          :item-title="(item) => `${item.id} - ${item.name}`"
          item-value="id"
          label="Natureza Oficial de Destino"
          variant="outlined"
        />
      </div>

      <template #actions>
        <UiButton :disabled="isResolving" variant="text" @click="closeResolveModal">Cancelar</UiButton>
        <UiButton color="primary" :loading="isResolving" @click="submitResolve">Confirmar</UiButton>
      </template>
    </UiModal>
  </div>
</template>
