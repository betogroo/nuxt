<script setup lang="ts">
  import type { ProductClassRow } from '~/composables/useProductClasses'

  definePageMeta({
    icon: 'categories',
    middleware: ['admin'],
    navLabel: 'Classes de Produtos',
    navSubtitle: 'Gerencie as classes de produtos',
    navColor: 'teal',
    navGroup: 'admin',
    navOrder: 95,
    roles: ['admin'],
    showIn: ['drawer', 'admin-shortcuts'],
  })

  useHead({ title: 'Gerenciar Classes de Produtos' })

  const {
    fetchProductClasses,
    fetchPendingProductClasses,
    fetchAllActiveProductClasses,
    createProductClass,
    updateProductClass,
    deleteProductClass,
    toggleProductClassStatus,
    approvePendingProductClass,
    mergePendingProductClass,
  } = useProductClasses()

  const {
    activeTab,
    pagination,
    searchQuery,
    handleSearch,
    items: productClasses,
    pendingItems: pendingClasses,
    allActiveItems: allActiveClasses,
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
    submitSaveForm: saveProductClass,

    // Actions
    handleToggleStatus: toggleStatus,
    handleDelete: deleteClass,

    // Resolve Pending
    isResolveModalOpen,
    isResolving,
    resolveError,
    resolveErrors,
    defineResolveField,
    targetPendingItem: targetPendingClass,
    openResolveModal,
    closeResolveModal,
    submitResolveForm: submitResolve,
  } = useAdminCrud<ProductClassRow>({
    entityName: 'esta classe de produto',
    asyncDataKey: 'product-classes-admin',
    fetchActive: fetchProductClasses,
    fetchPending: fetchPendingProductClasses,
    fetchAllActive: fetchAllActiveProductClasses,
    createItem: createProductClass,
    updateItem: (id, payload) => updateProductClass(id, payload),
    deleteItem: deleteProductClass,
    toggleStatus: toggleProductClassStatus,
    approvePending: approvePendingProductClass,
    mergePending: mergePendingProductClass,
  })
  const [id, idProps] = defineSaveField('id')
  const [name, nameProps] = defineSaveField('name')
  const [isActive, isActiveProps] = defineSaveField('is_active')

  const [resolveMode, resolveModeProps] = defineResolveField('resolveMode')
  const [newName, newNameProps] = defineResolveField('newName')
  const [finalClassId, finalClassIdProps] = defineResolveField('finalClassId')

  const { currentPage, totalPages } = pagination
</script>

<template>
  <div>
    <PageHeader subtitle="Gerencie as Classes de Produtos do sistema" title="Classes de Produtos" />

    <UiTabs v-model="activeTab" class="mb-5" color="primary" size="sm">
      <UiTab value="active">
        <UiIcon class="mr-2" name="categories" size="18" />
        Classes Oficiais
      </UiTab>
      <UiTab value="pending">
        <UiIcon class="mr-2" name="time" size="18" />
        Pendentes
        <UiBadge
          v-if="pendingClasses && pendingClasses.length > 0"
          class="ml-2"
          color="error"
          :content="pendingClasses.length"
          inline
        />
      </UiTab>
    </UiTabs>

    <!-- Aba Ativas -->
    <div v-if="activeTab === 'active'">
      <UiCard>
        <template #header>
          <UiIcon class="mr-2" color="primary" name="categories" />
          Lista de Classes de Produtos
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
          <UiButton color="primary" prepend-icon="add" @click="openAddModal">
            Nova Classe
          </UiButton>
        </template>

        <UiTable
          :headers="[
            { text: 'Código', value: 'id' },
            { text: 'Nome', value: 'name' },
            { text: 'Status', value: 'is_active', align: 'center' },
            { text: 'Ações', value: 'actions', align: 'right' },
          ]"
          :items="productClasses || []"
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
                @click="deleteClass(item.id)"
              />
            </div>
          </template>
        </UiTable>

        <div v-if="totalPages > 1" class="d-flex justify-center pa-4 border-t">
          <UiPagination v-model="currentPage" :length="totalPages" size="md" :total-visible="7" />
        </div>
      </UiCard>
    </div>

    <!-- Aba Pendentes -->
    <div v-else-if="activeTab === 'pending'">
      <UiCard>
        <template #header>
          <UiIcon class="mr-2" color="warning" name="time" />
          Classes Sugeridas por Usuários
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
            { text: 'Código Sugerido', value: 'id' },
            { text: 'Nome Sugerido', value: 'name' },
            { text: 'Data Sugestão', value: 'created_at' },
            { text: 'Ações', value: 'actions', align: 'right' },
          ]"
          :items="pendingClasses || []"
        >
          <template #item-id="{ item }">
            <UiChip color="warning" label size="sm" variant="soft">
              {{ item.id }}
            </UiChip>
          </template>

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
                @click="deleteClass(item.id)"
              />
            </div>
          </template>

          <template #empty>
            <div class="text-center pa-6 text-medium-emphasis">
              <UiIcon class="mb-2" color="grey" name="success" size="36" />
              <div>Nenhuma classe de produto pendente de revisão.</div>
            </div>
          </template>
        </UiTable>
      </UiCard>
    </div>

    <!-- Modal Adicionar / Editar Classe Oficial -->
    <UiModal
      v-model="isModalOpen"
      :title="isEditing ? 'Editar Classe de Produto' : 'Nova Classe de Produto'"
    >
      <UiAlert v-if="saveError" class="mb-4" type="error">
        {{ saveError }}
      </UiAlert>

      <UiForm @submit.prevent="saveProductClass">
        <UiInput
          v-model="id"
          v-bind="idProps"
          class="mb-3"
          :disabled="isEditing"
          :error-messages="saveErrors.id"
          hint="Ex: 5915"
          label="Código da Classe"
          persistent-hint
          required
          variant="outline"
        />

        <UiInput
          v-model="name"
          v-bind="nameProps"
          class="mb-3"
          :error-messages="saveErrors.name"
          label="Nome da Classe"
          placeholder="Ex: Filtros e redes"
          required
          variant="outline"
        />

        <UiSwitch
          v-model="isActive"
          v-bind="isActiveProps"
          color="primary"
          :error-messages="saveErrors.is_active"
          hide-details
          label="Classe Ativa"
          size="sm"
        />
      </UiForm>

      <template #actions>
        <UiButton color="grey" variant="ghost" @click="closeModal"> Cancelar </UiButton>
        <UiButton color="primary" :loading="isSaving" @click="saveProductClass"> Salvar </UiButton>
      </template>
    </UiModal>

    <!-- Modal Resolver Pendência (Aprovar / Mesclar) -->
    <UiModal
      v-model="isResolveModalOpen"
      :title="`Revisar Classe: ${targetPendingClass?.name || ''}`"
    >
      <UiAlert v-if="resolveError" class="mb-4" type="error">
        {{ resolveError }}
      </UiAlert>

      <div class="text-body-2 mb-4">
        Esta classe foi sugerida pelo usuário com o código
        <strong>{{ targetPendingClass?.id }}</strong> e o nome
        <strong>{{ targetPendingClass?.name }}</strong
        >.
      </div>

      <UiRadioGroup
        v-model="resolveMode"
        v-bind="resolveModeProps"
        class="mb-4"
        color="primary"
        :error-messages="resolveErrors.resolveMode"
      >
        <UiRadio label="Aprovar e Ativar (tornar classe oficial no sistema)" value="approve" />
        <UiRadio label="Mesclar em uma Classe Oficial já existente" value="merge" />
      </UiRadioGroup>

      <div v-if="resolveMode === 'approve'">
        <UiInput
          v-model="newName"
          v-bind="newNameProps"
          class="mb-2"
          :error-messages="resolveErrors.newName"
          label="Nome Oficial da Classe"
          variant="outline"
        />
      </div>

      <div v-if="resolveMode === 'merge'">
        <UiAutocomplete
          v-model="finalClassId"
          v-bind="finalClassIdProps"
          class="mb-2"
          :error-messages="resolveErrors.finalTargetId"
          item-title="name"
          item-value="id"
          :items="allActiveClasses || []"
          label="Selecione a Classe Oficial de Destino"
          placeholder="Busque pelo nome da classe..."
          variant="outline"
        />
        <div class="text-caption text-medium-emphasis">
          Todos os produtos vinculados a esta sugestão serão apontados para a classe oficial
          escolhida e a sugestão pendente será excluída.
        </div>
      </div>

      <template #actions>
        <UiButton color="grey" variant="ghost" @click="closeResolveModal"> Cancelar </UiButton>
        <UiButton color="primary" :loading="isResolving" @click="submitResolve">
          {{ resolveMode === 'approve' ? 'Aprovar Classe' : 'Confirmar Mesclagem' }}
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>
