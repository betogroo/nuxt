<script setup lang="ts">
  import type { UnitRow } from '~/composables/useMeasurementUnits'

  definePageMeta({
    middleware: ['admin'],
  })

  useHead({ title: 'Gerenciar Unidades de Medida' })

  const {
    fetchUnits,
    createUnit,
    updateUnit,
    toggleUnitStatus,
    approvePendingUnit,
    mergePendingUnit,
  } = useMeasurementUnits()

  const { data: units, pending, refresh } = useAsyncData('measurement-units-admin', fetchUnits)

  onMounted(() => {
    refresh()
  })

  // Modal State
  const isModalOpen = ref(false)
  const isEditing = ref(false)
  const isSaving = ref(false)
  const saveError = ref('')

  const form = ref<{
    id: string
    name: string
    legacy_alias: string
    is_active: boolean
  }>({
    id: '',
    name: '',
    legacy_alias: '',
    is_active: true,
  })

  const openAddModal = () => {
    form.value = {
      id: '',
      name: '',
      legacy_alias: '',
      is_active: true,
    }
    isEditing.value = false
    saveError.value = ''
    isModalOpen.value = true
  }

  const openEditModal = (unit: UnitRow) => {
    form.value = {
      id: unit.id,
      name: unit.name,
      legacy_alias: unit.legacy_alias || '',
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
    if (!form.value.name) {
      saveError.value = 'O nome da unidade é obrigatório.'
      return
    }

    isSaving.value = true
    saveError.value = ''

    try {
      const payload = {
        name: form.value.name,
        legacy_alias: form.value.legacy_alias || null,
        is_active: form.value.is_active,
      }

      if (isEditing.value) {
        await updateUnit(form.value.id, payload)
      } else {
        await createUnit(payload)
      }

      await refresh()
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
      await refresh()
    } catch (e: unknown) {
      alert(`Erro ao alterar status: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  // --- RESOLVER SUGESTÕES DE UNIDADES PENDENTES ---
  const pendingUnits = computed(() => {
    return units.value?.filter((u) => u.is_pending) || []
  })

  const activeUnits = computed(() => {
    return units.value?.filter((u) => !u.is_pending && u.is_active) || []
  })

  const inactiveUnits = computed(() => {
    return units.value?.filter((u) => !u.is_pending && !u.is_active) || []
  })

  const isResolveModalOpen = ref(false)
  const isResolving = ref(false)
  const resolveError = ref('')
  const resolveTarget = ref<UnitRow | null>(null)
  const resolveMode = ref<'new' | 'link'>('new')
  const resolveLinkUnitId = ref('')
  const resolveNewName = ref('')

  const openResolveModal = (unit: UnitRow) => {
    resolveTarget.value = unit
    resolveMode.value = 'new'
    resolveLinkUnitId.value = ''
    resolveNewName.value = unit.name
    resolveError.value = ''
    isResolveModalOpen.value = true
  }

  const closeResolveModal = () => {
    isResolveModalOpen.value = false
  }

  const submitResolve = async () => {
    if (!resolveTarget.value) return
    isResolving.value = true
    resolveError.value = ''

    try {
      const targetUnit = resolveTarget.value

      if (resolveMode.value === 'new') {
        if (!resolveNewName.value.trim()) {
          throw new Error('O nome da nova unidade é obrigatório.')
        }
        await approvePendingUnit(targetUnit, resolveNewName.value)
      } else {
        await mergePendingUnit(targetUnit, resolveLinkUnitId.value)
      }

      await refresh()
      await refreshNuxtData('pending-units-count')

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
      subtitle="Gerencie unidades e resolva unidades sugeridas"
      title="Unidades de Medida"
    />

    <v-row>
      <v-col v-if="pendingUnits && pendingUnits.length > 0" cols="12">
        <UiCard title="Unidades Pendentes">
          <template #header>
            <div class="text-warning d-flex align-center">
              <v-icon class="mr-2">mdi-alert-circle</v-icon>
              Unidades Pendentes ({{ pendingUnits.length }})
            </div>
          </template>

          <v-alert class="mb-4" density="compact" type="info" variant="tonal">
            Usuários sugeriram as unidades abaixo ao vincular a produtos. Resolva-as aprovando-as
            como oficiais ou fundindo-as com unidades existentes.
          </v-alert>

          <UiTable
            :headers="[
              { text: 'Unidade Sugerida', value: 'name' },
              { text: 'Apelido (Se houver)', value: 'legacy_alias' },
              { text: 'Ações', value: 'actions', align: 'right' },
            ]"
            :items="pendingUnits"
          >
            <template #item-actions="{ item }">
              <UiButton
                color="primary"
                size="small"
                variant="outlined"
                @click="openResolveModal(item)"
              >
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
              Nova Unidade
            </UiButton>
          </template>

          <UiTable
            :headers="[
              { text: 'Nome da Unidade', value: 'name' },
              { text: 'Apelido (Sistema Legado)', value: 'legacy_alias' },
              { text: 'Status', value: 'is_active', align: 'center' },
              { text: 'Ações', value: 'actions', align: 'right' },
            ]"
            :items="activeUnits"
            :loading="pending"
          >
            <template #item-legacy_alias="{ item }">
              <v-chip v-if="item.legacy_alias" color="info" size="small" variant="tonal">
                {{ item.legacy_alias }}
              </v-chip>
              <span v-else class="text-grey">-</span>
            </template>
            <template #item-is_active="{ item }">
              <v-chip
                class="cursor-pointer"
                :color="item.is_active ? 'success' : 'error'"
                size="small"
                variant="flat"
                @click="toggleStatus(item)"
              >
                {{ item.is_active ? 'ATIVO' : 'INATIVO' }}
              </v-chip>
            </template>
            <template #item-actions="{ item }">
              <UiButton
                color="primary"
                icon="mdi-pencil"
                size="small"
                variant="text"
                @click="openEditModal(item)"
              />
            </template>
          </UiTable>
        </UiCard>
      </v-col>

      <v-col v-if="inactiveUnits.length > 0" cols="12">
        <UiCard>
          <template #header>
            <span class="text-subtitle-1 font-weight-bold text-grey"
              >Unidades de Medida Desativadas</span
            >
          </template>

          <UiTable
            :headers="[
              { text: 'Nome da Unidade', value: 'name' },
              { text: 'Apelido (Sistema Legado)', value: 'legacy_alias' },
              { text: 'Status', value: 'is_active', align: 'center' },
              { text: 'Ações', value: 'actions', align: 'right' },
            ]"
            :items="inactiveUnits"
            :loading="pending"
          >
            <template #item-legacy_alias="{ item }">
              <v-chip v-if="item.legacy_alias" color="info" size="small" variant="tonal">
                {{ item.legacy_alias }}
              </v-chip>
              <span v-else class="text-grey">-</span>
            </template>
            <template #item-is_active="{ item }">
              <v-chip
                class="cursor-pointer"
                :color="item.is_active ? 'success' : 'error'"
                size="small"
                variant="flat"
                @click="toggleStatus(item)"
              >
                {{ item.is_active ? 'ATIVO' : 'INATIVO' }}
              </v-chip>
            </template>
            <template #item-actions="{ item }">
              <UiButton
                color="primary"
                icon="mdi-pencil"
                size="small"
                variant="text"
                @click="openEditModal(item)"
              />
            </template>
          </UiTable>
        </UiCard>
      </v-col>
    </v-row>

    <!-- Modal Form -->
    <UiModal
      v-model="isModalOpen"
      max-width="500px"
      :title="isEditing ? 'Editar Unidade' : 'Nova Unidade'"
      transparent-header
    >
      <v-alert v-if="saveError" class="mb-4" density="compact" type="error" variant="tonal">
        {{ saveError }}
      </v-alert>

      <UiInput v-model="form.name" label="Nome da Unidade (ex: Pacote, Bisnaga 90g)" />
      <UiInput v-model="form.legacy_alias" label="Apelido do Sistema Legado (opcional)" />

      <UiSwitch
        v-model="form.is_active"
        color="success"
        hint="Indica se a unidade está disponível para vínculos"
        label="Unidade Ativa"
        persistent-hint
      />

      <template #actions>
        <UiButton :disabled="isSaving" variant="text" @click="closeModal">Cancelar</UiButton>
        <UiButton color="primary" :loading="isSaving" @click="saveUnit"> Salvar </UiButton>
      </template>
    </UiModal>

    <!-- Modal Resolve Suggestion -->
    <UiModal
      v-model="isResolveModalOpen"
      max-width="600px"
      title="Resolver Unidade Pendente"
      transparent-header
    >
      <v-alert v-if="resolveError" class="mb-4" density="compact" type="error" variant="tonal">
        {{ resolveError }}
      </v-alert>

      <div class="text-subtitle-1 mb-4">
        Unidade Sugerida: <strong class="text-warning">{{ resolveTarget?.name }}</strong>
      </div>

      <v-radio-group v-model="resolveMode">
        <v-radio label="Aprovar como Nova Unidade Oficial" value="new" />
        <v-radio label="Fundir (Merge) com Unidade Oficial Existente" value="link" />
      </v-radio-group>

      <v-slide-y-transition leave-absolute>
        <div v-if="resolveMode === 'new'" class="mt-2">
          <UiInput
            v-model="resolveNewName"
            hint="Você pode ajustar o texto digitado pelo usuário para o padrão oficial."
            label="Nome da Nova Unidade"
            persistent-hint
          />
        </div>
        <div v-else class="mt-4">
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
        <UiButton color="primary" :loading="isResolving" @click="submitResolve">
          Confirmar
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>
