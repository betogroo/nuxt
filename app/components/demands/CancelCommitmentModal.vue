<script setup lang="ts">
  import { ref, watch } from 'vue'
  import { useZodForm } from '~/composables/useZodForm'
  import {
    cancelCommitmentFormSchema,
    type CancelCommitmentFormValues,
  } from '~/schemas/forms/commitment'
  import type { CommitmentRow } from '~/composables/useCommitments'
  import { useCommitments } from '~/composables/useCommitments'
  import { useToast } from '~/composables/useToast'

  const props = defineProps<{
    modelValue: boolean
    commitment: CommitmentRow | null
    itemsCount?: number
  }>()

  const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void
    (e: 'cancelled'): void
  }>()

  const toast = useToast()
  const { cancelCommitment } = useCommitments()

  const isSaving = ref(false)
  const serverError = ref('')

  const { errors, defineField, resetForm, handleSubmit } = useZodForm(cancelCommitmentFormSchema, {
    reason: '',
    cancellation_commitment_number: '',
    cancellation_issue_date: new Date().toISOString().slice(0, 10),
    cancellation_observation: '',
  })

  const [reason, reasonProps] = defineField('reason')
  const [cancellationCommitmentNumber, cancellationCommitmentNumberProps] = defineField(
    'cancellation_commitment_number',
  )
  const [cancellationIssueDate, cancellationIssueDateProps] = defineField('cancellation_issue_date')
  const [cancellationObservation, cancellationObservationProps] = defineField(
    'cancellation_observation',
  )

  watch(
    () => props.modelValue,
    (isOpen) => {
      if (isOpen) {
        resetForm({
          values: {
            reason: '',
            cancellation_commitment_number: '',
            cancellation_issue_date: new Date().toISOString().slice(0, 10),
            cancellation_observation: '',
          },
        })
        serverError.value = ''
      }
    },
    { immediate: true },
  )

  const closeModal = () => {
    emit('update:modelValue', false)
  }

  const onSubmit = handleSubmit(async (values: CancelCommitmentFormValues) => {
    if (!props.commitment) return
    isSaving.value = true
    serverError.value = ''

    try {
      await cancelCommitment({
        commitmentId: props.commitment.id,
        commitmentNumber: props.commitment.commitment_number,
        reason: values.reason,
        cancellationCommitmentNumber: values.cancellation_commitment_number,
        cancellationIssueDate: values.cancellation_issue_date,
        cancellationObservation: values.cancellation_observation || null,
      })

      toast.success(
        `Nota de Empenho ${props.commitment.commitment_number} cancelada pela NE ${values.cancellation_commitment_number}!`,
      )
      emit('cancelled')
      closeModal()
    } catch (err: unknown) {
      serverError.value =
        err instanceof Error ? err.message : 'Erro ao processar cancelamento do empenho.'
      toast.error(serverError.value)
    } finally {
      isSaving.value = false
    }
  })

  defineExpose({
    onSubmit,
    reason,
    cancellationCommitmentNumber,
    cancellationIssueDate,
    cancellationObservation,
  })
</script>

<template>
  <UiModal
    max-width="580px"
    :model-value="modelValue"
    title="Cancelar Nota de Empenho"
    transparent-header
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div v-if="commitment" class="space-y-4">
      <UiAlert class="mb-3" title="Atenção: Cancelamento de Empenho" type="warning" variant="tonal">
        <p class="text-body-2 mb-1">
          Ao cancelar a Nota de Empenho <strong>{{ commitment.commitment_number }}</strong
          >:
        </p>
        <ul class="text-caption ml-4 space-y-1">
          <li>
            Os itens vinculados ({{ itemsCount ?? 1 }} item(ns)) serão automaticamente convertidos
            para <strong>Fracassado</strong>.
          </li>
          <li>
            O valor total do empenho será <strong>estornado da cota anual</strong> de gastos da
            classe/natureza.
          </li>
          <li>
            A emissão de <strong>PD</strong> e <strong>OB</strong> será
            <strong>bloqueada</strong> definitivamente para este empenho.
          </li>
        </ul>
      </UiAlert>

      <UiAlert v-if="serverError" class="mb-3" type="error" variant="tonal">
        {{ serverError }}
      </UiAlert>

      <form @submit.prevent="onSubmit">
        <div class="mb-3">
          <UiTextarea
            v-model="reason"
            v-bind="reasonProps"
            :error-messages="errors.reason"
            label="Justificativa do Cancelamento *"
            placeholder="Ex: Fornecedor descumpriu o prazo de entrega estipulado no edital..."
            required
            rows="3"
          />
        </div>

        <UiCard class="pa-3 mb-4 bg-grey-lighten-4" variant="outlined">
          <div class="text-subtitle-2 font-weight-medium mb-1">
            Nova Nota de Empenho (NE) de Cancelamento / Anulação
          </div>
          <div class="text-caption text-medium-emphasis mb-3">
            Informe a nova Nota de Empenho SIAFEM gerada que anula e substitui o empenho anterior.
          </div>

          <UiRow>
            <UiCol cols="12" sm="6">
              <UiInput
                v-model="cancellationCommitmentNumber"
                v-bind="cancellationCommitmentNumberProps"
                :error-messages="errors.cancellation_commitment_number"
                hint="Padrão SIAFEM: 2026NE00000"
                label="Nº da NE de Cancelamento *"
                persistent-hint
                placeholder="2026NE00000"
                required
              />
            </UiCol>
            <UiCol cols="12" sm="6">
              <UiInput
                v-model="cancellationIssueDate"
                v-bind="cancellationIssueDateProps"
                :error-messages="errors.cancellation_issue_date"
                label="Data de Emissão da NE *"
                required
                type="date"
              />
            </UiCol>
          </UiRow>

          <div class="mt-3">
            <UiInput
              v-model="cancellationObservation"
              v-bind="cancellationObservationProps"
              :error-messages="errors.cancellation_observation"
              label="Observações da NE de Cancelamento (Opcional)"
              placeholder="Ex: Anulação total da NE por inadimplemento contratual"
            />
          </div>
        </UiCard>

        <div class="d-flex justify-end ga-2 pt-2">
          <UiButton :disabled="isSaving" variant="ghost" @click="closeModal"> Voltar </UiButton>
          <UiButton color="error" :loading="isSaving" prepend-icon="closeCircle" type="submit">
            Confirmar Cancelamento
          </UiButton>
        </div>
      </form>
    </div>
  </UiModal>
</template>
