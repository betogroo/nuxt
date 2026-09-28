<script setup lang="ts">
import type { UnitRow, UnitAliasRow } from '~/composables/useMeasurementUnits'

definePageMeta({
  middleware: ['auth', 'admin'],
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

const activeUnits = computed(() => allUnits.value?.filter((u) => u.is_active && !u.is_pending) || [])
const inactiveUnits = computed(() => allUnits.value?.filter((u) => !u.is_active && !u.is_pending) || [])
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
    aliasIds: unit.measurement_unit_aliases?.map(a => a.id) || [],
    is_active: unit.is_active,
  }
  isEditing.value = false
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
  } catch (e: any) {
    saveError.value = e.message || String(e)
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
    if (!aliasForm.value.name || aliasForm.value.code === null) throw new Error('Código e Nome são obrigatórios')

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
  } catch (e: any) {
    saveError.value = e.message || String(e)
  } finally {
    isSaving.value = false
  }
}

const removeAlias = async (alias: UnitAliasRow) => {
  if (confirm(`Deseja excluir o registro alternativo "${alias.name}"?`)) {
    try {
      await deleteAliasAsAdmin(alias.id, alias.name)
      await refreshAliases()
    } catch (e: any) {
      alert(e.message)
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
  } catch (e: any) {
    resolveError.value = e.message || String(e)
  } finally {
    isResolving.value = false
  }
}
</script>

<template>
  <div>
    <PageHeader subtitle="Gerencie unidades e registros alternativos" title="Unidades de Medida" />

    <v-tabs v-model="activeTab" class="mb-4" color="primary">
      <v-tab value="units">Unidades Oficiais</v-tab>
      <v-tab value="aliases">Registros Alternativos (Aliases)</v-tab>
    </v-tabs>

    <div class="mt-4">
      <div v-if="activeTab === 'units'">
        <v-row>
          <v-col v-if="pendingUnits && pendingUnits.length > 0" cols="12">
            <UiCard title="Unidades Pendentes">
              <template #header>
                <div class="text-warning d-flex align-center">
                  <v-icon class="mr-2">mdi-alert-circle</v-icon>
                  Unidades Pendentes ({{ pendingUnits.length }})
                </div>
              </template>

              <UiAlert class="mb-4" density="compact" type="info" variant="tonal">
                Usuários sugeriram as unidades abaixo ao não encontrarem um registro alternativo.
              </UiAlert>

              <UiTable
                :headers="[
                  { text: 'Unidade Sugerida', value: 'name' },
                  { text: 'Ações', value: 'actions', align: 'right' },
                ]"
                :items="pendingUnits"
              >
                <template #item-actions="{ item }">
                  <UiButton color="primary" size="small" variant="outlined" @click="openResolveModal(item)">
                    Resolver
                  </UiButton>
                </template>
              </UiTable>
            </UiCard>
          </v-col>

          <v-col cols="12">
            <UiCard>
              <template #header>
                <span class="text-subtitle-1 font-weight-bold">Unidades de Medida Oficiais</span>
                <v-spacer />
                <UiButton class="mr-2" color="secondary" icon="mdi-refresh" :loading="unitsPending" size="small" variant="tonal" @click="refreshUnits" />
                <UiButton color="primary" prepend-icon="mdi-plus" @click="openAddModal">
                  Nova Unidade
                </UiButton>
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
                  <div v-if="item.measurement_unit_aliases?.length > 0">
                    <UiChip v-for="alias in item.measurement_unit_aliases" :key="alias.id" color="info" size="small" variant="tonal" class="mr-1 mb-1">
                      {{ alias.name }} (Cód: {{ alias.code }})
                    </UiChip>
                  </div>
                  <span v-else class="text-grey">-</span>
                </template>
                <template #item-is_active="{ item }">
                  <UiChip
                    class="cursor-pointer"
                    :color="item.is_active ? 'success' : 'error'"
                    size="small"
                    variant="flat"
                    @click="toggleStatus(item)"
                  >
                    {{ item.is_active ? 'ATIVO' : 'INATIVO' }}
                  </UiChip>
                </template>
                <template #item-actions="{ item }">
                  <UiButton color="primary" icon="mdi-pencil" size="small" variant="text" @click="openEditModal(item)" />
                </template>
              </UiTable>
            </UiCard>
          </v-col>
        </v-row>
      </div>

      <div v-if="activeTab === 'aliases'">
        <UiCard>
          <template #header>
            <span class="text-subtitle-1 font-weight-bold">Todos os Registros Alternativos</span>
            <v-spacer />
            <UiButton class="mr-2" color="secondary" icon="mdi-refresh" :loading="aliasesPending" size="small" variant="tonal" @click="refreshAliases" />
            <UiButton color="primary" prepend-icon="mdi-plus" @click="openAddAliasModal">
              Novo Registro
            </UiButton>
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
              <UiChip :color="item.is_pending ? 'warning' : 'success'" size="small" variant="flat">
                {{ item.is_pending ? 'PENDENTE' : 'OK' }}
              </UiChip>
            </template>
            <template #item-actions="{ item }">
              <UiButton color="primary" icon="mdi-pencil" size="small" variant="text" @click="openEditAliasModal(item)" />
              <UiButton color="error" icon="mdi-delete" size="small" variant="text" @click="removeAlias(item)" />
            </template>
          </UiTable>
        </UiCard>
      </div>
    </div>

    <!-- Modal Form (Units) -->
    <UiModal v-model="isModalOpen" max-width="500px" :title="isEditing ? 'Editar Unidade' : 'Nova Unidade'" transparent-header>
      <UiAlert v-if="saveError" class="mb-4" density="compact" type="error" variant="tonal">{{ saveError }}</UiAlert>

      <UiInput v-model="form.name" label="Nome da Unidade (ex: Pacote)" />
      
      <v-autocomplete
        v-model="form.aliasIds"
        :items="allAliases || []"
        item-title="name"
        item-value="id"
        label="Vincular Registros Alternativos (Aliases)"
        multiple
        chips
        closable-chips
        variant="outlined"
      >
        <template #item="{ props, item }">
          <v-list-item v-bind="props" :title="`${item.raw.code} - ${item.raw.name}`"></v-list-item>
        </template>
      </v-autocomplete>

      <UiSwitch v-model="form.is_active" color="success" hint="Indica se a unidade está disponível" label="Unidade Ativa" persistent-hint />

      <template #actions>
        <UiButton :disabled="isSaving" variant="text" @click="closeModal">Cancelar</UiButton>
        <UiButton color="primary" :loading="isSaving" @click="saveUnit">Salvar</UiButton>
      </template>
    </UiModal>

    <!-- Modal Form (Aliases) -->
    <UiModal v-model="isAliasModalOpen" max-width="500px" :title="isAliasEditing ? 'Editar Registro Alternativo' : 'Novo Registro Alternativo'" transparent-header>
      <UiAlert v-if="saveError" class="mb-4" density="compact" type="error" variant="tonal">{{ saveError }}</UiAlert>

      <UiInput v-model.number="aliasForm.code" label="Código (Numeral único)" type="number" />
      <UiInput v-model="aliasForm.name" label="Nome / Descrição (ex: Pacote 500g)" />

      <template #actions>
        <UiButton :disabled="isSaving" variant="text" @click="closeAliasModal">Cancelar</UiButton>
        <UiButton color="primary" :loading="isSaving" @click="saveAlias">Salvar</UiButton>
      </template>
    </UiModal>

    <!-- Modal Resolve Suggestion -->
    <UiModal v-model="isResolveModalOpen" max-width="600px" title="Resolver Unidade Pendente" transparent-header>
      <UiAlert v-if="resolveError" class="mb-4" density="compact" type="error" variant="tonal">{{ resolveError }}</UiAlert>

      <div class="text-subtitle-1 mb-4">
        Unidade Sugerida: <strong class="text-warning">{{ resolveTarget?.name }}</strong>
      </div>

      <v-radio-group v-model="resolveMode">
        <v-radio label="Aprovar como Nova Unidade Oficial" value="new" />
        <v-radio label="Fundir (Merge) com Unidade Oficial Existente" value="link" />
      </v-radio-group>

      <v-slide-y-transition leave-absolute>
        <div v-if="resolveMode === 'new'" class="mt-2">
          <UiInput v-model="resolveNewName" hint="Ajustar o nome oficial se necessário." label="Nome da Nova Unidade" persistent-hint />
        </div>
        <div v-else class="mt-4">
          <UiSelect v-model="resolveLinkUnitId" item-title="name" item-value="id" :items="activeUnits" label="Selecione a unidade oficial correspondente" />
        </div>
      </v-slide-y-transition>

      <template #actions>
        <UiButton :disabled="isResolving" variant="text" @click="closeResolveModal">Cancelar</UiButton>
        <UiButton color="primary" :loading="isResolving" @click="submitResolve">Confirmar</UiButton>
      </template>
    </UiModal>
  </div>
</template>
