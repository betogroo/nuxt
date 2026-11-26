<script setup lang="ts">
  import { computed, ref, watch } from 'vue'
  import type { DemandRow } from '~/composables/useDemands'
  import type { CommitmentRow } from '~/composables/useCommitments'
  import type { DemandProductRow } from '~/composables/useDemandProducts'
  import { useCopyToClipboard } from '~/composables/useCopyToClipboard'
  import { useToast } from '~/composables/useToast'
  import {
    buildCombinedExtractsText,
    generateDemandCommitmentExtracts,
    type DemandCommitmentExtractItem,
  } from '~/utils/commitmentExtract'
  import { formatCurrency } from '~/utils/formatters'
  import { escapeHtml, printHtmlViaIframe } from '~/utils/reportHtml'

  const props = withDefaults(
    defineProps<{
      modelValue: boolean
      demand?: DemandRow | null
      commitments?: CommitmentRow[] | null
      items?: DemandProductRow[] | null
    }>(),
    {
      demand: null,
      commitments: () => [],
      items: () => [],
    },
  )

  const emit = defineEmits<{
    (e: 'update:modelValue', val: boolean): void
  }>()

  const toast = useToast()
  const { copy } = useCopyToClipboard()

  const extractItems = computed<DemandCommitmentExtractItem[]>(() => {
    return generateDemandCommitmentExtracts({
      demand: props.demand,
      commitments: props.commitments,
      items: props.items,
    })
  })

  const totalAmount = computed(() => {
    return extractItems.value.reduce((acc, item) => acc + item.totalAmount, 0)
  })

  const selectedView = ref<string>('all')
  const editedTexts = ref<Record<string, string>>({})

  // Initialize or reset edited texts whenever modal opens or extracts change
  watch(
    () => [props.modelValue, extractItems.value],
    ([isOpen]) => {
      if (isOpen) {
        const nextTexts: Record<string, string> = {
          all: buildCombinedExtractsText(extractItems.value),
        }
        for (const item of extractItems.value) {
          nextTexts[item.commitmentNumber] = item.extractText
        }
        editedTexts.value = nextTexts
        selectedView.value = 'all'
      }
    },
    { immediate: true },
  )

  const currentText = computed({
    get: () => editedTexts.value[selectedView.value] || '',
    set: (val: string) => {
      editedTexts.value[selectedView.value] = val
    },
  })

  const closeModal = () => {
    emit('update:modelValue', false)
  }

  const handleCopy = async () => {
    if (!currentText.value) return
    const isSingle = selectedView.value !== 'all'
    const successMsg = isSingle
      ? `Extrato da NE ${selectedView.value} copiado com sucesso!`
      : 'Todos os extratos foram copiados com sucesso!'

    const success = await copy(currentText.value, successMsg)
    if (success) {
      toast.success(successMsg)
    }
  }

  const handlePrint = () => {
    if (extractItems.value.length === 0) return

    let sectionsHtml = ''
    if (selectedView.value === 'all') {
      sectionsHtml = extractItems.value
        .map((item) => {
          const content = editedTexts.value[item.commitmentNumber] || item.extractText
          return `<div class="extract-item">${escapeHtml(content)}</div>`
        })
        .join('')
    } else {
      sectionsHtml = `<div class="extract-item">${escapeHtml(currentText.value)}</div>`
    }

    const printContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <title>Extratos de Notas de Empenho</title>
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
            .extract-item {
              white-space: pre-wrap;
              word-break: break-word;
              page-break-after: always;
              margin-bottom: 30px;
            }
            .extract-item:last-child {
              page-break-after: auto;
              margin-bottom: 0;
            }
          </style>
        </head>
        <body>
          ${sectionsHtml}
        </body>
      </html>
    `
    printHtmlViaIframe(printContent)
  }
</script>

<template>
  <UiModal
    max-width="840px"
    :model-value="modelValue"
    title="Relatório de Extratos do Empenho"
    transparent-header
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div v-if="demand" class="mb-4">
      <div class="d-flex align-center justify-space-between flex-wrap ga-2">
        <div>
          <div class="text-subtitle-1 font-weight-bold text-primary">
            {{ demand.name }}
          </div>
          <div class="text-caption text-grey">
            <template v-if="demand.process_number">
              Processo SEI: {{ demand.process_number }}
            </template>
            <template v-if="demand.internal_process_number">
              • Processo Interno: {{ demand.internal_process_number }}
            </template>
          </div>
        </div>

        <div class="d-flex align-center flex-wrap ga-2">
          <UiChip color="primary" size="sm" variant="soft">
            {{ extractItems.length }} empenho(s) ativo(s)
          </UiChip>
          <UiChip v-if="totalAmount > 0" color="success" size="sm" variant="soft">
            Total: {{ formatCurrency(totalAmount) }}
          </UiChip>
        </div>
      </div>
    </div>

    <!-- Alerta quando não houver empenhos ativos -->
    <UiAlert v-if="extractItems.length === 0" class="my-4" type="info" variant="soft">
      Nenhum empenho ativo (não cancelado) foi encontrado para esta demanda.
    </UiAlert>

    <template v-else>
      <!-- Seletor de Visualização (Todos os Extratos ou Empenho Individual) -->
      <div class="d-flex align-center flex-wrap ga-2 mb-3">
        <UiButton
          :color="selectedView === 'all' ? 'primary' : 'secondary'"
          size="xs"
          :variant="selectedView === 'all' ? 'solid' : 'outline'"
          @click="selectedView = 'all'"
        >
          Todos os Extratos ({{ extractItems.length }})
        </UiButton>

        <UiButton
          v-for="item in extractItems"
          :key="item.commitmentNumber"
          :color="selectedView === item.commitmentNumber ? 'primary' : 'secondary'"
          size="xs"
          :variant="selectedView === item.commitmentNumber ? 'solid' : 'outline'"
          @click="selectedView = item.commitmentNumber"
        >
          {{ item.commitmentNumber }}
        </UiButton>
      </div>

      <!-- Área de Texto Editável -->
      <div class="mb-2">
        <div class="d-flex align-center justify-space-between mb-1">
          <label class="text-caption font-weight-bold text-grey-darken-1">
            <template v-if="selectedView === 'all'">
              Extratos Unificados (Lote para Publicação)
            </template>
            <template v-else> Extrato da NE {{ selectedView }} </template>
          </label>
          <span class="text-caption text-grey">
            Você pode ajustar o texto antes de copiar ou imprimir
          </span>
        </div>
        <UiTextarea v-model="currentText" class="font-monospace" :rows="16" />
      </div>
    </template>

    <template #actions>
      <div class="d-flex align-center justify-space-between w-100 flex-wrap ga-2">
        <UiButton
          color="secondary"
          :disabled="extractItems.length === 0"
          prepend-icon="printer"
          variant="soft"
          @click="handlePrint"
        >
          Imprimir Extratos
        </UiButton>

        <div class="d-flex align-center ga-2">
          <UiButton color="secondary" variant="ghost" @click="closeModal"> Fechar </UiButton>
          <UiButton
            color="primary"
            :disabled="extractItems.length === 0"
            prepend-icon="copy"
            variant="solid"
            @click="handleCopy"
          >
            {{ selectedView === 'all' ? 'Copiar Todos os Extratos' : 'Copiar Extrato' }}
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
