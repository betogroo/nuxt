<script setup lang="ts">
  import type { DemandRow } from '~/composables/useDemands'
  import { useZodForm } from '~/composables/useZodForm'
  import { demandFormSchema } from '~/schemas/forms/demand'

  definePageMeta({
    icon: 'recordsList',
    middleware: ['uge'],
    navLabel: 'Demandas',
    navSubtitle: 'Gerencie processos e demandas de compras',
    navColor: 'primary',
    navGroup: 'management',
    navOrder: 10,
    roles: ['admin', 'uge'],
    showIn: ['drawer', 'home'],
  })
  useHead({ title: 'Demandas' })

  const { profile } = useProfile()

  const { fetchDemands, createDemand, updateDemand } = useDemands()
  const route = useRoute()

  const { currentPage, itemsPerPage, totalItems, totalPages, resetPage } = usePagination()
  const statusFilter = ref<string | null>((route.query.filter as string) || null)
  const searchQuery = ref('')

  const {
    data: demands,
    pending,
    refresh,
  } = useAsyncData(
    'demands-list',
    async () => {
      const result = await fetchDemands(
        currentPage.value,
        itemsPerPage.value,
        statusFilter.value,
        searchQuery.value,
      )
      totalItems.value = result.count
      return result.data
    },
    {
      watch: [currentPage, statusFilter, searchQuery],
    },
  )

  watch([statusFilter, searchQuery], () => {
    resetPage()
  })

  const { errors, defineField, resetForm, handleSubmit } = useZodForm(demandFormSchema, {
    name: '',
    type: 'consumption',
    process_number: '',
    id_pca: '',
    contract_number: '',
  })

  const [name, nameProps] = defineField('name')
  const [type, typeProps] = defineField('type')
  const [processNumber, processNumberProps] = defineField('process_number')
  const [idPca, idPcaProps] = defineField('id_pca')
  const [contractNumber, contractNumberProps] = defineField('contract_number')

  const modal = useModal<{ id?: string }>({})

  const originalOpen = modal.open.bind(modal)
  modal.open = (item?: Partial<DemandRow>) => {
    if (item) {
      resetForm({
        values: {
          id: item.id,
          name: item.name || '',
          type: item.type || 'consumption',
          process_number: item.process_number || '',
          id_pca: item.id_pca || '',
          contract_number: item.contract_number ? String(item.contract_number) : '',
        },
      })
      originalOpen({ id: item.id })
    } else {
      resetForm()
      originalOpen({})
    }
  }

  const canEdit = (demand: DemandRow) => {
    const currentUserId = profile.value?.id
    return profile.value?.role === 'admin' || demand.user_id === currentUserId
  }

  const saveDemand = handleSubmit(async (values) => {
    modal.startSaving()
    modal.error.value = ''
    try {
      const payload = {
        name: values.name,
        type: values.type,
        process_number: values.process_number || null,
        id_pca: values.id_pca || null,
        contract_number: values.contract_number ? String(values.contract_number) : null,
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

  const statusOptions = [
    { title: 'Planejamento', value: 'planning', color: 'blue-grey' },
    { title: 'Aviso de Contratação', value: 'bidding_notice', color: 'info' },
    { title: 'Cotação', value: 'quotation', color: 'secondary' },
    { title: 'Disputa', value: 'dispute', color: 'warning' },
    { title: 'Homologação', value: 'homologation', color: 'deep-purple' },
    { title: 'Concluído', value: 'completed', color: 'success' },
    { title: 'Cancelado', value: 'cancelled', color: 'error' },
    { title: 'Retorno (Admin)', value: 'returns', color: 'orange' },
  ]
</script>

<template>
  <div>
    <PageHeader subtitle="Gerencie as demandas e processos" title="Demandas"> </PageHeader>

    <UiCard>
      <template #header>
        <UiIcon class="mr-2" color="primary" name="recordsList" />
        Lista de Demandas
        <UiChip v-if="totalItems > 0" class="ml-2" label size="xs" variant="soft">
          {{ totalItems }}
        </UiChip>
        <UiSpacer />
        <!-- Filtros inline -->
        <div class="d-flex gap-2 align-center">
          <UiInput
            v-model="searchQuery"
            clearable
            size="sm"
            hide-details
            label="Buscar..."
            prepend-inner-icon="search"
            rounded="lg"
            style="min-width: 200px; max-width: 260px"
            variant="outline"
          />
          <UiSelect
            v-model="statusFilter"
            clearable
            size="sm"
            hide-details
            item-title="title"
            item-value="value"
            :items="statusOptions"
            label="Status"
            rounded="lg"
            style="min-width: 180px; max-width: 220px"
            variant="outline"
          />
          <UiDivider class="mx-2" vertical />
          <UiButton
            class="mr-2"
            color="secondary"
            icon="refresh"
            :loading="pending"
            size="sm"
            variant="soft"
            @click="refresh"
          />
          <UiButton color="primary" prepend-icon="add" @click="modal.open()">
            Nova Demanda
          </UiButton>
        </div>
      </template>

      <UiTable
        :headers="[
          { text: 'Nº Processo', value: 'internal_process_number' },
          { text: 'Nome', value: 'name' },
          { text: 'Tipo', value: 'type' },
          { text: 'Status', value: 'status' },
          { text: 'Criado por', value: 'creator' },
          { text: 'Ações', value: 'actions', align: 'right' },
        ]"
        :items="demands || []"
        :loading="pending"
      >
        <template v-if="!demands?.length && !pending" #empty>
          Nenhuma demanda encontrada.
        </template>
        <template #item-internal_process_number="{ item }">
          <div v-if="item.process_number" class="font-weight-bold text-primary">
            {{ item.process_number }}
          </div>
          <div v-else class="text-caption text-medium-emphasis font-italic">Sem nº oficial</div>
          <div class="text-caption text-medium-emphasis">
            Interno: {{ item.internal_process_number || '-' }}
          </div>
        </template>
        <template #item-name="{ item }">
          <NuxtLink
            class="text-decoration-none text-primary font-weight-medium"
            :to="`/demands/${item.id}`"
          >
            {{ item.name }}
          </NuxtLink>
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
          <div class="d-flex align-center gap-1 flex-wrap">
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
        </template>
        <template #item-creator="{ item }">
          <span class="text-body-2 text-medium-emphasis">
            {{ item.profiles?.name || `Usuário (${item.user_id.split('-')[0]})` }}
          </span>
        </template>
        <template #item-actions="{ item }">
          <UiButton
            color="primary"
            icon="next"
            size="sm"
            :to="`/demands/${item.id}`"
            variant="ghost"
          />
          <UiButton
            v-if="canEdit(item)"
            color="default"
            icon="editOutline"
            size="sm"
            variant="ghost"
            @click="modal.open(item)"
          />
        </template>
      </UiTable>

      <!-- Paginação -->
      <div v-if="totalPages > 1" class="d-flex justify-center py-4">
        <UiPagination
          v-model="currentPage"
          size="md"
          :length="totalPages"
          rounded="lg"
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
  </div>
</template>
