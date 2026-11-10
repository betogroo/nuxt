<script setup lang="ts">
  import { ref, computed, watch } from 'vue'
  import { usePagination } from '~/composables/usePagination'
  import { useIirgdDemands, type IirgdDemand } from '~/composables/useIirgdDemands'
  import { useIirgdDocumentTypes } from '~/composables/useIirgdDocumentTypes'
  import { useIirgdSettings } from '~/composables/useIirgdSettings'
  import {
    IIRGD_STATUS_LABELS,
    IIRGD_STATUS_COLORS,
    getIirgdStatusSelectOptions,
    type IirgdDemandStatus,
  } from '~/constants/iirgd-status'
  import { IIRGD_STATION_CODES } from '~/constants/iirgd-stations'
  import { padAndFormatRg, formatCitizenName } from '~/utils/formatters'

  definePageMeta({
    icon: 'search',
    middleware: ['iirgd'],
    layout: 'default',
    navLabel: 'Todas as Demandas',
    navSubtitle: 'Busca global e histórico de todas as demandas',
    navColor: 'deep-purple',
    navGroup: 'iirgd',
    navOrder: 15,
    roles: ['admin', 'iirgd_user', 'iirgd_manager'],
    showIn: ['drawer'],
  })

  useHead({
    title: 'Todas as Demandas - IIRGD',
  })

  const { fetchDemands } = useIirgdDemands()
  const { fetchAllActiveDocumentTypes } = useIirgdDocumentTypes()
  const { fetchSettings, computePriority } = useIirgdSettings()

  // Pagination & Filters
  const { currentPage, itemsPerPage, totalItems, totalPages, resetPage } = usePagination(10)
  const searchQuery = ref('')
  const stationCode = ref<string>('Todos')
  const selectedStatus = ref<string>('all')
  const selectedDocumentTypeId = ref<string>('all')

  // Document types for filtering
  const { data: documentTypes } = useAsyncData('iirgd-doc-types-filter', () =>
    fetchAllActiveDocumentTypes(),
  )
  const { data: slaSettings } = useAsyncData('iirgd-settings', fetchSettings)

  const documentTypeOptions = computed(() => [
    { title: 'Todos os tipos', value: 'all' },
    ...(documentTypes.value || []).map((dt) => ({
      title: dt.name,
      value: dt.id,
    })),
  ])

  const statusOptions = computed(() => [
    { title: 'Todos os status', value: 'all' },
    ...getIirgdStatusSelectOptions(),
  ])

  const stationOptions = computed(() => ['Todos', ...IIRGD_STATION_CODES])

  const tableHeaders = [
    { text: 'Posto', value: 'station_code', width: 110 },
    { text: 'Tipo Doc.', value: 'document_type_id', width: 150 },
    { text: 'Nome do Cidadão', value: 'name' },
    { text: 'RG', value: 'rg', width: 150 },
    { text: 'CPF', value: 'cpf', width: 140 },
    { text: 'Status', value: 'status', align: 'center' as const, width: 160 },
    { text: 'Observações', value: 'observation' },
    { text: 'Data', value: 'created_at', align: 'right' as const, width: 160 },
    { text: 'Ações', value: 'actions', align: 'right' as const, width: 80, sortable: false },
  ]

  const {
    data: demandsRaw,
    pending,
    refresh,
  } = useAsyncData(
    'iirgd-all-demands',
    async () => {
      const res = await fetchDemands({
        page: currentPage.value,
        itemsPerPage: itemsPerPage.value,
        searchQuery: searchQuery.value,
        stationCode: stationCode.value === 'Todos' ? undefined : stationCode.value,
        status: selectedStatus.value === 'all' ? undefined : selectedStatus.value,
        documentTypeId:
          selectedDocumentTypeId.value === 'all' ? undefined : selectedDocumentTypeId.value,
        ascending: false,
      })
      totalItems.value = res.count
      return res.data as IirgdDemand[]
    },
    {
      watch: [currentPage, searchQuery, stationCode, selectedStatus, selectedDocumentTypeId],
      default: () => [],
    },
  )

  const demands = computed(() => {
    return demandsRaw.value.map((d) => ({
      ...d,
      priority: computePriority(d, slaSettings.value || null),
    }))
  })

  // Reset pagination on filter change
  watch([searchQuery, stationCode, selectedStatus, selectedDocumentTypeId], () => {
    resetPage()
  })

  const clearFilters = () => {
    searchQuery.value = ''
    stationCode.value = 'Todos'
    selectedStatus.value = 'all'
    selectedDocumentTypeId.value = 'all'
    resetPage()
  }

  const hasActiveFilters = computed(() => {
    return (
      Boolean(searchQuery.value.trim()) ||
      stationCode.value !== 'Todos' ||
      selectedStatus.value !== 'all' ||
      selectedDocumentTypeId.value !== 'all'
    )
  })
</script>

<template>
  <div>
    <UiPageHeader
      subtitle="Localize qualquer demanda cadastrada no sistema por cidadão, RG, CPF ou posto"
      title="Todas as Demandas"
    >
      <template #actions>
        <UiButton
          color="default"
          prepend-icon="arrowLeft"
          variant="ghost"
          @click="navigateTo('/iirgd')"
        >
          Dashboard
        </UiButton>
        <UiActionButton
          action="refresh"
          :loading="pending"
          tooltip="Atualizar lista"
          variant="soft"
          @click="refresh"
        />
      </template>
    </UiPageHeader>

    <UiContainer>
      <UiCard class="mb-4" variant="outline">
        <template #header>
          <div class="d-flex align-center ga-2">
            <UiIcon class="text-primary" left name="search" />
            <span class="font-weight-medium">Filtros de Pesquisa</span>
            <UiChip v-if="hasActiveFilters" color="primary" size="xs" variant="soft">
              Filtros ativos
            </UiChip>
          </div>
        </template>

        <div class="pa-4">
          <UiRow>
            <UiCol cols="12" md="6">
              <UiInput
                v-model="searchQuery"
                clearable
                hide-details
                icon="search"
                label="Buscar Demanda"
                placeholder="Digite o Nome, RG, CPF ou Doc. Outro Estado..."
              />
            </UiCol>
            <UiCol cols="12" md="2" sm="4">
              <UiSelect
                v-model="stationCode"
                hide-details
                :items="stationOptions"
                label="Posto"
                placeholder="Filtrar por Posto"
              />
            </UiCol>
            <UiCol cols="12" md="2" sm="4">
              <UiSelect
                v-model="selectedStatus"
                hide-details
                item-title="title"
                item-value="value"
                :items="statusOptions"
                label="Status"
                placeholder="Filtrar por Status"
              />
            </UiCol>
            <UiCol cols="12" md="2" sm="4">
              <UiSelect
                v-model="selectedDocumentTypeId"
                hide-details
                item-title="title"
                item-value="value"
                :items="documentTypeOptions"
                label="Tipo de Doc."
                placeholder="Filtrar por Tipo"
              />
            </UiCol>
          </UiRow>

          <div v-if="hasActiveFilters" class="d-flex justify-end mt-3">
            <UiButton
              color="secondary"
              prepend-icon="clear"
              size="sm"
              variant="ghost"
              @click="clearFilters"
            >
              Limpar Filtros
            </UiButton>
          </div>
        </div>
      </UiCard>

      <UiCard variant="outline">
        <template #header>
          <div class="d-flex align-center justify-space-between w-100 ga-2">
            <div class="d-flex align-center ga-2">
              <UiIcon class="text-primary" left name="recordsList" />
              <span class="font-weight-medium">Demandas Encontradas</span>
              <UiChip class="flex-shrink-0" color="primary" size="sm" variant="solid">
                {{ totalItems }}
              </UiChip>
            </div>
          </div>
        </template>

        <UiTable :headers="tableHeaders" :items="demands" :loading="pending">
          <template #item-station_code="{ item }">
            <UiChip color="blue-grey" label size="sm" variant="soft">
              {{ item.station_code }}
            </UiChip>
          </template>

          <template #item-document_type_id="{ item }">
            {{ item.iirgd_document_types?.name || '-' }}
          </template>

          <template #item-name="{ item }">
            <div class="d-flex align-center ga-2">
              <NuxtLink
                class="text-decoration-none text-primary font-weight-bold"
                :to="`/iirgd/${item.id}`"
              >
                {{ formatCitizenName(item.iirgd_citizens?.name) || 'Cidadão não identificado' }}
              </NuxtLink>
              <UiChip v-if="item.priority === 'delay'" color="error" size="xs" variant="solid">
                Atraso
              </UiChip>
              <UiChip
                v-else-if="item.priority === 'alert'"
                color="warning"
                size="xs"
                variant="solid"
              >
                Alerta
              </UiChip>
            </div>
          </template>

          <template #item-rg="{ item }">
            <div v-if="item.iirgd_citizens?.rg" class="d-flex align-center ga-1">
              <span>{{ padAndFormatRg(item.iirgd_citizens.rg, true) }}</span>
              <UiCopyButton
                :clean-digits-only="false"
                tooltip="Copiar RG"
                :value="padAndFormatRg(item.iirgd_citizens.rg, true)"
              />
            </div>
            <div v-else-if="item.iirgd_citizens?.other_document" class="d-flex align-center ga-1">
              <span>{{ item.iirgd_citizens.other_document }}</span>
              <UiChip color="orange" label size="xs" variant="soft">Outro Estado</UiChip>
            </div>
            <span v-else class="text-medium-emphasis">-</span>
          </template>

          <template #item-cpf="{ item }">
            <div v-if="item.iirgd_citizens?.cpf" class="d-flex align-center ga-1">
              <span>{{ item.iirgd_citizens.cpf }}</span>
              <UiCopyButton
                :clean-digits-only="false"
                tooltip="Copiar CPF"
                :value="item.iirgd_citizens.cpf"
              />
            </div>
            <span v-else class="text-medium-emphasis">-</span>
          </template>

          <template #item-status="{ item }">
            <UiChip
              :color="IIRGD_STATUS_COLORS[item.status as IirgdDemandStatus] || 'grey'"
              size="sm"
              variant="soft"
            >
              {{ IIRGD_STATUS_LABELS[item.status as IirgdDemandStatus] || item.status }}
            </UiChip>
          </template>

          <template #item-observation="{ item }">
            <span
              v-if="item.observation"
              class="text-body-2 text-truncate d-inline-block"
              style="max-width: 220px"
              :title="item.observation"
            >
              {{ item.observation }}
            </span>
            <span v-else class="text-medium-emphasis">-</span>
          </template>

          <template #item-created_at="{ item }">
            <span class="text-caption text-medium-emphasis">
              {{ item.created_at ? new Date(item.created_at).toLocaleString('pt-BR') : '-' }}
            </span>
          </template>

          <template #item-actions="{ item }">
            <UiButton
              color="primary"
              icon="visibility"
              size="xs"
              title="Ver Detalhes"
              variant="ghost"
              @click="navigateTo(`/iirgd/${item.id}`)"
            />
          </template>

          <template #no-data>
            <div class="pa-6 text-center">
              <UiIcon class="text-medium-emphasis mb-2" name="search" size="xl" />
              <div class="text-subtitle-1 font-weight-medium">Nenhuma demanda encontrada</div>
              <div class="text-body-2 text-medium-emphasis mt-1">
                Tente ajustar os filtros ou digitar um termo diferente de busca.
              </div>
            </div>
          </template>
        </UiTable>

        <template #actions>
          <UiPagination
            v-model="currentPage"
            class="mt-2"
            :length="totalPages"
            :total-visible="7"
          />
        </template>
      </UiCard>
    </UiContainer>
  </div>
</template>
