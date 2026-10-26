<script setup lang="ts">
  import { ref, computed } from 'vue'
  import { useBallotBoxes } from '~/composables/useBallotBoxes'
  import { useToast } from '~/composables/useToast'
  import { ballotBoxSchema } from '~/schemas/forms/ballot-box'
  import type { BallotBoxRow, BallotBoxInput } from '~/types/ballot-box'

  const props = defineProps<{
    electionId: string
  }>()

  const emit = defineEmits<{
    (e: 'saved'): void
  }>()

  const toast = useToast()
  const { createBallotBox, updateBallotBox } = useBallotBoxes()

  const isOpen = ref(false)
  const isEditing = ref(false)
  const ballotBoxId = ref<string | null>(null)
  const isSaving = ref(false)
  const formError = ref<string | null>(null)

  // Form fields
  const name = ref('')
  const deviceInfo = ref('')

  // Validation errors
  const errors = ref<{
    name?: string
    device_info?: string
  }>({})

  const resetForm = () => {
    name.value = ''
    deviceInfo.value = ''
    errors.value = {}
    formError.value = null
    ballotBoxId.value = null
    isEditing.value = false
  }

  const open = (ballotBox?: BallotBoxRow) => {
    resetForm()
    if (ballotBox) {
      isEditing.value = true
      ballotBoxId.value = ballotBox.id
      name.value = ballotBox.name
      deviceInfo.value = ballotBox.device_info || ''
    }
    isOpen.value = true
  }

  const close = () => {
    isOpen.value = false
    resetForm()
  }

  const validate = (): boolean => {
    errors.value = {}
    formError.value = null

    const result = ballotBoxSchema.safeParse({
      name: name.value,
      device_info: deviceInfo.value || null,
    })

    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors
      errors.value = {
        name: fieldErrors.name?.[0],
        device_info: fieldErrors.device_info?.[0],
      }
      return false
    }

    return true
  }

  const handleSubmit = async () => {
    if (!validate()) return

    isSaving.value = true
    formError.value = null

    try {
      if (isEditing.value && ballotBoxId.value) {
        await updateBallotBox(ballotBoxId.value, {
          name: name.value.trim(),
          device_info: deviceInfo.value.trim() || null,
        })
        toast.success('Urna virtual atualizada com sucesso.')
      } else {
        const payload: BallotBoxInput = {
          election_id: props.electionId,
          name: name.value.trim(),
          device_info: deviceInfo.value.trim() || null,
        }
        await createBallotBox(payload)
        toast.success('Urna virtual cadastrada com sucesso.')
      }

      emit('saved')
      close()
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : 'Falha ao salvar urna virtual. Tente novamente.'
      formError.value = message
      toast.error(message)
    } finally {
      isSaving.value = false
    }
  }

  const modalTitle = computed(() =>
    isEditing.value ? 'Editar Urna Virtual' : 'Cadastrar Urna Virtual',
  )

  defineExpose({
    open,
    close,
  })
</script>

<template>
  <UiModal v-model="isOpen" max-width="540px" persistent :title="modalTitle">
    <template #default>
      <form class="py-2" @submit.prevent="handleSubmit">
        <UiAlert
          v-if="formError"
          class="mb-4"
          closable
          :text="formError"
          type="error"
          variant="soft"
        />

        <UiAlert
          v-if="!isEditing"
          class="mb-4"
          text="A urna será criada com status Desativada. No dia da eleição, ela poderá ser ativada e aberta diretamente no dispositivo físico correspondente."
          type="info"
          variant="soft"
        />

        <UiRow dense>
          <UiCol cols="12">
            <UiInput
              v-model="name"
              autofocus
              :error="!!errors.name"
              :error-messages="errors.name"
              label="Nome da Urna *"
              placeholder="ex: Urna 01 - Tablet Hall de Entrada"
              prepend-inner-icon="vote"
              required
            />
          </UiCol>

          <UiCol cols="12">
            <UiInput
              v-model="deviceInfo"
              :error="!!errors.device_info"
              :error-messages="errors.device_info"
              hint="Identifique o equipamento físico (ex: PC Secretaria, Tablet Samsung Tab A9)"
              label="Equipamento / Observações"
              placeholder="ex: Computador Sala 04 (Windows 11)"
              prepend-inner-icon="devices"
            />
          </UiCol>
        </UiRow>
      </form>
    </template>

    <template #actions>
      <UiButton :disabled="isSaving" variant="ghost" @click="close"> Cancelar </UiButton>
      <UiButton
        color="primary"
        :loading="isSaving"
        prepend-icon="save"
        variant="solid"
        @click="handleSubmit"
      >
        {{ isEditing ? 'Salvar Alterações' : 'Cadastrar Urna' }}
      </UiButton>
    </template>
  </UiModal>
</template>
