<script setup lang="ts">
  import { ref } from 'vue'
  import { useElectionVoters } from '~/composables/useElectionVoters'
  import { useToast } from '~/composables/useToast'
  import { electionVoterSchema } from '~/schemas/forms/election-voter'
  import type { ElectionVoterRow, ElectionVoterInput } from '~/types/election-voter'

  const emit = defineEmits<{
    (e: 'saved'): void
  }>()

  const toast = useToast()
  const { createVoter, updateVoter, generateNextVoterNumber } = useElectionVoters()

  const isOpen = ref(false)
  const isEditing = ref(false)
  const voterId = ref<string | null>(null)
  const isSaving = ref(false)
  const isGeneratingNumber = ref(false)
  const formError = ref<string | null>(null)

  // Form fields
  const name = ref('')
  const voterRegistrationNumber = ref('')
  const isActive = ref(true)

  // Validation errors
  const errors = ref<{
    name?: string
    voter_registration_number?: string
  }>({})

  const open = (voter?: ElectionVoterRow) => {
    formError.value = null
    errors.value = {}

    if (voter) {
      isEditing.value = true
      voterId.value = voter.id
      name.value = voter.name
      voterRegistrationNumber.value = voter.voter_registration_number
      isActive.value = voter.is_active
    } else {
      isEditing.value = false
      voterId.value = null
      name.value = ''
      voterRegistrationNumber.value = ''
      isActive.value = true
    }

    isOpen.value = true
  }

  const handleGenerateNumber = async () => {
    isGeneratingNumber.value = true
    try {
      const generated = await generateNextVoterNumber()
      voterRegistrationNumber.value = generated
      errors.value.voter_registration_number = undefined
    } catch {
      toast.error('Erro ao gerar número sequencial.')
    } finally {
      isGeneratingNumber.value = false
    }
  }

  const close = () => {
    if (isSaving.value) return
    isOpen.value = false
  }

  const handleSave = async () => {
    formError.value = null
    errors.value = {}

    const payload = {
      name: name.value.trim(),
      voter_registration_number: voterRegistrationNumber.value.trim(),
      is_active: isActive.value,
    }

    const validation = electionVoterSchema.safeParse(payload)
    if (!validation.success) {
      const fieldErrors = validation.error.flatten().fieldErrors
      errors.value = {
        name: fieldErrors.name?.[0],
        voter_registration_number: fieldErrors.voter_registration_number?.[0],
      }
      return
    }

    isSaving.value = true
    try {
      if (isEditing.value && voterId.value) {
        await updateVoter(voterId.value, payload as Partial<ElectionVoterInput>)
        toast.success(`Eleitor "${payload.name}" atualizado com sucesso!`)
      } else {
        await createVoter(payload)
        toast.success(`Eleitor "${payload.name}" cadastrado com sucesso!`)
      }

      isOpen.value = false
      emit('saved')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao salvar dados do eleitor.'
      if (msg.includes('duplicate key') || msg.includes('unique constraint')) {
        errors.value.voter_registration_number = 'Já existe um eleitor cadastrado com este número.'
      } else {
        formError.value = msg
      }
    } finally {
      isSaving.value = false
    }
  }

  defineExpose({
    open,
    close,
  })
</script>

<template>
  <UiModal
    v-model="isOpen"
    data-testid="modal-voter-form"
    max-width="560px"
    :title="isEditing ? 'Editar Eleitor' : 'Novo Eleitor'"
  >
    <template #header>
      <div class="d-flex align-center ga-2">
        <UiIcon color="primary" name="contactDetails" size="24" />
        <span class="text-h6 font-weight-bold">
          {{ isEditing ? 'Editar Eleitor' : 'Cadastrar Novo Eleitor' }}
        </span>
      </div>
      <UiSpacer />
      <UiButton color="default" icon="close" size="sm" variant="ghost" @click="close" />
    </template>

    <div class="py-2 d-flex flex-column ga-4">
      <UiAlert v-if="formError" color="error" size="sm" variant="soft">
        {{ formError }}
      </UiAlert>

      <!-- Nome Completo -->
      <div>
        <UiInput
          v-model="name"
          clearable
          :error-messages="errors.name"
          label="Nome Completo do Eleitor *"
          placeholder="Ex: Maria dos Santos Silva"
          prepend-inner-icon="userOutline"
          variant="outline"
          @keyup.enter="handleSave"
        />
      </div>

      <!-- Número da Inscrição (Título) -->
      <div>
        <div class="d-flex align-center ga-2">
          <div class="flex-grow-1">
            <UiInput
              v-model="voterRegistrationNumber"
              clearable
              :error-messages="errors.voter_registration_number"
              label="Número do Título / Inscrição *"
              placeholder="Ex: 104523"
              prepend-inner-icon="identifier"
              variant="outline"
              @keyup.enter="handleSave"
            />
          </div>
          <div v-if="!isEditing" style="margin-top: -8px">
            <UiButton
              color="primary"
              :loading="isGeneratingNumber"
              prepend-icon="refresh"
              size="sm"
              tooltip="Sugerir próximo número sequencial"
              variant="tonal"
              @click="handleGenerateNumber"
            >
              Gerar
            </UiButton>
          </div>
        </div>
        <span class="text-caption text-medium-emphasis">
          Identificador exclusivo utilizado para habilitação e votação nas urnas eletrônicas.
        </span>
      </div>

      <!-- Situação (Ativo / Inativo) -->
      <div
        class="pa-3 border rounded-lg bg-surface-variant d-flex align-center justify-space-between"
      >
        <div>
          <div class="text-subtitle-2 font-weight-bold">Situação Cadastral</div>
          <div class="text-caption text-medium-emphasis">
            {{
              isActive
                ? 'Eleitor ativo e apto para votar em eleições'
                : 'Eleitor desativado / suspenso'
            }}
          </div>
        </div>
        <UiSwitch v-model="isActive" color="success" hide-details />
      </div>
    </div>

    <template #actions>
      <UiButton color="default" :disabled="isSaving" variant="ghost" @click="close">
        Cancelar
      </UiButton>
      <UiButton
        color="primary"
        data-testid="btn-save-voter"
        :loading="isSaving"
        prepend-icon="save"
        variant="solid"
        @click="handleSave"
      >
        {{ isEditing ? 'Salvar Alterações' : 'Cadastrar Eleitor' }}
      </UiButton>
    </template>
  </UiModal>
</template>
