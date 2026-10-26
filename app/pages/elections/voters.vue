<script setup lang="ts">
  import { ref, computed, watch } from 'vue'
  import { useElectionVoters } from '~/composables/useElectionVoters'
  import { usePagination } from '~/composables/usePagination'
  import { usePermissions } from '~/composables/usePermissions'
  import { useToast } from '~/composables/useToast'
  import { formatDate } from '~/utils/formatters'
  import type { ElectionVoterRow } from '~/types/election-voter'
  import ElectionVoterFormModal from '~/components/elections/ElectionVoterFormModal.vue'
  import ElectionVoterCardModal from '~/components/elections/ElectionVoterCardModal.vue'

  definePageMeta({
    icon: 'contactDetails',
    middleware: ['elections'],
    layout: 'default',
    navLabel: 'Eleitores',
    navSubtitle: 'Cadastro e emissão de títulos eleitorais',
    navColor: 'teal',
    navGroup: 'elections',
    navOrder: 20,
    roles: ['admin', 'user-election', 'manager-election', 'admin-election'],
    showIn: ['drawer', 'home'],
  })

  useHead({
    title: 'Cadastro de Eleitores',
  })

  const { fetchVotersPaged, toggleVoterActive, deleteVoter } = useElectionVoters()
  const { canManageElections, canDeleteElections } = usePermissions()
  const toast = useToast()

  const { currentPage, itemsPerPage, totalItems, totalPages, resetPage } = usePagination(20)

  // Filters
  const searchQuery = ref('')
  const activeFilter = ref<'all' | 'active' | 'inactive'>('all')

  // Modals refs
  const formModalRef = ref<InstanceType<typeof ElectionVoterFormModal> | null>(null)
  const cardModalRef = ref<InstanceType<typeof ElectionVoterCardModal> | null>(null)

  // Selection state for batch operations
  const selectedVoterIds = ref<Set<string>>(new Set())
  const selectedVotersMap = ref<Map<string, ElectionVoterRow>>(new Map())

  // Safe delete modal state
  const isDeleteModalOpen = ref(false)
  const voterToDelete = ref<ElectionVoterRow | null>(null)
  const isDeleting = ref(false)

  // Status options for select
  const statusOptions = [
    { title: 'Todas as Situações', value: 'all' },
    { title: 'Apenas Ativos (Aptos)', value: 'active' },
    { title: 'Apenas Inativos', value: 'inactive' },
  ]

  // Data fetching
  const {
    data: votersResponse,
    pending,
    refresh,
  } = useAsyncData(
    'election-voters-list',
    async () => {
      const is_active = activeFilter.value === 'all' ? undefined : activeFilter.value === 'active'

      const result = await fetchVotersPaged({
        page: currentPage.value,
        limit: itemsPerPage.value,
        search: searchQuery.value,
        is_active,
        sortBy: 'name',
        sortOrder: 'asc',
      })

      totalItems.value = result.count
      return result
    },
    {
      watch: [currentPage, activeFilter, searchQuery],
    },
  )

  const voters = computed(() => votersResponse.value?.data || [])

  watch(
    () => votersResponse.value?.count,
    (cnt) => {
      if (typeof cnt === 'number') {
        totalItems.value = cnt
      }
    },
    { immediate: true },
  )

  watch([activeFilter, searchQuery], () => {
    resetPage()
  })

  // Selection helpers
  const isAllPageSelected = computed(() => {
    const list = voters.value
    if (list.length === 0) return false
    return list.every((v) => selectedVoterIds.value.has(v.id))
  })

  const isSomePageSelected = computed(() => {
    const list = voters.value
    if (list.length === 0) return false
    const some = list.some((v) => selectedVoterIds.value.has(v.id))
    return some && !isAllPageSelected.value
  })

  const toggleSelectVoter = (voter: ElectionVoterRow) => {
    const nextSet = new Set(selectedVoterIds.value)
    const nextMap = new Map(selectedVotersMap.value)

    if (nextSet.has(voter.id)) {
      nextSet.delete(voter.id)
      nextMap.delete(voter.id)
    } else {
      nextSet.add(voter.id)
      nextMap.set(voter.id, voter)
    }

    selectedVoterIds.value = nextSet
    selectedVotersMap.value = nextMap
  }

  const toggleSelectAllPage = () => {
    const nextSet = new Set(selectedVoterIds.value)
    const nextMap = new Map(selectedVotersMap.value)

    if (isAllPageSelected.value) {
      for (const v of voters.value) {
        nextSet.delete(v.id)
        nextMap.delete(v.id)
      }
    } else {
      for (const v of voters.value) {
        nextSet.add(v.id)
        nextMap.set(v.id, v)
      }
    }

    selectedVoterIds.value = nextSet
    selectedVotersMap.value = nextMap
  }

  const clearSelection = () => {
    selectedVoterIds.value = new Set()
    selectedVotersMap.value = new Map()
  }

  // Modals actions
  const openCreateModal = () => {
    formModalRef.value?.open()
  }

  const openEditModal = (voter: ElectionVoterRow) => {
    formModalRef.value?.open(voter)
  }

  const openCardModalSingle = (voter: ElectionVoterRow) => {
    cardModalRef.value?.open(voter)
  }

  const openCardModalBatch = () => {
    const selectedList = Array.from(selectedVotersMap.value.values())
    if (selectedList.length === 0) {
      toast.warning('Selecione ao menos um eleitor para emitir os títulos em lote.')
      return
    }
    cardModalRef.value?.open(selectedList)
  }

  const handleToggleActive = async (voter: ElectionVoterRow) => {
    try {
      await toggleVoterActive(voter.id, voter.is_active)
      toast.success(
        `Eleitor "${voter.name}" ${voter.is_active ? 'inativado' : 'ativado'} com sucesso!`,
      )
      await refresh()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao alterar situação do eleitor.'
      toast.error(msg)
    }
  }

  const openDeleteModal = (voter: ElectionVoterRow) => {
    voterToDelete.value = voter
    isDeleteModalOpen.value = true
  }

  const closeDeleteModal = () => {
    if (isDeleting.value) return
    isDeleteModalOpen.value = false
    voterToDelete.value = null
  }

  const handleConfirmDelete = async () => {
    if (!voterToDelete.value) return
    isDeleting.value = true
    try {
      await deleteVoter(voterToDelete.value.id)
      toast.success(`Eleitor "${voterToDelete.value.name}" removido com sucesso.`)
      // remove from selection if present
      if (selectedVoterIds.value.has(voterToDelete.value.id)) {
        selectedVoterIds.value.delete(voterToDelete.value.id)
        selectedVotersMap.value.delete(voterToDelete.value.id)
      }
      isDeleteModalOpen.value = false
      voterToDelete.value = null
      await refresh()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao excluir eleitor.'
      toast.error(msg)
    } finally {
      isDeleting.value = false
    }
  }

  const onVoterSaved = async () => {
    await refresh()
  }
</script>

<template>
  <UiContainer class="py-6" max-width="1400px">
    <!-- Cabeçalho da Página -->
    <UiPageHeader
      icon="contactDetails"
      subtitle="Gerenciamento de eleitores e emissão de títulos eleitorais"
      title="Cadastro de Eleitores"
    >
      <template #actions>
        <div class="d-flex align-center ga-3">
          <UiButton
            v-if="selectedVoterIds.size > 0"
            color="secondary"
            data-testid="btn-emit-batch-top"
            prepend-icon="printer"
            variant="solid"
            @click="openCardModalBatch"
          >
            Emitir Título em Lote ({{ selectedVoterIds.size }})
          </UiButton>
          <UiButton
            v-if="canManageElections()"
            color="primary"
            data-testid="btn-create-voter"
            prepend-icon="add"
            variant="solid"
            @click="openCreateModal"
          >
            Novo Eleitor
          </UiButton>
        </div>
      </template>
    </UiPageHeader>

    <!-- Cards de Métricas / KPI -->
    <UiRow class="g-4 mb-6">
      <!-- Total -->
      <UiCol cols="12" md="4" sm="6">
        <UiCard>
          <div class="d-flex align-center justify-space-between pa-4">
            <div>
              <div class="text-caption text-medium-emphasis font-weight-bold text-uppercase">
                Total de Eleitores
              </div>
              <div class="text-h4 font-weight-bold mt-1 text-primary">
                {{ totalItems }}
              </div>
              <div class="text-caption text-medium-emphasis mt-1">
                Registrados no cadastro eleitoral
              </div>
            </div>
            <UiAvatar color="primary" size="48" variant="soft">
              <UiIcon name="usersGroup" size="24" />
            </UiAvatar>
          </div>
        </UiCard>
      </UiCol>

      <!-- Selecionados para Emissão -->
      <UiCol cols="12" md="4" sm="6">
        <UiCard>
          <div class="d-flex align-center justify-space-between pa-4">
            <div>
              <div class="text-caption text-medium-emphasis font-weight-bold text-uppercase">
                Selecionados p/ Emissão
              </div>
              <div class="text-h4 font-weight-bold mt-1 text-teal">
                {{ selectedVoterIds.size }}
              </div>
              <div class="text-caption text-medium-emphasis mt-1">
                {{
                  selectedVoterIds.size > 0 ? 'Prontos para emissão em lote' : 'Nenhum selecionado'
                }}
              </div>
            </div>
            <UiAvatar color="teal" size="48" variant="soft">
              <UiIcon name="userBadge" size="24" />
            </UiAvatar>
          </div>
        </UiCard>
      </UiCol>

      <!-- Ações Rápidas -->
      <UiCol cols="12" md="4" sm="12">
        <UiCard>
          <div class="d-flex align-center justify-space-between pa-4">
            <div>
              <div class="text-caption text-medium-emphasis font-weight-bold text-uppercase">
                Emissão de Títulos
              </div>
              <div class="text-h6 font-weight-bold mt-1 text-high-emphasis">
                Individual e em Lote
              </div>
              <div class="text-caption text-medium-emphasis mt-1">
                Impressão oficial e PDF com guias de corte
              </div>
            </div>
            <UiAvatar color="secondary" size="48" variant="soft">
              <UiIcon name="printer" size="24" />
            </UiAvatar>
          </div>
        </UiCard>
      </UiCol>
    </UiRow>

    <!-- Card Principal com Tabela e Filtros -->
    <UiCard>
      <template #header>
        <div class="d-flex align-center ga-2">
          <UiIcon color="primary" name="recordsList" />
          <span class="font-weight-bold text-subtitle-1">Relação Geral de Eleitores</span>
          <UiChip v-if="totalItems > 0" class="ml-2" color="primary" size="xs" variant="soft">
            {{ totalItems }}
          </UiChip>
        </div>

        <UiSpacer />

        <!-- Barra de Ferramentas / Filtros -->
        <div class="d-flex align-center ga-2 flex-wrap">
          <UiInput
            v-model="searchQuery"
            clearable
            hide-details
            label="Buscar por nome ou título..."
            prepend-inner-icon="search"
            rounded="lg"
            size="sm"
            style="min-width: 240px; max-width: 320px"
            variant="outline"
          />

          <UiSelect
            v-model="activeFilter"
            hide-details
            item-title="title"
            item-value="value"
            :items="statusOptions"
            label="Situação"
            rounded="lg"
            size="sm"
            style="min-width: 180px; max-width: 220px"
            variant="outline"
          />

          <UiActionButton
            action="refresh"
            :loading="pending"
            tooltip="Atualizar lista"
            variant="soft"
            @click="refresh"
          />

          <UiButton
            v-if="canManageElections()"
            color="primary"
            prepend-icon="add"
            variant="solid"
            @click="openCreateModal"
          >
            Novo Eleitor
          </UiButton>
        </div>
      </template>

      <!-- Barra de Ações em Lote (Sticky) -->
      <div
        v-if="selectedVoterIds.size > 0"
        class="pa-3 px-4 bg-surface-variant border-bottom d-flex align-center justify-space-between flex-wrap ga-3"
      >
        <div class="d-flex align-center ga-2">
          <UiIcon color="primary" name="check" size="20" />
          <span class="font-weight-bold text-body-2">
            <strong>{{ selectedVoterIds.size }}</strong>
            {{ selectedVoterIds.size === 1 ? 'eleitor selecionado' : 'eleitores selecionados' }}
          </span>
          <UiButton color="default" size="xs" variant="ghost" @click="clearSelection">
            Limpar seleção
          </UiButton>
        </div>

        <div class="d-flex align-center ga-2">
          <UiButton
            color="primary"
            data-testid="btn-emit-batch"
            prepend-icon="printer"
            size="sm"
            variant="solid"
            @click="openCardModalBatch"
          >
            Emitir Títulos em Lote ({{ selectedVoterIds.size }})
          </UiButton>
        </div>
      </div>

      <!-- Tabela de Dados -->
      <UiTable
        :headers="[
          { text: '', value: 'select', width: 48, align: 'center' },
          { text: 'Nº do Título', value: 'voter_registration_number', width: 160 },
          { text: 'Nome do Eleitor', value: 'name' },
          { text: 'Situação', value: 'is_active', align: 'center', width: 140 },
          { text: 'Cadastrado em', value: 'created_at', width: 160 },
          { text: 'Ações', value: 'actions', align: 'right', width: 200 },
        ]"
        :items="voters as unknown as Array<Record<string, unknown>>"
        :loading="pending"
      >
        <!-- Header Checkbox -->
        <template #header-select>
          <div class="d-flex justify-center">
            <UiCheckbox
              :indeterminate="isSomePageSelected"
              :model-value="isAllPageSelected"
              @update:model-value="toggleSelectAllPage"
            />
          </div>
        </template>

        <!-- Item Checkbox -->
        <template #item-select="{ item }">
          <div class="d-flex justify-center">
            <UiCheckbox
              :model-value="selectedVoterIds.has((item as unknown as ElectionVoterRow).id)"
              @update:model-value="toggleSelectVoter(item as unknown as ElectionVoterRow)"
            />
          </div>
        </template>

        <!-- Nº do Título -->
        <template #item-voter_registration_number="{ item }">
          <span class="font-weight-bold font-monospace text-primary text-body-2">
            {{ (item as unknown as ElectionVoterRow).voter_registration_number }}
          </span>
        </template>

        <!-- Nome do Eleitor -->
        <template #item-name="{ item }">
          <div class="py-1">
            <span class="font-weight-medium text-body-2 text-high-emphasis">
              {{ (item as unknown as ElectionVoterRow).name }}
            </span>
          </div>
        </template>

        <!-- Situação -->
        <template #item-is_active="{ item }">
          <UiChip
            class="cursor-pointer"
            :color="(item as unknown as ElectionVoterRow).is_active ? 'success' : 'error'"
            size="xs"
            tooltip="Clique para alternar situação"
            variant="soft"
            @click="handleToggleActive(item as unknown as ElectionVoterRow)"
          >
            {{ (item as unknown as ElectionVoterRow).is_active ? 'REGULAR' : 'INATIVO' }}
          </UiChip>
        </template>

        <!-- Data de Cadastro -->
        <template #item-created_at="{ item }">
          <span class="text-caption text-medium-emphasis">
            {{ formatDate((item as unknown as ElectionVoterRow).created_at) }}
          </span>
        </template>

        <!-- Ações -->
        <template #item-actions="{ item }">
          <div class="d-flex align-center justify-end ga-1">
            <UiButton
              color="primary"
              data-testid="btn-emit-single"
              prepend-icon="printer"
              size="xs"
              tooltip="Emitir Título Eleitoral"
              variant="tonal"
              @click="openCardModalSingle(item as unknown as ElectionVoterRow)"
            >
              Emitir Título
            </UiButton>
            <UiActionButton
              v-if="canManageElections()"
              action="edit"
              tooltip="Editar eleitor"
              variant="ghost"
              @click="openEditModal(item as unknown as ElectionVoterRow)"
            />
            <UiActionButton
              v-if="canDeleteElections()"
              action="delete"
              tooltip="Remover eleitor"
              variant="ghost"
              @click="openDeleteModal(item as unknown as ElectionVoterRow)"
            />
          </div>
        </template>

        <!-- Empty State -->
        <template v-if="!voters.length && !pending" #empty>
          <div class="text-center py-8">
            <UiIcon class="mb-2 text-medium-emphasis" name="contactDetails" size="36" />
            <div class="text-body-1 font-weight-medium">Nenhum eleitor encontrado</div>
            <div class="text-caption text-medium-emphasis mb-3">
              {{
                searchQuery || activeFilter !== 'all'
                  ? 'Tente ajustar os filtros aplicados.'
                  : 'Cadastre o primeiro eleitor para começar.'
              }}
            </div>
            <UiButton
              v-if="canManageElections() && !searchQuery && activeFilter === 'all'"
              class="mt-2"
              color="primary"
              prepend-icon="add"
              variant="solid"
              @click="openCreateModal"
            >
              Cadastrar Eleitor
            </UiButton>
          </div>
        </template>
      </UiTable>

      <!-- Paginação -->
      <template v-if="totalPages > 1" #footer>
        <div class="d-flex align-center justify-space-between pa-4 border-top">
          <div class="text-caption text-medium-emphasis">
            Página {{ currentPage }} de {{ totalPages }} ({{ totalItems }} eleitores no total)
          </div>
          <div class="d-flex align-center ga-2">
            <UiButton
              :disabled="currentPage <= 1 || pending"
              size="sm"
              variant="outline"
              @click="currentPage--"
            >
              Anterior
            </UiButton>
            <UiButton
              :disabled="currentPage >= totalPages || pending"
              size="sm"
              variant="outline"
              @click="currentPage++"
            >
              Próxima
            </UiButton>
          </div>
        </div>
      </template>
    </UiCard>

    <!-- Modal de Cadastro / Edição -->
    <ElectionVoterFormModal ref="formModalRef" @saved="onVoterSaved" />

    <!-- Modal de Emissão do Título Eleitoral (Individual ou em Lote) -->
    <ElectionVoterCardModal ref="cardModalRef" />

    <!-- Modal de Exclusão -->
    <UiModal v-model="isDeleteModalOpen" max-width="480px" title="Confirmar Exclusão">
      <template #header>
        <div class="d-flex align-center ga-2 text-error">
          <UiIcon color="error" name="alert" size="24" />
          <span class="font-weight-bold text-h6">Remover Eleitor</span>
        </div>
      </template>

      <div class="py-2">
        <p class="text-body-1 mb-2">
          Deseja realmente remover o eleitor
          <strong>"{{ voterToDelete?.name }}"</strong> (Título:
          {{ voterToDelete?.voter_registration_number }})?
        </p>
        <UiAlert color="warning" size="sm" variant="soft">
          Esta operação removerá o cadastro do eleitor. Ele não poderá mais ser validado para votar
          em urnas eletrônicas.
        </UiAlert>
      </div>

      <template #actions>
        <UiButton :disabled="isDeleting" variant="ghost" @click="closeDeleteModal">
          Cancelar
        </UiButton>
        <UiButton color="error" :loading="isDeleting" variant="solid" @click="handleConfirmDelete">
          Confirmar Exclusão
        </UiButton>
      </template>
    </UiModal>
  </UiContainer>
</template>
