<script setup lang="ts">
  import { ref, watch } from 'vue'
  import { useElections } from '~/composables/useElections'
  import { usePagination } from '~/composables/usePagination'
  import { usePermissions } from '~/composables/usePermissions'
  import { useToast } from '~/composables/useToast'
  import {
    ELECTION_STATUS_LABELS,
    ELECTION_STATUS_COLORS,
    ELECTION_VOTING_MODE_LABELS,
    ELECTION_VOTING_MODE_COLORS,
  } from '~/constants/elections'
  import type {
    ElectionRow,
    ElectionStatus,
    ElectionVotingMode,
    ElectionTimelineFilter,
  } from '~/types/election'
  import ElectionFormModal from '~/components/elections/ElectionFormModal.vue'

  definePageMeta({
    icon: 'vote',
    middleware: ['elections'],
    layout: 'default',
    navLabel: 'Eleições',
    navSubtitle: 'Sistema de eleições e votação',
    navColor: 'indigo',
    navGroup: 'elections',
    navOrder: 10,
    roles: ['admin', 'user-election', 'manager-election', 'admin-election'],
    showIn: ['drawer', 'home'],
  })

  useHead({
    title: 'Dashboard de Eleições',
  })

  const { fetchElections, fetchElectionMetrics, deleteElection } = useElections()
  const { canManageElections, canDeleteElections } = usePermissions()
  const toast = useToast()

  const { currentPage, itemsPerPage, totalItems, totalPages, resetPage } = usePagination()

  const searchQuery = ref('')
  const statusFilter = ref<ElectionStatus | null>(null)
  const timelineFilter = ref<ElectionTimelineFilter>('all')

  const modalRef = ref<InstanceType<typeof ElectionFormModal> | null>(null)

  // Safe delete modal state
  const isDeleteModalOpen = ref(false)
  const electionToDelete = ref<ElectionRow | null>(null)
  const isDeleting = ref(false)

  // Fetch metrics for KPI cards
  const { data: metrics, refresh: refreshMetrics } = useAsyncData(
    'election-metrics',
    () => fetchElectionMetrics(),
    {
      default: () => ({ total: 0, active: 0, upcoming: 0, past: 0 }),
    },
  )

  // Fetch elections with filters & pagination
  const {
    data: elections,
    pending,
    refresh,
  } = useAsyncData(
    'elections-list',
    async () => {
      const result = await fetchElections({
        page: currentPage.value,
        limit: itemsPerPage.value,
        status: statusFilter.value,
        timeline: timelineFilter.value,
        search: searchQuery.value,
      })
      totalItems.value = result.count
      return result.data
    },
    {
      watch: [currentPage, statusFilter, timelineFilter, searchQuery],
    },
  )

  watch([statusFilter, timelineFilter, searchQuery], () => {
    resetPage()
  })

  const setTimelineFilter = (filter: ElectionTimelineFilter) => {
    if (timelineFilter.value === filter) {
      timelineFilter.value = 'all'
    } else {
      timelineFilter.value = filter
    }
  }

  const openCreateModal = () => {
    modalRef.value?.open()
  }

  const openEditModal = (election: ElectionRow) => {
    modalRef.value?.open(election)
  }

  const openDeleteModal = (election: ElectionRow) => {
    electionToDelete.value = election
    isDeleteModalOpen.value = true
  }

  const closeDeleteModal = () => {
    if (isDeleting.value) return
    isDeleteModalOpen.value = false
    electionToDelete.value = null
  }

  const handleConfirmDelete = async () => {
    if (!electionToDelete.value) return
    isDeleting.value = true
    try {
      await deleteElection(electionToDelete.value.id)
      toast.success(`Eleição "${electionToDelete.value.name}" removida com sucesso!`)
      isDeleteModalOpen.value = false
      electionToDelete.value = null
      await Promise.all([refresh(), refreshMetrics()])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao remover eleição.'
      toast.error(msg)
    } finally {
      isDeleting.value = false
    }
  }

  const handleSaved = async () => {
    await Promise.all([refresh(), refreshMetrics()])
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('pt-BR')
  }

  const statusOptions = [
    { title: 'Todas as Situações', value: null },
    { title: ELECTION_STATUS_LABELS.awaiting_release, value: 'awaiting_release' },
    { title: ELECTION_STATUS_LABELS.released, value: 'released' },
    { title: ELECTION_STATUS_LABELS.tallying, value: 'tallying' },
    { title: ELECTION_STATUS_LABELS.finished, value: 'finished' },
  ]
</script>

<template>
  <UiContainer class="py-6" max-width="1400px">
    <PageHeader
      icon="vote"
      subtitle="Acompanhamento e gestão de processos eleitorais"
      title="Dashboard de Eleições"
    >
      <template #actions>
        <div class="d-flex align-center ga-3">
          <UiButton
            v-if="canManageElections()"
            color="primary"
            prepend-icon="add"
            variant="solid"
            @click="openCreateModal"
          >
            Nova Eleição
          </UiButton>
        </div>
      </template>
    </PageHeader>

    <!-- Cards de KPI (Clicáveis para filtrar) -->
    <UiRow class="g-4 mb-6">
      <!-- Total -->
      <UiCol cols="12" md="3" sm="6">
        <UiCard
          class="cursor-pointer transition-all"
          :elevation="timelineFilter === 'all' ? 4 : 1"
          hover
          @click="setTimelineFilter('all')"
        >
          <div class="d-flex align-center justify-space-between pa-4">
            <div>
              <div class="text-caption text-medium-emphasis font-weight-bold text-uppercase">
                Todas as Eleições
              </div>
              <div class="text-h4 font-weight-bold mt-1 text-primary">
                {{ metrics?.total ?? 0 }}
              </div>
            </div>
            <UiAvatar color="primary" size="48" variant="soft">
              <UiIcon name="recordsList" size="24" />
            </UiAvatar>
          </div>
          <div
            v-if="timelineFilter === 'all'"
            class="bg-primary"
            style="height: 3px; width: 100%"
          />
        </UiCard>
      </UiCol>

      <!-- Ativas -->
      <UiCol cols="12" md="3" sm="6">
        <UiCard
          class="cursor-pointer transition-all"
          :elevation="timelineFilter === 'active' ? 4 : 1"
          hover
          @click="setTimelineFilter('active')"
        >
          <div class="d-flex align-center justify-space-between pa-4">
            <div>
              <div class="text-caption text-medium-emphasis font-weight-bold text-uppercase">
                Eleições Ativas
              </div>
              <div class="text-h4 font-weight-bold mt-1 text-success">
                {{ metrics?.active ?? 0 }}
              </div>
            </div>
            <UiAvatar color="success" size="48" variant="soft">
              <UiIcon name="vote" size="24" />
            </UiAvatar>
          </div>
          <div
            v-if="timelineFilter === 'active'"
            class="bg-success"
            style="height: 3px; width: 100%"
          />
        </UiCard>
      </UiCol>

      <!-- Próximas -->
      <UiCol cols="12" md="3" sm="6">
        <UiCard
          class="cursor-pointer transition-all"
          :elevation="timelineFilter === 'upcoming' ? 4 : 1"
          hover
          @click="setTimelineFilter('upcoming')"
        >
          <div class="d-flex align-center justify-space-between pa-4">
            <div>
              <div class="text-caption text-medium-emphasis font-weight-bold text-uppercase">
                Próximas Eleições
              </div>
              <div class="text-h4 font-weight-bold mt-1 text-warning">
                {{ metrics?.upcoming ?? 0 }}
              </div>
            </div>
            <UiAvatar color="warning" size="48" variant="soft">
              <UiIcon name="calendarOutline" size="24" />
            </UiAvatar>
          </div>
          <div
            v-if="timelineFilter === 'upcoming'"
            class="bg-warning"
            style="height: 3px; width: 100%"
          />
        </UiCard>
      </UiCol>

      <!-- Passadas -->
      <UiCol cols="12" md="3" sm="6">
        <UiCard
          class="cursor-pointer transition-all"
          :elevation="timelineFilter === 'past' ? 4 : 1"
          hover
          @click="setTimelineFilter('past')"
        >
          <div class="d-flex align-center justify-space-between pa-4">
            <div>
              <div class="text-caption text-medium-emphasis font-weight-bold text-uppercase">
                Eleições Passadas
              </div>
              <div class="text-h4 font-weight-bold mt-1 text-secondary">
                {{ metrics?.past ?? 0 }}
              </div>
            </div>
            <UiAvatar color="secondary" size="48" variant="soft">
              <UiIcon name="check" size="24" />
            </UiAvatar>
          </div>
          <div
            v-if="timelineFilter === 'past'"
            class="bg-secondary"
            style="height: 3px; width: 100%"
          />
        </UiCard>
      </UiCol>
    </UiRow>

    <!-- Card Principal com Tabela -->
    <UiCard>
      <template #header>
        <div class="d-flex align-center ga-2">
          <UiIcon color="primary" name="recordsList" />
          <span class="font-weight-bold text-subtitle-1">Processos Eleitorais</span>
          <UiChip v-if="totalItems > 0" class="ml-2" color="primary" size="xs" variant="soft">
            {{ totalItems }}
          </UiChip>
          <UiChip
            v-if="timelineFilter !== 'all'"
            class="ml-1"
            color="indigo"
            size="xs"
            variant="outline"
          >
            Filtro:
            {{
              timelineFilter === 'active'
                ? 'Ativas'
                : timelineFilter === 'upcoming'
                  ? 'Próximas'
                  : 'Passadas'
            }}
          </UiChip>
        </div>

        <UiSpacer />

        <!-- Barra de Ferramentas / Filtros -->
        <div class="d-flex align-center ga-2 flex-wrap">
          <UiInput
            v-model="searchQuery"
            clearable
            hide-details
            label="Buscar por nome..."
            prepend-inner-icon="search"
            rounded="lg"
            size="sm"
            style="min-width: 200px; max-width: 260px"
            variant="outline"
          />

          <UiSelect
            v-model="statusFilter"
            clearable
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
            Nova Eleição
          </UiButton>
        </div>
      </template>

      <!-- Tabela de Dados -->
      <UiTable
        :headers="[
          { text: 'Eleição', value: 'name' },
          { text: 'Data do Pleito', value: 'election_date' },
          { text: 'Modo de Votação', value: 'voting_mode', align: 'center' },
          { text: 'Dígitos', value: 'digits_count', align: 'center' },
          { text: 'Caixa Alta', value: 'is_uppercase', align: 'center' },
          { text: 'Situação', value: 'status', align: 'center' },
          { text: 'Ações', value: 'actions', align: 'right' },
        ]"
        :items="elections || []"
        :loading="pending"
      >
        <template v-if="!elections?.length && !pending" #empty>
          <div class="text-center py-6">
            <UiIcon class="mb-2 text-medium-emphasis" name="vote" size="36" />
            <div class="text-body-1 font-weight-medium">Nenhuma eleição encontrada</div>
            <div class="text-caption text-medium-emphasis mb-3">
              {{
                searchQuery || statusFilter || timelineFilter !== 'all'
                  ? 'Tente alterar os filtros aplicados.'
                  : 'Cadastre sua primeira eleição para começar.'
              }}
            </div>
            <UiButton
              v-if="
                canManageElections() && !searchQuery && !statusFilter && timelineFilter === 'all'
              "
              class="mt-2"
              color="primary"
              prepend-icon="add"
              variant="solid"
              @click="openCreateModal"
            >
              Cadastrar Eleição
            </UiButton>
          </div>
        </template>

        <!-- Nome da Eleição -->
        <template #item-name="{ item }">
          <div class="d-flex flex-column py-1">
            <NuxtLink
              class="font-weight-medium text-body-2 text-primary text-decoration-none cursor-pointer"
              :to="`/elections/${item.id}`"
            >
              {{ item.name }}
            </NuxtLink>
            <span v-if="item.description" class="text-caption text-medium-emphasis">
              {{ item.description }}
            </span>
          </div>
        </template>

        <!-- Data do Pleito -->
        <template #item-election_date="{ item }">
          <div class="d-flex align-center ga-1">
            <UiIcon class="text-medium-emphasis" name="calendar" size="14" />
            <span class="text-body-2">{{ formatDate(item.election_date) }}</span>
          </div>
        </template>

        <!-- Modo de Votação -->
        <template #item-voting_mode="{ item }">
          <div class="d-flex flex-column align-center ga-1">
            <UiChip
              :color="
                ELECTION_VOTING_MODE_COLORS[(item.voting_mode || 'simple') as ElectionVotingMode] ||
                'teal'
              "
              size="xs"
              variant="soft"
            >
              {{
                ELECTION_VOTING_MODE_LABELS[(item.voting_mode || 'simple') as ElectionVotingMode] ||
                'Simples'
              }}
            </UiChip>
            <UiChip
              v-if="item.is_anonymous === false"
              color="warning"
              label
              size="xs"
              variant="outline"
            >
              Nominal
            </UiChip>
          </div>
        </template>

        <!-- Quantidade de Dígitos -->
        <template #item-digits_count="{ item }">
          <UiChip color="primary" size="xs" variant="soft">
            {{ item.digits_count }} {{ item.digits_count === 1 ? 'dígito' : 'dígitos' }}
          </UiChip>
        </template>

        <!-- Modo Caixa Alta -->
        <template #item-is_uppercase="{ item }">
          <UiChip
            :color="item.is_uppercase ? 'indigo' : 'default'"
            size="xs"
            :variant="item.is_uppercase ? 'solid' : 'soft'"
          >
            {{ item.is_uppercase ? 'SIM' : 'NÃO' }}
          </UiChip>
        </template>

        <!-- Situação -->
        <template #item-status="{ item }">
          <UiChip
            :color="ELECTION_STATUS_COLORS[item.status as ElectionStatus] || 'primary'"
            size="xs"
            variant="soft"
          >
            {{ ELECTION_STATUS_LABELS[item.status as ElectionStatus] || item.status }}
          </UiChip>
        </template>

        <!-- Ações -->
        <template #item-actions="{ item }">
          <div class="d-flex align-center justify-end ga-1">
            <UiActionButton
              action="view"
              tooltip="Ver detalhes da eleição"
              variant="ghost"
              @click="navigateTo(`/elections/${item.id}`)"
            />
            <UiActionButton
              v-if="canManageElections()"
              action="edit"
              tooltip="Editar eleição"
              variant="ghost"
              @click="openEditModal(item)"
            />
            <UiActionButton
              v-if="canDeleteElections()"
              action="delete"
              tooltip="Remover eleição (safe delete)"
              variant="ghost"
              @click="openDeleteModal(item)"
            />
          </div>
        </template>
      </UiTable>

      <!-- Paginação -->
      <template v-if="totalPages > 1" #footer>
        <div class="d-flex align-center justify-space-between pa-4 border-top">
          <div class="text-caption text-medium-emphasis">
            Página {{ currentPage }} de {{ totalPages }} ({{ totalItems }} eleições no total)
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

    <!-- Modal de Criação / Edição -->
    <ElectionFormModal ref="modalRef" @saved="handleSaved" />

    <!-- Modal de Confirmação de Exclusão (Safe Delete) -->
    <UiModal v-model="isDeleteModalOpen" max-width="480px" title="Confirmar Exclusão">
      <template #header>
        <div class="d-flex align-center ga-2 text-error">
          <UiIcon color="error" name="alert" size="24" />
          <span class="font-weight-bold text-h6">Remover Eleição</span>
        </div>
        <UiSpacer />
        <UiButton icon="close" size="sm" variant="ghost" @click="closeDeleteModal" />
      </template>

      <div class="py-2">
        <p class="text-body-1 mb-2">
          Deseja realmente remover a eleição
          <strong>"{{ electionToDelete?.name }}"</strong>?
        </p>
        <UiAlert color="warning" size="sm" variant="soft">
          Esta operação utiliza o <strong>Safe Delete</strong> (exclusão lógica). O registro será
          arquivado e não aparecerá nas listagens operacionais do sistema.
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
