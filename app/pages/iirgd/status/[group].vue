<script setup lang="ts">
  import { ref, computed } from 'vue'
  import { useRoute } from 'vue-router'
  import { usePagination } from '~/composables/usePagination'
  import { useIirgdDemands, type IirgdDemand } from '~/composables/useIirgdDemands'
  import {
    IIRGD_STATUS_LABELS,
    IIRGD_STATUS_COLORS,
    type IirgdDemandStatus,
  } from '~/constants/iirgd-status'
  import { IIRGD_STATION_CODES } from '~/constants/iirgd-stations'
  import { padAndFormatRg } from '~/utils/formatters'

  definePageMeta({
    middleware: ['iirgd'],
    layout: 'default',
  })

  const route = useRoute()
  const group = route.params.group as string

  // Para o UiTabs e navegação
  const currentTab = computed({
    get: () => group,
    set: (val) => navigateTo(`/iirgd/status/${val}`),
  })

  const titles: Record<string, string> = {
    'in-progress': 'Em Andamento',
    consulted: 'Consultados',
    released: 'Liberados',
    issued: 'Emitidos',
    errors: 'Erros e Pendências',
  }

  useHead({
    title: `${titles[group] || 'Demandas'} - IIRGD`,
  })

  const { fetchDemands, updateDemand } = useIirgdDemands()
  const toast = useToast()

  // Pagination and Filters
  const { currentPage, itemsPerPage, totalItems, totalPages, resetPage } = usePagination()
  const searchQuery = ref('')
  const stationCode = ref<string | null>(null)

  const isUnpaginated = group === 'consulted'

  const {
    data: demands,
    pending,
    refresh,
  } = useAsyncData(
    `iirgd-demands-${group}`,
    async () => {
      const res = await fetchDemands({
        page: currentPage.value,
        itemsPerPage: itemsPerPage.value,
        statusGroup: group,
        searchQuery: searchQuery.value,
        stationCode:
          stationCode.value === 'Todos' || !stationCode.value ? undefined : stationCode.value,
        noPagination: isUnpaginated,
      })
      totalItems.value = res.count
      return res.data as IirgdDemand[]
    },
    {
      watch: [currentPage, searchQuery, stationCode],
      default: () => [],
    },
  )

  watch([searchQuery, stationCode], () => resetPage())

  // Chunk logic
  const consultadosRgsChunks = computed(() => {
    if (group !== 'consultado') return []
    const validDemands = demands.value.filter((d) => d.iirgd_citizens?.rg)
    const chunks: Array<{ text: string; demands: IirgdDemand[] }> = []
    for (let i = 0; i < validDemands.length; i += 8) {
      const chunkDemands = validDemands.slice(i, i + 8)
      const chunkString = chunkDemands
        .map((d) => d.iirgd_citizens.rg.replace(/[^a-zA-Z0-9]/g, ''))
        .join('')
      chunks.push({ text: chunkString, demands: chunkDemands })
    }
    return chunks
  })

  const copyChunk = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success('RGs copiados!')
    } catch (e) {
      toast.error('Falha ao copiar.')
      console.error(e)
    }
  }

  // Release Modal
  const releaseModal = ref({
    isOpen: false,
    demands: [] as IirgdDemand[],
    isSaving: false,
    error: '',
  })
  const openReleaseModal = (chunkDemands: IirgdDemand[]) => {
    releaseModal.value.demands = chunkDemands
    releaseModal.value.isOpen = true
    releaseModal.value.error = ''
  }

  const confirmRelease = async () => {
    releaseModal.value.isSaving = true
    releaseModal.value.error = ''
    try {
      for (const demand of releaseModal.value.demands) {
        if (demand.id) await updateDemand(demand.id, { status: 'released' })
      }
      releaseModal.value.isOpen = false
      toast.success('Demandas liberadas!')
      await refresh()
    } catch (e: unknown) {
      releaseModal.value.error = e instanceof Error ? e.message : 'Erro.'
    } finally {
      releaseModal.value.isSaving = false
    }
  }

  // Status Inline Modal logic
  const statusModal = ref({
    isOpen: false,
    isSaving: false,
    demand: null as IirgdDemand | null,
    newStatus: '' as string,
    error: '',
  })

  const statusOptions = Object.entries(IIRGD_STATUS_LABELS).map(([value, title]) => ({
    title,
    value,
  }))

  const openStatusModal = (demand: IirgdDemand) => {
    statusModal.value.demand = demand
    statusModal.value.newStatus = demand.status as string
    statusModal.value.isOpen = true
    statusModal.value.error = ''
  }

  const confirmStatusChange = async () => {
    if (!statusModal.value.demand?.id || !statusModal.value.newStatus) return

    statusModal.value.isSaving = true
    statusModal.value.error = ''
    try {
      await updateDemand(statusModal.value.demand.id, {
        status: statusModal.value.newStatus as IirgdDemandStatus,
      })
      toast.success('Status atualizado!')
      statusModal.value.isOpen = false
      await refresh()
    } catch (e: unknown) {
      statusModal.value.error = e instanceof Error ? e.message : 'Erro ao atualizar.'
    } finally {
      statusModal.value.isSaving = false
    }
  }

  const isNewDemandModalOpen = ref(false)
</script>

<template>
  <div>
    <div class="mb-4">
      <UiButton
        color="default"
        prepend-icon="arrowLeft"
        variant="ghost"
        @click="navigateTo('/iirgd')"
      >
        Voltar ao Dashboard
      </UiButton>
    </div>

    <UiContainer>
      <!-- Navegação Facilitada entre status -->
      <UiTabs v-model="currentTab" class="mb-4">
        <UiTab value="in-progress">Em Andamento</UiTab>
        <UiTab value="consulted">Consultados</UiTab>
        <UiTab value="released">Liberados</UiTab>
        <UiTab value="issued">Emitidos</UiTab>
        <UiTab value="errors">Erros</UiTab>
      </UiTabs>

      <UiCard variant="outline">
        <template #header>
          <div class="d-flex flex-wrap align-center w-100 ga-2">
            <UiIcon class="text-primary" left name="recordsList" />
            <span class="font-weight-medium">Demandas: {{ titles[group] }}</span>
            <UiChip class="flex-shrink-0" color="primary" size="sm" variant="solid">
              {{ totalItems }}
            </UiChip>

            <div class="ml-auto d-flex align-center" style="gap: 8px">
              <UiButton
                color="secondary"
                icon="refresh"
                :loading="pending"
                size="sm"
                variant="soft"
                @click="refresh"
              />
              <UiButton
                v-if="group === 'in-progress'"
                color="primary"
                prepend-icon="add"
                @click="isNewDemandModalOpen = true"
              >
                Nova Demanda
              </UiButton>
            </div>
          </div>
        </template>

        <div class="px-4 pt-4 pb-2">
          <UiRow>
            <UiCol cols="12" sm="8">
              <UiInput
                v-model="searchQuery"
                clearable
                hide-details
                icon="search"
                placeholder="Buscar por Nome, RG ou CPF"
              />
            </UiCol>
            <UiCol cols="12" sm="4">
              <UiSelect
                v-model="stationCode"
                clearable
                hide-details
                :items="['Todos', ...IIRGD_STATION_CODES]"
                placeholder="Filtrar por Posto"
              />
            </UiCol>
          </UiRow>
        </div>
        <UiTable
          :headers="[
            { text: 'Código Posto', value: 'station_code' },
            { text: 'Nome', value: 'name' },
            { text: 'RG', value: 'rg' },
            { text: 'CPF', value: 'cpf' },
            { text: 'Status', value: 'status', align: 'center' },
            { text: 'Data', value: 'created_at', align: 'right' },
          ]"
          :items="demands"
          :loading="pending"
        >
          <template #item-station_code="{ item }">
            <UiChip color="blue-grey" label size="sm" variant="soft">
              {{ item.station_code }}
            </UiChip>
          </template>
          <template #item-name="{ item }">
            <NuxtLink
              class="text-decoration-none text-primary font-weight-bold"
              :to="`/iirgd/${item.id}`"
            >
              {{ item.iirgd_citizens?.name || 'Cidadão não identificado' }}
            </NuxtLink>
          </template>
          <template #item-rg="{ item }">
            {{ item.iirgd_citizens?.rg ? padAndFormatRg(item.iirgd_citizens.rg, true) : '-' }}
          </template>
          <template #item-cpf="{ item }">
            {{ item.iirgd_citizens?.cpf || '-' }}
          </template>
          <template #item-status="{ item }">
            <UiChip
              :color="IIRGD_STATUS_COLORS[item.status as IirgdDemandStatus] || 'grey'"
              size="sm"
              style="cursor: pointer"
              variant="soft"
              @click="openStatusModal(item)"
            >
              {{ IIRGD_STATUS_LABELS[item.status as IirgdDemandStatus] || item.status }}
              <UiIcon class="ml-1" name="edit" size="xs" />
            </UiChip>
          </template>
          <template #item-created_at="{ item }">
            <span class="text-caption text-medium-emphasis">
              {{ new Date(item.created_at).toLocaleString('pt-BR') }}
            </span>
          </template>
        </UiTable>

        <template v-if="!isUnpaginated" #actions>
          <UiPagination
            v-model="currentPage"
            class="mt-2"
            :length="totalPages"
            size="sm"
            :total-visible="5"
          />
        </template>
      </UiCard>

      <!-- Chunk RGs -->
      <UiCard
        v-if="group === 'consulted' && consultadosRgsChunks.length"
        class="mt-6"
        variant="outline"
      >
        <template #header>
          <div class="d-flex flex-wrap align-center w-100 ga-2">
            <UiIcon class="text-primary" left name="copy" />
            <span class="font-weight-medium">RGs para Sistema Externo</span>
          </div>
        </template>
        <UiList bg-color="transparent" class="pa-0" size="sm">
          <UiListItem
            v-for="(chunk, index) in consultadosRgsChunks"
            :key="index"
            :title="chunk.text"
          >
            <template #append>
              <UiButton
                color="primary"
                icon="copy"
                size="sm"
                variant="ghost"
                @click="copyChunk(chunk.text)"
              />
              <UiButton
                class="ml-2"
                color="success"
                icon="check"
                size="sm"
                variant="ghost"
                @click="openReleaseModal(chunk.demands)"
              />
            </template>
          </UiListItem>
        </UiList>
      </UiCard>

      <!-- Modais -->
      <IirgdNewDemandModal
        v-if="group === 'in-progress'"
        v-model="isNewDemandModalOpen"
        @created="refresh"
      />

      <!-- Modal de Liberação de Lote -->
      <UiModal v-model="releaseModal.isOpen" max-width="600px" title="Liberar Demandas">
        <UiAlert v-if="releaseModal.error" class="mb-4" size="sm" type="error" variant="soft">
          {{ releaseModal.error }}
        </UiAlert>
        <p class="mb-4 text-body-2 text-medium-emphasis">
          As seguintes demandas serão atualizadas para <strong>Liberado</strong>:
        </p>
        <UiTable
          :headers="[
            { text: 'RG', value: 'rg' },
            { text: 'CPF', value: 'cpf' },
            { text: 'Nome', value: 'name' },
          ]"
          :items="releaseModal.demands"
        >
          <template #item-rg="{ item }">{{
            item.iirgd_citizens?.rg ? padAndFormatRg(item.iirgd_citizens.rg, true) : '-'
          }}</template>
          <template #item-name="{ item }">{{ item.iirgd_citizens?.name || '-' }}</template>
        </UiTable>
        <template #actions>
          <UiButton variant="ghost" @click="releaseModal.isOpen = false">Cancelar</UiButton>
          <UiButton
            color="success"
            :loading="releaseModal.isSaving"
            variant="solid"
            @click="confirmRelease"
          >
            Confirmar Liberação
          </UiButton>
        </template>
      </UiModal>

      <!-- Modal de Mudança de Status Inline -->
      <UiModal v-model="statusModal.isOpen" max-width="400px" title="Alterar Status">
        <UiAlert v-if="statusModal.error" class="mb-4" size="sm" type="error" variant="soft">
          {{ statusModal.error }}
        </UiAlert>
        <p class="mb-4 text-body-2 text-medium-emphasis">
          Selecione o novo status para a demanda de
          <strong>{{ statusModal.demand?.iirgd_citizens?.name || 'Desconhecido' }}</strong
          >:
        </p>
        <UiSelect
          v-model="statusModal.newStatus"
          item-title="title"
          item-value="value"
          :items="statusOptions"
          label="Novo Status"
        />
        <template #actions>
          <UiButton variant="ghost" @click="statusModal.isOpen = false">Cancelar</UiButton>
          <UiButton
            color="primary"
            :loading="statusModal.isSaving"
            variant="solid"
            @click="confirmStatusChange"
          >
            Salvar
          </UiButton>
        </template>
      </UiModal>
    </UiContainer>
  </div>
</template>
