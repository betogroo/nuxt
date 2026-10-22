<script setup lang="ts">
  import { watch, ref, computed } from 'vue'
  import { useZodForm } from '~/composables/useZodForm'
  import {
    demandItemStatusChangeFormSchema,
    type DemandItemStatusChangeFormValues,
  } from '~/schemas/forms/demand-item-status'
  import {
    ALL_DEMAND_ITEM_EXECUTION_STATUSES,
    DEMAND_ITEM_EXECUTION_STATUS_LABELS,
    type DemandItemExecutionStatus,
  } from '~/constants/demand-item-status'
  import type { DemandProductRow } from '~/composables/useDemandProducts'
  import { getWinningBid } from '~/utils/bids'

  const props = defineProps<{
    modelValue: boolean
    item: DemandProductRow | null
  }>()

  const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void
    (e: 'saved', payload: { itemId: string; status: DemandItemExecutionStatus }): void
  }>()

  const toast = useToast()
  const { updateDemandItemExecutionStatus } = useDemandProducts()
  const isSaving = ref(false)
  const serverError = ref('')

  const winningBid = computed(() => {
    if (!props.item?.demand_product_bids) return null
    return getWinningBid(props.item.demand_product_bids)
  })

  const statusOptions = ALL_DEMAND_ITEM_EXECUTION_STATUSES.map((status) => ({
    title: DEMAND_ITEM_EXECUTION_STATUS_LABELS[status],
    value: status,
  }))

  const { errors, defineField, resetForm, handleSubmit } = useZodForm(
    demandItemStatusChangeFormSchema,
    {
      status: 'homologated',
      commitment_number: '',
      observation: '',
      error_details: '',
    },
  )

  const [status, statusProps] = defineField('status')
  const [commitmentNumber, commitmentNumberProps] = defineField('commitment_number')
  const [observation, observationProps] = defineField('observation')
  const [errorDetails, errorDetailsProps] = defineField('error_details')

  watch(
    () => props.modelValue,
    (isOpen) => {
      if (isOpen && props.item) {
        const current = (props.item.execution_status || 'homologated') as DemandItemExecutionStatus
        resetForm({
          values: {
            status: current,
            commitment_number: props.item.commitment_number || '',
            observation: '',
            error_details: props.item.execution_error_details || '',
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

  const onSubmit = handleSubmit(async (values: DemandItemStatusChangeFormValues) => {
    if (!props.item) return
    isSaving.value = true
    serverError.value = ''

    try {
      await updateDemandItemExecutionStatus({
        itemId: props.item.id,
        status: values.status,
        commitmentNumber: values.commitment_number || null,
        observation: values.observation || null,
        errorDetails: values.status === 'error' ? values.error_details || null : null,
        supplierId: winningBid.value?.supplier_id || null,
      })

      toast.success('Status de execução do item atualizado com sucesso!')
      emit('saved', { itemId: props.item.id, status: values.status })
      closeModal()
    } catch (err: unknown) {
      serverError.value =
        err instanceof Error ? err.message : 'Erro ao atualizar status de execução.'
      toast.error(serverError.value)
    } finally {
      isSaving.value = false
    }
  })
</script>

<template>
  <UiModal
    max-width="560px"
    :model-value="modelValue"
    title="Atualizar Status de Execução"
    transparent-header
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div v-if="item" class="mb-3">
      <div class="text-subtitle-1 font-weight-bold">
        {{ item.product_name_snapshot || item.product?.name }}
      </div>
      <div class="text-caption text-grey">
        {{ item.unit_name_snapshot || item.measurement_units?.name || 'Unidade' }} | Qtd:
        {{ item.quantity }}
        <template v-if="winningBid?.suppliers">
          | Fornecedor: {{ winningBid.suppliers.company_name || winningBid.suppliers.cnpj }}
        </template>
      </div>
    </div>

    <UiAlert v-if="serverError" class="mb-4" size="sm" type="error" variant="soft">
      {{ serverError }}
    </UiAlert>

    <UiSelect
      v-model="status"
      v-bind="statusProps"
      :error-messages="errors.status"
      item-title="title"
      item-value="value"
      :items="statusOptions"
      label="Novo Status de Execução *"
    />

    <UiInput
      v-if="status === 'commitment_issued'"
      v-model="commitmentNumber"
      v-bind="commitmentNumberProps"
      class="mt-3"
      :error-messages="errors.commitment_number"
      label="Número do Empenho *"
      placeholder="Ex: 2026-NE-00247"
    />

    <UiTextarea
      v-if="status === 'error'"
      v-model="errorDetails"
      v-bind="errorDetailsProps"
      class="mt-3"
      :error-messages="errors.error_details"
      label="Especificação do Erro / Justificativa *"
      placeholder="Descreva detalhadamente o motivo do erro na execução..."
      rows="3"
    />

    <UiTextarea
      v-model="observation"
      v-bind="observationProps"
      class="mt-3"
      :error-messages="errors.observation"
      label="Observações / Anotações (Opcional)"
      placeholder="Informações adicionais sobre o andamento..."
      rows="2"
    />

    <template #actions>
      <UiButton :disabled="isSaving" variant="ghost" @click="closeModal"> Cancelar </UiButton>
      <UiButton :loading="isSaving" variant="solid" @click="onSubmit"> Salvar Alteração </UiButton>
    </template>
  </UiModal>
</template>
