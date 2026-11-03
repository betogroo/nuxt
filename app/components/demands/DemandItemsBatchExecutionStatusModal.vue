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
    items: DemandProductRow[]
  }>()

  const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void
    (e: 'saved', payload: { count: number; status: DemandItemExecutionStatus }): void
  }>()

  const toast = useToast()
  const { batchUpdateDemandItemsExecutionStatus } = useDemandProducts()
  const isSaving = ref(false)
  const serverError = ref('')

  const statusOptions = ALL_DEMAND_ITEM_EXECUTION_STATUSES.filter((s) => s !== 'completed').map(
    (status) => ({
      title: DEMAND_ITEM_EXECUTION_STATUS_LABELS[status],
      value: status,
    }),
  )

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

  // Mapeamento de fornecedores dos itens selecionados
  const supplierInfoList = computed(() => {
    const list: Array<{ id: string; name: string }> = []
    const seenIds = new Set<string>()

    for (const it of props.items || []) {
      const winner = getWinningBid(it.demand_product_bids || [])
      if (winner && winner.supplier_id) {
        const suppId = String(winner.supplier_id)
        if (!seenIds.has(suppId)) {
          seenIds.add(suppId)
          const name =
            winner.suppliers?.company_name || winner.suppliers?.cnpj || `Fornecedor ${suppId}`
          list.push({ id: suppId, name })
        }
      }
    }

    return list
  })

  const hasMultipleSuppliersForCommitment = computed(() => {
    return status.value === 'commitment_issued' && supplierInfoList.value.length > 1
  })

  watch(
    () => props.modelValue,
    (isOpen) => {
      if (isOpen) {
        resetForm({
          values: {
            status: 'homologated',
            commitment_number: '',
            observation: '',
            error_details: '',
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
    if (!props.items || props.items.length === 0) return
    if (hasMultipleSuppliersForCommitment.value) {
      serverError.value =
        'Não é possível aplicar o mesmo número de empenho para itens pertencentes a fornecedores distintos. Por favor, selecione itens do mesmo fornecedor ou escolha outro status.'
      return
    }

    isSaving.value = true
    serverError.value = ''

    try {
      const itemIds = props.items.map((it) => it.id)
      await batchUpdateDemandItemsExecutionStatus({
        itemIds,
        status: values.status,
        commitmentNumber: values.commitment_number || null,
        observation: values.observation || null,
        errorDetails: values.status === 'error' ? values.error_details || null : null,
      })

      toast.success(`Status de execução atualizado para ${itemIds.length} item(ns) com sucesso!`)
      emit('saved', { count: itemIds.length, status: values.status })
      closeModal()
    } catch (err: unknown) {
      serverError.value =
        err instanceof Error ? err.message : 'Erro ao atualizar status de execução em lote.'
      toast.error(serverError.value)
    } finally {
      isSaving.value = false
    }
  })
</script>

<template>
  <UiModal
    max-width="600px"
    :model-value="modelValue"
    title="Alterar Status de Execução em Lote"
    transparent-header
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="mb-4">
      <div class="d-flex align-center justify-space-between mb-2">
        <span class="text-subtitle-2 font-weight-bold">
          Itens Selecionados ({{ items?.length || 0 }})
        </span>
        <UiChip color="primary" size="xs" variant="soft">
          {{ items?.length || 0 }} produto(s)
        </UiChip>
      </div>

      <!-- Lista compacta de itens selecionados -->
      <UiCard class="pa-2 bg-slate-50 dark:bg-slate-900/50" max-height="120px" variant="outline">
        <div class="d-flex flex-wrap ga-1 overflow-y-auto" style="max-height: 100px">
          <UiChip v-for="it in items" :key="it.id" color="default" size="xs" variant="outlined">
            {{ it.product_name_snapshot || it.product?.name || 'Item' }}
            <span class="text-caption text-grey ml-1">({{ it.quantity }} un)</span>
          </UiChip>
        </div>
      </UiCard>
    </div>

    <!-- Alerta caso tente aplicar empenho a múltiplos fornecedores -->
    <UiAlert
      v-if="hasMultipleSuppliersForCommitment"
      class="mb-4"
      size="sm"
      type="warning"
      variant="soft"
    >
      <div>
        <strong>Atenção:</strong> Os itens selecionados pertencem a
        {{ supplierInfoList.length }} fornecedores diferentes:
        <ul class="pl-4 mt-1 mb-0">
          <li v-for="s in supplierInfoList" :key="s.id">{{ s.name }}</li>
        </ul>
        O número de Nota de Empenho deve ser único para cada credor. Para emissão de empenho em
        lote, utilize a aba <em>Fornecedores & Empenhos</em> ou selecione itens do mesmo fornecedor.
      </div>
    </UiAlert>

    <UiAlert v-if="serverError" class="mb-4" size="sm" type="error" variant="soft">
      {{ serverError }}
    </UiAlert>

    <form @submit.prevent="onSubmit">
      <UiSelect
        v-model="status"
        v-bind="statusProps"
        :error-messages="errors.status"
        item-title="title"
        item-value="value"
        :items="statusOptions"
        label="Novo Status de Execução para os Itens *"
      />

      <UiInput
        v-if="status === 'commitment_issued'"
        v-model="commitmentNumber"
        v-bind="commitmentNumberProps"
        class="mt-3"
        :error-messages="errors.commitment_number"
        hint="Padrão SIAFEM: 2026NE00000"
        label="Número da Nota de Empenho (NE) *"
        persistent-hint
        placeholder="Ex: 2026NE00001"
      />

      <UiTextarea
        v-if="status === 'error'"
        v-model="errorDetails"
        v-bind="errorDetailsProps"
        class="mt-3"
        :error-messages="errors.error_details"
        label="Motivo do Erro na Execução *"
        placeholder="Descreva o motivo da falha na execução destes itens..."
        rows="2"
      />

      <UiTextarea
        v-model="observation"
        v-bind="observationProps"
        class="mt-3"
        :error-messages="errors.observation"
        label="Observação (Opcional)"
        placeholder="Adicione um detalhe relevante sobre este avanço..."
        rows="2"
      />

      <div class="d-flex justify-end ga-2 mt-4">
        <UiButton color="secondary" :disabled="isSaving" variant="ghost" @click="closeModal">
          Cancelar
        </UiButton>
        <UiButton
          color="primary"
          :disabled="hasMultipleSuppliersForCommitment"
          :loading="isSaving"
          type="submit"
        >
          Atualizar {{ items?.length || 0 }} Item(ns)
        </UiButton>
      </div>
    </form>
  </UiModal>
</template>
