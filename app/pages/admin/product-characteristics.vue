<script setup lang="ts">
  import type {
    ProductCharacteristicKeyRow,
    ProductCharacteristicKeyWithStats,
  } from '~/composables/useProductCharacteristics'
  import { useZodForm } from '~/composables/useZodForm'
  import { useFormModal } from '~/composables/useFormModal'
  import {
    adminCharacteristicKeyFormSchema,
    adminCharacteristicKeyResolveSchema,
    adminCharacteristicKeyMergeSchema,
    type AdminCharacteristicKeyFormInput,
    type AdminCharacteristicKeyResolveInput,
    type AdminCharacteristicKeyMergeInput,
  } from '~/schemas/forms/product-characteristic'
  import { getErrorMessage } from '~/utils/errorHandler'

  definePageMeta({
    icon: 'categories',
    middleware: ['admin'],
    navLabel: 'Características de Produtos',
    navSubtitle: 'Padronize e unifique chaves de características',
    navColor: 'teal',
    navGroup: 'admin',
    navSubgroup: 'catalogs',
    navOrder: 35,
    roles: ['admin'],
    showIn: ['drawer', 'admin-shortcuts'],
  })

  useHead({ title: 'Gerenciar Características de Produtos' })

  const toast = useToast()
  const {
    fetchCharacteristicKeys,
    fetchAllOfficialCharacteristicKeys,
    fetchPendingCharacteristicKeys,
    createCharacteristicKey,
    updateCharacteristicKey,
    toggleCharacteristicKeyStatus,
    deleteCharacteristicKey,
    approvePendingCharacteristicKey,
    mergeCharacteristicKeys,
  } = useProductCharacteristics()

  const activeTab = ref<'active' | 'pending'>('active')
  const { currentPage, itemsPerPage, totalItems, totalPages, resetPage } = usePagination()
  const searchQuery = ref('')

  let searchTimeout: ReturnType<typeof setTimeout> | null = null
  const handleSearch = (val: string) => {
    searchQuery.value = val
    if (searchTimeout) clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => {
      resetPage()
      refreshActive()
    }, 400)
  }

  const {
    data: officialKeys,
    pending: isLoadingActive,
    refresh: refreshActive,
  } = useAsyncData(
    'characteristic-keys-admin-active',
    async () => {
      const result = await fetchCharacteristicKeys(
        currentPage.value,
        itemsPerPage.value,
        searchQuery.value,
      )
      totalItems.value = result.count
      return result.data
    },
    {
      watch: [currentPage, itemsPerPage],
      default: () => [] as ProductCharacteristicKeyWithStats[],
    },
  )

  const { data: pendingKeys, refresh: refreshPending } = useAsyncData(
    'characteristic-keys-admin-pending',
    async () => await fetchPendingCharacteristicKeys(),
    { default: () => [] as ProductCharacteristicKeyWithStats[] },
  )

  const { data: allOfficialKeys, refresh: refreshAllOfficial } = useAsyncData(
    'characteristic-keys-admin-all-official',
    async () => await fetchAllOfficialCharacteristicKeys(),
    { default: () => [] as ProductCharacteristicKeyRow[] },
  )

  const refreshAll = async () => {
    await Promise.all([refreshActive(), refreshPending(), refreshAllOfficial()])
  }

  // --- Add / Edit Official Key Modal ---
  const {
    isOpen: isModalOpen,
    isEditing,
    isSaving,
    error: saveError,
    openAdd: openAddKeyState,
    openEdit: openEditKeyState,
    close: closeModal,
    executeSave: executeKeySave,
  } = useFormModal<ProductCharacteristicKeyRow>()

  const {
    errors: saveErrors,
    defineField: defineSaveField,
    handleSubmit: handleSaveSubmit,
    resetForm: resetSaveForm,
  } = useZodForm(adminCharacteristicKeyFormSchema, {
    id: '',
    name: '',
    is_active: true,
  })

  const [name, nameProps] = defineSaveField('name')
  const [isActive, isActiveProps] = defineSaveField('is_active')

  const openAddModal = () =>
    openAddKeyState(() => {
      resetSaveForm({ values: { id: '', name: '', is_active: true } })
    })

  const openEditModal = (item: ProductCharacteristicKeyRow) =>
    openEditKeyState(item, () => {
      resetSaveForm({
        values: {
          id: item.id,
          name: item.name,
          is_active: item.is_active,
        },
      })
    })

  const saveCharacteristicKey = handleSaveSubmit(
    async (values: AdminCharacteristicKeyFormInput) => {
      await executeKeySave(async () => {
        if (isEditing.value && values.id) {
          await updateCharacteristicKey(values.id, {
            name: values.name,
            is_active: values.is_active,
          })
          toast.success('Chave de característica atualizada com sucesso!')
        } else {
          await createCharacteristicKey({
            name: values.name,
            is_active: values.is_active,
          })
          toast.success('Nova chave oficial cadastrada com sucesso!')
        }

        await refreshAll()
        closeModal()
      })
    },
  )

  // --- Toggle & Delete ---
  const toggleStatus = async (item: ProductCharacteristicKeyRow) => {
    try {
      await toggleCharacteristicKeyStatus(item)
      await refreshAll()
    } catch (e: unknown) {
      toast.error(getErrorMessage(e))
    }
  }

  const handleDeleteKey = async (item: ProductCharacteristicKeyWithStats) => {
    const usageWarning =
      item.usage_count > 0
        ? ` Atenção: ${item.usage_count} produto(s) possuem esta característica e perderão este vínculo se você não unificá-la antes.`
        : ''
    if (!confirm(`Tem certeza que deseja excluir a chave "${item.name}"?${usageWarning}`)) return
    try {
      await deleteCharacteristicKey(item.id)
      toast.success('Chave de característica excluída!')
      await refreshAll()
    } catch (e: unknown) {
      toast.error(getErrorMessage(e))
    }
  }

  // --- Resolve Pending Key Modal (Approve or Merge) ---
  const {
    isOpen: isResolveModalOpen,
    isSaving: isResolving,
    error: resolveError,
    target: targetPendingKey,
    openForTarget: openResolveTarget,
    close: closeResolveModal,
    executeSave: executeResolveSave,
  } = useFormModal<ProductCharacteristicKeyWithStats>()

  const {
    errors: resolveErrors,
    defineField: defineResolveField,
    handleSubmit: handleResolveSubmit,
    resetForm: resetResolveForm,
  } = useZodForm(adminCharacteristicKeyResolveSchema, {
    resolveMode: 'approve',
    newName: '',
    targetKeyId: '',
  })

  const [resolveMode, resolveModeProps] = defineResolveField('resolveMode')
  const [newName, newNameProps] = defineResolveField('newName')
  const [targetKeyId, targetKeyIdProps] = defineResolveField('targetKeyId')

  const openResolveModal = async (item: ProductCharacteristicKeyWithStats) =>
    await openResolveTarget(item, async () => {
      resetResolveForm({
        values: {
          resolveMode: 'approve',
          newName: item.name,
          targetKeyId: '',
        },
      })
      await refreshAllOfficial()
    })

  const submitResolve = handleResolveSubmit(async (values: AdminCharacteristicKeyResolveInput) => {
    if (!targetPendingKey.value) return
    await executeResolveSave(async () => {
      if (!targetPendingKey.value) return
      if (values.resolveMode === 'approve') {
        await approvePendingCharacteristicKey(targetPendingKey.value, values.newName || '')
        toast.success('Chave padronizada e aprovada com sucesso!')
      } else {
        await mergeCharacteristicKeys(targetPendingKey.value, values.targetKeyId || '')
        toast.success('Chave sugerida unificada na chave oficial com sucesso!')
      }

      await refreshAll()
      const { refreshAll: refreshPendingTasks } = usePendingTasks()
      await refreshPendingTasks()
      closeResolveModal()
    })
  })

  // --- Direct Unification Modal (Official Key -> Official Key) ---
  const {
    isOpen: isMergeModalOpen,
    isSaving: isMerging,
    error: mergeError,
    target: sourceMergeKey,
    openForTarget: openMergeTarget,
    close: closeMergeModal,
    executeSave: executeMergeSave,
  } = useFormModal<ProductCharacteristicKeyWithStats>()

  const {
    errors: mergeErrors,
    defineField: defineMergeField,
    handleSubmit: handleMergeSubmit,
    resetForm: resetMergeForm,
  } = useZodForm(adminCharacteristicKeyMergeSchema, {
    targetKeyId: '',
  })

  const [mergeTargetKeyId, mergeTargetKeyIdProps] = defineMergeField('targetKeyId')

  const availableMergeTargets = computed(() =>
    (allOfficialKeys.value || []).filter((k) => k.id !== sourceMergeKey.value?.id),
  )

  const openMergeModal = async (item: ProductCharacteristicKeyWithStats) =>
    await openMergeTarget(item, async () => {
      resetMergeForm({ values: { targetKeyId: '' } })
      await refreshAllOfficial()
    })

  const submitDirectMerge = handleMergeSubmit(async (values: AdminCharacteristicKeyMergeInput) => {
    if (!sourceMergeKey.value) return
    await executeMergeSave(async () => {
      if (!sourceMergeKey.value) return
      await mergeCharacteristicKeys(sourceMergeKey.value, values.targetKeyId)
      toast.success(`Chave "${sourceMergeKey.value.name}" unificada com sucesso!`)

      await refreshAll()
      closeMergeModal()
    })
  })
</script>

<template>
  <div>
    <PageHeader
      subtitle="Padronize e unifique as chaves de características dos produtos (ex: Cor, Ponta, Altura)"
      title="Características de Produtos"
    />

    <UiTabs v-model="activeTab" class="mb-5" color="primary" size="sm">
      <UiTab value="active">
        <UiIcon class="mr-2" name="categories" size="18" />
        Chaves Oficiais
      </UiTab>
      <UiTab value="pending">
        <UiIcon class="mr-2" name="time" size="18" />
        Pendentes de Padronização
        <UiBadge
          v-if="pendingKeys && pendingKeys.length > 0"
          class="ml-2"
          color="error"
          :content="pendingKeys.length"
          inline
        />
      </UiTab>
    </UiTabs>

    <!-- Aba Chaves Oficiais -->
    <div v-if="activeTab === 'active'">
      <UiCard>
        <template #header>
          <UiIcon class="mr-2" color="teal" name="categories" />
          Chaves Padronizadas
          <UiChip v-if="totalItems > 0" class="ml-2" label size="xs" variant="soft">
            {{ totalItems }}
          </UiChip>
          <UiSpacer />
          <UiInput
            v-model="searchQuery"
            clearable
            hide-details
            label="Buscar chave..."
            prepend-inner-icon="search"
            rounded="lg"
            size="sm"
            style="max-width: 260px"
            variant="outline"
            @update:model-value="handleSearch"
          />
          <div class="d-flex align-center gap-3">
            <UiActionButton
              action="refresh"
              :loading="isLoadingActive"
              tooltip="Atualizar lista"
              variant="soft"
              @click="refreshAll"
            />
            <UiButton color="primary" prepend-icon="add" @click="openAddModal">
              Nova Chave
            </UiButton>
          </div>
        </template>

        <UiTable
          :headers="[
            { text: 'Nome da Chave', value: 'name' },
            { text: 'Produtos Vinculados', value: 'usage_count', align: 'center' },
            { text: 'Status', value: 'is_active', align: 'center' },
            { text: 'Ações', value: 'actions', align: 'right' },
          ]"
          :items="officialKeys || []"
          :loading="isLoadingActive"
        >
          <template #item-name="{ item }">
            <span class="font-weight-bold text-body-1">{{ item.name }}</span>
          </template>

          <template #item-usage_count="{ item }">
            <UiChip
              :color="item.usage_count > 0 ? 'teal' : 'default'"
              label
              size="sm"
              variant="soft"
            >
              {{ item.usage_count }} {{ item.usage_count === 1 ? 'produto' : 'produtos' }}
            </UiChip>
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
            <div class="d-flex justify-end gap-2">
              <UiActionButton
                color="indigo"
                icon="transfer"
                tooltip="Unificar em outra chave oficial"
                @click="openMergeModal(item)"
              />
              <UiActionButton action="edit" tooltip="Editar chave" @click="openEditModal(item)" />
              <UiActionButton
                action="delete"
                tooltip="Excluir chave"
                @click="handleDeleteKey(item)"
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
          Chaves Sugeridas por Usuários
          <UiSpacer />
          <UiActionButton
            action="refresh"
            tooltip="Atualizar lista"
            variant="soft"
            @click="refreshAll"
          />
        </template>

        <UiTable
          :headers="[
            { text: 'Chave Sugerida', value: 'name' },
            { text: 'Produtos Vinculados', value: 'usage_count', align: 'center' },
            { text: 'Data da Sugestão', value: 'created_at' },
            { text: 'Ações', value: 'actions', align: 'right' },
          ]"
          :items="pendingKeys || []"
        >
          <template #item-name="{ item }">
            <UiChip color="warning" label size="sm" variant="soft">
              {{ item.name }}
            </UiChip>
          </template>

          <template #item-usage_count="{ item }">
            <UiChip color="info" label size="sm" variant="soft">
              {{ item.usage_count }} {{ item.usage_count === 1 ? 'produto' : 'produtos' }}
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
                Revisar / Unificar
              </UiButton>
              <UiActionButton
                action="delete"
                tooltip="Excluir chave pendente"
                @click="handleDeleteKey(item)"
              />
            </div>
          </template>

          <template #empty>
            <div class="text-center pa-6 text-medium-emphasis">
              <UiIcon class="mb-2" color="grey" name="success" size="36" />
              <div>Nenhuma chave de característica pendente de revisão.</div>
            </div>
          </template>
        </UiTable>
      </UiCard>
    </div>

    <!-- Modal Adicionar / Editar Chave Oficial -->
    <UiModal
      v-model="isModalOpen"
      :title="isEditing ? 'Editar Chave de Característica' : 'Nova Chave de Característica'"
    >
      <UiAlert v-if="saveError" class="mb-4" type="error">
        {{ saveError }}
      </UiAlert>

      <UiForm @submit.prevent="saveCharacteristicKey">
        <UiInput
          v-model="name"
          v-bind="nameProps"
          class="mb-3"
          :error-messages="saveErrors.name"
          label="Nome da Chave (ex: Cor, Ponta, Altura)"
          placeholder="Ex: Tipo de Ponta"
          required
          variant="outline"
        />

        <UiSwitch
          v-model="isActive"
          v-bind="isActiveProps"
          color="success"
          :error-messages="saveErrors.is_active"
          hide-details
          label="Chave Ativa para Seleção"
          size="sm"
        />
      </UiForm>

      <template #actions>
        <UiButton color="grey" variant="ghost" @click="closeModal"> Cancelar </UiButton>
        <UiButton color="primary" :loading="isSaving" @click="saveCharacteristicKey">
          Salvar
        </UiButton>
      </template>
    </UiModal>

    <!-- Modal Resolver Pendência (Aprovar / Unificar) -->
    <UiModal
      v-model="isResolveModalOpen"
      :title="`Revisar Chave Sugerida: ${targetPendingKey?.name || ''}`"
    >
      <UiAlert v-if="resolveError" class="mb-4" type="error">
        {{ resolveError }}
      </UiAlert>

      <div class="text-body-2 mb-4">
        Esta chave foi cadastrada durante o uso do sistema com o nome
        <strong>"{{ targetPendingKey?.name }}"</strong> e está presente em
        <strong>{{ targetPendingKey?.usage_count || 0 }} produto(s)</strong>.
      </div>

      <UiRadioGroup
        v-model="resolveMode"
        v-bind="resolveModeProps"
        class="mb-4"
        color="primary"
        :error-messages="resolveErrors.resolveMode"
      >
        <UiRadio label="Aprovar e Padronizar (tornar chave oficial no sistema)" value="approve" />
        <UiRadio
          label="Unificar em uma Chave Oficial já existente (ex: Tipo de ponta → Ponta)"
          value="merge"
        />
      </UiRadioGroup>

      <div v-if="resolveMode === 'approve'">
        <UiInput
          v-model="newName"
          v-bind="newNameProps"
          class="mb-2"
          :error-messages="resolveErrors.newName"
          label="Nome Oficial Padronizado"
          variant="outline"
        />
        <div class="text-caption text-medium-emphasis">
          Você pode ajustar a grafia antes de oficializar a chave.
        </div>
      </div>

      <div v-if="resolveMode === 'merge'">
        <UiAutocomplete
          v-model="targetKeyId"
          v-bind="targetKeyIdProps"
          class="mb-2"
          :error-messages="resolveErrors.targetKeyId"
          item-title="name"
          item-value="id"
          :items="allOfficialKeys || []"
          label="Selecione a Chave Oficial de Destino"
          placeholder="Busque pelo nome da chave oficial..."
          variant="outline"
        />
        <div class="text-caption text-medium-emphasis">
          Todos os produtos que usam "{{ targetPendingKey?.name }}" terão seus valores transferidos
          automaticamente para a chave oficial escolhida, e a chave duplicada será removida.
        </div>
      </div>

      <template #actions>
        <UiButton color="grey" variant="ghost" @click="closeResolveModal"> Cancelar </UiButton>
        <UiButton color="primary" :loading="isResolving" @click="submitResolve">
          {{ resolveMode === 'approve' ? 'Aprovar Chave' : 'Confirmar Unificação' }}
        </UiButton>
      </template>
    </UiModal>

    <!-- Modal Unificar Chave Oficial em Outra Chave Oficial -->
    <UiModal v-model="isMergeModalOpen" :title="`Unificar Chave: ${sourceMergeKey?.name || ''}`">
      <UiAlert v-if="mergeError" class="mb-4" type="error">
        {{ mergeError }}
      </UiAlert>

      <div class="text-body-2 mb-4">
        Selecione a chave oficial de destino na qual deseja unificar
        <strong>"{{ sourceMergeKey?.name }}"</strong> ({{ sourceMergeKey?.usage_count || 0 }}
        produto(s) vinculado(s)).
      </div>

      <UiAutocomplete
        v-model="mergeTargetKeyId"
        v-bind="mergeTargetKeyIdProps"
        class="mb-2"
        :error-messages="mergeErrors.targetKeyId"
        item-title="name"
        item-value="id"
        :items="availableMergeTargets"
        label="Chave Oficial de Destino"
        placeholder="Ex: Ponta"
        variant="outline"
      />

      <div class="text-caption text-medium-emphasis">
        Os valores de todos os produtos vinculados a "{{ sourceMergeKey?.name }}" serão migrados
        para a chave de destino selecionada e "{{ sourceMergeKey?.name }}" será removida.
      </div>

      <template #actions>
        <UiButton color="grey" variant="ghost" @click="closeMergeModal"> Cancelar </UiButton>
        <UiButton color="primary" :loading="isMerging" @click="submitDirectMerge">
          Confirmar Unificação
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>
