<script setup lang="ts">
  import type { IirgdDocumentTypeRow } from '~/composables/useIirgdDocumentTypes'

  definePageMeta({
    icon: 'document',
    middleware: ['admin'],
    navLabel: 'Tipos de Documento IIRGD',
    navSubtitle: 'Gerencie os tipos de documento',
    navColor: 'deep-purple',
    navGroup: 'admin',
    navOrder: 96,
    roles: ['admin'],
    showIn: ['drawer', 'admin-shortcuts'],
  })

  useHead({ title: 'Gerenciar Tipos de Documento IIRGD' })

  const {
    fetchDocumentTypes,
    fetchPendingDocumentTypes,
    fetchAllActiveDocumentTypes,
    createDocumentType,
    updateDocumentType,
    deleteDocumentType,
    toggleDocumentTypeStatus,
    approvePendingDocumentType,
    mergePendingDocumentType,
  } = useIirgdDocumentTypes()

  const {
    activeTab,
    pagination,
    searchQuery,
    handleSearch,
    items: documentTypes,
    pendingItems: pendingTypes,
    allActiveItems: allActiveTypes,
    isLoadingActive: pending,
    refreshActive: refresh,
    refreshPending,

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
    submitSaveForm: saveDocumentType,

    // Actions
    handleToggleStatus: toggleStatus,
    handleDelete: deleteType,

    // Resolve Pending
    isResolveModalOpen,
    isResolving,
    resolveError,
    resolveErrors,
    defineResolveField,
    targetPendingItem: targetPendingType,
    openResolveModal,
    closeResolveModal,
    submitResolveForm: submitResolve,
  } = useAdminCrud<IirgdDocumentTypeRow>({
    entityName: 'este tipo de documento',
    asyncDataKey: 'iirgd-document-types-admin',
    fetchActive: fetchDocumentTypes,
    fetchPending: fetchPendingDocumentTypes,
    fetchAllActive: fetchAllActiveDocumentTypes,
    createItem: createDocumentType,
    updateItem: (id, payload) => updateDocumentType(id, payload),
    deleteItem: deleteDocumentType,
    toggleStatus: toggleDocumentTypeStatus,
    approvePending: approvePendingDocumentType,
    mergePending: mergePendingDocumentType,
  })

  const [id] = defineSaveField('id')
  const [name, nameProps] = defineSaveField('name')
  const [isActive, isActiveProps] = defineSaveField('is_active')

  const [resolveMode, resolveModeProps] = defineResolveField('resolveMode')
  const [newName, newNameProps] = defineResolveField('newName')
  const [finalTargetId, finalTargetIdProps] = defineResolveField('finalTargetId')

  const { currentPage, totalPages, totalItems } = pagination

  // The shared catalog form requires an id; document types use a generated UUID.
  const openCreateModal = () => {
    openAddModal()
    id.value = crypto.randomUUID()
  }
</script>

<template>
  <div>
    <PageHeader
      subtitle="Gerencie os tipos de documento utilizados nas demandas do IIRGD"
      title="Tipos de Documento IIRGD"
    />

    <UiTabs v-model="activeTab" class="mb-5" color="primary" size="sm">
      <UiTab value="active">
        <UiIcon class="mr-2" name="document" size="18" />
        Tipos Oficiais
      </UiTab>
      <UiTab value="pending">
        <UiIcon class="mr-2" name="time" size="18" />
        Pendentes
        <UiBadge
          v-if="pendingTypes && pendingTypes.length > 0"
          class="ml-2"
          color="error"
          :content="pendingTypes.length"
          inline
        />
      </UiTab>
    </UiTabs>

    <!-- Active tab -->
    <div v-if="activeTab === 'active'">
      <UiCard>
        <template #header>
          <UiIcon class="mr-2" color="primary" name="document" />
          Lista de Tipos de Documento
          <UiChip v-if="totalItems > 0" class="ml-2" label size="xs" variant="soft">
            {{ totalItems }}
          </UiChip>
          <UiSpacer />
          <UiInput
            v-model="searchQuery"
            clearable
            hide-details
            label="Buscar..."
            prepend-inner-icon="search"
            rounded="lg"
            size="sm"
            style="max-width: 260px"
            variant="outline"
            @update:model-value="handleSearch"
          />
          <UiButton
            class="mr-2"
            color="secondary"
            icon="refresh"
            :loading="pending"
            size="sm"
            variant="soft"
            @click="refresh"
          />
          <UiButton color="primary" prepend-icon="add" @click="openCreateModal">
            Novo Tipo
          </UiButton>
        </template>

        <UiTable
          :headers="[
            { text: 'Nome', value: 'name' },
            { text: 'Status', value: 'is_active', align: 'center' },
            { text: 'Ações', value: 'actions', align: 'right' },
          ]"
          :items="documentTypes || []"
          :loading="pending"
        >
          <template #item-is_active="{ item }">
            <UiSwitch
              class="d-inline-flex"
              color="primary"
              hide-details
              :model-value="item.is_active"
              size="sm"
              @update:model-value="toggleStatus(item)"
            />
          </template>

          <template #item-actions="{ item }">
            <div class="d-flex justify-end gap-1">
              <UiButton
                color="secondary"
                icon="editOutline"
                size="xs"
                variant="ghost"
                @click="openEditModal(item)"
              />
              <UiButton
                color="error"
                icon="deleteOutline"
                size="xs"
                variant="ghost"
                @click="deleteType(item.id)"
              />
            </div>
          </template>
        </UiTable>

        <div v-if="totalPages > 1" class="d-flex justify-center pa-4 border-t">
          <UiPagination v-model="currentPage" :length="totalPages" size="md" :total-visible="7" />
        </div>
      </UiCard>
    </div>

    <!-- Pending tab -->
    <div v-else-if="activeTab === 'pending'">
      <UiCard>
        <template #header>
          <UiIcon class="mr-2" color="warning" name="time" />
          Tipos Sugeridos por Usuários
          <UiSpacer />
          <UiButton
            color="secondary"
            icon="refresh"
            size="sm"
            variant="soft"
            @click="refreshPending"
          />
        </template>

        <UiTable
          :headers="[
            { text: 'Nome Sugerido', value: 'name' },
            { text: 'Data Sugestão', value: 'created_at' },
            { text: 'Ações', value: 'actions', align: 'right' },
          ]"
          :items="pendingTypes || []"
        >
          <template #item-created_at="{ item }">
            {{ new Date(item.created_at).toLocaleDateString('pt-BR') }}
          </template>

          <template #item-actions="{ item }">
            <div class="d-flex justify-end gap-2">
              <UiButton
                color="primary"
                prepend-icon="check"
                size="sm"
                variant="soft"
                @click="openResolveModal(item)"
              >
                Revisar
              </UiButton>
              <UiButton
                color="error"
                icon="deleteOutline"
                size="sm"
                variant="ghost"
                @click="deleteType(item.id)"
              />
            </div>
          </template>

          <template #empty>
            <div class="text-center pa-6 text-medium-emphasis">
              <UiIcon class="mb-2" color="grey" name="success" size="36" />
              <div>Nenhum tipo de documento pendente de revisão.</div>
            </div>
          </template>
        </UiTable>
      </UiCard>
    </div>

    <!-- Add / Edit modal -->
    <UiModal
      v-model="isModalOpen"
      :title="isEditing ? 'Editar Tipo de Documento' : 'Novo Tipo de Documento'"
    >
      <UiAlert v-if="saveError" class="mb-4" type="error">
        {{ saveError }}
      </UiAlert>

      <UiForm @submit.prevent="saveDocumentType">
        <UiInput
          v-model="name"
          v-bind="nameProps"
          class="mb-3"
          :error-messages="saveErrors.name"
          label="Nome do Tipo de Documento"
          placeholder="Ex: Segunda Via"
          required
          variant="outline"
        />

        <UiSwitch
          v-model="isActive"
          v-bind="isActiveProps"
          color="primary"
          :error-messages="saveErrors.is_active"
          hide-details
          label="Tipo Ativo"
          size="sm"
        />
      </UiForm>

      <template #actions>
        <UiButton color="grey" variant="ghost" @click="closeModal"> Cancelar </UiButton>
        <UiButton color="primary" :loading="isSaving" @click="saveDocumentType"> Salvar </UiButton>
      </template>
    </UiModal>

    <!-- Resolve pending modal -->
    <UiModal
      v-model="isResolveModalOpen"
      :title="`Revisar Tipo: ${targetPendingType?.name || ''}`"
    >
      <UiAlert v-if="resolveError" class="mb-4" type="error">
        {{ resolveError }}
      </UiAlert>

      <div class="text-body-2 mb-4">
        Este tipo foi sugerido por um usuário com o nome
        <strong>{{ targetPendingType?.name }}</strong
        >.
      </div>

      <UiRadioGroup
        v-model="resolveMode"
        v-bind="resolveModeProps"
        class="mb-4"
        color="primary"
        :error-messages="resolveErrors.resolveMode"
      >
        <UiRadio label="Aprovar e Ativar (tornar tipo oficial no sistema)" value="approve" />
        <UiRadio label="Mesclar em um Tipo Oficial já existente" value="merge" />
      </UiRadioGroup>

      <div v-if="resolveMode === 'approve'">
        <UiInput
          v-model="newName"
          v-bind="newNameProps"
          class="mb-2"
          :error-messages="resolveErrors.newName"
          label="Nome Oficial do Tipo"
          variant="outline"
        />
      </div>

      <div v-if="resolveMode === 'merge'">
        <UiAutocomplete
          v-model="finalTargetId"
          v-bind="finalTargetIdProps"
          class="mb-2"
          :error-messages="resolveErrors.finalTargetId"
          item-title="name"
          item-value="id"
          :items="allActiveTypes || []"
          label="Selecione o Tipo Oficial de Destino"
          placeholder="Busque pelo nome..."
          variant="outline"
        />
        <div class="text-caption text-medium-emphasis">
          Todas as demandas vinculadas a esta sugestão serão apontadas para o tipo oficial escolhido
          e a sugestão pendente será excluída.
        </div>
      </div>

      <template #actions>
        <UiButton color="grey" variant="ghost" @click="closeResolveModal"> Cancelar </UiButton>
        <UiButton color="primary" :loading="isResolving" @click="submitResolve">
          {{ resolveMode === 'approve' ? 'Aprovar Tipo' : 'Confirmar Mesclagem' }}
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>
