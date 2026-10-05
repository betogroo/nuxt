<script setup lang="ts">
  import { padAndFormatRg, formatCpf } from '~/utils/formatters'
  import {
    IIRGD_STATUS_LABELS,
    IIRGD_STATUS_COLORS,
    IIRGD_STATUS_GROUPS,
    type IirgdDemandStatus,
  } from '~/constants/iirgd-status'

  definePageMeta({ middleware: ['iirgd'] })
  const route = useRoute()
  const router = useRouter()

  const { fetchDemandById, updateDemand } = useIirgdDemands()

  const demandId = route.params.id as string

  const {
    data: demand,
    pending,
    refresh,
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

  // Modal State para Editar Observação/Status
  const isEditing = ref(false)
  const isSaving = ref(false)
  const editError = ref('')

  const editPayload = ref({
    status: 'new' as IirgdDemandStatus,
    observation: '',
  })

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
      editPayload.value = {
        status: (demand.value.status as IirgdDemandStatus) || 'new',
        observation: demand.value.observation || '',
      }
      editError.value = ''
      isEditing.value = true
    }
  }

  const closeEditModal = () => {
    isEditing.value = false
  }

  const saveEdit = async () => {
    try {
      isSaving.value = true
      editError.value = ''

      if (editPayload.value.status === 'other_pending' && !editPayload.value.observation.trim()) {
        throw new Error('A observação é obrigatória para o status "Outra Pendência".')
      }

      await updateDemand(demandId, {
        status: editPayload.value.status,
        observation: editPayload.value.observation,
      })

      await refresh()
      closeEditModal()
    } catch (e: unknown) {
      editError.value = e instanceof Error ? e.message : 'Ocorreu um erro ao atualizar.'
    } finally {
      isSaving.value = false
    }
  }

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
        variant="text"
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
              variant="tonal"
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
                          <UiChip color="blue-grey" label size="small" variant="tonal">
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
                      color="primary"
                      prepend-icon="edit"
                      size="small"
                      variant="tonal"
                      @click="openEditModal"
                    >
                      Atualizar
                    </UiButton>
                  </div>

                  <div class="text-body-2 text-medium-emphasis mb-4">
                    Acompanhe a situação do atendimento e registre observações relevantes.
                  </div>

                  <div class="bg-surface-variant rounded-lg pa-4 mb-4">
                    <div class="text-caption text-medium-emphasis mb-1">Status Atual</div>
                    <div class="text-body-1 font-weight-bold">
                      {{
                        IIRGD_STATUS_LABELS[demand.status as IirgdDemandStatus] ||
                        demand.status ||
                        'Novo'
                      }}
                    </div>
                  </div>

                  <div class="bg-surface-variant rounded-lg pa-4">
                    <div class="text-caption text-medium-emphasis mb-1">
                      Observações do Atendimento
                    </div>
                    <div
                      v-if="demand.observation"
                      class="text-body-2"
                      style="white-space: pre-wrap"
                    >
                      {{ demand.observation }}
                    </div>
                    <div v-else class="text-caption text-grey font-italic">
                      Nenhuma observação registrada.
                    </div>
                  </div>
                </div>
              </UiCard>
            </UiCol>
          </UiRow>

          <UiCard class="mt-6" title="Histórico de Solicitações do Cidadão" variant="outlined">
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
                <UiChip color="blue-grey" label size="small" variant="tonal">
                  {{ item.station_code }}
                </UiChip>
              </template>
              <template #item-status="{ item }">
                <UiChip
                  :color="IIRGD_STATUS_COLORS[item.status as IirgdDemandStatus] || 'default'"
                  label
                  size="small"
                  variant="tonal"
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
                  size="small"
                  title="Acessar"
                  :to="`/iirgd/${item.id}`"
                  variant="text"
                />
                <UiChip v-else color="primary" size="small" variant="flat">Atual</UiChip>
              </template>
            </UiTable>
          </UiCard>
        </UiCol>
      </UiRow>
    </div>

    <div v-else>
      <UiAlert type="error" variant="tonal">Demanda IIRGD não encontrada.</UiAlert>
    </div>

    <!-- Modal de Edição -->
    <UiModal v-model="isEditing" max-width="500px" title="Atualizar Demanda IIRGD">
      <UiAlert v-if="editError" class="mb-4" density="compact" type="error" variant="tonal">
        {{ editError }}
      </UiAlert>

      <UiRow dense>
        <UiCol cols="12">
          <UiSelect
            v-model="editPayload.status"
            item-title="title"
            item-value="value"
            :items="statusOptions"
            label="Status do Atendimento"
          />
        </UiCol>
        <UiCol cols="12">
          <UiTextarea
            v-model="editPayload.observation"
            density="comfortable"
            label="Observações Gerais"
            rounded="lg"
            rows="4"
            variant="outlined"
          />
        </UiCol>
      </UiRow>

      <template #actions>
        <UiButton variant="text" @click="closeEditModal">Cancelar</UiButton>
        <UiButton color="primary" :loading="isSaving" variant="flat" @click="saveEdit">
          Salvar
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>
