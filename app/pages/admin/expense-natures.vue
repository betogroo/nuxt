<script setup lang="ts">
  import type { expenseNatureRow } from '~/composables/useExpenseNatures'

  definePageMeta({
    middleware: ['admin'],
  })

  useHead({ title: 'Gerenciar Naturezas de Despesa' })

  const {
    fetchExpenseNatures,
    createExpenseNature,
    updateExpenseNature,
    toggleexpenseNaturestatus,
    approvePendingexpenseNature,
    mergePendingexpenseNature,
  } = useExpenseNatures()

  const { data: expenseNatures, pending, refresh } = useAsyncData('measurement-expenseNatures-admin', fetchExpenseNatures)

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
    id: string
    is_active: boolean
  }>({
    id: '',
    name: '',
    id: '',
    is_active: true,
  })

  const openAddModal = () => {
    form.value = {
      id: '',
      name: '',
      id: '',
      is_active: true,
    }
    isEditing.value = false
    saveError.value = ''
    isModalOpen.value = true
  }

  const openEditModal = (expenseNature: expenseNatureRow) => {
    form.value = {
      id: expenseNature.id,
      name: expenseNature.name,
      id: expenseNature.id || '',
      is_active: expenseNature.is_active,
    }
    isEditing.value = true
    saveError.value = ''
    isModalOpen.value = true
  }

  const closeModal = () => {
    isModalOpen.value = false
  }

  const saveexpenseNature = async () => {
    if (!form.value.name) {
      saveError.value = 'O Nome da Natureza é obrigatório.'
      return
    }

    isSaving.value = true
    saveError.value = ''

    try {
      const payload = {
        name: form.value.name,
        id: form.value.id || null,
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

  const toggleStatus = async (expenseNature: expenseNatureRow) => {
    try {
      await toggleexpenseNaturestatus(expenseNature)
      await refresh()
    } catch (e: unknown) {
      alert(`Erro ao alterar status: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  // --- RESOLVER SUGESTÕES DE UNIDADES PENDENTES ---
  const pendingexpenseNatures = computed(() => {
    return expenseNatures.value?.filter((u) => u.is_pending) || []
  })

  const activeexpenseNatures = computed(() => {
    return expenseNatures.value?.filter((u) => !u.is_pending && u.is_active) || []
  })

  const inactiveexpenseNatures = computed(() => {
    return expenseNatures.value?.filter((u) => !u.is_pending && !u.is_active) || []
  })

  const isResolveModalOpen = ref(false)
  const isResolving = ref(false)
  const resolveError = ref('')
  const resolveTarget = ref<expenseNatureRow | null>(null)
  const resolveMode = ref<'new' | 'link'>('new')
  const resolveLinkexpenseNatureId = ref('')
  const resolveNewName = ref('')

  const openResolveModal = (expenseNature: expenseNatureRow) => {
    resolveTarget.value = expenseNature
    resolveMode.value = 'new'
    resolveLinkexpenseNatureId.value = ''
    resolveNewName.value = expenseNature.name
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
      const targetexpenseNature = resolveTarget.value

      if (resolveMode.value === 'new') {
        if (!resolveNewName.value.trim()) {
          throw new Error('O nome da nova unidade é obrigatório.')
        }
        await approvePendingexpenseNature(targetexpenseNature, resolveNewName.value)
      } else {
        await mergePendingexpenseNature(targetexpenseNature, resolveLinkexpenseNatureId.value)
      }

      await refresh()
      await refreshNuxtData('pending-expenseNatures-count')

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
      title="Naturezas de Despesa"
    />

    <v-row>
      <v-col v-if="pendingexpenseNatures && pendingexpenseNatures.length > 0" cols="12">
        <UiCard title="Unidades Pendentes">
          <template #header>
            <div class="text-warning d-flex align-center">
              <v-icon class="mr-2">mdi-alert-circle</v-icon>
              Unidades Pendentes ({{ pendingexpenseNatures.length }})
            </div>
          </template>

          <UiAlert class="mb-4" density="compact" type="info" variant="tonal">
            Usuários sugeriram as unidades abaixo ao vincular a produtos. Resolva-as aprovando-as
            como oficiais ou fundindo-as com unidades existentes.
          </UiAlert>

          <UiTable
            :headers="[
              { text: 'Unidade Sugerida', value: 'name' },
              { text: 'Apelido (Se houver)', value: 'id' },
              { text: 'Ações', value: 'actions', align: 'right' },
            ]"
            :items="pendingexpenseNatures"
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
            <span class="text-subtitle-1 font-weight-bold">Naturezas de Despesa Oficiais</span>
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
              { text: 'Nome da Natureza', value: 'name' },
              { text: 'Apelido (Sistema Legado)', value: 'id' },
              { text: 'Status', value: 'is_active', align: 'center' },
              { text: 'Ações', value: 'actions', align: 'right' },
            ]"
            :items="activeexpenseNatures"
            :loading="pending"
          >
            <template #item-id="{ item }">
              <UiChip v-if="item.id" color="info" size="small" variant="tonal">
                {{ item.id }}
              </UiChip>
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

      <v-col v-if="inactiveexpenseNatures.length > 0" cols="12">
        <UiCard>
          <template #header>
            <span class="text-subtitle-1 font-weight-bold text-grey"
              >Naturezas de Despesa Desativadas</span
            >
          </template>

          <UiTable
            :headers="[
              { text: 'Nome da Natureza', value: 'name' },
              { text: 'Apelido (Sistema Legado)', value: 'id' },
              { text: 'Status', value: 'is_active', align: 'center' },
              { text: 'Ações', value: 'actions', align: 'right' },
            ]"
            :items="inactiveexpenseNatures"
            :loading="pending"
          >
            <template #item-id="{ item }">
              <UiChip v-if="item.id" color="info" size="small" variant="tonal">
                {{ item.id }}
              </UiChip>
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
      :title="isEditing ? 'Editar Natureza de Despesa' : 'Nova Natureza de Despesa'"
      transparent-header
    >
      <UiAlert v-if="saveError" class="mb-4" density="compact" type="error" variant="tonal">
        {{ saveError }}
      </UiAlert>

      <UiInput v-model="form.name" label="Nome da Natureza (ex: Pacote, Bisnaga 90g)" />
      <UiInput v-model="form.id" label="Apelido do Sistema Legado (opcional)" />

      <UiSwitch
        v-model="form.is_active"
        color="success"
        hint="Indica se a unidade está disponível para vínculos"
        label="Unidade Ativa"
        persistent-hint
      />

      <template #actions>
        <UiButton :disabled="isSaving" variant="text" @click="closeModal">Cancelar</UiButton>
        <UiButton color="primary" :loading="isSaving" @click="saveexpenseNature"> Salvar </UiButton>
      </template>
    </UiModal>

    <!-- Modal Resolve Suggestion -->
    <UiModal
      v-model="isResolveModalOpen"
      max-width="600px"
      title="Resolver Natureza de Despesa Pendente"
      transparent-header
    >
      <UiAlert v-if="resolveError" class="mb-4" density="compact" type="error" variant="tonal">
        {{ resolveError }}
      </UiAlert>

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
            v-model="resolveLinkexpenseNatureId"
            item-title="name"
            item-value="id"
            :items="activeexpenseNatures"
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
