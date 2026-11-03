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
    cancellation_nl_number: '',
    cancellation_nl_issue_date: new Date().toISOString().slice(0, 10),
    cancellation_nl_observation: '',
  })

  const [reason, reasonProps] = defineField('reason')
  const [cancellationNlNumber, cancellationNlNumberProps] = defineField('cancellation_nl_number')
  const [cancellationNlIssueDate, cancellationNlIssueDateProps] = defineField(
    'cancellation_nl_issue_date',
  )
  const [cancellationNlObservation, cancellationNlObservationProps] = defineField(
    'cancellation_nl_observation',
  )

  watch(
    () => props.modelValue,
    (isOpen) => {
      if (isOpen) {
        resetForm({
          values: {
            reason: '',
            cancellation_nl_number: '',
            cancellation_nl_issue_date: new Date().toISOString().slice(0, 10),
            cancellation_nl_observation: '',
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
      const cleanNl = values.cancellation_nl_number?.trim()
      const finalNlNumber = cleanNl && !/^\d{4}NL$/i.test(cleanNl) ? cleanNl : null

      await cancelCommitment({
        commitmentId: props.commitment.id,
        commitmentNumber: props.commitment.commitment_number,
        reason: values.reason,
        cancellationNlNumber: finalNlNumber,
        cancellationNlIssueDate: finalNlNumber ? values.cancellation_nl_issue_date : null,
        cancellationNlObservation: finalNlNumber ? values.cancellation_nl_observation : null,
      })

      toast.success(`Nota de Empenho ${props.commitment.commitment_number} cancelada com sucesso!`)
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
    cancellationNlNumber,
    cancellationNlIssueDate,
    cancellationNlObservation,
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
            Nota de Lançamento (NL) de Cancelamento
          </div>
          <div class="text-caption text-medium-emphasis mb-3">
            Opcional no momento. Caso já possua o número da NL SIAFEM gerada, informe abaixo ou
            cadastre posteriormente.
          </div>

          <UiRow>
            <UiCol cols="12" sm="6">
              <UiTextField
                v-model="cancellationNlNumber"
                v-bind="cancellationNlNumberProps"
                :error-messages="errors.cancellation_nl_number"
                hint="Padrão SIAFEM: 2026NL00000"
                label="Nº da NL SIAFEM (Opcional)"
                persistent-hint
                placeholder="2026NL00000"
              />
            </UiCol>
            <UiCol cols="12" sm="6">
              <UiTextField
                v-model="cancellationNlIssueDate"
                v-bind="cancellationNlIssueDateProps"
                :error-messages="errors.cancellation_nl_issue_date"
                label="Data de Emissão da NL"
                type="date"
              />
            </UiCol>
          </UiRow>

          <div class="mt-3">
            <UiTextField
              v-model="cancellationNlObservation"
              v-bind="cancellationNlObservationProps"
              :error-messages="errors.cancellation_nl_observation"
              label="Observações da NL de Cancelamento (Opcional)"
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
