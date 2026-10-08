<script setup lang="ts">
  import { padAndFormatRg, formatCpf, isValidRgSP, isValidCpf } from '~/utils/formatters'
  import {
    IIRGD_STATUS_LABELS,
    IIRGD_STATUS_COLORS,
    type IirgdDemandStatus,
  } from '~/constants/iirgd-status'
  import { IIRGD_STATION_CODES } from '~/constants/iirgd-stations'
  import { iirgdDemandFormSchema, type IirgdDemandFormInput } from '~/schemas/forms/iirgd-demand'

  definePageMeta({
    icon: 'userBadge',
    middleware: ['iirgd'],
    layout: 'default',
    navLabel: 'IIRGD',
    navSubtitle: 'Módulo de gestão IIRGD',
    navColor: 'deep-purple',
    navGroup: 'iirgd',
    navOrder: 40,
    roles: ['admin', 'iirgd'],
    showIn: ['drawer', 'home'],
  })

  useHead({
    title: 'Gerenciar Demandas - IIRGD',
  })

  const { fetchDemands, createDemand } = useIirgdDemands()
  const { fetchCitizenByDocument } = useIirgdCitizens()

  // Data fetching
  const { data: demands, pending, refresh } = useAsyncData('iirgd-demands', fetchDemands)

  const existingCitizen = ref<Record<string, unknown> | null>(null)
  const activeTab = ref('em_andamento') // em_andamento | emitidos | erros

  const inProgressCount = computed(() => {
    if (!demands.value) return 0
    return demands.value.filter((d) =>
      ['new', 'mailbag', 'cegaf', 'no_data', 'other_pending'].includes(d.status as string),
    ).length
  })

  const confrontedCount = computed(() => {
    if (!demands.value) return 0
    return demands.value.filter((d) => d.status === 'confronted').length
  })

  const releasedCount = computed(() => {
    if (!demands.value) return 0
    return demands.value.filter((d) => d.status === 'released').length
  })

  const issuedCount = computed(() => {
    if (!demands.value) return 0
    return demands.value.filter((d) => d.status === 'issued').length
  })

  const errorCount = computed(() => {
    if (!demands.value) return 0
    return demands.value.filter((d) =>
      ['protocol_cancelled', 'awaiting_collection', 'confrontation_failed'].includes(
        d.status as string,
      ),
    ).length
  })

  const toast = useToast()

  const consultadosRgsChunks = computed(() => {
    if (activeTab.value !== 'consultado') return []
    const rgs = filteredDemands.value
      .map((d: any) => d.iirgd_citizens?.rg)
      .filter(Boolean)
      .map((rg: string) => rg.replace(/[^a-zA-Z0-9]/g, ''))

    const chunks: string[] = []
    for (let i = 0; i < rgs.length; i += 8) {
      chunks.push(rgs.slice(i, i + 8).join(''))
    }
    return chunks
  })

  const copyRgs = async () => {
    try {
      await navigator.clipboard.writeText(consultadosRgsChunks.value.join('\n'))
      toast.success('RGs agrupados copiados para a área de transferência!')
    } catch (e) {
      toast.error('Falha ao copiar RGs.')
      console.error(e)
    }
  }

  const filteredDemands = computed(() => {
    if (!demands.value) return []

    if (activeTab.value === 'consultado') {
      return demands.value.filter((d) => d.status === 'confronted')
    }
    if (activeTab.value === 'liberado') {
      return demands.value.filter((d) => d.status === 'released')
    }
    if (activeTab.value === 'emitidos') {
      return demands.value.filter((d) => d.status === 'issued')
    }
    if (activeTab.value === 'erros') {
      return demands.value.filter((d) =>
        ['protocol_cancelled', 'awaiting_collection', 'confrontation_failed'].includes(
          d.status as string,
        ),
      )
    }
    // Default (Em andamento)
    return demands.value.filter((d) =>
      ['new', 'mailbag', 'cegaf', 'no_data', 'other_pending'].includes(d.status as string),
    )
  })

  // Add Modal State
  const modal = ref({
    isOpen: false,
    isSaving: false,
    error: '',
  })

  const emptyDemandForm = (): Partial<IirgdDemandFormInput> => ({
    rg: '',
    cpf: '',
    name: '',
    observation: '',
  })

  const { errors, values, defineField, setFieldValue, validateField, handleSubmit, resetForm } =
    useZodForm(iirgdDemandFormSchema, emptyDemandForm())

  const [stationCode] = defineField('station_code')
  // RG e CPF são validados no blur (e no submit), não a cada tecla digitada
  const [rg] = defineField('rg', { validateOnModelUpdate: false })
  const [cpf] = defineField('cpf', { validateOnModelUpdate: false })
  const [name] = defineField('name')
  const [observation] = defineField('observation')

  const openAddModal = () => {
    resetForm({ values: emptyDemandForm() })
    modal.value.error = ''
    existingCitizen.value = null
    modal.value.isOpen = true
  }

  const closeAddModal = () => {
    modal.value.isOpen = false
  }

  const onRgBlur = async () => {
    const formattedRg = values.rg || ''

    if (!formattedRg && !values.cpf) {
      existingCitizen.value = null
      return
    }

    if (!formattedRg) return

    const { valid } = await validateField('rg')
    if (!valid || !isValidRgSP(formattedRg)) return

    try {
      const citizen = await fetchCitizenByDocument('rg', formattedRg)
      if (citizen) {
        existingCitizen.value = citizen
        setFieldValue('name', citizen.name)
        if (citizen.cpf) setFieldValue('cpf', formatCpf(citizen.cpf))
      }
    } catch (e) {
      console.error(e)
    }
  }

  const onCpfBlur = async () => {
    const formattedCpf = values.cpf || ''

    if (!formattedCpf && !values.rg) {
      existingCitizen.value = null
      return
    }

    if (!formattedCpf) return

    const { valid } = await validateField('cpf')
    if (!valid || !isValidCpf(formattedCpf)) return

    try {
      const citizen = await fetchCitizenByDocument('cpf', formattedCpf)
      if (citizen) {
        existingCitizen.value = citizen
        setFieldValue('name', citizen.name)
        if (citizen.rg) setFieldValue('rg', padAndFormatRg(citizen.rg, true))
      }
    } catch (e) {
      console.error(e)
    }
  }

  const saveDemand = handleSubmit(async (formValues) => {
    try {
      modal.value.error = ''
      modal.value.isSaving = true

      await createDemand({
        ...formValues,
        rg: formValues.rg ? padAndFormatRg(formValues.rg, true) : formValues.rg,
        cpf: formValues.cpf ? formatCpf(formValues.cpf) : formValues.cpf,
      })

      await refresh()
      closeAddModal()
    } catch (e: unknown) {
      modal.value.error = e instanceof Error ? e.message : 'Ocorreu um erro ao salvar.'
    } finally {
      modal.value.isSaving = false
    }
  })
</script>

<template>
  <div>
    <PageHeader
      subtitle="Gerencie os atendimentos e registros independentes do IIRGD"
      title="Demandas IIRGD"
    >
    </PageHeader>

    <UiCard>
      <template #header>
        <UiIcon class="mr-2" color="primary" name="userBadge" />
        Lista de Demandas
        <UiChip v-if="filteredDemands?.length" class="ml-2" label size="x-small" variant="tonal">
          {{ filteredDemands.length }}
        </UiChip>
        <UiSpacer />
        <UiButton
          class="mr-2"
          color="secondary"
          icon="refresh"
          :loading="pending"
          size="small"
          variant="tonal"
          @click="refresh"
        />
        <UiButton color="primary" prepend-icon="add" @click="openAddModal">Nova Demanda</UiButton>
      </template>

      <UiTabs v-model="activeTab" class="mb-4 px-4 pt-2">
        <UiTab color="primary" value="em_andamento">
          <UiIcon class="mr-2" name="time" />
          Em Andamento
          <UiBadge
            v-if="inProgressCount > 0"
            class="ml-2"
            color="primary"
            :content="inProgressCount"
            inline
          />
        </UiTab>
        <UiTab color="info" value="consultado">
          <UiIcon class="mr-2" name="search" />
          Consultado
          <UiBadge
            v-if="confrontedCount > 0"
            class="ml-2"
            color="info"
            :content="confrontedCount"
            inline
          />
        </UiTab>
        <UiTab color="teal" value="liberado">
          <UiIcon class="mr-2" name="checkCircle" />
          Liberado
          <UiBadge
            v-if="releasedCount > 0"
            class="ml-2"
            color="teal"
            :content="releasedCount"
            inline
          />
        </UiTab>
        <UiTab color="success" value="emitidos">
          <UiIcon class="mr-2" name="success" />
          Emitidos
          <UiBadge
            v-if="issuedCount > 0"
            class="ml-2"
            color="success"
            :content="issuedCount"
            inline
          />
        </UiTab>
        <UiTab color="error" value="erros">
          <UiIcon class="mr-2" name="alert" />
          Finalizados com Erro
          <UiBadge v-if="errorCount > 0" class="ml-2" color="error" :content="errorCount" inline />
        </UiTab>
      </UiTabs>

      <UiTable
        :headers="[
          { text: 'Código Posto', value: 'station_code' },
          { text: 'Nome', value: 'name' },
          { text: 'RG', value: 'rg' },
          { text: 'CPF', value: 'cpf' },
          { text: 'Status', value: 'status', align: 'center' },
          { text: 'Data', value: 'created_at', align: 'right' },
        ]"
        :items="filteredDemands"
        :loading="pending"
      >
        <template #item-station_code="{ item }">
          <UiChip color="blue-grey" label size="small" variant="tonal">
            {{ item.station_code }}
          </UiChip>
        </template>
        <template #item-name="{ item }">
          <NuxtLink
            class="text-decoration-none text-primary font-weight-bold"
            :to="`/iirgd/${item.id}`"
          >
            {{ item.iirgd_citizens?.name || 'Desconhecido' }}
          </NuxtLink>
        </template>
        <template #item-rg="{ item }">
          {{ item.iirgd_citizens?.rg ? padAndFormatRg(item.iirgd_citizens.rg, true) : '-' }}
        </template>
        <template #item-cpf="{ item }">
          {{ item.iirgd_citizens?.cpf ? formatCpf(item.iirgd_citizens.cpf) : '-' }}
        </template>
        <template #item-status="{ item }">
          <UiChip
            :color="IIRGD_STATUS_COLORS[item.status as IirgdDemandStatus] || 'default'"
            label
            size="small"
            variant="tonal"
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
    </UiCard>

    <div v-if="activeTab === 'consultado' && consultadosRgsChunks.length" class="mt-6">
      <div class="d-flex align-center mb-2">
        <h3 class="text-h6 mb-0">RGs para Sistema Externo</h3>
        <UiSpacer />
        <UiButton size="small" variant="tonal" prepend-icon="copy" @click="copyRgs">Copiar Texto</UiButton>
      </div>
      <UiCard variant="outlined" class="bg-grey-lighten-4">
        <UiList bg-color="transparent" density="compact">
          <UiListItem v-for="(chunk, index) in consultadosRgsChunks" :key="index" :title="chunk" />
        </UiList>
      </UiCard>
    </div>

    <!-- Create Modal -->
    <UiModal v-model="modal.isOpen" max-width="600px" title="Nova Demanda IIRGD">
      <UiAlert v-if="modal.error" class="mb-4" density="compact" type="error" variant="tonal">
        {{ modal.error }}
      </UiAlert>

      <UiRow dense>
        <UiCol cols="12" sm="4">
          <UiSelect
            v-model="stationCode"
            :error-messages="errors.station_code"
            :items="[...IIRGD_STATION_CODES]"
            label="Código do Posto *"
            placeholder="Selecione"
          />
        </UiCol>
        <UiCol cols="12" sm="4">
          <UiCpfInput
            v-model="cpf"
            :disabled="!!existingCitizen?.cpf"
            :error-messages="errors.cpf"
            label="CPF *"
            @blur="onCpfBlur"
          />
        </UiCol>
        <UiCol cols="12" sm="4">
          <UiRgInput
            v-model="rg"
            :disabled="!!existingCitizen?.rg"
            :error-messages="errors.rg"
            label="Número do RG (Opcional)"
            @blur="onRgBlur"
          />
        </UiCol>
        <UiCol cols="12">
          <UiInput
            v-model="name"
            :disabled="!!existingCitizen"
            :error-messages="errors.name"
            label="Nome do Cidadão *"
          />
        </UiCol>
        <UiCol cols="12">
          <UiTextarea
            v-model="observation"
            density="comfortable"
            :error-messages="errors.observation"
            label="Observação"
            rounded="lg"
            rows="3"
            variant="outlined"
          />
        </UiCol>
      </UiRow>

      <template #actions>
        <UiButton variant="text" @click="closeAddModal">Cancelar</UiButton>
        <UiButton color="primary" :loading="modal.isSaving" variant="flat" @click="saveDemand">
          Salvar
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>
