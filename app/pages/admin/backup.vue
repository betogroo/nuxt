<script setup lang="ts">
  import { ref, onMounted } from 'vue'
  import { useBackup } from '~/composables/useBackup'
  import type { BackupInspection, BackupSummary, RestoreResult } from '~/types/backup'

  definePageMeta({
    middleware: ['admin'],
    layout: 'default',
    icon: 'database',
    navLabel: 'Backup & Restauração',
    navSubtitle: 'Exportar e restaurar registros do sistema',
    navColor: 'indigo',
    navGroup: 'admin',
    navSubgroup: 'system',
    navOrder: 20,
    roles: ['admin'],
    showIn: ['drawer', 'admin-shortcuts'],
  })

  useHead({ title: 'Backup & Restauração - Admin' })

  const {
    isGenerating,
    isRestoring,
    isFetchingCounts,
    fetchCurrentCounts,
    generateBackup,
    inspectBackupFile,
    restoreBackup,
  } = useBackup()

  const toast = useToast()
  const currentCounts = ref<BackupSummary | null>(null)
  const inspection = ref<BackupInspection | null>(null)
  const isConfirmModalOpen = ref(false)
  const restoreResult = ref<RestoreResult | null>(null)
  const fileInputRef = ref<HTMLInputElement | null>(null)

  const loadCounts = async () => {
    try {
      currentCounts.value = await fetchCurrentCounts()
    } catch (e: unknown) {
      console.error(e)
      toast.error('Erro ao carregar totais do banco de dados.')
    }
  }

  onMounted(() => {
    loadCounts()
  })

  const handleGenerateBackup = async () => {
    try {
      await generateBackup()
      toast.success('Arquivo de backup gerado e baixado com sucesso!')
      await loadCounts()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Falha ao gerar backup.'
      toast.error(msg)
    }
  }

  const triggerFileInput = () => {
    fileInputRef.value?.click()
  }

  const onFileChange = async (event: Event) => {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return

    restoreResult.value = null
    inspection.value = await inspectBackupFile(file)

    if (!inspection.value.isValid) {
      toast.error(inspection.value.errorMessage || 'Arquivo inválido.')
    } else {
      toast.info('Arquivo analisado com sucesso! Verifique os dados abaixo antes de confirmar.')
    }
  }

  const handleRestoreConfirm = async () => {
    if (!inspection.value?.payload) return

    try {
      isConfirmModalOpen.value = false
      const result = await restoreBackup(inspection.value.payload)
      restoreResult.value = result
      toast.success('Restauração concluída com sucesso!')
      await loadCounts()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Falha ao restaurar dados.'
      toast.error(msg)
    }
  }

  const resetRestore = () => {
    inspection.value = null
    restoreResult.value = null
    if (fileInputRef.value) {
      fileInputRef.value.value = ''
    }
  }
</script>

<template>
  <div>
    <PageHeader
      back-to="/admin"
      subtitle="Exporte cópias de segurança e restaure demandas, usuários e históricos"
      title="Backup & Restauração"
    />

    <UiContainer>
      <UiRow>
        <!-- Card 1: Geração de Backup -->
        <UiCol cols="12" md="6">
          <UiCard class="h-100" variant="outline">
            <template #header>
              <div class="d-flex align-center ga-2">
                <UiIcon color="primary" name="backup" size="24" />
                <span class="font-weight-bold text-subtitle-1">Exportar Backup</span>
              </div>
            </template>

            <UiAlert class="mb-4" color="info" size="sm" variant="soft">
              Gera um arquivo <code>.json</code> completo contendo todas as demandas gerais,
              demandas IIRGD, cidadãos, usuários e históricos de alteração.
            </UiAlert>

            <div class="mb-4">
              <div class="text-caption font-weight-bold text-medium-emphasis text-uppercase mb-2">
                Registros atuais no banco
              </div>

              <div v-if="isFetchingCounts && !currentCounts" class="d-flex justify-center py-4">
                <UiProgressCircular color="primary" indeterminate size="28" width="2" />
              </div>

              <div v-else-if="currentCounts" class="d-flex flex-column ga-2">
                <div
                  class="d-flex justify-space-between align-center text-body-2 py-1 border-bottom"
                >
                  <span>Demandas Gerais (e itens vinculados):</span>
                  <UiChip color="primary" size="xs" variant="solid"
                    >{{ currentCounts.demands }} demandas ({{
                      currentCounts.demand_products
                    }}
                    itens)</UiChip
                  >
                </div>
                <div
                  class="d-flex justify-space-between align-center text-body-2 py-1 border-bottom"
                >
                  <span>Demandas IIRGD:</span>
                  <UiChip color="info" size="xs" variant="solid"
                    >{{ currentCounts.iirgd_demands }} demandas</UiChip
                  >
                </div>
                <div
                  class="d-flex justify-space-between align-center text-body-2 py-1 border-bottom"
                >
                  <span>Cidadãos IIRGD:</span>
                  <UiChip color="teal" size="xs" variant="solid"
                    >{{ currentCounts.iirgd_citizens }} cadastrados</UiChip
                  >
                </div>
                <div
                  class="d-flex justify-space-between align-center text-body-2 py-1 border-bottom"
                >
                  <span>Perfis de Usuários:</span>
                  <UiChip color="secondary" size="xs" variant="solid"
                    >{{ currentCounts.profiles }} usuários</UiChip
                  >
                </div>
                <div
                  class="d-flex justify-space-between align-center text-body-2 py-1 border-bottom"
                >
                  <span>Históricos de Status IIRGD:</span>
                  <UiChip color="deep-purple" size="xs" variant="solid"
                    >{{ currentCounts.iirgd_demand_status_history }} eventos</UiChip
                  >
                </div>
                <div class="d-flex justify-space-between align-center text-body-2 py-1">
                  <span>Logs de Auditoria do Sistema:</span>
                  <UiChip color="warning" size="xs" variant="solid"
                    >{{ currentCounts.logs }} registros</UiChip
                  >
                </div>
              </div>
            </div>

            <template #actions>
              <UiButton
                block
                color="primary"
                :loading="isGenerating"
                prepend-icon="download"
                variant="solid"
                @click="handleGenerateBackup"
              >
                Gerar e Baixar Backup (.json)
              </UiButton>
            </template>
          </UiCard>
        </UiCol>

        <!-- Card 2: Restauração de Backup -->
        <UiCol cols="12" md="6">
          <UiCard class="h-100" variant="outline">
            <template #header>
              <div class="d-flex align-center ga-2">
                <UiIcon color="warning" name="restore" size="24" />
                <span class="font-weight-bold text-subtitle-1">Restaurar Backup</span>
              </div>
            </template>

            <UiAlert class="mb-4" color="warning" size="sm" variant="soft">
              A restauração mescla os dados do arquivo no banco (upsert). Registros com o mesmo
              identificador serão atualizados com os dados do arquivo.
            </UiAlert>

            <!-- Input oculto de arquivo -->
            <input
              ref="fileInputRef"
              accept=".json,application/json"
              style="display: none"
              type="file"
              @change="onFileChange"
            />

            <div v-if="!inspection" class="text-center py-6 border-dashed rounded-lg mb-4">
              <UiIcon class="mb-2 text-medium-emphasis" name="database" size="36" />
              <div class="text-body-2 font-weight-medium mb-1">
                Selecione um arquivo de backup para restaurar
              </div>
              <div class="text-caption text-medium-emphasis mb-4">Arquivos com extensão .json</div>
              <UiButton
                color="primary"
                prepend-icon="upload"
                variant="soft"
                @click="triggerFileInput"
              >
                Selecionar Arquivo (.json)
              </UiButton>
            </div>

            <!-- Preview do arquivo inspecionado -->
            <div v-else-if="inspection.isValid" class="mb-4">
              <div class="d-flex align-center justify-space-between mb-2">
                <span class="text-subtitle-2 font-weight-bold"
                  >Arquivo pronto para restauração</span
                >
                <UiButton color="default" size="xs" variant="ghost" @click="resetRestore"
                  >Trocar arquivo</UiButton
                >
              </div>

              <UiCard class="pa-3 mb-3 bg-surface-variant" variant="soft">
                <div class="text-caption mb-1">
                  <strong>Gerado em:</strong>
                  {{
                    inspection.timestamp
                      ? new Date(inspection.timestamp).toLocaleString('pt-BR')
                      : '-'
                  }}
                </div>
                <div class="text-caption mb-1">
                  <strong>Responsável:</strong> {{ inspection.generatedBy || 'Sistema' }}
                </div>
                <div class="text-caption">
                  <strong>Versão do Schema:</strong> {{ inspection.version || '1.0' }}
                </div>
              </UiCard>

              <div class="text-caption font-weight-bold text-uppercase text-medium-emphasis mb-2">
                Registros a serem restaurados
              </div>
              <div class="d-flex flex-wrap ga-2">
                <UiChip color="primary" label size="sm" variant="soft">
                  Demandas: {{ inspection.counts.demands || 0 }}
                </UiChip>
                <UiChip color="primary" label size="sm" variant="soft">
                  Itens Demanda: {{ inspection.counts.demand_products || 0 }}
                </UiChip>
                <UiChip color="info" label size="sm" variant="soft">
                  Demandas IIRGD: {{ inspection.counts.iirgd_demands || 0 }}
                </UiChip>
                <UiChip color="teal" label size="sm" variant="soft">
                  Cidadãos: {{ inspection.counts.iirgd_citizens || 0 }}
                </UiChip>
                <UiChip color="secondary" label size="sm" variant="soft">
                  Usuários: {{ inspection.counts.profiles || 0 }}
                </UiChip>
                <UiChip color="deep-purple" label size="sm" variant="soft">
                  Histórico IIRGD: {{ inspection.counts.iirgd_demand_status_history || 0 }}
                </UiChip>
                <UiChip color="warning" label size="sm" variant="soft">
                  Logs: {{ inspection.counts.logs || 0 }}
                </UiChip>
              </div>
            </div>

            <!-- Arquivo Inválido -->
            <div v-else class="mb-4">
              <UiAlert color="error" size="sm" variant="soft">
                {{ inspection.errorMessage }}
              </UiAlert>
              <div class="mt-2 text-center">
                <UiButton color="default" size="sm" variant="ghost" @click="resetRestore"
                  >Tentar outro arquivo</UiButton
                >
              </div>
            </div>

            <!-- Resultado de restauração -->
            <UiAlert v-if="restoreResult" class="mt-4" color="success" size="sm" variant="soft">
              <div class="font-weight-bold mb-1">Restauração concluída com sucesso!</div>
              <div class="text-caption">
                {{ restoreResult.counts.demands }} demandas,
                {{ restoreResult.counts.iirgd_demands }} demandas IIRGD,
                {{ restoreResult.counts.iirgd_citizens }} cidadãos e
                {{ restoreResult.counts.logs }} logs foram restaurados.
              </div>
            </UiAlert>

            <template #actions>
              <UiButton
                v-if="inspection && inspection.isValid"
                block
                color="warning"
                :loading="isRestoring"
                prepend-icon="restore"
                variant="solid"
                @click="isConfirmModalOpen = true"
              >
                Confirmar Restauração do Backup
              </UiButton>
            </template>
          </UiCard>
        </UiCol>
      </UiRow>
    </UiContainer>

    <!-- Modal de Confirmação de Restauração -->
    <UiModal v-model="isConfirmModalOpen" max-width="500px" title="Confirmar Restauração">
      <div class="pa-2">
        <UiAlert class="mb-4" color="warning" size="sm" variant="soft">
          Você tem certeza de que deseja restaurar os dados deste arquivo? Os dados existentes serão
          mesclados e atualizados conforme o conteúdo do backup.
        </UiAlert>
        <p class="text-body-2 text-medium-emphasis">
          Esta operação não pode ser desfeita após a confirmação.
        </p>
      </div>

      <template #actions>
        <UiButton variant="ghost" @click="isConfirmModalOpen = false">Cancelar</UiButton>
        <UiButton
          color="warning"
          :loading="isRestoring"
          variant="solid"
          @click="handleRestoreConfirm"
        >
          Sim, Restaurar Dados
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>

<style scoped>
  .border-dashed {
    border: 2px dashed rgba(var(--v-border-color), 0.3);
  }
  .border-bottom {
    border-bottom: 1px solid rgba(var(--v-border-color), 0.12);
  }
</style>
