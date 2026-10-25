<script setup lang="ts">
  import { ref, computed } from 'vue'
  import { useElectionVoterCards, formatCardDate } from '~/composables/useElectionVoterCards'
  import { useToast } from '~/composables/useToast'
  import type { ElectionVoterRow, VoterCardItem } from '~/types/election-voter'
  import ElectionVoterCard from '~/components/elections/ElectionVoterCard.vue'

  const toast = useToast()
  const { printVoterCards, exportVoterCardsToPdf } = useElectionVoterCards()

  const isOpen = ref(false)
  const isPrinting = ref(false)
  const isExporting = ref(false)

  // Target voters list
  const targetVoters = ref<ElectionVoterRow[]>([])

  // Emission date input (default today YYYY-MM-DD)
  const getTodayIso = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const issueDate = ref(getTodayIso())

  // Pagination for batch preview
  const currentPreviewIndex = ref(0)

  const isBatch = computed(() => targetVoters.value.length > 1)
  const totalCount = computed(() => targetVoters.value.length)

  const currentVoter = computed<VoterCardItem | null>(() => {
    if (targetVoters.value.length === 0) return null
    const voter = targetVoters.value[currentPreviewIndex.value] || targetVoters.value[0]
    return {
      id: voter.id,
      voter_registration_number: voter.voter_registration_number,
      name: voter.name,
      is_active: voter.is_active,
      issueDate: issueDate.value,
    }
  })

  const open = (voters: ElectionVoterRow | ElectionVoterRow[]) => {
    const list = Array.isArray(voters) ? voters : [voters]
    targetVoters.value = list
    issueDate.value = getTodayIso()
    currentPreviewIndex.value = 0
    isOpen.value = true
  }

  const close = () => {
    if (isPrinting.value || isExporting.value) return
    isOpen.value = false
  }

  const handlePrint = async () => {
    if (targetVoters.value.length === 0) return
    isPrinting.value = true
    try {
      await printVoterCards({
        issueDate: issueDate.value,
        voters: targetVoters.value,
      })
      toast.success(
        targetVoters.value.length === 1
          ? 'Título eleitoral enviado para impressão!'
          : `${targetVoters.value.length} títulos eleitorais enviados para impressão!`,
      )
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao imprimir título(s).'
      toast.error(msg)
    } finally {
      isPrinting.value = false
    }
  }

  const handleDownloadPdf = async () => {
    if (targetVoters.value.length === 0) return
    isExporting.value = true
    try {
      await exportVoterCardsToPdf({
        issueDate: issueDate.value,
        voters: targetVoters.value,
      })
      toast.success(
        targetVoters.value.length === 1
          ? 'Título eleitoral exportado para PDF com sucesso!'
          : `${targetVoters.value.length} títulos eleitorais exportados para PDF!`,
      )
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao exportar título(s) para PDF.'
      toast.error(msg)
    } finally {
      isExporting.value = false
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
    data-testid="modal-voter-card"
    max-width="720px"
    :title="isBatch ? 'Emissão de Títulos Eleitorais em Lote' : 'Emissão de Título Eleitoral'"
  >
    <template #header>
      <div class="d-flex align-center ga-2">
        <UiIcon color="primary" name="userBadge" size="24" />
        <span class="text-h6 font-weight-bold">
          {{ isBatch ? `Emissão em Lote (${totalCount} Títulos)` : 'Emissão de Título Eleitoral' }}
        </span>
      </div>
      <UiSpacer />
      <UiButton color="default" icon="close" size="sm" variant="ghost" @click="close" />
    </template>

    <div class="py-2 d-flex flex-column ga-4">
      <!-- Seletor de Data de Emissão e Painel Informativo -->
      <UiRow class="g-3 align-center">
        <UiCol cols="12" md="6">
          <UiInput
            v-model="issueDate"
            data-testid="input-issue-date"
            label="Data de Emissão do Título *"
            prepend-inner-icon="calendar"
            type="date"
            variant="outline"
          />
        </UiCol>
        <UiCol cols="12" md="6">
          <div class="pa-2 px-3 border rounded-lg bg-surface-variant text-caption">
            <span class="font-weight-bold text-primary d-block">Data no Documento:</span>
            <span>{{ formatCardDate(issueDate) }}</span>
          </div>
        </UiCol>
      </UiRow>

      <!-- Alerta Informativo para Emissão em Lote -->
      <UiAlert v-if="isBatch" color="info" size="sm" variant="soft">
        <div class="d-flex align-center justify-space-between flex-wrap ga-2">
          <span>
            Você está emitindo <strong>{{ totalCount }} títulos eleitorais</strong>. Na impressão,
            eles serão organizados em folhas A4 (até 4 títulos por folha) com marcações para
            recorte.
          </span>
          <UiChip color="primary" size="xs" variant="solid"> {{ totalCount }} Eleitores </UiChip>
        </div>
      </UiAlert>

      <!-- Pré-visualização do Card -->
      <div class="pa-4 border rounded-lg bg-surface d-flex flex-column align-center">
        <div v-if="isBatch" class="d-flex align-center justify-space-between w-100 mb-3 px-2">
          <span class="text-caption text-medium-emphasis font-weight-bold">
            Pré-visualização (Eleitor {{ currentPreviewIndex + 1 }} de {{ totalCount }})
          </span>
          <div class="d-flex align-center ga-1">
            <UiButton
              color="default"
              :disabled="currentPreviewIndex <= 0"
              icon="arrowLeft"
              size="xs"
              variant="tonal"
              @click="currentPreviewIndex--"
            />
            <span class="text-caption font-monospace px-2">
              {{ currentPreviewIndex + 1 }} / {{ totalCount }}
            </span>
            <UiButton
              color="default"
              :disabled="currentPreviewIndex >= totalCount - 1"
              icon="next"
              size="xs"
              variant="tonal"
              @click="currentPreviewIndex++"
            />
          </div>
        </div>

        <ElectionVoterCard
          v-if="currentVoter"
          :key="`${currentVoter.id}-${issueDate}`"
          :voter="currentVoter"
        />
      </div>
    </div>

    <template #actions>
      <UiButton
        color="default"
        :disabled="isPrinting || isExporting"
        variant="ghost"
        @click="close"
      >
        Fechar
      </UiButton>
      <UiSpacer />
      <UiButton
        color="info"
        data-testid="btn-download-pdf-cards"
        :loading="isExporting"
        prepend-icon="download"
        variant="outline"
        @click="handleDownloadPdf"
      >
        {{ isBatch ? 'Baixar Lote em PDF' : 'Baixar PDF' }}
      </UiButton>
      <UiButton
        color="primary"
        data-testid="btn-print-cards"
        :loading="isPrinting"
        prepend-icon="printer"
        variant="solid"
        @click="handlePrint"
      >
        {{ isBatch ? `Imprimir ${totalCount} Títulos` : 'Imprimir Título' }}
      </UiButton>
    </template>
  </UiModal>
</template>
