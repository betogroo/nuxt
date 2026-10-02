<script setup lang="ts">
  import type { UnitRow, UnitAliasRow } from '~/composables/useMeasurementUnits'

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
  const form = ref({
    id: '',
    name: '',
    aliasIds: [] as string[],
    is_active: true,
  })

  const openAddModal = () => {
    form.value = { id: '', name: '', aliasIds: [], is_active: true }
    isEditing.value = false
    saveError.value = ''
    isModalOpen.value = true
  }

  const openEditModal = (unit: UnitRow) => {
    form.value = {
      id: unit.id,
      name: unit.name,
      aliasIds: unit.measurement_unit_aliases?.map((a) => a.id) || [],
      is_active: unit.is_active,
    }
    isEditing.value = true
    saveError.value = ''
    isModalOpen.value = true
  }

  const closeModal = () => {
    isModalOpen.value = false
  }

  const saveUnit = async () => {
    try {
      isSaving.value = true
      saveError.value = ''
      if (!form.value.name) throw new Error('Nome é obrigatório')

      if (isEditing.value) {
        await updateUnit(form.value.id, {
          name: form.value.name,
          aliasIds: form.value.aliasIds,
          is_active: form.value.is_active,
        })
      } else {
        await createUnit({
          name: form.value.name,
          aliasIds: form.value.aliasIds,
          is_active: form.value.is_active,
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
  }

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
  const aliasForm = ref({ id: '', code: null as number | null, name: '' })

  const openAddAliasModal = () => {
    aliasForm.value = { id: '', code: null, name: '' }
    isAliasEditing.value = false
    saveError.value = ''
    isAliasModalOpen.value = true
  }

  const openEditAliasModal = (alias: UnitAliasRow) => {
    aliasForm.value = { id: alias.id, code: alias.code, name: alias.name }
    isAliasEditing.value = true
    saveError.value = ''
    isAliasModalOpen.value = true
  }

  const closeAliasModal = () => {
    isAliasModalOpen.value = false
  }

  const saveAlias = async () => {
    try {
      isSaving.value = true
      saveError.value = ''
      if (!aliasForm.value.name || aliasForm.value.code === null)
        throw new Error('Código e Nome são obrigatórios')

      if (isAliasEditing.value) {
        await updateAliasAsAdmin(aliasForm.value.id, {
          code: aliasForm.value.code,
          name: aliasForm.value.name,
        })
      } else {
        await createAliasAsAdmin({
          code: aliasForm.value.code,
          name: aliasForm.value.name,
        })
      }

      await refreshAliases()
      closeAliasModal()
    } catch (e: unknown) {
      saveError.value = e instanceof Error ? e.message : String(e)
    } finally {
      isSaving.value = false
    }
  }

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
  const resolveMode = ref<'new' | 'link'>('new')
  const resolveNewName = ref('')
  const resolveLinkUnitId = ref<string | null>(null)
  const resolveError = ref('')

  const openResolveModal = (unit: UnitRow) => {
    resolveTarget.value = unit
    resolveMode.value = 'new'
    resolveNewName.value = unit.name
    resolveLinkUnitId.value = null
    resolveError.value = ''
    isResolveModalOpen.value = true
  }

  const closeResolveModal = () => {
    isResolveModalOpen.value = false
    resolveTarget.value = null
  }

  const submitResolve = async () => {
    try {
      isResolving.value = true
      resolveError.value = ''

      if (!resolveTarget.value) return

      if (resolveMode.value === 'new') {
        await approvePendingUnit(resolveTarget.value, resolveNewName.value)
      } else {
        if (!resolveLinkUnitId.value) throw new Error('Selecione uma unidade para vincular')
        await mergePendingUnit(resolveTarget.value, resolveLinkUnitId.value)
      }

      await refreshUnits()
      await refreshAliases()
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
    <PageHeader subtitle="Gerencie unidades e registros alternativos" title="Unidades de Medida">
    </PageHeader>

    <v-tabs v-model="activeTab" class="mb-5" color="primary" density="compact">
      <v-tab value="units">
        <UiIcon class="mr-2" name="balance" size="18" />
        Unidades Oficiais
        <UiChip
          v-if="activeUnits.length"
          class="ml-2"
          color="primary"
          label
          size="x-small"
          variant="tonal"
        >
          {{ activeUnits.length }}
        </UiChip>
      </v-tab>
      <v-tab value="aliases">
        <UiIcon class="mr-2" name="categories" size="18" />
        Registros Alternativos
        <UiChip v-if="allAliases?.length" class="ml-2" label size="x-small" variant="tonal">
          {{ allAliases.length }}
        </UiChip>
      </v-tab>
    </v-tabs>

    <!-- Aba Unidades -->
    <div v-if="activeTab === 'units'">
      <!-- Pendentes -->
      <v-expand-transition>
        <div v-if="pendingUnits && pendingUnits.length > 0" class="mb-4">
          <v-alert
            border="start"
            color="warning"
            density="compact"
            icon="alert"
            rounded="xl"
            :title="`${pendingUnits.length} unidade(s) pendente(s) de revisão`"
            variant="tonal"
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
                  size="small"
                  variant="tonal"
                  @click="openResolveModal(unit)"
                >
                  Resolver
                </UiButton>
              </div>
            </div>
          </v-alert>
        </div>
      </v-expand-transition>

      <!-- Unidades Oficiais -->
      <UiCard>
        <template #header>
          <UiIcon class="mr-2" color="primary" name="balance" />
          Unidades de Medida Oficiais
          <v-spacer />
          <UiButton
            class="mr-2"
            color="secondary"
            icon="refresh"
            :loading="unitsPending"
            size="small"
            variant="tonal"
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
                size="small"
                variant="tonal"
              >
                {{ alias.name }} (Cód: {{ alias.code }})
              </UiChip>
            </div>
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
              color="primary"
              icon="editOutline"
              size="small"
              variant="text"
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
          <v-spacer />
          <UiButton
            class="mr-2"
            color="secondary"
            icon="refresh"
            :loading="aliasesPending"
            size="small"
            variant="tonal"
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
              size="small"
              variant="tonal"
            >
              {{ item.is_pending ? 'Pendente' : 'Ativo' }}
            </UiChip>
          </template>
          <template #item-actions="{ item }">
            <UiButton
              color="primary"
              icon="editOutline"
              size="small"
              variant="text"
              @click="openEditAliasModal(item)"
            />
            <UiButton
              color="error"
              icon="deleteOutline"
              size="small"
              variant="text"
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
      <UiAlert v-if="saveError" class="mb-4" density="compact" type="error" variant="tonal">
        {{ saveError }}
      </UiAlert>

      <UiInput v-model="form.name" label="Nome da Unidade (ex: Pacote)" />

      <v-autocomplete
        v-model="form.aliasIds"
        chips
        closable-chips
        density="comfortable"
        :item-title="(item) => (item.code ? `${item.code} - ${item.name}` : item.name)"
        item-value="id"
        :items="allAliases || []"
        label="Vincular Registros Alternativos"
        multiple
        rounded="lg"
        variant="outlined"
      />

      <UiSwitch
        v-model="form.is_active"
        color="success"
        hint="Indica se a unidade está disponível para uso"
        label="Unidade Ativa"
        persistent-hint
      />

      <template #actions>
        <UiButton :disabled="isSaving" variant="text" @click="closeModal">Cancelar</UiButton>
        <UiButton color="primary" :loading="isSaving" variant="flat" @click="saveUnit"
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
      <UiAlert v-if="saveError" class="mb-4" density="compact" type="error" variant="tonal">
        {{ saveError }}
      </UiAlert>

      <UiInput v-model.number="aliasForm.code" label="Código (Numeral único)" type="number" />
      <UiInput v-model="aliasForm.name" label="Nome / Descrição (ex: Pacote 500g)" />

      <template #actions>
        <UiButton :disabled="isSaving" variant="text" @click="closeAliasModal">Cancelar</UiButton>
        <UiButton color="primary" :loading="isSaving" variant="flat" @click="saveAlias"
          >Salvar</UiButton
        >
      </template>
    </UiModal>

    <!-- Modal Resolver Pendência -->
    <UiModal v-model="isResolveModalOpen" max-width="600px" title="Resolver Unidade Pendente">
      <UiAlert v-if="resolveError" class="mb-4" density="compact" type="error" variant="tonal">
        {{ resolveError }}
      </UiAlert>

      <div class="pa-3 mb-4 rounded-lg bg-surface-variant d-flex align-center gap-3">
        <UiIcon color="warning" name="balance" />
        <div>
          <div class="text-caption text-medium-emphasis">Unidade Sugerida</div>
          <div class="text-subtitle-2 font-weight-bold text-warning">{{ resolveTarget?.name }}</div>
        </div>
      </div>

      <v-radio-group v-model="resolveMode" class="mb-2">
        <v-radio label="Aprovar como Nova Unidade Oficial" value="new" />
        <v-radio label="Fundir (Merge) com Unidade Oficial Existente" value="link" />
      </v-radio-group>

      <v-slide-y-transition leave-absolute>
        <div v-if="resolveMode === 'new'" class="mt-2">
          <UiInput
            v-model="resolveNewName"
            hint="Ajuste o nome oficial se necessário."
            label="Nome da Nova Unidade"
            persistent-hint
          />
        </div>
        <div v-else class="mt-2">
          <UiSelect
            v-model="resolveLinkUnitId"
            item-title="name"
            item-value="id"
            :items="activeUnits"
            label="Selecione a unidade oficial correspondente"
          />
        </div>
      </v-slide-y-transition>

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
