<script setup lang="ts">
  import type { BrandRow } from '~/composables/useBrands'

  definePageMeta({
    icon: 'tag',
    middleware: ['admin'],
    navLabel: 'Marcas',
    navSubtitle: 'Gerencie as marcas comerciais de produtos',
    navColor: 'deep-purple',
    navGroup: 'admin',
    navSubgroup: 'catalogs',
    navOrder: 35,
    roles: ['admin'],
    showIn: ['drawer', 'admin-shortcuts'],
  })

  useHead({ title: 'Gerenciar Marcas' })

  const {
    fetchBrands,
    fetchPendingBrands,
    fetchAllActiveBrands,
    createBrand,
    updateBrand,
    deleteBrand,
    toggleBrandStatus,
    approvePendingBrand,
    mergePendingBrand,
  } = useBrands()

  const {
    activeTab,
    pagination,
    searchQuery,
    handleSearch,
    items: brands,
    pendingItems: pendingBrands,
    allActiveItems: allActiveBrands,
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
    submitSaveForm: saveBrand,

    // Actions
    handleToggleStatus: toggleStatus,
    handleDelete: removeBrand,

    // Resolve Pending
    isResolveModalOpen,
    isResolving,
    resolveError,
    resolveErrors,
    defineResolveField,
    targetPendingItem: targetPendingBrand,
    openResolveModal,
    closeResolveModal,
    submitResolveForm: submitResolve,
  } = useAdminCrud<BrandRow>({
    entityName: 'esta marca',
    asyncDataKey: 'brands-admin',
    fetchActive: fetchBrands,
    fetchPending: fetchPendingBrands,
    fetchAllActive: fetchAllActiveBrands,
    createItem: (payload) =>
      createBrand({
        name: payload.name,
        is_active: payload.is_active,
        is_pending: false,
      }),
    updateItem: (id, payload) => updateBrand(id, payload),
    deleteItem: (id) => deleteBrand(id),
    toggleStatus: toggleBrandStatus,
    approvePending: approvePendingBrand,
    mergePending: mergePendingBrand,
  })

  const [id] = defineSaveField('id')
  const [name, nameProps] = defineSaveField('name')
  const [isActive, isActiveProps] = defineSaveField('is_active')

  const [resolveMode, resolveModeProps] = defineResolveField('resolveMode')
  const [newName, newNameProps] = defineResolveField('newName')
  const [finalTargetId, finalTargetIdProps] = defineResolveField('finalTargetId')

  const { currentPage, totalPages, totalItems } = pagination

  // O formulário de catálogo exige um ID; marcas utilizam UUID gerado automaticamente
  const openCreateModal = () => {
    openAddModal()
    id.value = crypto.randomUUID()
  }
</script>

<template>
  <div>
    <UiPageHeader
      subtitle="Gerencie as marcas comerciais de produtos cadastradas no sistema"
      title="Marcas de Produtos"
    />

    <UiTabs v-model="activeTab" class="mb-5" color="primary" size="sm">
      <UiTab value="active">
        <UiIcon class="mr-2" name="tag" size="18" />
        Marcas Oficiais
      </UiTab>
      <UiTab value="pending">
        <UiIcon class="mr-2" name="time" size="18" />
        Pendentes de Revisão
        <UiBadge
          v-if="pendingBrands && pendingBrands.length > 0"
          class="ml-2"
          color="error"
          :content="pendingBrands.length"
          inline
        />
      </UiTab>
    </UiTabs>

    <!-- Aba 1: Marcas Oficiais / Ativas -->
    <div v-if="activeTab === 'active'">
      <UiCard>
        <template #header>
          <UiIcon class="mr-2" color="primary" name="tag" />
          Lista de Marcas
          <UiChip v-if="totalItems > 0" class="ml-2" label size="xs" variant="soft">
            {{ totalItems }}
          </UiChip>
          <UiSpacer />
          <UiInput
            v-model="searchQuery"
            clearable
            hide-details
            label="Buscar por nome..."
            prepend-inner-icon="search"
            rounded="lg"
            size="sm"
            style="max-width: 260px"
            variant="outline"
            @update:model-value="handleSearch"
          />
          <UiActionButton
            action="refresh"
            class="mr-2"
            :loading="pending"
            tooltip="Atualizar lista"
            variant="soft"
            @click="refresh"
          />
          <UiButton color="primary" prepend-icon="add" size="sm" @click="openCreateModal">
            Nova Marca
          </UiButton>
        </template>

        <UiTable
          :headers="[
            { text: 'Nome da Marca', value: 'name' },
            { text: 'Status', value: 'is_active', align: 'center' },
            { text: 'Ações', value: 'actions', align: 'right' },
          ]"
          :items="brands || []"
          :loading="pending"
        >
          <template #item-name="{ item }">
            <NuxtLink
              class="font-weight-medium text-body-1 text-primary text-decoration-none"
              :to="`/brands/${item.id}`"
            >
              {{ item.name }}
            </NuxtLink>
          </template>

          <template #item-is_active="{ item }">
            <UiSwitch
              class="d-inline-flex"
              color="success"
              hide-details
              :model-value="item.is_active"
              size="sm"
              @update:model-value="toggleStatus(item)"
            />
          </template>

          <template #item-actions="{ item }">
            <div class="d-flex justify-end gap-1">
              <UiActionButton
                action="view"
                :to="`/brands/${item.id}`"
                tooltip="Ver produtos desta marca"
              />
              <UiActionButton action="edit" tooltip="Editar marca" @click="openEditModal(item)" />
              <UiActionButton
                action="delete"
                tooltip="Excluir marca"
                @click="removeBrand(item.id)"
              />
            </div>
          </template>

          <template #empty>
            <div class="text-center pa-6 text-medium-emphasis">
              <UiIcon class="mb-2" color="grey" name="tag" size="36" />
              <div>Nenhuma marca encontrada.</div>
            </div>
          </template>
        </UiTable>

        <div v-if="totalPages > 1" class="d-flex justify-center pa-4 border-t">
          <UiPagination v-model="currentPage" :length="totalPages" size="md" :total-visible="7" />
        </div>
      </UiCard>
    </div>

    <!-- Aba 2: Marcas Pendentes de Revisão -->
    <div v-else-if="activeTab === 'pending'">
      <UiCard>
        <template #header>
          <UiIcon class="mr-2" color="warning" name="time" />
          Marcas Sugeridas por Usuários
          <UiSpacer />
          <UiActionButton
            action="refresh"
            tooltip="Atualizar lista"
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
          :items="pendingBrands || []"
        >
          <template #item-name="{ item }">
            <NuxtLink
              class="font-weight-medium text-body-1 text-primary text-decoration-none"
              :to="`/brands/${item.id}`"
            >
              {{ item.name }}
            </NuxtLink>
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
              <UiActionButton
                action="delete"
                tooltip="Excluir sugestão"
                @click="removeBrand(item.id)"
              />
            </div>
          </template>

          <template #empty>
            <div class="text-center pa-6 text-medium-emphasis">
              <UiIcon class="mb-2" color="grey" name="success" size="36" />
              <div>Nenhuma marca pendente de revisão.</div>
            </div>
          </template>
        </UiTable>
      </UiCard>
    </div>

    <!-- Modal Inclusão / Edição de Marca -->
    <UiModal v-model="isModalOpen" :title="isEditing ? 'Editar Marca' : 'Nova Marca'">
      <UiAlert v-if="saveError" class="mb-4" type="error">
        {{ saveError }}
      </UiAlert>

      <UiForm @submit.prevent="saveBrand">
        <UiInput
          v-model="name"
          v-bind="nameProps"
          class="mb-3"
          :error-messages="saveErrors.name"
          label="Nome da Marca *"
          placeholder="Ex: BIC, Faber-Castell, 3M, Dell"
          required
          variant="outline"
        />

        <UiSwitch
          v-model="isActive"
          v-bind="isActiveProps"
          color="success"
          :error-messages="saveErrors.is_active"
          hide-details
          label="Marca Ativa"
          size="sm"
        />
      </UiForm>

      <template #actions>
        <UiButton color="grey" variant="ghost" @click="closeModal"> Cancelar </UiButton>
        <UiButton color="primary" :loading="isSaving" @click="saveBrand"> Salvar </UiButton>
      </template>
    </UiModal>

    <!-- Modal Revisão de Marca Pendente (Aprovar / Mesclar) -->
    <UiModal
      v-model="isResolveModalOpen"
      :title="`Revisar Marca: ${targetPendingBrand?.name || ''}`"
    >
      <UiAlert v-if="resolveError" class="mb-4" type="error">
        {{ resolveError }}
      </UiAlert>

      <div class="text-body-2 mb-4">
        Esta marca foi sugerida por um usuário ao cadastrar um produto real com o nome
        <strong>"{{ targetPendingBrand?.name }}"</strong>.
      </div>

      <UiRadioGroup
        v-model="resolveMode"
        v-bind="resolveModeProps"
        class="mb-4"
        color="primary"
        :error-messages="resolveErrors.resolveMode"
      >
        <UiRadio label="Aprovar e Ativar (tornar marca oficial no sistema)" value="approve" />
        <UiRadio label="Mesclar em uma Marca Oficial já existente" value="merge" />
      </UiRadioGroup>

      <div v-if="resolveMode === 'approve'">
        <UiInput
          v-model="newName"
          v-bind="newNameProps"
          class="mb-2"
          :error-messages="resolveErrors.newName"
          label="Nome Oficial da Marca *"
          placeholder="Ex: Nome corrigido da marca"
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
          :items="allActiveBrands || []"
          label="Selecione a Marca Oficial de Destino *"
          placeholder="Busque pelo nome da marca..."
          variant="outline"
        />
        <div class="text-caption text-medium-emphasis">
          Todos os produtos reais vinculados a esta sugestão serão apontados para a marca oficial
          escolhida e a sugestão pendente será excluída.
        </div>
      </div>

      <template #actions>
        <UiButton color="grey" variant="ghost" @click="closeResolveModal"> Cancelar </UiButton>
        <UiButton color="primary" :loading="isResolving" @click="submitResolve">
          {{ resolveMode === 'approve' ? 'Aprovar Marca' : 'Confirmar Mesclagem' }}
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>
