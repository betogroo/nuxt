<script setup lang="ts">
  import type { ExpenseNatureRow } from '~/composables/useExpenseNatures'

  definePageMeta({
    icon: 'finances',
    middleware: ['admin'],
    navLabel: 'Naturezas de Despesa',
    navSubtitle: 'Gerencie naturezas de despesa',
    navColor: 'orange',
    navGroup: 'admin',
    navOrder: 90,
    roles: ['admin'],
    showIn: ['drawer', 'admin-shortcuts'],
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

  const {
    activeTab,
    pagination,
    searchQuery,
    handleSearch,
    items: expenseNatures,
    pendingItems: pendingNatures,
    allActiveItems: allActiveNatures,
    isLoadingActive: pending,
    refreshActive: refresh,

    // Modal
    isModalOpen,
    isEditing,
    isSaving,
    saveError,
    saveErrors,
    defineSaveField,
    openAddModal,
    openEditModal,
    closeModal,
    submitSaveForm: saveExpenseNature,

    // Actions
    handleToggleStatus: toggleStatus,
    handleDelete: deleteNature,

    // Resolve Pending
    isResolveModalOpen,
    isResolving,
    resolveError,
    resolveErrors,
    defineResolveField,
    targetPendingItem: targetPendingNature,
    openResolveModal,
    closeResolveModal,
    submitResolveForm: submitResolve,
  } = useAdminCrud<ExpenseNatureRow>({
    entityName: 'esta natureza de despesa',
    asyncDataKey: 'expense-natures-admin',
    fetchActive: fetchExpenseNatures,
    fetchPending: fetchPendingExpenseNatures,
    fetchAllActive: fetchAllActiveExpenseNatures,
    createItem: createExpenseNature,
    updateItem: (id, payload) => updateExpenseNature(id, payload),
    deleteItem: deleteExpenseNature,
    toggleStatus: toggleExpenseNatureStatus,
    approvePending: approvePendingExpenseNature,
    mergePending: mergePendingExpenseNature,
  })
  const [id, idProps] = defineSaveField('id')
  const [name, nameProps] = defineSaveField('name')
  const [isActive, isActiveProps] = defineSaveField('is_active')

  const [resolveMode, resolveModeProps] = defineResolveField('resolveMode')
  const [newName, newNameProps] = defineResolveField('newName')
  const [finalNatureId, finalNatureIdProps] = defineResolveField('finalNatureId')

  const { currentPage, totalPages } = pagination
</script>

<template>
  <div>
    <PageHeader subtitle="Gerencie as Naturezas de Despesa do sistema" title="Naturezas de Despesa">
    </PageHeader>

    <UiTabs v-model="activeTab" class="mb-5" color="primary" density="compact">
      <UiTab value="active">
        <UiIcon class="mr-2" name="finances" size="18" />
        Naturezas Oficiais
      </UiTab>
      <UiTab value="pending">
        <UiIcon class="mr-2" name="time" size="18" />
        Pendentes
        <UiBadge
          v-if="pendingNatures && pendingNatures.length > 0"
          class="ml-2"
          color="error"
          :content="pendingNatures.length"
          inline
        />
      </UiTab>
    </UiTabs>

    <!-- Aba Ativas -->
    <div v-if="activeTab === 'active'">
      <UiCard>
        <template #header>
          <UiIcon class="mr-2" color="primary" name="finances" />
          Lista de Naturezas de Despesa
          <UiChip v-if="totalItems > 0" class="ml-2" label size="x-small" variant="tonal">
            {{ totalItems }}
          </UiChip>
          <UiSpacer />
          <UiInput
            v-model="searchQuery"
            clearable
            density="compact"
            hide-details
            label="Buscar..."
            prepend-inner-icon="search"
            rounded="lg"
            style="max-width: 260px"
            variant="outlined"
            @update:model-value="handleSearch"
          />
          <UiButton
            class="mr-2"
            color="secondary"
            icon="refresh"
            :loading="pending"
            size="small"
            variant="tonal"
            @click="refresh"
          />
          <UiButton color="primary" prepend-icon="add" @click="openAddModal"
            >Nova Natureza</UiButton
          >
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
            <UiChip v-if="item.id" color="info" label size="sm" variant="soft">
              {{ item.id }}
            </UiChip>
            <span v-else class="text-medium-emphasis">—</span>
          </template>
          <template #item-is_active="{ item }">
            <UiSwitch
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
              icon="editOutline"
              size="small"
              variant="text"
              @click="openEditModal(item)"
            />
            <UiButton
              color="error"
              icon="deleteOutline"
              size="small"
              variant="text"
              @click="deleteNature(item.id)"
            />
          </template>
        </UiTable>

        <div v-if="totalPages > 1" class="d-flex justify-center pa-4">
          <UiPagination
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
      <UiExpandTransition>
        <div v-if="pendingNatures && pendingNatures.length > 0" class="mb-4">
          <UiAlert
            border="start"
            color="warning"
            size="sm"
            icon="clockAlert"
            rounded="xl"
            :title="`${pendingNatures.length} natureza(s) aguardando revisão`"
            variant="soft"
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
          </UiAlert>
        </div>
        <div v-else>
          <UiCard>
            <div class="d-flex flex-column align-center py-10 text-medium-emphasis">
              <UiIcon class="mb-3" name="success" size="40" />
              <span class="text-body-2">Nenhuma natureza pendente no momento.</span>
            </div>
          </UiCard>
        </div>
      </UiExpandTransition>
    </div>

    <!-- Modal Add/Edit -->
    <UiModal
      v-model="isModalOpen"
      max-width="500px"
      :title="isEditing ? 'Editar Natureza de Despesa' : 'Nova Natureza de Despesa'"
    >
      <UiAlert v-if="saveError" class="mb-4" size="sm" type="error" variant="soft">
        {{ saveError }}
      </UiAlert>

      <UiInput
        v-model="id"
        v-bind="idProps"
        :disabled="isEditing"
        :error-messages="saveErrors.id"
        label="Código (ID) *"
        placeholder="Ex: 33903000"
      />
      <UiInput
        v-model="name"
        v-bind="nameProps"
        :error-messages="saveErrors.name"
        label="Nome da Natureza *"
      />

      <UiSwitch
        v-model="isActive"
        v-bind="isActiveProps"
        color="success"
        :error-messages="saveErrors.is_active"
        label="Ativo no sistema"
      />

      <template #actions>
        <UiButton variant="text" @click="closeModal">Cancelar</UiButton>
        <UiButton color="primary" :loading="isSaving" variant="flat" @click="saveExpenseNature">
          Salvar
        </UiButton>
      </template>
    </UiModal>

    <!-- Modal Resolver Pendência -->
    <UiModal v-model="isResolveModalOpen" max-width="600px" title="Resolver Natureza Pendente">
      <UiAlert v-if="resolveError" class="mb-4" size="sm" type="error" variant="soft">
        {{ resolveError }}
      </UiAlert>

      <div class="pa-3 mb-4 rounded-lg bg-surface-variant d-flex align-center gap-3">
        <UiIcon color="warning" name="finances" />
        <div>
          <div class="text-caption text-medium-emphasis">Natureza Sugerida</div>
          <div class="text-subtitle-2 font-weight-bold text-warning">
            {{ targetPendingNature?.name }}
          </div>
          <div class="text-caption text-medium-emphasis">Código: {{ targetPendingNature?.id }}</div>
        </div>
      </div>

      <UiRadioGroup
        v-model="resolveMode"
        v-bind="resolveModeProps"
        class="mb-4"
        :error-messages="resolveErrors.resolveMode"
      >
        <UiRadio label="Aprovar como Nova Natureza Oficial" value="approve" />
        <UiRadio label="Rejeitar e Mesclar para Natureza Existente" value="merge" />
      </UiRadioGroup>

      <div v-if="resolveMode === 'approve'">
        <UiInput
          v-model="newName"
          v-bind="newNameProps"
          :error-messages="resolveErrors.newName"
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
        <UiAutocomplete
          v-model="finalNatureId"
          v-bind="finalNatureIdProps"
          density="comfortable"
          :error-messages="resolveErrors.finalTargetId"
          :item-title="(item: Record<string, unknown>) => `${item.id} - ${item.name}`"
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
