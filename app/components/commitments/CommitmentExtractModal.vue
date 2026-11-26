<script setup lang="ts">
  import { computed, ref, watch } from 'vue'
  import type { CommitmentRow, CommitmentItemWithTotals } from '~/composables/useCommitments'
  import { useCopyToClipboard } from '~/composables/useCopyToClipboard'
  import { useToast } from '~/composables/useToast'
  import { generateCommitmentExtract, type CommitmentExtractData } from '~/utils/commitmentExtract'
  import { formatCnpj } from '~/utils/formatters'
  import { escapeHtml, printHtmlViaIframe } from '~/utils/reportHtml'

  const props = withDefaults(
    defineProps<{
      modelValue: boolean
      commitment: CommitmentRow | null
      items?: CommitmentItemWithTotals[]
      totalAmount?: number
    }>(),
    {
      items: () => [],
      totalAmount: 0,
    },
  )

  const emit = defineEmits<{
    (e: 'update:modelValue', val: boolean): void
  }>()

  const toast = useToast()
  const { copy } = useCopyToClipboard()

  const fallbackExpenseNature = computed(() => {
    if (props.commitment?.expense_natures) {
      return props.commitment.expense_natures
    }
    const firstItemWithNature = props.items.find(
      (item) => item.product?.expense_natures || item.product?.expense_nature_id,
    )
    if (firstItemWithNature?.product?.expense_natures) {
      return firstItemWithNature.product.expense_natures
    }
    if (firstItemWithNature?.product?.expense_nature_id) {
      return { id: firstItemWithNature.product.expense_nature_id, name: '' }
    }
    return null
  })

  const extractData = computed<CommitmentExtractData>(() => {
    return {
      commitmentNumber: props.commitment?.commitment_number || '',
      issueDate: props.commitment?.issue_date || null,
      totalAmount: props.totalAmount || 0,
      demand: props.commitment?.demands || null,
      supplier: props.commitment?.suppliers || null,
      expenseNature: fallbackExpenseNature.value,
    }
  })

  const initialExtractText = computed(() => {
    if (!props.commitment) return ''
    return generateCommitmentExtract(extractData.value)
  })

  const editableText = ref('')

  watch(
    () => [props.modelValue, props.commitment],
    ([isOpen]) => {
      if (isOpen) {
        editableText.value = initialExtractText.value
      }
    },
    { immediate: true },
  )

  const closeModal = () => {
    emit('update:modelValue', false)
  }

  const handleCopy = async () => {
    if (!editableText.value) return
    const success = await copy(
      editableText.value,
      'Extrato da Nota de Empenho copiado para a área de transferência!',
    )
    if (success) {
      toast.success('Extrato copiado com sucesso!')
    }
  }

  const handlePrint = () => {
    if (!editableText.value) return
    const printContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <title>Extrato da Nota de Empenho</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 20mm;
            }
            body {
              font-family: 'Courier New', Courier, monospace;
              font-size: 13pt;
              line-height: 1.6;
              color: #000;
              margin: 0;
              padding: 0;
            }
            .extract-content {
              white-space: pre-wrap;
              word-break: break-word;
            }
          </style>
        </head>
        <body>
          <div class="extract-content">${escapeHtml(editableText.value)}</div>
        </body>
      </html>
    `
    printHtmlViaIframe(printContent)
  }
</script>

<template>
  <UiModal
    max-width="720px"
    :model-value="modelValue"
    title="Extrato da Nota de Empenho"
    transparent-header
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div v-if="commitment" class="mb-4">
      <div class="d-flex align-center justify-space-between flex-wrap ga-2">
        <div>
          <div class="text-subtitle-1 font-weight-bold text-primary">
            {{ commitment.commitment_number }}
          </div>
          <div v-if="commitment.suppliers" class="text-body-2 text-grey-darken-2">
            {{ commitment.suppliers.company_name }}
            <span v-if="commitment.suppliers.cnpj" class="text-caption text-grey">
              ({{ formatCnpj(commitment.suppliers.cnpj) }})
            </span>
          </div>
        </div>

        <UiChip color="primary" size="sm" variant="soft"> Extrato Oficial </UiChip>
      </div>
    </div>

    <!-- Texto do Extrato -->
    <div class="mb-2">
      <div class="d-flex align-center justify-space-between mb-1">
        <label class="text-caption font-weight-bold text-grey-darken-1"> Texto do Extrato </label>
        <span class="text-caption text-grey">
          Você pode editar ou ajustar o texto antes de copiar
        </span>
      </div>
      <UiTextarea v-model="editableText" class="font-monospace" :rows="14" />
    </div>

    <template #actions>
      <div class="d-flex align-center justify-space-between w-100 flex-wrap ga-2">
        <UiButton color="secondary" prepend-icon="printer" variant="soft" @click="handlePrint">
          Imprimir Extrato
        </UiButton>

        <div class="d-flex align-center ga-2">
          <UiButton color="secondary" variant="ghost" @click="closeModal"> Fechar </UiButton>
          <UiButton color="primary" prepend-icon="copy" variant="solid" @click="handleCopy">
            Copiar Extrato
          </UiButton>
        </div>
      </div>
    </template>
  </UiModal>
</template>

<style scoped>
  .font-monospace :deep(textarea) {
    font-family: 'Courier New', Courier, monospace !important;
    font-size: 0.9rem;
    line-height: 1.5;
  }
</style>
