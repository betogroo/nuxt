<script setup lang="ts">
  import { ref, computed, onMounted, onUnmounted } from 'vue'
  import { useSchoolIncidents } from '~/composables/useSchoolIncidents'
  import { usePermissions } from '~/composables/usePermissions'
  import { useRowSelection } from '~/composables/useRowSelection'
  import { useRealtimeChannel } from '~/composables/useRealtimeChannel'
  import { SCHOOL_INCIDENT_STATUS_MAP } from '~/constants/school-incidents'
  import type { SchoolIncident, SchoolIncidentStatus } from '~/types/school'
  import SchoolIncidentFormModal from '~/components/schools/SchoolIncidentFormModal.vue'

  definePageMeta({
    middleware: ['schools'],
    layout: 'default',
    icon: 'alert',
    navLabel: 'Ocorrências',
    navSubtitle: 'Registro e acompanhamento de ocorrências escolares',
    navGroup: 'schools',
    navOrder: 2,
    roles: ['admin', 'school-manager', 'school-user'],
    showIn: ['drawer'],
  })

  useHead({
    title: 'Ocorrências Escolares - Módulo Escola',
  })

  const { canViewAllSchoolIncidents } = usePermissions()
  const { incidents, isLoading, fetchIncidents } = useSchoolIncidents()
  const { subscribeToPostgresChanges, removeRealtimeChannel } = useRealtimeChannel()
  const route = useRoute()

  const searchQuery = ref('')
  const selectedStatusFilter = ref<string>('all')

  const isFormModalOpen = ref(false)

  const openFormModal = () => {
    isFormModalOpen.value = true
  }

  const unreadCount = computed(() => (incidents.value || []).filter((i) => !i.read_at).length)

  const filteredIncidents = computed(() => {
    let list = incidents.value || []

    if (selectedStatusFilter.value === 'unread') {
      list = list.filter((item) => !item.read_at)
    } else if (selectedStatusFilter.value !== 'all') {
      list = list.filter((item) => item.status === selectedStatusFilter.value)
    }

    if (searchQuery.value.trim()) {
      const q = searchQuery.value.trim().toLowerCase()
      list = list.filter((item) => {
        const titleMatch = item.title.toLowerCase().includes(q)
        const descMatch = item.description.toLowerCase().includes(q)
        const participantMatch = item.participants?.some(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            (p.classroom && p.classroom.toLowerCase().includes(q)),
        )
        const authorMatch = item.author?.name?.toLowerCase().includes(q)
        return titleMatch || descMatch || participantMatch || authorMatch
      })
    }

    return list
  })

  // Seleção de linhas padronizada
  const {
    isRowSelected,
    toggleSelectRow,
    toggleSelectAllPage,
    isAllPageSelected,
    isSomePageSelected,
  } = useRowSelection(filteredIncidents)

  const tableHeaders = computed(() => {
    const headers = [
      { text: '', value: 'select', width: 48, align: 'center' as const },
      { text: 'Título da Ocorrência', value: 'title', align: 'left' as const },
      { text: 'Ofensores', value: 'offenders', align: 'left' as const },
      { text: 'Vítimas', value: 'victims', align: 'left' as const },
      { text: 'Status', value: 'status', align: 'center' as const, width: 130 },
      { text: 'Leitura', value: 'read', align: 'center' as const, width: 120 },
    ]

    if (canViewAllSchoolIncidents()) {
      headers.push({ text: 'Autor', value: 'author', align: 'left' as const, width: 150 })
    }

    headers.push(
      { text: 'Data', value: 'created_at', align: 'right' as const, width: 130 },
      { text: 'Ações', value: 'actions', align: 'right' as const, width: 100 },
    )

    return headers
  })

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  let realtimeChannel: ReturnType<typeof subscribeToPostgresChanges> | null = null

  onMounted(() => {
    fetchIncidents().catch(() => {})

    if (route.query.new === '1' || route.query.new === 'true') {
      openFormModal()
    }

    realtimeChannel = subscribeToPostgresChanges('school-incidents-realtime', [
      {
        event: '*',
        schema: 'public',
        table: 'school_incidents',
        callback: () => {
          fetchIncidents().catch(() => {})
        },
      },
      {
        event: '*',
        schema: 'public',
        table: 'school_incident_participants',
        callback: () => {
          fetchIncidents().catch(() => {})
        },
      },
    ])
  })

  onUnmounted(() => {
    if (realtimeChannel) {
      removeRealtimeChannel(realtimeChannel)
    }
  })
</script>

<template>
  <div class="d-flex flex-column gap-6">
    <!-- Cabeçalho da Página -->
    <UiPageHeader
      subtitle="Registro, acompanhamento e gestão de ocorrências envolvendo alunos"
      title="Ocorrências Escolares"
    >
      <template #actions>
        <UiButton
          color="primary"
          prepend-icon="add"
          size="md"
          variant="solid"
          @click="openFormModal"
        >
          Nova Ocorrência
        </UiButton>
      </template>
    </UiPageHeader>

    <!-- Barra de Filtros e Busca -->
    <UiCard border class="pa-4" elevation="0" rounded="xl">
      <UiRow align="center" dense>
        <UiCol cols="12" lg="5" md="6">
          <UiTextField
            v-model="searchQuery"
            clearable
            density="compact"
            hide-details
            placeholder="Buscar por título, aluno, sala ou autor..."
            prepend-inner-icon="search"
            variant="outline"
          />
        </UiCol>

        <UiCol cols="12" lg="7" md="6">
          <div class="d-flex flex-wrap align-center justify-end gap-2">
            <UiChip
              class="cursor-pointer"
              :color="selectedStatusFilter === 'all' ? 'primary' : 'neutral'"
              size="sm"
              :variant="selectedStatusFilter === 'all' ? 'solid' : 'outline'"
              @click="selectedStatusFilter = 'all'"
            >
              Todas ({{ incidents.length }})
            </UiChip>
            <UiChip
              class="cursor-pointer"
              :color="selectedStatusFilter === 'unread' ? 'warning' : 'neutral'"
              size="sm"
              :variant="selectedStatusFilter === 'unread' ? 'solid' : 'outline'"
              @click="selectedStatusFilter = 'unread'"
            >
              Não Lidas ({{ unreadCount }})
            </UiChip>
            <UiChip
              class="cursor-pointer"
              :color="selectedStatusFilter === 'new' ? 'info' : 'neutral'"
              size="sm"
              :variant="selectedStatusFilter === 'new' ? 'solid' : 'outline'"
              @click="selectedStatusFilter = 'new'"
            >
              Novas
            </UiChip>
            <UiChip
              class="cursor-pointer"
              :color="selectedStatusFilter === 'under_review' ? 'warning' : 'neutral'"
              size="sm"
              :variant="selectedStatusFilter === 'under_review' ? 'solid' : 'outline'"
              @click="selectedStatusFilter = 'under_review'"
            >
              Em Análise
            </UiChip>
            <UiChip
              class="cursor-pointer"
              :color="selectedStatusFilter === 'in_progress' ? 'primary' : 'neutral'"
              size="sm"
              :variant="selectedStatusFilter === 'in_progress' ? 'solid' : 'outline'"
              @click="selectedStatusFilter = 'in_progress'"
            >
              Em Andamento
            </UiChip>
            <UiChip
              class="cursor-pointer"
              :color="selectedStatusFilter === 'resolved' ? 'success' : 'neutral'"
              size="sm"
              :variant="selectedStatusFilter === 'resolved' ? 'solid' : 'outline'"
              @click="selectedStatusFilter = 'resolved'"
            >
              Resolvidas
            </UiChip>
          </div>
        </UiCol>
      </UiRow>
    </UiCard>

    <!-- Tabela de Ocorrências -->
    <UiCard border elevation="0" rounded="xl">
      <UiTable
        :headers="tableHeaders"
        :items="filteredIncidents as unknown as Record<string, unknown>[]"
        :loading="isLoading"
      >
        <!-- Checkbox de Cabeçalho -->
        <template #header-select>
          <UiCheckbox
            :indeterminate="isSomePageSelected"
            :model-value="isAllPageSelected"
            size="sm"
            @update:model-value="toggleSelectAllPage"
          />
        </template>

        <!-- Checkbox de Linha -->
        <template #item-select="{ item }">
          <UiCheckbox
            :model-value="isRowSelected(String(item.id))"
            size="sm"
            @update:model-value="toggleSelectRow(String(item.id))"
          />
        </template>

        <!-- Título -->
        <template #item-title="{ item }">
          <div class="py-1">
            <NuxtLink
              class="font-weight-medium text-body-2 text-decoration-none text-primary hover-underline"
              :to="`/schools/incidents/${item.id}`"
            >
              {{ item.title }}
            </NuxtLink>
            <div class="text-caption text-medium-emphasis text-truncate" style="max-width: 320px">
              {{ item.description }}
            </div>
          </div>
        </template>

        <!-- Ofensores -->
        <template #item-offenders="{ item }">
          <div class="d-flex flex-wrap gap-1 py-1">
            <UiChip
              v-for="off in ((item.participants as SchoolIncident['participants']) || []).filter(
                (p) => p.role === 'offender',
              )"
              :key="off.id"
              color="warning"
              size="xs"
              variant="soft"
            >
              @{{ off.name }}
              <span v-if="off.classroom" class="ml-1 opacity-75">({{ off.classroom }})</span>
            </UiChip>
          </div>
        </template>

        <!-- Vítimas -->
        <template #item-victims="{ item }">
          <div class="d-flex flex-wrap gap-1 py-1">
            <template
              v-if="
                ((item.participants as SchoolIncident['participants']) || []).filter(
                  (p) => p.role === 'victim',
                ).length > 0
              "
            >
              <UiChip
                v-for="vic in ((item.participants as SchoolIncident['participants']) || []).filter(
                  (p) => p.role === 'victim',
                )"
                :key="vic.id"
                color="info"
                size="xs"
                variant="soft"
              >
                /{{ vic.name }}
                <span v-if="vic.classroom" class="ml-1 opacity-75">({{ vic.classroom }})</span>
              </UiChip>
            </template>
            <span v-else class="text-caption text-medium-emphasis">-</span>
          </div>
        </template>

        <!-- Status -->
        <template #item-status="{ item }">
          <UiChip
            :color="
              SCHOOL_INCIDENT_STATUS_MAP[item.status as SchoolIncidentStatus]?.color || 'neutral'
            "
            size="xs"
            :variant="
              SCHOOL_INCIDENT_STATUS_MAP[item.status as SchoolIncidentStatus]?.variant || 'soft'
            "
          >
            <UiIcon
              class="mr-1"
              :name="
                SCHOOL_INCIDENT_STATUS_MAP[item.status as SchoolIncidentStatus]?.icon ||
                'clockAlert'
              "
              size="12"
            />
            {{
              SCHOOL_INCIDENT_STATUS_MAP[item.status as SchoolIncidentStatus]?.label || item.status
            }}
          </UiChip>
        </template>

        <!-- Leitura -->
        <template #item-read="{ item }">
          <UiChip
            v-if="item.read_at"
            color="success"
            size="xs"
            :title="`Lida em ${formatDateTime(String(item.read_at))}${(item.reader as SchoolIncident['reader'])?.name ? ` por ${(item.reader as SchoolIncident['reader'])?.name}` : ''}`"
            variant="soft"
          >
            <UiIcon class="mr-1" name="check" size="12" />
            Lida
          </UiChip>
          <UiChip v-else color="warning" size="xs" variant="outline">
            <UiIcon class="mr-1" name="clockAlert" size="12" />
            Não Lida
          </UiChip>
        </template>

        <!-- Autor (apenas para Gestores e Admin) -->
        <template #item-author="{ item }">
          <span class="text-caption">
            {{ (item.author as SchoolIncident['author'])?.name || 'Não informado' }}
          </span>
        </template>

        <!-- Data -->
        <template #item-created_at="{ item }">
          <span class="text-caption text-medium-emphasis">
            {{ formatDate(String(item.created_at)) }}
          </span>
        </template>

        <!-- Ações -->
        <template #item-actions="{ item }">
          <UiButton
            color="primary"
            prepend-icon="eye"
            size="xs"
            :to="`/schools/incidents/${item.id}`"
            variant="ghost"
          >
            Abrir
          </UiButton>
        </template>

        <!-- Estado Vazio -->
        <template #empty>
          <div class="d-flex flex-column align-center gap-3 py-6">
            <span class="text-body-2 text-medium-emphasis"> Nenhuma ocorrência encontrada. </span>
            <UiButton
              color="primary"
              prepend-icon="add"
              size="sm"
              variant="solid"
              @click="openFormModal"
            >
              Cadastrar Primeira Ocorrência
            </UiButton>
          </div>
        </template>
      </UiTable>
    </UiCard>

    <!-- Modal de Formulário (Nova Ocorrência) -->
    <SchoolIncidentFormModal v-model="isFormModalOpen" @saved="fetchIncidents" />
  </div>
</template>
