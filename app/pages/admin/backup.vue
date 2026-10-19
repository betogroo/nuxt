<script setup lang="ts">
  import { ref, computed, onMounted } from 'vue'
  import { useBackup } from '~/composables/useBackup'
  import type { BackupInspection, BackupSummary, RestoreResult } from '~/types/backup'
  import type { IconName } from '~/components/ui/icons'

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

  interface BackupTableMeta {
    key: keyof BackupSummary
    label: string
    suffix: string
    color: string
  }

  interface BackupCategoryMeta {
    title: string
    icon: IconName
    tables: BackupTableMeta[]
  }

  const BACKUP_CATEGORIES: BackupCategoryMeta[] = [
    {
      title: 'Demandas & Compras',
      icon: 'document',
      tables: [
        { key: 'demands', label: 'Demandas Gerais', suffix: 'demandas', color: 'primary' },
        { key: 'demand_products', label: 'Itens de Demandas', suffix: 'itens', color: 'primary' },
        {
          key: 'demand_product_bids',
          label: 'Propostas / Lances',
          suffix: 'propostas',
          color: 'primary',
        },
        {
          key: 'demand_responsibles',
          label: 'Responsáveis Vinculados',
          suffix: 'vínculos',
          color: 'primary',
        },
      ],
    },
    {
      title: 'Catálogo & Cadastros',
      icon: 'product',
      tables: [
        { key: 'suppliers', label: 'Fornecedores', suffix: 'fornecedores', color: 'indigo' },
        { key: 'products', label: 'Produtos', suffix: 'produtos', color: 'teal' },
        { key: 'product_classes', label: 'Classes de Produtos', suffix: 'classes', color: 'teal' },
        {
          key: 'expense_natures',
          label: 'Naturezas de Despesa',
          suffix: 'naturezas',
          color: 'teal',
        },
        {
          key: 'measurement_units',
          label: 'Unidades de Medida',
          suffix: 'unidades',
          color: 'teal',
        },
        {
          key: 'measurement_unit_aliases',
          label: 'Sinônimos de Unidades',
          suffix: 'sinônimos',
          color: 'teal',
        },
        {
          key: 'measurement_unit_alias_links',
          label: 'Vínculos de Sinônimos',
          suffix: 'vínculos',
          color: 'teal',
        },
        { key: 'product_units', label: 'Unidades por Produto', suffix: 'vínculos', color: 'teal' },
      ],
    },
    {
      title: 'Módulo IIRGD',
      icon: 'contactDetails',
      tables: [
        { key: 'iirgd_demands', label: 'Demandas IIRGD', suffix: 'demandas', color: 'info' },
        { key: 'iirgd_citizens', label: 'Cidadãos Cadastrados', suffix: 'cidadãos', color: 'info' },
        {
          key: 'iirgd_document_types',
          label: 'Tipos de Documento',
          suffix: 'tipos',
          color: 'info',
        },
        {
          key: 'iirgd_demand_status_history',
          label: 'Histórico de Status',
          suffix: 'eventos',
          color: 'deep-purple',
        },
        {
          key: 'iirgd_settings',
          label: 'Parâmetros do IIRGD',
          suffix: 'registros',
          color: 'deep-purple',
        },
      ],
    },
    {
      title: 'Sistema & Auditoria',
      icon: 'security',
      tables: [
        { key: 'profiles', label: 'Perfis de Usuários', suffix: 'usuários', color: 'secondary' },
        { key: 'logs', label: 'Logs de Auditoria', suffix: 'logs', color: 'warning' },
      ],
    },
  ]

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

  const totalCurrentRecords = computed(() => {
    if (!currentCounts.value) return 0
    return Object.values(currentCounts.value).reduce((acc, val) => acc + (Number(val) || 0), 0)
  })

  const totalInspectionRecords = computed(() => {
    if (!inspection.value?.counts) return 0
    return Object.values(inspection.value.counts).reduce((acc, val) => acc + (Number(val) || 0), 0)
  })

  const totalRestoredRecords = computed(() => {
    if (!restoreResult.value?.counts) return 0
    return Object.values(restoreResult.value.counts).reduce(
      (acc, val) => acc + (Number(val) || 0),
      0,
    )
  })

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
              <div class="d-flex align-center justify-space-between mb-2">
                <div class="text-caption font-weight-bold text-medium-emphasis text-uppercase">
                  Registros atuais no banco
                </div>
                <UiChip v-if="currentCounts" color="primary" size="xs" variant="soft">
                  19 tabelas ({{ totalCurrentRecords }} registros)
                </UiChip>
              </div>

              <div v-if="isFetchingCounts && !currentCounts" class="d-flex justify-center py-4">
                <UiProgressCircular color="primary" indeterminate size="28" width="2" />
              </div>

              <div v-else-if="currentCounts" class="d-flex flex-column ga-3">
                <div v-for="cat in BACKUP_CATEGORIES" :key="cat.title" class="border rounded pa-2">
                  <div
                    class="text-caption font-weight-bold text-medium-emphasis mb-1 d-flex align-center ga-1"
                  >
                    <UiIcon :name="cat.icon" size="14" />
                    <span>{{ cat.title }}</span>
                  </div>
                  <div class="d-flex flex-column ga-1">
                    <div
                      v-for="tbl in cat.tables"
                      :key="tbl.key"
                      class="d-flex justify-space-between align-center text-body-2 py-1 px-1 border-bottom"
                    >
                      <span>{{ tbl.label }}:</span>
                      <UiChip :color="tbl.color" size="xs" variant="solid">
                        {{ currentCounts[tbl.key] ?? 0 }} {{ tbl.suffix }}
                      </UiChip>
                    </div>
                  </div>
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

              <div class="d-flex align-center justify-space-between mb-2">
                <div class="text-caption font-weight-bold text-uppercase text-medium-emphasis">
                  Registros a serem restaurados
                </div>
                <UiChip color="primary" label size="xs" variant="outlined">
                  Total: {{ totalInspectionRecords }} registros
                </UiChip>
              </div>

              <div class="d-flex flex-column ga-3">
                <div
                  v-for="cat in BACKUP_CATEGORIES"
                  :key="cat.title"
                  class="rounded pa-2 bg-surface"
                  style="border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity))"
                >
                  <div class="d-flex align-center ga-1 mb-2">
                    <UiIcon class="text-medium-emphasis" :name="cat.icon" size="16" />
                    <span class="text-caption font-weight-bold">{{ cat.title }}</span>
                  </div>
                  <div class="d-flex flex-wrap ga-1">
                    <UiChip
                      v-for="tbl in cat.tables"
                      :key="tbl.key"
                      :color="tbl.color"
                      label
                      size="xs"
                      variant="soft"
                    >
                      {{ tbl.label }}: {{ inspection.counts[tbl.key] || 0 }}
                    </UiChip>
                  </div>
                </div>
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
                {{ totalRestoredRecords }} registros processados com sucesso em 19 tabelas do
                sistema.
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
