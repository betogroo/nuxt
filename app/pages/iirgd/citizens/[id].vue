<script setup lang="ts">
  import { padAndFormatRg, formatCpf } from '~/utils/formatters'
  import { useZodForm } from '~/composables/useZodForm'
  import { iirgdCitizenFormSchema } from '~/schemas/forms/iirgd-citizen'
  import {
    IIRGD_STATUS_LABELS,
    IIRGD_STATUS_COLORS,
    type IirgdDemandStatus,
  } from '~/constants/iirgd-status'

  definePageMeta({ middleware: ['iirgd'] })
  const route = useRoute()
  const router = useRouter()

  const { fetchCitizenById, updateCitizen } = useIirgdCitizens()

  const citizenId = route.params.id as string

  const {
    data: citizen,
    pending,
    refresh,
  } = useAsyncData(`iirgd-citizen-${citizenId}`, async () => {
    try {
      return await fetchCitizenById(citizenId)
    } catch (e) {
      console.error(e)
      return null
    }
  })

  useHead({
    title: computed(() =>
      citizen.value ? `Cidadão: ${citizen.value.name}` : 'Detalhes do Cidadão',
    ),
  })

  // Edit logic
  const isEditModalOpen = ref(false)
  const isSaving = ref(false)
  const saveError = ref('')

  const { errors, defineField, resetForm, handleSubmit } = useZodForm(iirgdCitizenFormSchema, {
    name: '',
    rg: '',
    cpf: '',
  })

  const [name, nameProps] = defineField('name')
  const [rg, rgProps] = defineField('rg', { validateOnModelUpdate: false })
  const [cpf, cpfProps] = defineField('cpf', { validateOnModelUpdate: false })

  const openEditModal = () => {
    if (citizen.value) {
      resetForm({
        values: {
          name: citizen.value.name,
          rg: citizen.value.rg || '',
          cpf: citizen.value.cpf || '',
        },
      })
    }
    saveError.value = ''
    isEditModalOpen.value = true
  }

  const handleSave = handleSubmit(async (values) => {
    isSaving.value = true
    saveError.value = ''
    try {
      await updateCitizen(citizenId, {
        name: values.name,
        rg: values.rg || null,
      })
      await refresh()
      isEditModalOpen.value = false
    } catch (err: unknown) {
      saveError.value = err instanceof Error ? err.message : String(err)
    } finally {
      isSaving.value = false
    }
  })
</script>

<template>
  <div>
    <div class="mb-6">
      <UiButton
        color="default"
        prepend-icon="arrowLeft"
        variant="ghost"
        @click="router.push('/iirgd/citizens')"
      >
        Voltar para Cidadãos
      </UiButton>
    </div>

    <!-- Loading state -->
    <div v-if="pending" class="d-flex justify-center my-16">
      <UiProgressCircular color="primary" indeterminate size="48" width="3" />
    </div>

    <div v-else-if="citizen">
      <UiRow justify="center">
        <UiCol cols="12" lg="10" xl="8">
          <!-- Cabeçalho Principal -->
          <div class="d-flex align-center mb-6">
            <UiIcon class="mr-3" color="primary" name="userBadge" size="32" />
            <div class="flex-grow-1">
              <div class="text-h5 font-weight-bold">{{ citizen.name }}</div>
              <div class="text-subtitle-2 text-medium-emphasis">Ficha do Cidadão e Histórico</div>
            </div>
            <UiButton color="primary" prepend-icon="edit" variant="soft" @click="openEditModal">
              Editar
            </UiButton>
          </div>

          <!-- Bloco Superior: Informações do Cidadão (Banner / Cards Horizontais) -->
          <UiCard class="mb-6">
            <div class="pa-5">
              <div class="d-flex align-center mb-4">
                <UiIcon class="mr-2" color="primary" name="contactDetails" />
                <div class="text-subtitle-1 font-weight-bold">Dados Pessoais e Cadastro</div>
              </div>

              <UiRow dense>
                <UiCol cols="12" sm="3">
                  <div class="text-caption text-medium-emphasis">RG</div>
                  <div class="text-body-1 font-weight-mono">
                    {{ citizen.rg ? padAndFormatRg(citizen.rg, true) : '-' }}
                  </div>
                </UiCol>
                <UiCol cols="12" sm="3">
                  <div class="text-caption text-medium-emphasis">CPF</div>
                  <div class="text-body-1 font-weight-mono">
                    {{ citizen.cpf ? formatCpf(citizen.cpf) : '-' }}
                  </div>
                </UiCol>
                <UiCol cols="12" sm="3">
                  <div class="text-caption text-medium-emphasis">Primeiro contato</div>
                  <div class="text-body-2 mt-1">
                    {{ new Date(citizen.created_at).toLocaleString('pt-BR') }}
                  </div>
                </UiCol>
                <UiCol cols="12" sm="3">
                  <div class="text-caption text-medium-emphasis">Última atualização</div>
                  <div class="text-body-2 mt-1">
                    {{ new Date(citizen.updated_at).toLocaleString('pt-BR') }}
                  </div>
                </UiCol>
              </UiRow>
            </div>
          </UiCard>

          <!-- Bloco Inferior: Histórico de Demandas Ocupando 100% da Largura -->
          <UiCard title="Histórico de Solicitações (Demandas)" variant="outlined">
            <UiTable
              :headers="[
                { text: 'Posto', value: 'station_code' },
                { text: 'Status', value: 'status', align: 'center' },
                { text: 'Observações', value: 'observation' },
                { text: 'Data da Solicitação', value: 'created_at', align: 'right' },
                { text: '', value: 'actions', align: 'right' },
              ]"
              :items="citizen.iirgd_demands || []"
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
                  {{ IIRGD_STATUS_LABELS[item.status as IirgdDemandStatus] || item.status }}
                </UiChip>
              </template>
              <template #item-observation="{ item }">
                <!-- Observação com quebra de texto natural para evitar barra de rolagem horizontal se for longo, limitando tamanho verticalmente -->
                <div
                  class="text-caption"
                  style="
                    max-width: 400px;
                    white-space: normal;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                  "
                >
                  {{ item.observation || '-' }}
                </div>
              </template>
              <template #item-created_at="{ item }">
                <span class="text-caption text-medium-emphasis">
                  {{ new Date(item.created_at).toLocaleString('pt-BR') }}
                </span>
              </template>
              <template #item-actions="{ item }">
                <UiButton
                  color="primary"
                  icon="externalLink"
                  size="sm"
                  title="Acessar Demanda"
                  :to="`/iirgd/${item.id}`"
                  variant="ghost"
                />
              </template>
            </UiTable>
          </UiCard>
        </UiCol>
      </UiRow>
    </div>

    <div v-else>
      <UiAlert type="error" variant="soft">Cidadão não encontrado.</UiAlert>
    </div>

    <!-- Edit Modal -->
    <UiModal v-model="isEditModalOpen" max-width="500px" title="Editar Cidadão">
      <UiAlert v-if="saveError" class="mb-4" size="sm" type="error" variant="soft">
        {{ saveError }}
      </UiAlert>

      <form @submit.prevent="handleSave">
        <UiInput
          v-model="cpf"
          v-bind="cpfProps"
          v-mask="'###.###.###-##'"
          class="mb-3"
          disabled
          :error-messages="errors.cpf"
          label="CPF (Não Editável)"
        />

        <UiInput
          v-model="name"
          v-bind="nameProps"
          class="mb-3"
          :error-messages="errors.name"
          label="Nome *"
        />

        <UiRgInput
          v-model="rg"
          v-bind="rgProps"
          class="mb-3"
          :error-messages="errors.rg"
          label="RG (Opcional, apenas números ou X)"
        />

        <div class="d-flex justify-end ga-2 mt-4">
          <UiButton color="grey" variant="ghost" @click="isEditModalOpen = false">Cancelar</UiButton>
          <UiButton color="primary" :loading="isSaving" type="submit">Salvar Alterações</UiButton>
        </div>
      </form>
    </UiModal>
  </div>
</template>
