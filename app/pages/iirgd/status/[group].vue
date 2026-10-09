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

  const titles: Record<string, string> = {
    'em-andamento': 'Em Andamento',
    consultado: 'Consultados',
    liberado: 'Liberados',
    emitidos: 'Emitidos',
    erros: 'Erros e Pendências',
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

  // O "consultado" não usa paginação (traz tudo)
  const isUnpaginated = group === 'consultado'

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

  // Reset page when filters change
  watch([searchQuery, stationCode], () => resetPage())

  // --- Lógica exclusiva do "Consultado" (Bulk Release de RGs em blocos de 8) ---
  const consultadosRgsChunks = computed(() => {
    if (group !== 'consultado') return []
    const validDemands = demands.value.filter((d) => d.iirgd_citizens?.rg)

    const chunks: Array<{ text: string; demands: IirgdDemand[] }> = []
    for (let i = 0; i < validDemands.length; i += 8) {
      const chunkDemands = validDemands.slice(i, i + 8)
      const chunkString = chunkDemands
        .map((d) => d.iirgd_citizens.rg.replace(/[^a-zA-Z0-9]/g, ''))
        .join('')
      chunks.push({
        text: chunkString,
        demands: chunkDemands,
      })
    }
    return chunks
  })

  const copyChunk = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success('RGs copiados para a área de transferência!')
    } catch (e) {
      toast.error('Falha ao copiar bloco de RGs.')
      console.error(e)
    }
  }

  // Modal de liberação
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
        if (demand.id) {
          await updateDemand(demand.id, { status: 'released' })
        }
      }
      releaseModal.value.isOpen = false
      toast.success('Demandas liberadas com sucesso!')
      await refresh()
    } catch (e: unknown) {
      releaseModal.value.error = e instanceof Error ? e.message : 'Erro ao liberar demandas'
    } finally {
      releaseModal.value.isSaving = false
    }
  }

  // Nova Demanda Modal
  const isNewDemandModalOpen = ref(false)
</script>

<template>
  <div>
    <PageHeader
      :subtitle="`Gestão de demandas com status: ${titles[group]}`"
      :title="titles[group] || 'Lista de Demandas'"
    >
      <template #actions>
        <UiButton
          class="mr-2"
          color="secondary"
          icon="arrowBack"
          size="sm"
          variant="soft"
          @click="navigateTo('/iirgd')"
        >
          Voltar ao Dashboard
        </UiButton>

        <UiButton
          class="mr-2"
          color="secondary"
          icon="refresh"
          :loading="pending"
          size="sm"
          variant="soft"
          @click="refresh"
        />

        <UiButton
          v-if="group === 'em-andamento'"
          color="primary"
          prepend-icon="add"
          @click="isNewDemandModalOpen = true"
        >
          Nova Demanda
        </UiButton>
      </template>
    </PageHeader>

    <UiContainer>
      <!-- Filters -->
      <UiRow class="mb-4">
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

      <!-- Table -->
      <UiCard>
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
            >
              {{ IIRGD_STATUS_LABELS[item.status as IirgdDemandStatus] || item.status }}
            </UiChip>
          </template>
          <template #item-created_at="{ item }">
            <span class="text-caption text-medium-emphasis">
              {{ new Date(item.created_at).toLocaleString('pt-BR') }}
            </span>
          </template>
        </UiTable>

        <template v-if="!isUnpaginated" #actions>
          <Pagination
            v-model="currentPage"
            class="mt-2"
            :length="totalPages"
            size="sm"
            :total-visible="5"
          />
        </template>
      </UiCard>

      <!-- Seção exclusiva da aba Consultado: Blocos de 8 RGs -->
      <div v-if="group === 'consultado' && consultadosRgsChunks.length" class="mt-6">
        <div class="d-flex align-center mb-2">
          <h3 class="text-h6 mb-0">RGs para Sistema Externo</h3>
          <UiSpacer />
        </div>
        <UiCard class="bg-grey-lighten-4" variant="outline">
          <UiList bg-color="transparent" size="sm">
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
      </div>

      <!-- Modais Extras -->
      <IirgdNewDemandModal
        v-if="group === 'em-andamento'"
        v-model="isNewDemandModalOpen"
        @created="refresh"
      />

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
          <template #item-rg="{ item }">
            {{ item.iirgd_citizens?.rg ? padAndFormatRg(item.iirgd_citizens.rg, true) : '-' }}
          </template>
          <template #item-name="{ item }">
            {{ item.iirgd_citizens?.name || '-' }}
          </template>
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
    </UiContainer>
  </div>
</template>
