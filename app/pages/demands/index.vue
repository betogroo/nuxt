<script setup lang="ts">
  import type { DemandRow } from '~/composables/useDemands'
  import { useZodForm } from '~/composables/useZodForm'
  import { demandFormSchema } from '~/schemas/forms/demand'
  import { ROLES } from '~/constants/roles'

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
  const { canEditDemand, canDeleteDemand } = usePermissions()
  const toast = useToast()

  const { fetchDemands, createDemand, updateDemand, deleteDemand } = useDemands()
  const route = useRoute()

  const { currentPage, itemsPerPage, totalItems, totalPages, resetPage } = usePagination()
  const statusFilter = ref<string | null>((route.query.filter as string) || null)
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

      if (profile.value?.role === ROLES.ADMIN && values.internal_process_number) {
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

  const statusOptions = getDemandStatusFilterOptions()
</script>

<template>
  <div>
    <UiPageHeader subtitle="Gerencie as demandas e processos" title="Demandas"> </UiPageHeader>

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
            hide-details
            label="Buscar..."
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
            label="Status"
            rounded="lg"
            size="sm"
            style="min-width: 180px; max-width: 220px"
            variant="outline"
          />
          <UiDivider class="mx-2" vertical />
          <div class="d-flex align-center gap-3">
            <UiActionButton
              action="refresh"
              :loading="pending"
              tooltip="Atualizar lista"
              variant="soft"
              @click="refresh"
            />
            <UiButton color="primary" prepend-icon="add" @click="modal.open()">
              Nova Demanda
            </UiButton>
          </div>
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
          <div class="d-flex justify-end gap-2">
            <UiActionButton
              action="view"
              :to="`/demands/${item.id}`"
              tooltip="Ver detalhes da demanda"
            />
            <UiActionButton
              v-if="canEdit(item)"
              action="edit"
              color="default"
              tooltip="Editar demanda"
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
        v-if="profile?.role === ROLES.ADMIN"
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
