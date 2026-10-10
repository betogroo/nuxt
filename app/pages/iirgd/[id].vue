<script setup lang="ts">
  import { padAndFormatRg, formatCpf } from '~/utils/formatters'
  import {
    IIRGD_STATUS_LABELS,
    IIRGD_STATUS_COLORS,
    IIRGD_STATUS_GROUPS,
    type IirgdDemandStatus,
  } from '~/constants/iirgd-status'
  import { IIRGD_STATION_CODES } from '~/constants/iirgd-stations'
  import { iirgdStatusChangeFormSchema } from '~/schemas/forms/iirgd-status-change'
  import { ROLES } from '~/constants/roles'
  const stationCodes = IIRGD_STATION_CODES
  const { profile } = useProfile()

  definePageMeta({ middleware: ['iirgd'] })
  const route = useRoute()
  const router = useRouter()

  const { fetchDemandById, updateDemand, fetchCitizenHistory, fetchDemandStatusHistory } =
    useIirgdDemands()
  const { fetchAllActiveDocumentTypes, createPendingDocumentType } = useIirgdDocumentTypes()

  const demandId = route.params.id as string

  // Fetch active document types for the combobox
  const { data: activeDocumentTypes } = useAsyncData('active-iirgd-doc-types', () =>
    fetchAllActiveDocumentTypes(),
  )

  const { fetchSettings, computePriority } = useIirgdSettings()
  const { data: slaSettings } = useAsyncData('iirgd-settings', fetchSettings)

  const {
    data: demandRaw,
    pending,
    refresh: refreshDemand,
  } = useAsyncData(`iirgd-demand-${demandId}`, async () => {
    try {
      return await fetchDemandById(demandId)
    } catch (e) {
      console.error(e)
      return null
    }
  })

  const demand = computed(() => {
    if (!demandRaw.value) return null
    return {
      ...demandRaw.value,
      priority: computePriority(demandRaw.value, slaSettings.value || null),
    }
  })

  const { data: history } = useAsyncData(
    `iirgd-history-${demandId}`,
    async () => {
      if (demand.value?.citizen_id) {
        return await fetchCitizenHistory(demand.value.citizen_id)
      }
      return []
    },
    { watch: [demand] },
  )

  const { data: statusHistory, refresh: refreshStatusHistory } = useAsyncData(
    `iirgd-status-history-${demandId}`,
    async () => {
      return await fetchDemandStatusHistory(demandId)
    },
  )

  const refresh = async () => {
    await Promise.all([refreshDemand(), refreshStatusHistory()])
  }

  // Modal State para Editar Observação/Status
  const canEditStatus = computed(() => {
    return profile.value?.role === ROLES.ADMIN || profile.value?.role === ROLES.IIRGD_MANAGER
  })

  const canEditData = computed(() => {
    return canEditStatus.value || demand.value?.status === 'new'
  })

  const isEditing = ref(false)
  const isSaving = ref(false)
  const editError = ref('')

  const { errors, defineField, resetForm, handleSubmit } = useZodForm(iirgdStatusChangeFormSchema, {
    status: 'new',
    observation: '',
    station_code: '',
    document_type_id: '',
  })
  const [status] = defineField('status')
  const [observation] = defineField('observation')
  const [stationCode] = defineField('station_code')
  const [documentTypeId] = defineField('document_type_id')

  // Achatar os grupos para o UiSelect formatando com o nome do grupo
  const statusOptions = computed(() => {
    return IIRGD_STATUS_GROUPS.flatMap((group) =>
      group.options.map((opt) => ({
        title: `${IIRGD_STATUS_LABELS[opt]} (${group.label})`,
        value: opt,
      })),
    )
  })

  const openEditModal = () => {
    if (demand.value) {
      resetForm({
        values: {
          status: (demand.value.status as IirgdDemandStatus) || 'new',
          observation: demand.value.observation || '',
          station_code: demand.value.station_code || '',
          document_type_id: demand.value.document_type_id || '',
        },
      })
      editError.value = ''
      isEditing.value = true
    }
  }

  const closeEditModal = () => {
    isEditing.value = false
  }

  const saveEdit = handleSubmit(async (formValues) => {
    try {
      isSaving.value = true
      editError.value = ''

      let finalDocumentTypeId = formValues.document_type_id
      if (
        finalDocumentTypeId &&
        !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
          finalDocumentTypeId,
        )
      ) {
        const newType = await createPendingDocumentType(finalDocumentTypeId)
        finalDocumentTypeId = newType.id
      }

      await updateDemand(demandId, {
        status: formValues.status,
        observation: formValues.observation,
        station_code: formValues.station_code,
        document_type_id: finalDocumentTypeId || undefined,
      })

      await refresh()
      closeEditModal()
    } catch (e: unknown) {
      editError.value = e instanceof Error ? e.message : 'Ocorreu um erro ao atualizar.'
    } finally {
      isSaving.value = false
    }
  })

  useHead({
    title: computed(() =>
      demand.value ? `Demanda IIRGD: ${demand.value.iirgd_citizens?.name}` : 'Detalhes IIRGD',
    ),
  })
</script>

<template>
  <div>
    <div class="mb-6">
      <UiButton
        color="default"
        prepend-icon="arrowLeft"
        variant="ghost"
        @click="router.push('/iirgd')"
      >
        Voltar para Demandas IIRGD
      </UiButton>
    </div>

    <!-- Loading state -->
    <div v-if="pending" class="d-flex justify-center my-16">
      <UiProgressCircular color="primary" indeterminate size="48" width="3" />
    </div>

    <div v-else-if="demand">
      <UiRow justify="center">
        <UiCol cols="12" lg="10" xl="9">
          <!-- Cabeçalho Principal -->
          <div class="d-flex align-center flex-wrap ga-4 mb-8">
            <UiIcon color="primary" name="userBadge" size="40" />
            <div>
              <div class="text-h5 font-weight-bold">{{ demand.iirgd_citizens?.name }}</div>
              <div class="text-subtitle-2 text-medium-emphasis">
                Atendimento IIRGD · Posto {{ demand.station_code }}
              </div>
            </div>
            <UiSpacer />
            <UiChip
              :color="IIRGD_STATUS_COLORS[demand.status as IirgdDemandStatus] || 'default'"
              label
              size="default"
              variant="soft"
            >
              {{
                IIRGD_STATUS_LABELS[demand.status as IirgdDemandStatus] ||
                demand.status ||
                'Não informado'
              }}
            </UiChip>
            <UiChip v-if="demand.priority === 'delay'" color="error" size="default" variant="solid" label>
              Atraso
            </UiChip>
            <UiChip v-else-if="demand.priority === 'alert'" color="warning" size="default" variant="solid" label>
              Alerta
            </UiChip>
            <UiButton
              v-if="canEditData"
              color="primary"
              prepend-icon="edit"
              variant="solid"
              @click="openEditModal"
            >
              Atualizar
            </UiButton>
          </div>

          <UiRow>
            <!-- Cidadão -->
            <UiCol cols="12" md="5">
              <UiCard class="h-100">
                <template #header>
                  <UiIcon color="primary" name="contactDetails" />
                  <span>Cidadão</span>
                </template>

                <div class="d-flex flex-column ga-6">
                  <div>
                    <div class="text-overline text-medium-emphasis">Nome completo</div>
                    <NuxtLink
                      class="text-body-1 font-weight-medium text-decoration-none text-primary"
                      :to="`/iirgd/citizens/${demand.citizen_id}`"
                    >
                      {{ demand.iirgd_citizens?.name }}
                    </NuxtLink>
                  </div>

                  <div>
                    <div class="text-overline text-medium-emphasis">RG</div>
                    <div class="text-body-1 font-weight-medium">
                      {{
                        demand.iirgd_citizens?.rg
                          ? padAndFormatRg(demand.iirgd_citizens.rg, true)
                          : '-'
                      }}
                    </div>
                  </div>

                  <div>
                    <div class="text-overline text-medium-emphasis">CPF</div>
                    <div class="text-body-1 font-weight-medium">
                      {{ demand.iirgd_citizens?.cpf ? formatCpf(demand.iirgd_citizens.cpf) : '-' }}
                    </div>
                  </div>
                </div>
              </UiCard>
            </UiCol>

            <!-- Atendimento -->
            <UiCol cols="12" md="7">
              <UiCard class="h-100">
                <template #header>
                  <UiIcon color="primary" name="document" />
                  <span>Atendimento</span>
                </template>

                <div class="d-flex flex-column ga-6">
                  <UiRow>
                    <UiCol cols="12" sm="6">
                      <div class="text-overline text-medium-emphasis">Código do posto</div>
                      <div class="mt-1">
                        <UiChip color="blue-grey" label size="sm" variant="soft">
                          {{ demand.station_code }}
                        </UiChip>
                      </div>
                    </UiCol>
                    <UiCol cols="12" sm="6">
                      <div class="text-overline text-medium-emphasis">Tipo do documento</div>
                      <div class="text-body-1 font-weight-medium">
                        {{ demand.iirgd_document_types?.name || '-' }}
                      </div>
                    </UiCol>
                  </UiRow>

                  <div>
                    <div class="text-overline text-medium-emphasis">Observações gerais</div>
                    <div
                      v-if="demand.observation"
                      class="bg-surface-variant rounded-lg pa-3 mt-1 text-body-2"
                      style="white-space: pre-wrap"
                    >
                      {{ demand.observation }}
                    </div>
                    <div v-else class="text-body-2 text-medium-emphasis">
                      Nenhuma observação registrada.
                    </div>
                  </div>

                  <UiDivider />

                  <UiRow>
                    <UiCol cols="12" sm="4">
                      <div class="text-overline text-medium-emphasis">Criado em</div>
                      <div class="text-body-2">
                        {{ new Date(demand.created_at).toLocaleString('pt-BR') }}
                      </div>
                    </UiCol>
                    <UiCol cols="12" sm="4">
                      <div class="text-overline text-medium-emphasis">Cadastrado por</div>
                      <div class="text-body-2">{{ demand.profiles?.name || 'Sistema' }}</div>
                    </UiCol>
                    <UiCol cols="12" sm="4">
                      <div class="text-overline text-medium-emphasis">Última atualização</div>
                      <div class="text-body-2">
                        {{ demand.updated_at ? new Date(demand.updated_at).toLocaleString('pt-BR') : '-' }}
                      </div>
                    </UiCol>
                  </UiRow>
                </div>
              </UiCard>
            </UiCol>
          </UiRow>

          <!-- Histórico de acompanhamento -->
          <UiCard class="mt-6">
            <template #header>
              <UiIcon color="primary" name="document" />
              <span>Histórico de acompanhamento</span>
            </template>

            <div class="text-body-2 text-medium-emphasis mb-6">
              Acompanhe a situação do atendimento e as observações registradas a cada mudança.
            </div>

            <UiTimeline v-if="statusHistory && statusHistory.length" align="start" side="end">
              <UiTimelineItem
                v-for="item in statusHistory"
                :key="item.id"
                :dot-color="IIRGD_STATUS_COLORS[item.status as IirgdDemandStatus] || 'default'"
                size="small"
              >
                <div class="d-flex flex-column pb-4">
                  <div class="d-flex align-center flex-wrap ga-2 mb-1">
                    <strong>{{
                      IIRGD_STATUS_LABELS[item.status as IirgdDemandStatus] || item.status
                    }}</strong>
                    <UiSpacer />
                    <span class="text-caption text-medium-emphasis">
                      {{ new Date(item.created_at).toLocaleString('pt-BR') }}
                    </span>
                  </div>
                  <div class="text-body-2 text-medium-emphasis">
                    por {{ item.profiles?.name || 'Sistema' }}
                  </div>
                  <div
                    v-if="item.observation"
                    class="bg-surface-variant rounded-lg pa-3 mt-2 text-body-2"
                    style="white-space: pre-wrap"
                  >
                    {{ item.observation }}
                  </div>
                </div>
              </UiTimelineItem>
            </UiTimeline>

            <div v-else class="text-center pa-4 text-medium-emphasis">
              Nenhum histórico registrado.
            </div>
          </UiCard>

          <!-- Histórico de solicitações do cidadão -->
          <UiCard class="mt-6" title="Histórico de Solicitações do Cidadão" variant="outline">
            <UiTable
              :headers="[
                { text: 'Posto', value: 'station_code' },
                { text: 'Status', value: 'status', align: 'center' },
                { text: 'Observações', value: 'observation' },
                { text: 'Data', value: 'created_at', align: 'right' },
                { text: '', value: 'actions', align: 'right' },
              ]"
              :items="history || []"
            >
              <template #empty>
                <div class="pa-4 text-center text-medium-emphasis">
                  Nenhum histórico encontrado.
                </div>
              </template>
              <template #item-station_code="{ item }">
                <UiChip color="blue-grey" label size="sm" variant="soft">
                  {{ item.station_code }}
                </UiChip>
              </template>
              <template #item-status="{ item }">
                <UiChip
                  :color="IIRGD_STATUS_COLORS[item.status as IirgdDemandStatus] || 'default'"
                  label
                  size="sm"
                  variant="soft"
                >
                  {{
                    IIRGD_STATUS_LABELS[item.status as IirgdDemandStatus] ||
                    item.status ||
                    'Não informado'
                  }}
                </UiChip>
              </template>
              <template #item-observation="{ item }">
                <span
                  class="text-caption"
                  style="
                    display: block;
                    max-width: 250px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                  "
                >
                  {{ item.observation || '-' }}
                </span>
              </template>
              <template #item-created_at="{ item }">
                <span class="text-caption text-medium-emphasis">
                  {{ new Date(item.created_at).toLocaleString('pt-BR') }}
                </span>
              </template>
              <template #item-actions="{ item }">
                <UiButton
                  v-if="item.id !== demandId"
                  color="primary"
                  icon="externalLink"
                  size="sm"
                  title="Acessar"
                  :to="`/iirgd/${item.id}`"
                  variant="ghost"
                />
                <UiChip v-else color="primary" size="sm" variant="solid">Atual</UiChip>
              </template>
            </UiTable>
          </UiCard>
        </UiCol>
      </UiRow>
    </div>

    <div v-else>
      <UiAlert type="error" variant="soft">Demanda IIRGD não encontrada.</UiAlert>
    </div>

    <!-- Modal de Edição -->
    <UiModal v-model="isEditing" max-width="500px" title="Atualizar Demanda IIRGD">
      <UiAlert v-if="editError" class="mb-4" size="sm" type="error" variant="soft">
        {{ editError }}
      </UiAlert>

      <UiRow dense>
        <UiCol cols="12">
          <UiCombobox
            v-if="canEditData"
            v-model="documentTypeId"
            :error-messages="errors.document_type_id"
            item-title="name"
            item-value="id"
            :items="activeDocumentTypes || []"
            label="Tipo do Documento"
            placeholder="Selecione ou digite um novo tipo..."
          />
        </UiCol>
        <UiCol cols="12">
          <UiSelect
            v-if="canEditStatus"
            v-model="status"
            :error-messages="errors.status"
            item-title="title"
            item-value="value"
            :items="statusOptions"
            label="Status do Atendimento"
          />
        </UiCol>
        <UiCol cols="12">
          <UiSelect
            v-model="stationCode"
            :error-messages="errors.station_code"
            :items="[...stationCodes]"
            label="Código do Posto"
            placeholder="Selecione"
          />
        </UiCol>
        <UiCol cols="12">
          <UiTextarea
            v-model="observation"
            :error-messages="errors.observation"
            label="Observações Gerais"
            rounded="lg"
            rows="4"
            size="md"
            variant="outline"
          />
        </UiCol>
      </UiRow>

      <template #actions>
        <UiButton variant="ghost" @click="closeEditModal">Cancelar</UiButton>
        <UiButton color="primary" :loading="isSaving" variant="solid" @click="saveEdit">
          Salvar
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>
