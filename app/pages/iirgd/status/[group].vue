<script setup lang="ts">
  import { ref, computed } from 'vue'

  import { usePagination } from '~/composables/usePagination'
  import { useIirgdDemands, type IirgdDemand } from '~/composables/useIirgdDemands'
  import {
    IIRGD_STATUS_LABELS,
    IIRGD_STATUS_COLORS,
    IIRGD_STATUS_GROUPS,
    type IirgdDemandStatus,
  } from '~/constants/iirgd-status'
  import { IIRGD_STATION_CODES } from '~/constants/iirgd-stations'
  import { padAndFormatRg, formatCitizenName } from '~/utils/formatters'
  import { ROLES } from '~/constants/roles'

  definePageMeta({
    middleware: ['iirgd'],
    layout: 'default',
  })

  const route = useRoute()
  const { profile } = useProfile()
  const group = route.params.group as string

  // Restringir acesso para iirgd_user
  if (profile.value?.role === ROLES.IIRGD_USER && ['consulted', 'released'].includes(group)) {
    throw createError({ statusCode: 403, message: 'Acesso negado' })
  }

  // Para o UiTabs e navegação
  const currentTab = computed({
    get: () => group,
    set: (val) => navigateTo(`/iirgd/status/${val}`),
  })

  const titles: Record<string, string> = {
    'in-progress': 'Em Andamento',
    consulted: 'Consultados',
    released: 'Liberados',
    issued: 'RGs Emitidos',
    'issued-antecedents': 'Antecedentes Emitidos',
    errors: 'Erros e Pendências',
  }

  useHead({
    title: `${titles[group] || 'Demandas'} - IIRGD`,
  })

  const { fetchDemands, updateDemand, updateDemandsBatch } = useIirgdDemands()
  const toast = useToast()

  // Pagination and Filters
  const { currentPage, itemsPerPage, totalItems, totalPages, resetPage } = usePagination()
  const searchQuery = ref('')
  const stationCode = ref<string | null>(null)

  const isUnpaginated = group === 'consulted'
  const canEditStatus = computed(() => profile.value?.role !== ROLES.IIRGD_USER)
  const canBatchEdit = computed(() => {
    return profile.value?.role === ROLES.ADMIN || profile.value?.role === ROLES.IIRGD_MANAGER
  })

  const tableHeaders = computed(() => {
    const headers = [
      { text: 'Código Posto', value: 'station_code' },
      { text: 'Tipo Doc.', value: 'document_type_id' },
      { text: 'Nome', value: 'name' },
      { text: 'RG', value: 'rg' },
      { text: 'CPF', value: 'cpf' },
      { text: 'Status', value: 'status', align: 'center' as const },
      ...(group === 'errors' || group === 'in-progress'
        ? [{ text: 'Observações', value: 'observation' }]
        : []),
      { text: 'Data', value: 'created_at', align: 'right' as const },
    ]
    if (canBatchEdit.value) {
      return [{ text: '', value: 'select', width: 48, align: 'center' as const }, ...headers]
    }
    return headers
  })

  // Selection state for batch operations
  const selectedDemandIds = ref<string[]>([])

  const { fetchSettings, computePriority } = useIirgdSettings()
  const { data: slaSettings } = useAsyncData('iirgd-settings', fetchSettings)

  const {
    data: demandsRaw,
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

  const demands = computed(() => {
    return demandsRaw.value.map((d) => ({
      ...d,
      priority: computePriority(d, slaSettings.value || null),
    }))
  })

  const isAllPageSelected = computed(() => {
    if (!demands.value || demands.value.length === 0) return false
    return demands.value.every((d) => d.id && selectedDemandIds.value.includes(d.id))
  })

  const isSomePageSelected = computed(() => {
    if (!demands.value || demands.value.length === 0) return false
    const selectedCount = demands.value.filter(
      (d) => d.id && selectedDemandIds.value.includes(d.id),
    ).length
    return selectedCount > 0 && selectedCount < demands.value.length
  })

  const toggleSelectAllPage = (value: boolean | null) => {
    const pageIds = demands.value.map((d) => d.id).filter((id): id is string => Boolean(id))
    if (value) {
      const set = new Set([...selectedDemandIds.value, ...pageIds])
      selectedDemandIds.value = Array.from(set)
    } else {
      selectedDemandIds.value = selectedDemandIds.value.filter((id) => !pageIds.includes(id))
    }
  }

  const toggleSelectRow = (id?: string) => {
    if (!id) return
    const idx = selectedDemandIds.value.indexOf(id)
    if (idx > -1) {
      selectedDemandIds.value.splice(idx, 1)
    } else {
      selectedDemandIds.value.push(id)
    }
  }

  const isRowSelected = (id?: string) => {
    return id ? selectedDemandIds.value.includes(id) : false
  }

  const clearSelection = () => {
    selectedDemandIds.value = []
  }

  watch([searchQuery, stationCode, () => route.params.group], () => {
    clearSelection()
    resetPage()
  })

  // Chunk logic
  const consultadosRgsChunks = computed(() => {
    if (group !== 'consulted') return []
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

  const { copy } = useCopyToClipboard()

  const copyChunk = async (text: string) => {
    await copy(text, 'RGs copiados!')
  }

  const copySingleRg = async (rgFormatted: string) => {
    await copy(rgFormatted, 'RG copiado para a área de transferência!')
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
    observation: '',
    error: '',
  })

  const statusOptions = computed(() => {
    return IIRGD_STATUS_GROUPS.flatMap((g) =>
      g.options.map((opt) => ({
        title: `${IIRGD_STATUS_LABELS[opt]} (${g.label})`,
        value: opt,
      })),
    )
  })

  const openStatusModal = (demand: IirgdDemand) => {
    statusModal.value.demand = demand
    statusModal.value.newStatus = demand.status as string
    statusModal.value.observation = demand.observation || ''
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
        observation: statusModal.value.observation,
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

  // Batch Status Modal logic
  const batchModal = ref({
    isOpen: false,
    isSaving: false,
    newStatus: '' as string,
    observation: '',
    error: '',
  })

  const batchStatusOptions = computed(() => {
    return IIRGD_STATUS_GROUPS.flatMap((g) =>
      g.options.map((opt) => ({
        title: `${IIRGD_STATUS_LABELS[opt]} (${g.label})`,
        value: opt,
      })),
    )
  })

  const selectedDemandsPreview = computed(() => {
    const map = new Map(demands.value.map((d) => [d.id, d]))
    return selectedDemandIds.value
      .map((id) => map.get(id))
      .filter((d): d is IirgdDemand => Boolean(d))
  })

  const openBatchModal = () => {
    if (selectedDemandIds.value.length === 0) return
    batchModal.value.newStatus = ''
    batchModal.value.observation = ''
    batchModal.value.error = ''
    batchModal.value.isOpen = true
  }

  const confirmBatchStatusChange = async () => {
    if (!batchModal.value.newStatus || selectedDemandIds.value.length === 0) return

    batchModal.value.isSaving = true
    batchModal.value.error = ''
    try {
      const count = selectedDemandIds.value.length
      await updateDemandsBatch(selectedDemandIds.value, {
        status: batchModal.value.newStatus as IirgdDemandStatus,
        observation: batchModal.value.observation,
      })
      toast.success(
        `${count} ${count === 1 ? 'demanda atualizada' : 'demandas atualizadas'} com sucesso!`,
      )
      batchModal.value.isOpen = false
      clearSelection()
      await refresh()
    } catch (e: unknown) {
      batchModal.value.error =
        e instanceof Error ? e.message : 'Erro ao atualizar demandas em lote.'
    } finally {
      batchModal.value.isSaving = false
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
        <UiTab v-if="profile?.role !== ROLES.IIRGD_USER" value="consulted">Consultados</UiTab>
        <UiTab v-if="profile?.role !== ROLES.IIRGD_USER" value="released">Liberados</UiTab>
        <UiTab value="issued">RGs Emitidos</UiTab>
        <UiTab value="issued-antecedents">Antecedentes Emitidos</UiTab>
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
                v-if="canBatchEdit && selectedDemandIds.length > 0"
                color="primary"
                prepend-icon="edit"
                size="sm"
                variant="solid"
                @click="openBatchModal"
              >
                Alterar Status ({{ selectedDemandIds.length }})
              </UiButton>
              <UiActionButton
                action="refresh"
                :loading="pending"
                tooltip="Atualizar lista"
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
                label="Buscar"
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

        <!-- Barra de Ações em Lote -->
        <div
          v-if="canBatchEdit && selectedDemandIds.length > 0"
          class="d-flex flex-wrap align-center justify-space-between ga-2 px-4 py-2 mx-4 mb-3 rounded-lg border bg-surface-variant"
        >
          <div class="d-flex align-center ga-2">
            <UiIcon class="text-primary" name="check" />
            <span class="text-body-2 font-weight-medium">
              <strong>{{ selectedDemandIds.length }}</strong>
              {{ selectedDemandIds.length === 1 ? 'demanda selecionada' : 'demandas selecionadas' }}
            </span>
          </div>
          <div class="d-flex align-center ga-2">
            <UiButton size="sm" variant="ghost" @click="clearSelection"> Limpar seleção </UiButton>
            <UiButton
              color="primary"
              prepend-icon="edit"
              size="sm"
              variant="solid"
              @click="openBatchModal"
            >
              Alterar Status em Lote
            </UiButton>
          </div>
        </div>

        <UiTable :headers="tableHeaders" :items="demands" :loading="pending">
          <template #header-select>
            <div class="d-flex justify-center">
              <UiCheckbox
                :disabled="demands.length === 0"
                hide-details
                :indeterminate="isSomePageSelected"
                :model-value="isAllPageSelected"
                size="sm"
                @update:model-value="toggleSelectAllPage"
              />
            </div>
          </template>

          <template #item-select="{ item }">
            <div class="d-flex justify-center" @click.stop>
              <UiCheckbox
                hide-details
                :model-value="isRowSelected(item.id)"
                size="sm"
                @update:model-value="toggleSelectRow(item.id)"
              />
            </div>
          </template>
          <template #item-station_code="{ item }">
            <UiChip color="blue-grey" label size="sm" variant="soft">
              {{ item.station_code }}
            </UiChip>
          </template>
          <template #item-document_type_id="{ item }">
            {{ item.iirgd_document_types?.name || '-' }}
          </template>
          <template #item-name="{ item }">
            <div class="d-flex align-center gap-2">
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
              <UiButton
                color="secondary"
                icon="copy"
                size="xs"
                title="Copiar RG"
                variant="ghost"
                @click="copySingleRg(padAndFormatRg(item.iirgd_citizens.rg, true))"
              />
            </div>
            <div v-else-if="item.iirgd_citizens?.other_document" class="d-flex align-center ga-1">
              <span>{{ item.iirgd_citizens.other_document }}</span>
              <UiChip color="orange" label size="xs" variant="soft">Outro Estado</UiChip>
            </div>
            <span v-else>-</span>
          </template>
          <template #item-cpf="{ item }">
            {{ item.iirgd_citizens?.cpf || '-' }}
          </template>
          <template #item-status="{ item }">
            <UiChip
              :color="IIRGD_STATUS_COLORS[item.status as IirgdDemandStatus] || 'grey'"
              size="sm"
              :style="canEditStatus ? 'cursor: pointer' : ''"
              variant="soft"
              @click="canEditStatus ? openStatusModal(item) : undefined"
            >
              {{ IIRGD_STATUS_LABELS[item.status as IirgdDemandStatus] || item.status }}
              <UiIcon v-if="canEditStatus" class="ml-1" name="edit" size="xs" />
            </UiChip>
          </template>
          <template #item-observation="{ item }">
            <span
              v-if="item.observation"
              class="text-body-2 text-truncate d-inline-block"
              style="max-width: 250px"
              :title="item.observation"
            >
              {{ item.observation }}
            </span>
            <span v-else class="text-medium-emphasis">-</span>
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
          <template #item-name="{ item }">{{
            formatCitizenName(item.iirgd_citizens?.name) || '-'
          }}</template>
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
      <UiModal v-model="statusModal.isOpen" max-width="480px" title="Alterar Status">
        <UiAlert v-if="statusModal.error" class="mb-4" size="sm" type="error" variant="soft">
          {{ statusModal.error }}
        </UiAlert>
        <p class="mb-4 text-body-2 text-medium-emphasis">
          Selecione o novo status para a demanda de
          <strong>{{
            formatCitizenName(statusModal.demand?.iirgd_citizens?.name) || 'Desconhecido'
          }}</strong
          >:
        </p>
        <UiSelect
          v-model="statusModal.newStatus"
          class="mb-3"
          item-title="title"
          item-value="value"
          :items="statusOptions"
          label="Novo Status"
        />

        <UiTextarea
          v-model="statusModal.observation"
          :hint="
            statusModal.newStatus === 'unknown_error'
              ? 'Descreva o motivo do erro desconhecido.'
              : 'Opcional. Registre observações sobre este status.'
          "
          label="Observação"
          persistent-hint
          placeholder="Ex: Motivo do erro ou observações sobre a solicitação..."
          :rows="3"
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

      <!-- Modal de Alteração de Status em Lote -->
      <UiModal v-model="batchModal.isOpen" max-width="520px" title="Alterar Status em Lote">
        <UiAlert v-if="batchModal.error" class="mb-4" size="sm" type="error" variant="soft">
          {{ batchModal.error }}
        </UiAlert>

        <p class="mb-3 text-body-2 text-medium-emphasis">
          Você está prestes a atualizar o status de
          <strong>
            {{ selectedDemandIds.length }}
            {{
              selectedDemandIds.length === 1 ? 'demanda selecionada' : 'demandas selecionadas'
            }} </strong
          >.
        </p>

        <!-- Preview de selecionados -->
        <div
          v-if="selectedDemandsPreview.length > 0"
          class="mb-4 pa-3 rounded-lg border bg-surface-variant text-caption"
        >
          <div class="font-weight-medium mb-1">Demandas selecionadas:</div>
          <div class="text-medium-emphasis">
            {{
              selectedDemandsPreview
                .slice(0, 5)
                .map((d) => formatCitizenName(d.iirgd_citizens?.name) || 'Sem nome')
                .join(', ')
            }}
            <span v-if="selectedDemandIds.length > 5">
              e mais {{ selectedDemandIds.length - 5 }} outra(s)...
            </span>
          </div>
        </div>

        <UiSelect
          v-model="batchModal.newStatus"
          class="mb-3"
          item-title="title"
          item-value="value"
          :items="batchStatusOptions"
          label="Novo Status *"
          placeholder="Selecione o novo status"
        />

        <UiTextarea
          v-model="batchModal.observation"
          hint="Opcional. Se informada, esta observação será registrada para todas as demandas selecionadas."
          label="Observação (opcional)"
          persistent-hint
          placeholder="Ex: Atualização em lote autorizada pela gestão..."
          :rows="3"
        />

        <template #actions>
          <UiButton
            :disabled="batchModal.isSaving"
            variant="ghost"
            @click="batchModal.isOpen = false"
          >
            Cancelar
          </UiButton>
          <UiButton
            color="primary"
            :disabled="!batchModal.newStatus"
            :loading="batchModal.isSaving"
            variant="solid"
            @click="confirmBatchStatusChange"
          >
            Confirmar Alteração
          </UiButton>
        </template>
      </UiModal>
    </UiContainer>
  </div>
</template>
