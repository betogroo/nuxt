<script setup lang="ts">
  import { ref, computed } from 'vue'
  import { useSupabaseClient } from '#imports'
  import { useZodForm } from '~/composables/useZodForm'
  import { electionFormSchema, type ElectionFormInput } from '~/schemas/forms/election'
  import type { ElectionRow, ElectionStatus } from '~/types/election'
  import { ELECTION_STATUS_LABELS } from '~/constants/elections'

  const emit = defineEmits<{
    (e: 'saved', election: ElectionRow): void
  }>()

  const supabase = useSupabaseClient()
  const { createElection, updateElection, loading } = useElections()
  const toast = useToast()

  const isOpen = ref(false)
  const editingId = ref<string | null>(null)
  const isEditing = computed(() => !!editingId.value)
  const errorMessage = ref('')
  const hasCandidates = ref(false)

  const statusOptions = [
    { title: ELECTION_STATUS_LABELS.awaiting_release, value: 'awaiting_release' },
    { title: ELECTION_STATUS_LABELS.released, value: 'released' },
    { title: ELECTION_STATUS_LABELS.tallying, value: 'tallying' },
    { title: ELECTION_STATUS_LABELS.finished, value: 'finished' },
  ]

  const digitsOptions = [
    { title: '1 dígito (ex: 1 a 9)', value: 1 },
    { title: '2 dígitos (ex: 10 a 99)', value: 2 },
    { title: '3 dígitos (ex: 100 a 999)', value: 3 },
    { title: '4 dígitos (ex: 1000 a 9999)', value: 4 },
    { title: '5 dígitos (ex: 10000 a 99999)', value: 5 },
  ]

  const defaultValues = {
    name: '',
    election_date: '',
    digits_count: 2,
    is_uppercase: false,
    status: 'awaiting_release' as ElectionStatus,
    description: '',
  }

  const { errors, defineField, handleSubmit, resetForm } = useZodForm(
    electionFormSchema,
    defaultValues,
  )

  const [name, nameProps] = defineField('name')
  const [electionDate, electionDateProps] = defineField('election_date')
  const [digitsCount, digitsCountProps] = defineField('digits_count')
  const [isUppercase, isUppercaseProps] = defineField('is_uppercase')
  const [status, statusProps] = defineField('status')
  const [description, descriptionProps] = defineField('description')

  const open = async (election?: ElectionRow, hasCandidatesParam?: boolean) => {
    errorMessage.value = ''
    hasCandidates.value = false

    if (election) {
      editingId.value = election.id
      // Format election_date to YYYY-MM-DD for date input
      const dateStr = election.election_date
        ? new Date(election.election_date).toISOString().slice(0, 10)
        : ''

      // Determina se a eleição possui candidatos cadastrados
      if (hasCandidatesParam !== undefined) {
        hasCandidates.value = hasCandidatesParam
      } else if (election.candidates_count !== undefined) {
        hasCandidates.value = election.candidates_count > 0
      } else if (election.id) {
        try {
          const { count } = await supabase
            .from('candidates')
            .select('id', { count: 'exact', head: true })
            .eq('election_id', election.id)
            .is('deleted_at', null)
          hasCandidates.value = (count || 0) > 0
        } catch {
          hasCandidates.value = false
        }
      }

      resetForm({
        values: {
          name: election.name,
          election_date: dateStr,
          digits_count: election.digits_count,
          is_uppercase: election.is_uppercase,
          status: election.status,
          description: election.description || '',
        },
      })
    } else {
      editingId.value = null
      hasCandidates.value = false
      const todayStr = new Date().toISOString().slice(0, 10)
      resetForm({
        values: {
          ...defaultValues,
          election_date: todayStr,
        },
      })
    }
    isOpen.value = true
  }

  const close = () => {
    isOpen.value = false
    editingId.value = null
    errorMessage.value = ''
  }

  const onSubmit = handleSubmit(async (values: ElectionFormInput) => {
    errorMessage.value = ''
    try {
      let savedElection: ElectionRow
      if (isEditing.value && editingId.value) {
        savedElection = await updateElection(editingId.value, values)
        toast.success(`Eleição "${values.name}" atualizada com sucesso!`)
      } else {
        savedElection = await createElection(values)
        toast.success(`Eleição "${values.name}" cadastrada com sucesso!`)
      }

      emit('saved', savedElection)
      close()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar eleição.'
      errorMessage.value = msg
      toast.error(msg)
    }
  })

  defineExpose({
    open,
    close,
  })
</script>

<template>
  <UiModal
    v-model="isOpen"
    max-width="600px"
    :title="isEditing ? 'Editar Eleição' : 'Nova Eleição'"
  >
    <template #header>
      <div class="d-flex align-center ga-2">
        <UiIcon color="indigo" name="vote" size="24" />
        <span class="font-weight-bold text-h6">
          {{ isEditing ? 'Editar Eleição' : 'Cadastrar Nova Eleição' }}
        </span>
      </div>
      <UiSpacer />
      <UiButton icon="close" size="sm" variant="ghost" @click="close" />
    </template>

    <UiAlert v-if="errorMessage" class="mb-4" color="error" size="sm" variant="soft">
      {{ errorMessage }}
    </UiAlert>

    <div class="d-flex flex-column ga-3">
      <!-- Nome da Eleição -->
      <UiInput
        v-model="name"
        v-bind="nameProps"
        :error-messages="errors.name"
        label="Nome da Eleição *"
        placeholder="Ex: Grêmio Estudantil 2026"
      />

      <!-- Data da Eleição -->
      <UiInput
        v-model="electionDate"
        v-bind="electionDateProps"
        :error-messages="errors.election_date"
        label="Data da Eleição *"
        type="date"
      />

      <div class="d-flex ga-3 flex-wrap">
        <!-- Quantidade de dígitos -->
        <div class="flex-grow-1" style="min-width: 220px">
          <UiSelect
            v-model="digitsCount"
            v-bind="digitsCountProps"
            :disabled="hasCandidates"
            :error-messages="errors.digits_count"
            :hint="
              hasCandidates
                ? 'Bloqueado: Esta eleição já possui candidatos cadastrados'
                : 'Define o tamanho do número dos candidatos na urna'
            "
            item-title="title"
            item-value="value"
            :items="digitsOptions"
            label="Quantidade de Dígitos *"
            persistent-hint
          />
          <div v-if="hasCandidates" class="d-flex align-center ga-1 mt-1 text-caption text-warning">
            <UiIcon name="lock" size="14" />
            <span
              >Remova os candidatos existentes se precisar alterar a quantidade de dígitos.</span
            >
          </div>
        </div>

        <!-- Situação -->
        <div class="flex-grow-1" style="min-width: 220px">
          <UiSelect
            v-model="status"
            v-bind="statusProps"
            :error-messages="errors.status"
            item-title="title"
            item-value="value"
            :items="statusOptions"
            label="Situação da Eleição *"
          />
        </div>
      </div>

      <!-- Caixa Alta (Modo Infantil / Alfabetização) -->
      <div class="border rounded pa-3 bg-surface-variant">
        <UiSwitch
          v-model="isUppercase"
          v-bind="isUppercaseProps"
          color="indigo"
          hint="Exibe os nomes de chapas e candidatos em CAIXA ALTA (MAIÚSCULO) na cabine de votação para evitar confusão entre letras para crianças em fase de alfabetização."
          label="Modo Caixa Alta (Letras Maiúsculas)"
          persistent-hint
        />
      </div>

      <!-- Descrição / Observações -->
      <UiInput
        v-model="description"
        v-bind="descriptionProps"
        :error-messages="errors.description"
        label="Descrição / Observações (Opcional)"
        placeholder="Informações adicionais sobre o pleito..."
      />
    </div>

    <template #actions>
      <UiButton :disabled="loading" variant="ghost" @click="close"> Cancelar </UiButton>
      <UiButton color="primary" :loading="loading" variant="solid" @click="onSubmit">
        {{ isEditing ? 'Salvar Alterações' : 'Cadastrar Eleição' }}
      </UiButton>
    </template>
  </UiModal>
</template>
