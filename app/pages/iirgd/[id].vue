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

  const demandId = route.params.id as string

  const {
    data: demand,
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
  })
  const [status] = defineField('status')
  const [observation] = defineField('observation')
  const [stationCode] = defineField('station_code')

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

      await updateDemand(demandId, {
        status: formValues.status,
        observation: formValues.observation,
        station_code: formValues.station_code,
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
        <UiCol cols="12" lg="10" xl="8">
          <!-- Cabeçalho Principal -->
          <div class="d-flex align-center mb-6">
            <UiIcon class="mr-3" color="primary" name="userBadge" size="32" />
            <div>
              <div class="text-h5 font-weight-bold">{{ demand.iirgd_citizens?.name }}</div>
              <div class="text-subtitle-2 text-medium-emphasis">Detalhes do atendimento IIRGD</div>
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
          </div>

          <UiRow>
            <!-- Lado Esquerdo: Informações do Cidadão -->
            <UiCol cols="12" md="6">
              <UiCard class="h-100">
                <div class="pa-5">
                  <div class="d-flex align-center mb-4">
                    <UiIcon class="mr-2" color="primary" name="contactDetails" />
                    <div class="text-subtitle-1 font-weight-bold">Dados do Cidadão e Posto</div>
                  </div>

                  <div class="d-flex flex-column gap-4">
                    <UiRow dense>
                      <UiCol cols="12" sm="6">
                        <div class="text-caption text-medium-emphasis">Código do Posto</div>
                        <div class="mt-1">
                          <UiChip color="blue-grey" label size="sm" variant="soft">
                            {{ demand.station_code }}
                          </UiChip>
                        </div>
                      </UiCol>
                    </UiRow>

                    <UiDivider />

                    <UiRow dense>
                      <UiCol cols="12" sm="6">
                        <div class="text-caption text-medium-emphasis">Nome Completo</div>
                        <NuxtLink
                          class="text-body-1 font-weight-medium text-decoration-none text-primary"
                          :to="`/iirgd/citizens/${demand.citizen_id}`"
                        >
                          {{ demand.iirgd_citizens?.name }}
                        </NuxtLink>
                      </UiCol>
                    </UiRow>

                    <UiRow dense>
                      <UiCol cols="12" sm="6">
                        <div class="text-caption text-medium-emphasis">RG</div>
                        <div class="text-body-1 font-weight-mono">
                          {{
                            demand.iirgd_citizens?.rg
                              ? padAndFormatRg(demand.iirgd_citizens.rg, true)
                              : '-'
                          }}
                        </div>
                      </UiCol>
                      <UiCol cols="12" sm="6">
                        <div class="text-caption text-medium-emphasis">CPF</div>
                        <div class="text-body-1 font-weight-mono">
                          {{
                            demand.iirgd_citizens?.cpf ? formatCpf(demand.iirgd_citizens.cpf) : '-'
                          }}
                        </div>
                      </UiCol>
                    </UiRow>

                    <UiDivider />

                    <div>
                      <div class="text-caption text-medium-emphasis mb-2">
                        Histórico de Registro da Demanda Atual
                      </div>
                      <UiRow dense>
                        <UiCol cols="12">
                          <div class="text-caption text-medium-emphasis">Criado em</div>
                          <div class="text-body-2">
                            {{ new Date(demand.created_at).toLocaleString('pt-BR') }}
                          </div>
                        </UiCol>
                        <UiCol cols="12">
                          <div class="text-caption text-medium-emphasis">Última atualização</div>
                          <div class="text-body-2">
                            {{ new Date(demand.updated_at).toLocaleString('pt-BR') }}
                          </div>
                        </UiCol>
                      </UiRow>
                    </div>
                  </div>
                </div>
              </UiCard>
            </UiCol>

            <!-- Lado Direito: Status e Observação -->
            <UiCol cols="12" md="6">
              <UiCard class="h-100">
                <div class="pa-5">
                  <div class="d-flex align-center justify-space-between mb-4">
                    <div class="d-flex align-center">
                      <UiIcon class="mr-2" color="primary" name="document" />
                      <div class="text-subtitle-1 font-weight-bold">Acompanhamento</div>
                    </div>
                    <UiButton
                      v-if="canEditData"
                      color="primary"
                      prepend-icon="edit"
                      size="sm"
                      variant="soft"
                      @click="openEditModal"
                    >
                      Atualizar
                    </UiButton>
                  </div>

                  <div class="text-body-2 text-medium-emphasis mb-4">
                    Acompanhe a situação do atendimento e registre observações relevantes.
                  </div>

                  <UiTimeline
                    v-if="statusHistory && statusHistory.length"
                    align="start"
                    side="end"
                    size="sm"
                  >
                    <UiTimelineItem
                      v-for="item in statusHistory"
                      :key="item.id"
                      :dot-color="
                        IIRGD_STATUS_COLORS[item.status as IirgdDemandStatus] || 'default'
                      "
                      size="sm"
                    >
                      <div class="d-flex flex-column mb-3">
                        <div class="d-flex align-center justify-space-between mb-1">
                          <strong>{{
                            IIRGD_STATUS_LABELS[item.status as IirgdDemandStatus] || item.status
                          }}</strong>
                          <span class="text-caption text-medium-emphasis">
                            {{ new Date(item.created_at).toLocaleString('pt-BR') }}
                          </span>
                        </div>
                        <div class="text-body-2 text-medium-emphasis">
                          por {{ item.profiles?.name || 'Sistema' }}
                        </div>
                        <div
                          v-if="item.observation"
                          class="bg-surface-variant rounded pa-2 mt-2 text-body-2"
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
                </div>
              </UiCard>
            </UiCol>
          </UiRow>

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
            :items="stationCodes"
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
