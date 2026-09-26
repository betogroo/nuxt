<script setup lang="ts">
  import type { ExpenseNatureRow } from '~/composables/useExpenseNatures'

  definePageMeta({
    middleware: ['admin'],
  })

  useHead({ title: 'Gerenciar Naturezas de Despesa' })

  const {
    fetchExpenseNatures,
    createExpenseNature,
    updateExpenseNature,
    deleteExpenseNature
  } = useExpenseNatures()

  // Pagination and Search State
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

  const deleteNature = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta Natureza de Despesa?')) return
    try {
      await deleteExpenseNature(id)
      await refresh()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : String(e))
    }
  }
</script>

<template>
  <div>
    <PageHeader
      subtitle="Gerencie as Naturezas de Despesa do sistema"
      title="Naturezas de Despesa"
    />

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
              <UiChip :color="item.is_active ? 'success' : 'error'" size="small">
                {{ item.is_active ? 'Ativo' : 'Inativo' }}
              </UiChip>
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

          <!-- Pagination Controls -->
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

    <!-- Add/Edit Modal -->
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
  </div>
</template>
