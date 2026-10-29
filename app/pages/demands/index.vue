<script setup lang="ts">
  import type { DemandRow } from '~/composables/useDemands'
  import { createEmptyDemandDashboardSummary } from '~/composables/useDemands'
  import type { IconName } from '~/components/ui/icons'
  import { useZodForm } from '~/composables/useZodForm'
  import { demandFormSchema } from '~/schemas/forms/demand'
  import { formatDate, formatDemandType } from '~/utils/formatters'
  import {
    type DemandStatus,
    formatDemandStatus,
    getDemandStatusColor,
    getDemandStatusFilterOptions,
  } from '~/utils/demandStatus'

  definePageMeta({
    icon: 'recordsList',
    middleware: ['uge'],
    navLabel: 'Demandas',
    navSubtitle: 'Painel e gestão de processos e demandas de compras',
    navColor: 'primary',
    navGroup: 'management',
    navOrder: 10,
    roles: ['admin', 'uge'],
    showIn: ['drawer', 'home'],
  })
  useHead({ title: 'Dashboard de Demandas' })

  const { profile } = useProfile()
  const { isAdmin, canEditDemand, canDeleteDemand } = usePermissions()
  const toast = useToast()

  const { fetchDemands, fetchDemandDashboardSummary, createDemand, updateDemand, deleteDemand } =
    useDemands()
  const route = useRoute()

  const { currentPage, itemsPerPage, totalItems, totalPages, resetPage } = usePagination()
  const statusFilter = ref<string | null>((route.query.filter as string) || null)
  const typeFilter = ref<string | null>(null)
  const searchQuery = ref('')

  const isDeleteModalOpen = ref(false)
  const demandToDelete = ref<DemandRow | null>(null)
  const isDeleting = ref(false)

  const openDeleteModal = (demand: DemandRow) => {
    demandToDelete.value = demand
    isDeleteModalOpen.value = true
  }

  const closeDeleteModal = () => {
    if (isDeleting.value) return
    isDeleteModalOpen.value = false
    demandToDelete.value = null
  }

  const { data: dashboardSummaryData, refresh: refreshSummary } = useAsyncData(
    'demands-dashboard-summary',
    fetchDemandDashboardSummary,
    {
      default: () => createEmptyDemandDashboardSummary(),
    },
  )

  const summary = computed(() => dashboardSummaryData.value || createEmptyDemandDashboardSummary())

  const {
    data: demands,
    pending,
    refresh: refreshList,
  } = useAsyncData(
    'demands-list',
    async () => {
      const result = await fetchDemands(
        currentPage.value,
        itemsPerPage.value,
        statusFilter.value,
        searchQuery.value,
        typeFilter.value,
      )
      totalItems.value = result.count
      return result.data
    },
    {
      watch: [currentPage, statusFilter, typeFilter, searchQuery],
    },
  )

  const refresh = async () => {
    await Promise.all([refreshList(), refreshSummary()])
  }

  watch([statusFilter, typeFilter, searchQuery], () => {
    resetPage()
  })

  const hasActiveFilters = computed(() => {
    return Boolean(statusFilter.value || typeFilter.value || searchQuery.value.trim())
  })

  const clearAllFilters = () => {
    statusFilter.value = null
    typeFilter.value = null
    searchQuery.value = ''
  }

  const toggleStatusFilter = (target: string | null) => {
    if (target === null) {
      statusFilter.value = null
      typeFilter.value = null
      return
    }
    statusFilter.value = statusFilter.value === target ? null : target
  }

  const toggleTypeFilter = (target: 'consumption' | 'permanent' | null) => {
    if (target === null) {
      typeFilter.value = null
      return
    }
    typeFilter.value = typeFilter.value === target ? null : target
  }

  interface PipelineStage {
    status: DemandStatus
    step: number
    label: string
    icon: IconName
    color: string
    count: number
  }

  const pipelineStages = computed<PipelineStage[]>(() => [
    {
      status: 'planning',
      step: 1,
      label: 'Planejamento',
      icon: 'document',
      color: 'blue-grey',
      count: summary.value.byStatus.planning,
    },
    {
      status: 'bidding_notice',
      step: 2,
      label: 'Aviso Contratação',
      icon: 'notifications',
      color: 'info',
      count: summary.value.byStatus.bidding_notice,
    },
    {
      status: 'quotation',
      step: 3,
      label: 'Cotação',
      icon: 'currency',
      color: 'deep-purple',
      count: summary.value.byStatus.quotation,
    },
    {
      status: 'dispute',
      step: 4,
      label: 'Disputa',
      icon: 'balance',
      color: 'warning',
      count: summary.value.byStatus.dispute,
    },
    {
      status: 'homologation',
      step: 5,
      label: 'Homologação',
      icon: ' recordsList'.trim() as IconName,
      color: 'primary',
      count: summary.value.byStatus.homologation,
    },
    {
      status: 'completed',
      step: 6,
      label: 'Concluído',
      icon: 'checkCircle',
      color: 'success',
      count: summary.value.byStatus.completed,
    },
  ])

  const getStatusStepNumber = (status: string): number | null => {
    const found = pipelineStages.value.find((s) => s.status === status)
    return found ? found.step : null
  }

  const handleConfirmDelete = async () => {
    if (!demandToDelete.value) return
    isDeleting.value = true
    try {
      await deleteDemand(demandToDelete.value.id)
      toast.success(`Demanda "${demandToDelete.value.name}" excluída com sucesso!`)
      isDeleteModalOpen.value = false
      demandToDelete.value = null
      await refresh()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao excluir demanda.'
      toast.error(msg)
    } finally {
      isDeleting.value = false
    }
  }

  const { errors, defineField, resetForm, handleSubmit } = useZodForm(demandFormSchema, {
    name: '',
    type: 'consumption',
    internal_process_number: '',
    process_number: '',
    id_pca: '',
    contract_number: '',
    siafem_number: '',
  })

  const [name, nameProps] = defineField('name')
  const [type, typeProps] = defineField('type')
  const [internalProcessNumber, internalProcessNumberProps] = defineField('internal_process_number')
  const [processNumber, processNumberProps] = defineField('process_number')
  const [idPca, idPcaProps] = defineField('id_pca')
  const [contractNumber, contractNumberProps] = defineField('contract_number')
  const [siafemNumber, siafemNumberProps] = defineField('siafem_number')

  const modal = useModal<{ id?: string }>({})

  const originalOpen = modal.open.bind(modal)
  modal.open = (item?: Partial<DemandRow>) => {
    if (item) {
      resetForm({
        values: {
          id: item.id,
          name: item.name || '',
          type: item.type || 'consumption',
          internal_process_number: item.internal_process_number || '',
          process_number: item.process_number || '',
          id_pca: item.id_pca || '',
          contract_number: item.contract_number ? String(item.contract_number) : '',
          siafem_number: item.siafem_number || '',
        },
      })
      originalOpen({ id: item.id })
    } else {
      resetForm()
      originalOpen({})
    }
  }

  const canEdit = (demand: DemandRow) => {
    return canEditDemand(demand)
  }

  const canDelete = (demand: DemandRow) => {
    return canDeleteDemand(demand)
  }

  const saveDemand = handleSubmit(async (values) => {
    modal.startSaving()
    modal.error.value = ''
    try {
      const payload: {
        name: string
        type: 'consumption' | 'permanent'
        internal_process_number?: string
        process_number: string | null
        id_pca: string | null
        contract_number: string | null
        siafem_number: string | null
      } = {
        name: values.name,
        type: values.type,
        process_number: values.process_number || null,
        id_pca: values.id_pca || null,
        contract_number: values.contract_number ? String(values.contract_number) : null,
        siafem_number: values.siafem_number || null,
      }

      if (isAdmin.value && values.internal_process_number) {
        payload.internal_process_number = values.internal_process_number.trim()
      }

      if (values.id) {
        await updateDemand(values.id, payload)
      } else {
        await createDemand({ ...payload, user_id: profile.value!.id })
      }

      await refresh()
      modal.close()
    } catch (err: unknown) {
      if (err instanceof Error) {
        modal.error.value = err.message
      } else if (typeof err === 'object' && err !== null && 'message' in err) {
        modal.error.value = String((err as Record<string, unknown>).message)
      } else {
        modal.error.value = 'Ocorreu um erro desconhecido.'
      }
    } finally {
      modal.stopSaving()
    }
  })

  const statusOptions = computed(() => [
    { title: 'Em Preparação (Planej. / Aviso / Cotação)', value: 'preparation', color: 'info' },
    { title: 'Disputa e Homologação', value: 'execution', color: 'warning' },
    ...getDemandStatusFilterOptions(),
  ])
</script>

<template>
  <div>
    <UiPageHeader
      subtitle="Visão geral do pipeline de contratações, acompanhamento de etapas e gestão de demandas"
      title="Dashboard de Demandas"
    >
      <template #actions>
        <div class="d-flex align-center ga-2 flex-wrap">
          <UiButton
            color="default"
            prepend-icon="product"
            size="sm"
            to="/products"
            variant="outline"
          >
            Produtos
          </UiButton>
          <UiButton
            color="default"
            prepend-icon="company"
            size="sm"
            to="/suppliers"
            variant="outline"
          >
            Fornecedores
          </UiButton>
          <UiButton
            color="teal"
            prepend-icon="chart"
            size="sm"
            to="/demands/class-spending"
            variant="soft"
          >
            Gastos por Classe
          </UiButton>
          <UiButton color="primary" prepend-icon="add" size="sm" @click="modal.open()">
            Nova Demanda
          </UiButton>
        </div>
      </template>
    </UiPageHeader>

    <!-- Alerta de Solicitações de Retorno Pendentes -->
    <UiAlert v-if="summary.returnsCount > 0" class="mb-4" size="sm" type="warning" variant="soft">
      <div class="d-flex align-center justify-space-between flex-wrap ga-2">
        <span>
          Existem <strong>{{ summary.returnsCount }}</strong> demanda(s) com
          <strong>solicitação de retorno de etapa</strong> aguardando revisão.
        </span>
        <UiButton
          color="warning"
          prepend-icon="back"
          size="xs"
          :variant="statusFilter === 'returns' ? 'outline' : 'solid'"
          @click="toggleStatusFilter('returns')"
        >
          {{ statusFilter === 'returns' ? 'Mostrando Retornos (Limpar)' : 'Filtrar Retornos' }}
        </UiButton>
      </div>
    </UiAlert>

    <!-- Cards de Resumo (KPIs Clicáveis) -->
    <UiRow class="mb-4" dense>
      <UiCol cols="12" md="3" sm="6">
        <UiCard
          border
          class="h-100 cursor-pointer kpi-card"
          :class="{ 'kpi-card--active': !statusFilter && !typeFilter }"
          hover
          @click="toggleStatusFilter(null)"
        >
          <div class="d-flex align-center justify-space-between">
            <div>
              <div class="text-caption font-weight-bold text-uppercase text-medium-emphasis">
                Demandas Ativas
              </div>
              <div class="text-h4 font-weight-bold text-primary my-1">
                {{ summary.totalActive }}
              </div>
              <div class="text-caption text-medium-emphasis">
                {{ summary.byType.consumption }} Consumo • {{ summary.byType.permanent }} Permanente
              </div>
            </div>
            <UiAvatar color="primary" rounded="lg" size="46" variant="soft">
              <UiIcon name="recordsList" size="24" />
            </UiAvatar>
          </div>
        </UiCard>
      </UiCol>

      <UiCol cols="12" md="3" sm="6">
        <UiCard
          border
          class="h-100 cursor-pointer kpi-card"
          :class="{ 'kpi-card--active': statusFilter === 'preparation' }"
          hover
          @click="toggleStatusFilter('preparation')"
        >
          <div class="d-flex align-center justify-space-between">
            <div>
              <div class="text-caption font-weight-bold text-uppercase text-medium-emphasis">
                Em Preparação
              </div>
              <div class="text-h4 font-weight-bold text-info my-1">
                {{ summary.inPreparation }}
              </div>
              <div class="text-caption text-medium-emphasis">Planejamento, Aviso e Cotação</div>
            </div>
            <UiAvatar color="info" rounded="lg" size="46" variant="soft">
              <UiIcon name="clipboardClock" size="24" />
            </UiAvatar>
          </div>
        </UiCard>
      </UiCol>

      <UiCol cols="12" md="3" sm="6">
        <UiCard
          border
          class="h-100 cursor-pointer kpi-card"
          :class="{ 'kpi-card--active': statusFilter === 'execution' }"
          hover
          @click="toggleStatusFilter('execution')"
        >
          <div class="d-flex align-center justify-space-between">
            <div>
              <div class="text-caption font-weight-bold text-uppercase text-medium-emphasis">
                Disputa e Homologação
              </div>
              <div class="text-h4 font-weight-bold text-warning my-1">
                {{ summary.inExecution }}
              </div>
              <div class="text-caption text-medium-emphasis">Certames ativos e empenhos</div>
            </div>
            <UiAvatar color="warning" rounded="lg" size="46" variant="soft">
              <UiIcon name="balance" size="24" />
            </UiAvatar>
          </div>
        </UiCard>
      </UiCol>

      <UiCol cols="12" md="3" sm="6">
        <UiCard
          border
          class="h-100 cursor-pointer kpi-card"
          :class="{ 'kpi-card--active': statusFilter === 'completed' }"
          hover
          @click="toggleStatusFilter('completed')"
        >
          <div class="d-flex align-center justify-space-between">
            <div>
              <div class="text-caption font-weight-bold text-uppercase text-medium-emphasis">
                Concluídas
              </div>
              <div class="text-h4 font-weight-bold text-success my-1">
                {{ summary.completed }}
              </div>
              <div class="text-caption text-medium-emphasis">Processos 100% finalizados</div>
            </div>
            <UiAvatar color="success" rounded="lg" size="46" variant="soft">
              <UiIcon name="checkCircle" size="24" />
            </UiAvatar>
          </div>
        </UiCard>
      </UiCol>
    </UiRow>

    <!-- Barra Visual do Fluxo (Pipeline por Etapa Clicável) -->
    <UiCard class="mb-4" variant="outlined">
      <div class="d-flex align-center justify-space-between flex-wrap ga-2 mb-3">
        <div class="d-flex align-center ga-2">
          <UiIcon color="primary" name="trendingUp" size="18" />
          <span class="text-subtitle-2 font-weight-bold"> Fluxo das Demandas por Etapa </span>
          <span class="text-caption text-medium-emphasis">
            (clique em uma etapa para filtrar)
          </span>
        </div>

        <!-- Filtro Rápido por Tipo -->
        <div class="d-flex align-center ga-1 flex-wrap">
          <span class="text-caption text-medium-emphasis mr-1">Tipo:</span>
          <UiChip
            class="cursor-pointer"
            :color="!typeFilter ? 'primary' : 'default'"
            label
            size="xs"
            :variant="!typeFilter ? 'solid' : 'outline'"
            @click="toggleTypeFilter(null)"
          >
            Todos ({{ summary.totalActive }})
          </UiChip>
          <UiChip
            class="cursor-pointer"
            color="info"
            label
            size="xs"
            :variant="typeFilter === 'consumption' ? 'solid' : 'soft'"
            @click="toggleTypeFilter('consumption')"
          >
            Consumo ({{ summary.byType.consumption }})
          </UiChip>
          <UiChip
            class="cursor-pointer"
            color="warning"
            label
            size="xs"
            :variant="typeFilter === 'permanent' ? 'solid' : 'soft'"
            @click="toggleTypeFilter('permanent')"
          >
            Permanente ({{ summary.byType.permanent }})
          </UiChip>
        </div>
      </div>

      <UiRow dense>
        <UiCol v-for="stage in pipelineStages" :key="stage.status" cols="6" lg="2" md="4" sm="4">
          <div
            class="pipeline-step pa-3 rounded-lg border cursor-pointer d-flex flex-column justify-space-between h-100"
            :class="{
              'pipeline-step--active': statusFilter === stage.status,
            }"
            @click="toggleStatusFilter(stage.status)"
          >
            <div class="d-flex align-center justify-space-between mb-1">
              <span class="text-caption text-medium-emphasis font-weight-medium">
                Etapa {{ stage.step }}/6
              </span>
              <UiIcon :color="stage.color" :name="stage.icon" size="16" />
            </div>
            <div class="text-body-2 font-weight-bold text-truncate">
              {{ stage.label }}
            </div>
            <div class="d-flex align-center justify-space-between mt-2">
              <UiChip
                :color="stage.count > 0 ? stage.color : 'default'"
                label
                size="xs"
                :variant="statusFilter === stage.status ? 'solid' : 'soft'"
              >
                {{ stage.count }} {{ stage.count === 1 ? 'demanda' : 'demandas' }}
              </UiChip>
            </div>
          </div>
        </UiCol>
      </UiRow>
    </UiCard>

    <!-- Tabela Principal de Demandas -->
    <UiCard>
      <template #header>
        <UiIcon class="mr-2" color="primary" name="recordsList" />
        <span>Processos e Demandas</span>
        <UiChip v-if="totalItems > 0" class="ml-2" label size="xs" variant="soft">
          {{ totalItems }}
        </UiChip>
        <UiButton
          v-if="hasActiveFilters"
          class="ml-2"
          color="warning"
          prepend-icon="close"
          size="xs"
          variant="ghost"
          @click="clearAllFilters"
        >
          Limpar filtros
        </UiButton>
        <UiSpacer />

        <!-- Filtros inline -->
        <div class="d-flex ga-2 align-center flex-wrap">
          <UiInput
            v-model="searchQuery"
            clearable
            hide-details
            label="Buscar nome ou nº processo..."
            prepend-inner-icon="search"
            rounded="lg"
            size="sm"
            style="min-width: 220px; max-width: 280px"
            variant="outline"
          />
          <UiSelect
            v-model="statusFilter"
            clearable
            hide-details
            item-title="title"
            item-value="value"
            :items="statusOptions"
            label="Etapa / Status"
            rounded="lg"
            size="sm"
            style="min-width: 190px; max-width: 240px"
            variant="outline"
          />
          <UiActionButton
            action="refresh"
            :loading="pending"
            tooltip="Atualizar painel e lista"
            variant="soft"
            @click="refresh"
          />
        </div>
      </template>

      <UiTable
        :headers="[
          { text: 'Nº Processo', value: 'internal_process_number' },
          { text: 'Demanda', value: 'name' },
          { text: 'Tipo', value: 'type' },
          { text: 'Etapa / Status', value: 'status' },
          { text: 'Datas', value: 'dates' },
          { text: 'Criado por', value: 'creator' },
          { text: 'Ações', value: 'actions', align: 'right' },
        ]"
        :items="demands || []"
        :loading="pending"
      >
        <template v-if="!demands?.length && !pending" #empty>
          <div class="text-center pa-8 text-medium-emphasis">
            <UiIcon class="mb-2" color="grey" name="searchDocument" size="36" />
            <div class="font-weight-medium">Nenhuma demanda encontrada para os filtros atuais.</div>
            <div v-if="hasActiveFilters" class="mt-2">
              <UiButton color="primary" size="xs" variant="soft" @click="clearAllFilters">
                Mostrar todas as demandas
              </UiButton>
            </div>
          </div>
        </template>

        <template #item-internal_process_number="{ item }">
          <div class="d-flex flex-column" style="line-height: 1.25">
            <span v-if="item.process_number" class="font-weight-bold text-primary">
              {{ item.process_number }}
            </span>
            <span v-else class="text-caption text-medium-emphasis font-italic">Sem nº oficial</span>
            <span class="text-caption text-medium-emphasis">
              Interno: {{ item.internal_process_number || '-' }}
            </span>
          </div>
        </template>

        <template #item-name="{ item }">
          <div class="d-flex flex-column py-1">
            <NuxtLink
              class="text-decoration-none text-primary font-weight-bold"
              :to="`/demands/${item.id}`"
            >
              {{ item.name }}
            </NuxtLink>
            <span
              v-if="item.siafem_number || item.dispute_number"
              class="text-caption text-medium-emphasis"
            >
              <template v-if="item.dispute_number">Disputa: {{ item.dispute_number }}</template>
              <template v-if="item.dispute_number && item.siafem_number"> • </template>
              <template v-if="item.siafem_number">SIAFEM: {{ item.siafem_number }}</template>
            </span>
          </div>
        </template>

        <template #item-type="{ item }">
          <UiChip
            :color="item.type === 'consumption' ? 'info' : 'warning'"
            label
            size="sm"
            variant="soft"
          >
            {{ formatDemandType(item.type) }}
          </UiChip>
        </template>

        <template #item-status="{ item }">
          <div class="d-flex flex-column ga-1 align-start py-1">
            <div class="d-flex align-center ga-1 flex-wrap">
              <UiChip :color="getDemandStatusColor(item.status)" label size="sm" variant="soft">
                {{ formatDemandStatus(item.status) }}
              </UiChip>
              <UiChip
                v-if="item.is_return_requested"
                color="warning"
                label
                size="sm"
                variant="outline"
              >
                <UiIcon name="back" size="12" start />
                Retorno
              </UiChip>
            </div>
            <span v-if="getStatusStepNumber(item.status)" class="text-caption text-medium-emphasis">
              Etapa {{ getStatusStepNumber(item.status) }} de 6
            </span>
          </div>
        </template>

        <template #item-dates="{ item }">
          <div class="d-flex flex-column" style="line-height: 1.25">
            <span v-if="item.dispute_date" class="text-caption font-weight-medium">
              Disputa: {{ formatDate(item.dispute_date) }}
            </span>
            <span class="text-caption text-medium-emphasis">
              Criada: {{ formatDate(item.created_at) }}
            </span>
          </div>
        </template>

        <template #item-creator="{ item }">
          <span class="text-body-2 text-medium-emphasis">
            {{ item.profiles?.name || `Usuário (${item.user_id.split('-')[0]})` }}
          </span>
        </template>

        <template #item-actions="{ item }">
          <div class="d-flex justify-end ga-2">
            <UiActionButton
              action="view"
              :to="`/demands/${item.id}`"
              tooltip="Abrir painel da demanda"
            />
            <UiActionButton
              v-if="canEdit(item)"
              action="edit"
              color="default"
              tooltip="Editar dados básicos"
              @click="modal.open(item)"
            />
            <UiActionButton
              v-if="canDelete(item)"
              action="delete"
              tooltip="Excluir demanda"
              @click="openDeleteModal(item)"
            />
          </div>
        </template>
      </UiTable>

      <!-- Paginação -->
      <div v-if="totalPages > 1" class="d-flex justify-center py-4">
        <UiPagination
          v-model="currentPage"
          :length="totalPages"
          rounded="lg"
          size="md"
          :total-visible="7"
        />
      </div>
    </UiCard>

    <!-- Modal Form -->
    <UiModal
      v-model="modal.isOpen.value"
      max-width="520px"
      :title="modal.payload.value?.id ? 'Editar Demanda' : 'Nova Demanda'"
    >
      <UiAlert v-if="modal.error.value" class="mb-4" size="sm" type="error" variant="soft">
        {{ modal.error.value }}
      </UiAlert>

      <UiInput
        v-model="name"
        v-bind="nameProps"
        :error-messages="errors.name"
        label="Nome da Demanda *"
        required
      />

      <UiInput
        v-if="isAdmin"
        v-model="internalProcessNumber"
        v-bind="internalProcessNumberProps"
        :error-messages="errors.internal_process_number"
        hint="Exclusivo Administrador. Formato: AAAA-XXXX (ex: 2026-0001)"
        label="Nº do Processo Interno"
        placeholder="Ex: 2026-0001"
      />

      <UiSelect
        v-model="type"
        v-bind="typeProps"
        :error-messages="errors.type"
        item-title="title"
        item-value="value"
        :items="[
          { title: 'Consumo', value: 'consumption' },
          { title: 'Permanente', value: 'permanent' },
        ]"
        label="Tipo *"
        required
      />

      <UiInput
        v-model="processNumber"
        v-bind="processNumberProps"
        :error-messages="errors.process_number"
        hint="Opcional. Padrão: XXX.XXXXXXXX/YYYY-ZZ"
        label="Nº do Processo (Oficial)"
        placeholder="Ex: 058.00100793/2026-21"
      />

      <UiInput
        v-model="idPca"
        v-bind="idPcaProps"
        :error-messages="errors.id_pca"
        hint="Opcional. ID do Plano de Contratações Anual"
        label="ID PCA"
        placeholder="Ex: 46377800000127-0-000132/2026"
      />

      <UiInput
        v-model="contractNumber"
        v-bind="contractNumberProps"
        :error-messages="errors.contract_number"
        hint="Opcional. Número da contratação."
        label="Nº da Contratação"
        placeholder="Apenas números"
        type="number"
      />

      <UiInput
        v-model="siafemNumber"
        v-bind="siafemNumberProps"
        :error-messages="errors.siafem_number"
        hint="Opcional. Número SIAFEM."
        label="Nº SIAFEM"
        placeholder="Ex: 2026NE000123 ou número SIAFEM"
      />

      <template #actions>
        <UiButton :disabled="modal.isSaving.value" variant="ghost" @click="modal.close">
          Cancelar
        </UiButton>
        <UiButton
          color="primary"
          :loading="modal.isSaving.value"
          variant="solid"
          @click="saveDemand"
        >
          Salvar
        </UiButton>
      </template>
    </UiModal>

    <!-- Modal de Confirmação de Exclusão (Safe Delete) -->
    <UiModal v-model="isDeleteModalOpen" max-width="480px" title="Excluir Demanda">
      <div v-if="demandToDelete" class="pa-1">
        <UiAlert class="mb-4" color="warning" size="sm" variant="soft">
          Esta demanda será movida para a lixeira (safe delete) e não aparecerá mais nas listagens
          ativas.
        </UiAlert>

        <p class="text-body-2 mb-2">
          Tem certeza de que deseja excluir a demanda <strong>{{ demandToDelete.name }}</strong
          >?
        </p>

        <div v-if="demandToDelete.process_number" class="text-caption text-medium-emphasis mb-1">
          <strong>Processo Oficial:</strong> {{ demandToDelete.process_number }}
        </div>
        <div
          v-if="demandToDelete.internal_process_number"
          class="text-caption text-medium-emphasis mb-1"
        >
          <strong>Processo Interno:</strong> {{ demandToDelete.internal_process_number }}
        </div>
      </div>

      <template #actions>
        <UiButton :disabled="isDeleting" variant="ghost" @click="closeDeleteModal">
          Cancelar
        </UiButton>
        <UiButton
          color="error"
          :loading="isDeleting"
          prepend-icon="delete"
          variant="solid"
          @click="handleConfirmDelete"
        >
          Sim, Excluir
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>

<style scoped>
  .kpi-card {
    transition:
      transform 0.15s ease,
      border-color 0.15s ease,
      box-shadow 0.15s ease;
  }
  .kpi-card:hover {
    transform: translateY(-2px);
  }
  .kpi-card--active {
    border-color: rgb(var(--v-theme-primary)) !important;
    box-shadow: 0 0 0 1px rgb(var(--v-theme-primary));
  }
  .pipeline-step {
    transition:
      background-color 0.15s ease,
      border-color 0.15s ease,
      transform 0.15s ease;
  }
  .pipeline-step:hover {
    transform: translateY(-1px);
    border-color: rgb(var(--v-theme-primary));
  }
  .pipeline-step--active {
    border-color: rgb(var(--v-theme-primary)) !important;
    background-color: rgba(var(--v-theme-primary), 0.06);
  }
</style>
