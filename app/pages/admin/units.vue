<script setup lang="ts">
  import type { UnitRow, UnitAliasRow } from '~/composables/useMeasurementUnits'
  import { useZodForm } from '~/composables/useZodForm'
  import {
    adminUnitFormSchema,
    adminUnitAliasFormSchema,
    adminUnitResolveSchema,
    type AdminUnitFormInput,
    type AdminUnitAliasFormInput,
    type AdminUnitResolveInput,
  } from '~/schemas/forms/admin-unit'

  definePageMeta({
    icon: 'balance',
    middleware: ['admin'],
    navLabel: 'Unidades de Medida',
    navSubtitle: 'Gerencie unidades e alias',
    navColor: 'warning',
    navGroup: 'admin',
    navOrder: 80,
    roles: ['admin'],
    showIn: ['drawer', 'admin-shortcuts'],
  })

  const {
    fetchUnits,
    createUnit,
    updateUnit,
    toggleUnitStatus,
    fetchAliases,
    createAliasAsAdmin,
    updateAliasAsAdmin,
    deleteAliasAsAdmin,
    approvePendingUnit,
    mergePendingUnit,
  } = useMeasurementUnits()

  const activeTab = ref('units')

  const {
    data: allUnits,
    pending: unitsPending,
    refresh: refreshUnits,
  } = useAsyncData('admin-units', fetchUnits)

  const {
    data: allAliases,
    pending: aliasesPending,
    refresh: refreshAliases,
  } = useAsyncData('admin-aliases', fetchAliases)

  const activeUnits = computed(
    () => allUnits.value?.filter((u) => u.is_active && !u.is_pending) || [],
  )
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const inactiveUnits = computed(
    () => allUnits.value?.filter((u) => !u.is_active && !u.is_pending) || [],
  )
  const pendingUnits = computed(() => allUnits.value?.filter((u) => u.is_pending) || [])

  // --- Unit Modal ---
  const isModalOpen = ref(false)
  const isEditing = ref(false)
  const isSaving = ref(false)
  const saveError = ref('')
  const {
    errors: saveErrors,
    defineField: defineSaveField,
    handleSubmit: handleSaveSubmit,
    resetForm: resetSaveForm,
  } = useZodForm(adminUnitFormSchema, { id: '', name: '', aliasIds: [], is_active: true })

  const [name, nameProps] = defineSaveField('name')
  const [aliasIds, aliasIdsProps] = defineSaveField('aliasIds')
  const [isActive, isActiveProps] = defineSaveField('is_active')

  const openAddModal = () => {
    resetSaveForm({ values: { id: '', name: '', aliasIds: [], is_active: true } })
    isEditing.value = false
    saveError.value = ''
    isModalOpen.value = true
  }

  const openEditModal = (unit: UnitRow) => {
    resetSaveForm({
      values: {
        id: unit.id,
        name: unit.name,
        aliasIds: unit.measurement_unit_aliases?.map((a) => a.id) || [],
        is_active: unit.is_active,
      },
    })
    isEditing.value = true
    saveError.value = ''
    isModalOpen.value = true
  }

  const closeModal = () => {
    isModalOpen.value = false
  }

  const saveUnit = handleSaveSubmit(async (values: AdminUnitFormInput) => {
    try {
      isSaving.value = true
      saveError.value = ''

      if (isEditing.value && values.id) {
        await updateUnit(values.id, {
          name: values.name,
          aliasIds: values.aliasIds,
          is_active: values.is_active,
        })
      } else {
        await createUnit({
          name: values.name,
          aliasIds: values.aliasIds,
          is_active: values.is_active,
        })
      }

      await refreshUnits()
      await refreshAliases()
      closeModal()
    } catch (e: unknown) {
      saveError.value = e instanceof Error ? e.message : String(e)
    } finally {
      isSaving.value = false
    }
  })

  const toggleStatus = async (unit: UnitRow) => {
    try {
      await toggleUnitStatus(unit)
      await refreshUnits()
    } catch (e) {
      console.error(e)
    }
  }

  // --- Alias Modal ---
  const isAliasModalOpen = ref(false)
  const isAliasEditing = ref(false)
  const {
    errors: aliasErrors,
    defineField: defineAliasField,
    handleSubmit: handleAliasSubmit,
    resetForm: resetAliasForm,
  } = useZodForm(adminUnitAliasFormSchema, { id: '', name: '', code: undefined })

  const [aliasCode, aliasCodeProps] = defineAliasField('code')
  const [aliasName, aliasNameProps] = defineAliasField('name')

  const openAddAliasModal = () => {
    resetAliasForm({ values: { id: '', name: '', code: undefined } })
    isAliasEditing.value = false
    saveError.value = ''
    isAliasModalOpen.value = true
  }

  const openEditAliasModal = (alias: UnitAliasRow) => {
    resetAliasForm({ values: { id: alias.id, code: alias.code, name: alias.name } })
    isAliasEditing.value = true
    saveError.value = ''
    isAliasModalOpen.value = true
  }

  const closeAliasModal = () => {
    isAliasModalOpen.value = false
  }

  const saveAlias = handleAliasSubmit(async (values: AdminUnitAliasFormInput) => {
    try {
      isSaving.value = true
      saveError.value = ''

      if (isAliasEditing.value && values.id) {
        await updateAliasAsAdmin(values.id, {
          code: values.code,
          name: values.name,
        })
      } else {
        await createAliasAsAdmin({
          code: values.code,
          name: values.name,
        })
      }

      await refreshAliases()
      closeAliasModal()
    } catch (e: unknown) {
      saveError.value = e instanceof Error ? e.message : String(e)
    } finally {
      isSaving.value = false
    }
  })

  const removeAlias = async (alias: UnitAliasRow) => {
    if (confirm(`Deseja excluir o registro alternativo "${alias.name}"?`)) {
      try {
        await deleteAliasAsAdmin(alias.id, alias.name)
        await refreshAliases()
      } catch (e: unknown) {
        alert(e instanceof Error ? e.message : String(e))
      }
    }
  }

  // --- Resolve Pending Modal ---
  const isResolveModalOpen = ref(false)
  const isResolving = ref(false)
  const resolveTarget = ref<UnitRow | null>(null)
  const {
    errors: resolveErrors,
    defineField: defineResolveField,
    handleSubmit: handleResolveSubmit,
    resetForm: resetResolveForm,
  } = useZodForm(adminUnitResolveSchema, {
    resolveMode: 'new',
    resolveNewName: '',
    resolveLinkUnitId: '',
  })

  const [resolveMode, resolveModeProps] = defineResolveField('resolveMode')
  const [resolveNewName, resolveNewNameProps] = defineResolveField('resolveNewName')
  const [resolveLinkUnitId, resolveLinkUnitIdProps] = defineResolveField('resolveLinkUnitId')
  const resolveError = ref('')

  const openResolveModal = (unit: UnitRow) => {
    resolveTarget.value = unit
    resetResolveForm({
      values: { resolveMode: 'new', resolveNewName: unit.name, resolveLinkUnitId: '' },
    })
    resolveError.value = ''
    isResolveModalOpen.value = true
  }

  const closeResolveModal = () => {
    isResolveModalOpen.value = false
    resolveTarget.value = null
  }

  const submitResolve = handleResolveSubmit(async (values: AdminUnitResolveInput) => {
    if (!resolveTarget.value) return

    try {
      isResolving.value = true
      resolveError.value = ''

      if (values.resolveMode === 'new' && values.resolveNewName) {
        await approvePendingUnit(resolveTarget.value, values.resolveNewName)
      } else if (values.resolveMode === 'link' && values.resolveLinkUnitId) {
        await mergePendingUnit(resolveTarget.value, values.resolveLinkUnitId)
      }

      await refreshUnits()
      closeResolveModal()
    } catch (e: unknown) {
      resolveError.value = e instanceof Error ? e.message : String(e)
    } finally {
      isResolving.value = false
    }
  })
</script>

<template>
  <div>
    <PageHeader subtitle="Gerencie unidades e registros alternativos" title="Unidades de Medida">
    </PageHeader>

    <UiTabs v-model="activeTab" class="mb-5" color="primary" density="compact">
      <UiTab value="units">
        <UiIcon class="mr-2" name="balance" size="18" />
        Unidades Oficiais
        <UiChip
          v-if="activeUnits.length"
          class="ml-2"
          color="primary"
          label
          size="xs"
          variant="soft"
        >
          {{ activeUnits.length }}
        </UiChip>
      </UiTab>
      <UiTab value="aliases">
        <UiIcon class="mr-2" name="categories" size="18" />
        Registros Alternativos
        <UiChip v-if="allAliases?.length" class="ml-2" label size="xs" variant="soft">
          {{ allAliases.length }}
        </UiChip>
      </UiTab>
    </UiTabs>

    <!-- Aba Unidades -->
    <div v-if="activeTab === 'units'">
      <!-- Pendentes -->
      <UiExpandTransition>
        <div v-if="pendingUnits && pendingUnits.length > 0" class="mb-4">
          <UiAlert
            border="start"
            color="warning"
            size="sm"
            icon="alert"
            rounded="xl"
            :title="`${pendingUnits.length} unidade(s) pendente(s) de revisão`"
            variant="soft"
          >
            <div class="mt-3 text-body-2 text-medium-emphasis mb-2">
              Usuários sugeriram as unidades abaixo ao não encontrarem um registro alternativo.
            </div>
            <div class="d-flex flex-column gap-2">
              <div
                v-for="unit in pendingUnits"
                :key="unit.id"
                class="d-flex align-center justify-space-between pa-3 rounded-lg bg-surface"
              >
                <div class="d-flex align-center gap-2">
                  <UiIcon color="warning" name="balance" size="18" />
                  <span class="text-body-2 font-weight-medium">{{ unit.name }}</span>
                </div>
                <UiButton
                  color="warning"
                  size="sm"
                  variant="soft"
                  @click="openResolveModal(unit)"
                >
                  Resolver
                </UiButton>
              </div>
            </div>
          </UiAlert>
        </div>
      </UiExpandTransition>

      <!-- Unidades Oficiais -->
      <UiCard>
        <template #header>
          <UiIcon class="mr-2" color="primary" name="balance" />
          Unidades de Medida Oficiais
          <UiSpacer />
          <UiButton
            class="mr-2"
            color="secondary"
            icon="refresh"
            :loading="unitsPending"
            size="sm"
            variant="soft"
            @click="refreshUnits"
          />
          <UiButton color="primary" prepend-icon="add" @click="openAddModal">Nova Unidade</UiButton>
        </template>

        <UiTable
          :headers="[
            { text: 'Nome da Unidade', value: 'name' },
            { text: 'Registros Alternativos', value: 'aliases' },
            { text: 'Status', value: 'is_active', align: 'center' },
            { text: 'Ações', value: 'actions', align: 'right' },
          ]"
          :items="activeUnits"
          :loading="unitsPending"
        >
          <template #item-aliases="{ item }">
            <div v-if="item.measurement_unit_aliases?.length > 0" class="d-flex flex-wrap gap-1">
              <UiChip
                v-for="alias in item.measurement_unit_aliases"
                :key="alias.id"
                color="info"
                size="sm"
                variant="soft"
              >
                {{ alias.name }} (Cód: {{ alias.code }})
              </UiChip>
            </div>
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
              color="primary"
              icon="editOutline"
              size="sm"
              variant="ghost"
              @click="openEditModal(item)"
            />
          </template>
        </UiTable>
      </UiCard>
    </div>

    <!-- Aba Aliases -->
    <div v-if="activeTab === 'aliases'">
      <UiCard>
        <template #header>
          <UiIcon class="mr-2" color="primary" name="categories" />
          Todos os Registros Alternativos
          <UiSpacer />
          <UiButton
            class="mr-2"
            color="secondary"
            icon="refresh"
            :loading="aliasesPending"
            size="sm"
            variant="soft"
            @click="refreshAliases"
          />
          <UiButton color="primary" prepend-icon="add" @click="openAddAliasModal"
            >Novo Registro</UiButton
          >
        </template>

        <UiTable
          :headers="[
            { text: 'Código', value: 'code' },
            { text: 'Nome / Descrição', value: 'name' },
            { text: 'Status', value: 'is_pending', align: 'center' },
            { text: 'Ações', value: 'actions', align: 'right' },
          ]"
          :items="allAliases || []"
          :loading="aliasesPending"
        >
          <template #item-is_pending="{ item }">
            <UiChip
              :color="item.is_pending ? 'warning' : 'success'"
              label
              size="sm"
              variant="soft"
            >
              {{ item.is_pending ? 'Pendente' : 'Ativo' }}
            </UiChip>
          </template>
          <template #item-actions="{ item }">
            <UiButton
              color="primary"
              icon="editOutline"
              size="sm"
              variant="ghost"
              @click="openEditAliasModal(item)"
            />
            <UiButton
              color="error"
              icon="deleteOutline"
              size="sm"
              variant="ghost"
              @click="removeAlias(item)"
            />
          </template>
        </UiTable>
      </UiCard>
    </div>

    <!-- Modal Form (Units) -->
    <UiModal
      v-model="isModalOpen"
      max-width="500px"
      :title="isEditing ? 'Editar Unidade' : 'Nova Unidade'"
    >
      <UiAlert v-if="saveError" class="mb-4" size="sm" type="error" variant="soft">
        {{ saveError }}
      </UiAlert>

      <UiInput
        v-model="name"
        v-bind="nameProps"
        :error-messages="saveErrors.name"
        label="Nome da Unidade (ex: Pacote)"
      />

      <UiAutocomplete
        v-model="aliasIds"
        v-bind="aliasIdsProps"
        chips
        closable-chips
        density="comfortable"
        :error-messages="saveErrors.aliasIds"
        :item-title="
          (item: Record<string, unknown>) => (item.code ? `${item.code} - ${item.name}` : item.name)
        "
        item-value="id"
        :items="allAliases || []"
        label="Vincular Registros Alternativos"
        multiple
        rounded="lg"
        variant="outlined"
      />

      <UiSwitch
        v-model="isActive"
        v-bind="isActiveProps"
        color="success"
        :error-messages="saveErrors.is_active"
        hint="Indica se a unidade está disponível para uso"
        label="Unidade Ativa"
        persistent-hint
      />

      <template #actions>
        <UiButton :disabled="isSaving" variant="ghost" @click="closeModal">Cancelar</UiButton>
        <UiButton color="primary" :loading="isSaving" variant="solid" @click="saveUnit"
          >Salvar</UiButton
        >
      </template>
    </UiModal>

    <!-- Modal Form (Aliases) -->
    <UiModal
      v-model="isAliasModalOpen"
      max-width="500px"
      :title="isAliasEditing ? 'Editar Registro Alternativo' : 'Novo Registro Alternativo'"
    >
      <UiAlert v-if="saveError" class="mb-4" size="sm" type="error" variant="soft">
        {{ saveError }}
      </UiAlert>

      <UiInput
        v-model.number="aliasCode"
        v-bind="aliasCodeProps"
        :error-messages="aliasErrors.code"
        label="Código (Numeral único)"
        type="number"
      />
      <UiInput
        v-model="aliasName"
        v-bind="aliasNameProps"
        :error-messages="aliasErrors.name"
        label="Nome / Descrição (ex: Pacote 500g)"
      />

      <template #actions>
        <UiButton :disabled="isSaving" variant="ghost" @click="closeAliasModal">Cancelar</UiButton>
        <UiButton color="primary" :loading="isSaving" variant="solid" @click="saveAlias"
          >Salvar</UiButton
        >
      </template>
    </UiModal>

    <!-- Modal Resolver Pendência -->
    <UiModal v-model="isResolveModalOpen" max-width="600px" title="Resolver Unidade Pendente">
      <UiAlert v-if="resolveError" class="mb-4" size="sm" type="error" variant="soft">
        {{ resolveError }}
      </UiAlert>

      <div class="pa-3 mb-4 rounded-lg bg-surface-variant d-flex align-center gap-3">
        <UiIcon color="warning" name="balance" />
        <div>
          <div class="text-caption text-medium-emphasis">Unidade Sugerida</div>
          <div class="text-subtitle-2 font-weight-bold text-warning">{{ resolveTarget?.name }}</div>
        </div>
      </div>

      <UiRadioGroup
        v-model="resolveMode"
        v-bind="resolveModeProps"
        class="mb-2"
        :error-messages="resolveErrors.resolveMode"
      >
        <UiRadio label="Aprovar como Nova Unidade Oficial" value="new" />
        <UiRadio label="Fundir (Merge) com Unidade Oficial Existente" value="link" />
      </UiRadioGroup>

      <UiSlideYTransition leave-absolute>
        <div v-if="resolveMode === 'new'" class="mt-2">
          <UiInput
            v-model="resolveNewName"
            v-bind="resolveNewNameProps"
            :error-messages="resolveErrors.resolveNewName"
            hint="Ajuste o nome oficial se necessário."
            label="Nome da Nova Unidade"
            persistent-hint
          />
        </div>
        <div v-else class="mt-2">
          <UiSelect
            v-model="resolveLinkUnitId"
            v-bind="resolveLinkUnitIdProps"
            :error-messages="resolveErrors.resolveLinkUnitId"
            item-title="name"
            item-value="id"
            :items="activeUnits"
            label="Selecione a unidade oficial correspondente"
          />
        </div>
      </UiSlideYTransition>

      <template #actions>
        <UiButton :disabled="isResolving" variant="ghost" @click="closeResolveModal"
          >Cancelar</UiButton
        >
        <UiButton color="primary" :loading="isResolving" variant="solid" @click="submitResolve">
          Confirmar
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>
