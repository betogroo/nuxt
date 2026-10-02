<script setup lang="ts">
  import { padAndFormatRg, formatCpf } from '~/utils/formatters'

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

  // Data fetching
  const { data: demands, pending, refresh } = useAsyncData('iirgd-demands', fetchDemands)

  // Add Modal State
  const modal = ref({
    isOpen: false,
    isSaving: false,
    error: '',
    payload: {
      station_code: '',
      rg: '',
      cpf: '',
      name: '',
      observation: '',
      status: 'Novo',
    },
  })

  const openAddModal = () => {
    modal.value.payload = {
      station_code: '',
      rg: '',
      cpf: '',
      name: '',
      observation: '',
      status: 'Novo',
    }
    modal.value.error = ''
    modal.value.isOpen = true
  }

  const closeAddModal = () => {
    modal.value.isOpen = false
  }

  const onRgInput = (val: string | null) => {
    if (val !== null) {
      modal.value.payload.rg = padAndFormatRg(val, false) // Format while typing without padding
    }
  }

  const onRgBlur = () => {
    modal.value.payload.rg = padAndFormatRg(modal.value.payload.rg, true) // Pad on blur
  }

  const onCpfInput = (val: string | null) => {
    if (val !== null) {
      modal.value.payload.cpf = formatCpf(val)
    }
  }

  const saveDemand = async () => {
    try {
      modal.value.error = ''
      const p = modal.value.payload

      if (!p.station_code) throw new Error('O Código do Posto é obrigatório.')
      if (!p.rg) throw new Error('O RG é obrigatório.')
      if (!p.cpf) throw new Error('O CPF é obrigatório.')
      if (!p.name) throw new Error('O Nome é obrigatório.')

      // Ensure RG is padded one last time before saving
      p.rg = padAndFormatRg(p.rg, true)

      modal.value.isSaving = true
      await createDemand(p)

      await refresh()
      closeAddModal()
    } catch (e: unknown) {
      modal.value.error = e instanceof Error ? e.message : 'Ocorreu um erro ao salvar.'
    } finally {
      modal.value.isSaving = false
    }
  }
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
        <UiChip v-if="demands?.length" class="ml-2" label size="x-small" variant="tonal">
          {{ demands.length }}
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

      <UiTable
        :headers="[
          { text: 'Código Posto', value: 'station_code' },
          { text: 'Nome', value: 'name' },
          { text: 'RG', value: 'rg' },
          { text: 'CPF', value: 'cpf' },
          { text: 'Status', value: 'status', align: 'center' },
          { text: 'Data', value: 'created_at', align: 'right' },
        ]"
        :items="demands || []"
        :loading="pending"
      >
        <template #item-station_code="{ item }">
          <UiChip color="blue-grey" label size="small" variant="tonal">
            {{ item.station_code }}
          </UiChip>
        </template>
        <template #item-name="{ item }">
          <span class="font-weight-medium">{{ item.name }}</span>
        </template>
        <template #item-status="{ item }">
          <UiChip
            :color="item.status === 'Novo' ? 'info' : 'default'"
            label
            size="small"
            variant="tonal"
          >
            {{ item.status }}
          </UiChip>
        </template>
        <template #item-created_at="{ item }">
          <span class="text-caption text-medium-emphasis">
            {{ new Date(item.created_at).toLocaleString('pt-BR') }}
          </span>
        </template>
      </UiTable>
    </UiCard>

    <!-- Create Modal -->
    <UiModal v-model="modal.isOpen" max-width="600px" title="Nova Demanda IIRGD">
      <UiAlert v-if="modal.error" class="mb-4" density="compact" type="error" variant="tonal">
        {{ modal.error }}
      </UiAlert>

      <v-row dense>
        <v-col cols="12" sm="4">
          <UiSelect
            v-model="modal.payload.station_code"
            :items="['1342-5', '1062-9']"
            label="Código do Posto *"
            placeholder="Selecione"
          />
        </v-col>
        <v-col cols="12" sm="4">
          <UiInput
            label="Número do RG *"
            :model-value="modal.payload.rg"
            placeholder="00000000-0"
            @blur="onRgBlur"
            @update:model-value="onRgInput"
          />
        </v-col>
        <v-col cols="12" sm="4">
          <UiInput
            label="CPF *"
            :model-value="modal.payload.cpf"
            placeholder="000.000.000-00"
            @update:model-value="onCpfInput"
          />
        </v-col>
        <v-col cols="12">
          <UiInput v-model="modal.payload.name" label="Nome do Cidadão *" />
        </v-col>
        <v-col cols="12">
          <v-textarea
            v-model="modal.payload.observation"
            density="comfortable"
            label="Observação"
            rounded="lg"
            rows="3"
            variant="outlined"
          />
        </v-col>
      </v-row>

      <template #actions>
        <UiButton variant="text" @click="closeAddModal">Cancelar</UiButton>
        <UiButton color="primary" :loading="modal.isSaving" variant="flat" @click="saveDemand">
          Salvar
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>
