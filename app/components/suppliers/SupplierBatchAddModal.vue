<script setup lang="ts">
  import { ref, computed, watch } from 'vue'
  import { useSuppliers, type SupplierRow } from '~/composables/useSuppliers'
  import {
    parseBatchSuppliersText,
    type ParsedBatchSupplierItem,
    type ParseBatchSuppliersResult,
  } from '~/utils/parseBatchSuppliers'

  const emit = defineEmits<{
    (e: 'saved', count: number): void
  }>()

  const isOpen = defineModel<boolean>({ default: false })

  const { checkExistingSuppliersByCnpjs, createSuppliersBatch } = useSuppliers()

  // State
  const rawText = ref('')
  const isProcessing = ref(false)
  const isSaving = ref(false)
  const saveError = ref('')
  const hasParsed = ref(false)
  const isCompleted = ref(false)

  const parsedItems = ref<ParsedBatchSupplierItem[]>([])
  const ignoredHeaderLines = ref<Array<{ lineNumber: number; line: string; reason: string }>>([])
  const activeTab = ref<'ready' | 'ignored'>('ready')
  const completedTab = ref<'saved' | 'ignored'>('saved')

  // Results for completed stage
  const successfullySavedSuppliers = ref<SupplierRow[]>([])

  const readyItems = computed(() =>
    parsedItems.value.filter((item) => item.isValid && item.status === 'ready'),
  )

  const ignoredItems = computed(() =>
    parsedItems.value.filter((item) => !item.isValid || item.status !== 'ready'),
  )

  const resetState = () => {
    rawText.value = ''
    isProcessing.value = false
    isSaving.value = false
    saveError.value = ''
    hasParsed.value = false
    isCompleted.value = false
    parsedItems.value = []
    ignoredHeaderLines.value = []
    activeTab.value = 'ready'
    completedTab.value = 'saved'
    successfullySavedSuppliers.value = []
  }

  watch(
    () => isOpen.value,
    (open) => {
      if (!open) {
        resetState()
      }
    },
  )

  const handleProcessText = async () => {
    saveError.value = ''
    if (!rawText.value.trim()) {
      saveError.value = 'Por favor, cole ou digite os dados antes de processar.'
      return
    }

    isProcessing.value = true

    try {
      const result: ParseBatchSuppliersResult = parseBatchSuppliersText(rawText.value)
      ignoredHeaderLines.value = result.ignoredLines

      const candidateCleanCnpjs = result.items
        .filter((item) => item.isValid && item.cleanCnpj.length === 14)
        .map((item) => item.cleanCnpj)

      // Verificar no banco quais já existem
      const existingMap = await checkExistingSuppliersByCnpjs(candidateCleanCnpjs)

      // Atualizar o status dos itens baseado na existência no banco
      result.items.forEach((item) => {
        if (item.isValid && item.cleanCnpj) {
          const existing = existingMap.get(item.cleanCnpj)
          if (existing) {
            item.isValid = false
            item.status = 'already_registered'
            item.errorReason = `Fornecedor já cadastrado no sistema (${existing.company_name}).`
            item.existingSupplierId = existing.id
          }
        }
      })

      parsedItems.value = result.items
      hasParsed.value = true

      // Ajusta aba ativa inicial: se houver itens prontos, foca neles; senão, foca nos ignorados
      if (result.items.some((i) => i.isValid && i.status === 'ready')) {
        activeTab.value = 'ready'
      } else {
        activeTab.value = 'ignored'
      }
    } catch (err: unknown) {
      console.error('Erro ao processar texto do lote:', err)
      saveError.value =
        err instanceof Error ? err.message : 'Erro inesperado ao processar o texto informado.'
    } finally {
      isProcessing.value = false
    }
  }

  const handleBackToEdit = () => {
    hasParsed.value = false
    saveError.value = ''
  }

  const handleConfirmSave = async () => {
    const toSave = readyItems.value
    if (toSave.length === 0) {
      saveError.value = 'Não há fornecedores válidos e novos para cadastrar.'
      return
    }

    isSaving.value = true
    saveError.value = ''

    try {
      const payloads = toSave.map((item) => ({
        cnpj: item.cnpj,
        company_name: item.company_name,
      }))

      const created = await createSuppliersBatch(payloads)
      successfullySavedSuppliers.value = created
      isCompleted.value = true
      emit('saved', created.length)
    } catch (err: unknown) {
      console.error('Erro ao salvar lote de fornecedores:', err)
      saveError.value =
        err instanceof Error ? err.message : 'Falha ao cadastrar os fornecedores. Tente novamente.'
    } finally {
      isSaving.value = false
    }
  }

  const closeModal = () => {
    isOpen.value = false
  }

  const getStatusChipColor = (status: string) => {
    switch (status) {
      case 'ready':
        return 'success'
      case 'already_registered':
        return 'secondary'
      case 'duplicate_in_batch':
        return 'warning'
      case 'invalid_cnpj':
      case 'missing_name':
      default:
        return 'error'
    }
  }

  const getStatusChipLabel = (status: string) => {
    switch (status) {
      case 'ready':
        return 'Pronto para Cadastrar'
      case 'already_registered':
        return 'Já Cadastrado'
      case 'duplicate_in_batch':
        return 'Duplicado no Lote'
      case 'invalid_cnpj':
        return 'CNPJ Inválido'
      case 'missing_name':
        return 'Nome Ausente'
      default:
        return 'Inválido'
    }
  }

  const readyTableHeaders = [
    { text: '#', value: 'index', width: '50px' },
    { text: 'CNPJ', value: 'cnpj', width: '180px' },
    { text: 'Nome da Empresa', value: 'company_name' },
    { text: 'Status', value: 'status', align: 'center' as const, width: '170px' },
  ]

  const ignoredTableHeaders = [
    { text: '#', value: 'index', width: '50px' },
    { text: 'CNPJ', value: 'cnpj', width: '180px' },
    { text: 'Nome da Empresa', value: 'company_name' },
    { text: 'Motivo', value: 'status', width: '160px' },
    { text: 'Detalhe', value: 'reason' },
  ]
</script>

<template>
  <UiModal v-model="isOpen" max-width="960px" persistent title="Cadastro de Fornecedores em Lote">
    <template #header>
      <div class="d-flex align-center gap-2">
        <UiIcon color="primary" name="playlistAdd" />
        <span class="text-h6 font-weight-bold">Cadastro de Fornecedores em Lote</span>
      </div>
    </template>

    <div class="pa-4">
      <!-- Alerta Geral de Erro -->
      <UiAlert v-if="saveError" class="mb-4" size="sm" type="error" variant="soft">
        {{ saveError }}
      </UiAlert>

      <!-- ========================================== -->
      <!-- ETAPA 1: ENTRADA / COLAGEM DO TEXTO        -->
      <!-- ========================================== -->
      <div v-if="!hasParsed && !isCompleted">
        <UiAlert class="mb-4" size="sm" type="info" variant="soft">
          <div class="font-weight-medium mb-1">Como colar os dados:</div>
          <div class="text-caption">
            Cole as linhas diretamente do Excel, Google Sheets, CSV ou texto. O sistema aceita CNPJ
            com ou sem pontuação. Separadores aceitos: <strong>Tabulação</strong>,
            <strong>Ponto e vírgula (;)</strong>, <strong>Vírgula (,)</strong> ou
            <strong>Hífen ( - )</strong>. Caso um CNPJ já esteja cadastrado no sistema, ele será
            identificado e ignorado automaticamente.
          </div>
        </UiAlert>

        <UiCard class="mb-3" variant="outline">
          <div class="pa-3">
            <div class="text-caption font-weight-bold text-medium-emphasis mb-2">
              Exemplo de formato esperado:
            </div>
            <pre
              class="text-caption text-grey-darken-1 bg-grey-lighten-4 pa-2 rounded"
              style="overflow-x: auto; font-family: monospace"
            >
00.000.000/0001-91	Empresa Alpha Ltda
11222333000144 - Beta Serviços ME
Gama Distribuidora; 33.000.167/0001-01</pre>
          </div>
        </UiCard>

        <UiTextarea
          v-model="rawText"
          class="mb-3"
          hide-details="auto"
          label="Cole a lista de fornecedores aqui (um por linha)"
          placeholder="00.000.000/0001-91&#9;Empresa Exemplo LTDA&#10;33000167000101&#9;Beta Distribuidora ME"
          :rows="10"
          variant="outline"
        />

        <div class="d-flex justify-end gap-2 mt-4">
          <UiButton variant="outlined" @click="closeModal"> Cancelar </UiButton>
          <UiButton
            color="primary"
            :disabled="!rawText.trim()"
            :loading="isProcessing"
            prepend-icon="check"
            @click="handleProcessText"
          >
            Processar Texto
          </UiButton>
        </div>
      </div>

      <!-- ========================================== -->
      <!-- ETAPA 2: PRÉ-VISUALIZAÇÃO E VALIDAÇÃO     -->
      <!-- ========================================== -->
      <div v-else-if="hasParsed && !isCompleted">
        <!-- Métricas do Lote -->
        <UiRow class="mb-4" dense>
          <UiCol cols="12" md="4" sm="4">
            <UiCard class="pa-3" variant="outline">
              <div class="text-caption text-medium-emphasis">Total de Linhas</div>
              <div class="text-h6 font-weight-bold">{{ parsedItems.length }}</div>
            </UiCard>
          </UiCol>
          <UiCol cols="12" md="4" sm="4">
            <UiCard class="pa-3" variant="outline">
              <div class="text-caption text-success font-weight-bold">A Cadastrar (Novos)</div>
              <div class="text-h6 font-weight-bold text-success">{{ readyItems.length }}</div>
            </UiCard>
          </UiCol>
          <UiCol cols="12" md="4" sm="4">
            <UiCard class="pa-3" variant="outline">
              <div class="text-caption text-secondary font-weight-bold">Ignorados / Inválidos</div>
              <div class="text-h6 font-weight-bold text-secondary">{{ ignoredItems.length }}</div>
            </UiCard>
          </UiCol>
        </UiRow>

        <UiAlert
          v-if="readyItems.length === 0"
          class="mb-4"
          size="sm"
          type="warning"
          variant="soft"
        >
          Nenhum fornecedor novo e válido foi identificado para cadastro. Todos os registros
          informados já estão cadastrados ou possuem erros.
        </UiAlert>

        <UiAlert
          v-else-if="ignoredItems.length > 0"
          class="mb-4"
          size="sm"
          type="info"
          variant="soft"
        >
          {{ readyItems.length }} fornecedor(es) pronto(s) para cadastro.
          {{ ignoredItems.length }} fornecedor(es) não serão cadastrados e serão ignorados conforme
          demonstrado na aba correspondente.
        </UiAlert>

        <!-- Abas de Navegação -->
        <UiTabs v-model="activeTab" class="mb-3" color="primary">
          <UiTab value="ready">
            Novos a Cadastrar
            <UiChip class="ml-2" color="success" size="xs" variant="soft">
              {{ readyItems.length }}
            </UiChip>
          </UiTab>
          <UiTab value="ignored">
            Não Cadastrados / Ignorados
            <UiChip class="ml-2" color="secondary" size="xs" variant="soft">
              {{ ignoredItems.length }}
            </UiChip>
          </UiTab>
        </UiTabs>

        <!-- Conteúdo Aba: Novos a Cadastrar -->
        <div v-if="activeTab === 'ready'">
          <UiTable :headers="readyTableHeaders" :items="readyItems">
            <template #empty> Nenhum fornecedor novo pronto para cadastro. </template>
            <template #item-index="{ index }">
              <span class="text-caption text-grey">{{ (index ?? 0) + 1 }}</span>
            </template>
            <template #item-cnpj="{ item }">
              <span class="font-weight-medium font-monospace">{{ item.cnpj }}</span>
            </template>
            <template #item-company_name="{ item }">
              <span>{{ item.company_name }}</span>
            </template>
            <template #item-status="{ item }">
              <UiChip :color="getStatusChipColor(item.status)" size="xs" variant="soft">
                {{ getStatusChipLabel(item.status) }}
              </UiChip>
            </template>
          </UiTable>
        </div>

        <!-- Conteúdo Aba: Não Cadastrados / Ignorados -->
        <div v-else-if="activeTab === 'ignored'">
          <UiTable :headers="ignoredTableHeaders" :items="ignoredItems">
            <template #empty>
              Nenhum fornecedor ignorado. Todas as linhas lidas são válidas e inéditas!
            </template>
            <template #item-index="{ index }">
              <span class="text-caption text-grey">{{ (index ?? 0) + 1 }}</span>
            </template>
            <template #item-cnpj="{ item }">
              <span class="font-monospace text-medium-emphasis">{{ item.cnpj || '-' }}</span>
            </template>
            <template #item-company_name="{ item }">
              <span>{{ item.company_name || '(Não informado)' }}</span>
            </template>
            <template #item-status="{ item }">
              <UiChip :color="getStatusChipColor(item.status)" size="xs" variant="soft">
                {{ getStatusChipLabel(item.status) }}
              </UiChip>
            </template>
            <template #item-reason="{ item }">
              <span class="text-caption text-grey-darken-1">{{ item.errorReason }}</span>
            </template>
          </UiTable>
        </div>

        <!-- Rodapé de Ações -->
        <div class="d-flex justify-space-between align-center mt-5">
          <UiButton variant="outlined" @click="handleBackToEdit"> Voltar / Editar Texto </UiButton>
          <div class="d-flex gap-2">
            <UiButton variant="ghost" @click="closeModal"> Cancelar </UiButton>
            <UiButton
              color="primary"
              :disabled="readyItems.length === 0"
              :loading="isSaving"
              prepend-icon="check"
              @click="handleConfirmSave"
            >
              Confirmar Cadastro ({{ readyItems.length }})
            </UiButton>
          </div>
        </div>
      </div>

      <!-- ========================================== -->
      <!-- ETAPA 3: RELATÓRIO FINAL DE CONCLUSÃO      -->
      <!-- ========================================== -->
      <div v-else-if="isCompleted">
        <UiAlert class="mb-4" size="sm" type="success" variant="soft">
          <div class="d-flex align-center gap-2">
            <UiIcon color="success" name="checkCircle" />
            <div>
              <strong>Lote processado com sucesso!</strong>
              <div>
                {{ successfullySavedSuppliers.length }} fornecedor(es) foram cadastrados e
                {{ ignoredItems.length }} fornecedor(es) não foram cadastrados.
              </div>
            </div>
          </div>
        </UiAlert>

        <!-- Abas de Visualização do Relatório Final -->
        <UiTabs v-model="completedTab" class="mb-3" color="primary">
          <UiTab value="saved">
            Cadastrados com Sucesso
            <UiChip class="ml-2" color="success" size="xs" variant="soft">
              {{ successfullySavedSuppliers.length }}
            </UiChip>
          </UiTab>
          <UiTab value="ignored">
            Não Cadastrados
            <UiChip class="ml-2" color="secondary" size="xs" variant="soft">
              {{ ignoredItems.length }}
            </UiChip>
          </UiTab>
        </UiTabs>

        <!-- Aba: Cadastrados com Sucesso -->
        <div v-if="completedTab === 'saved'">
          <UiTable
            :headers="[
              { text: '#', value: 'index', width: '50px' },
              { text: 'CNPJ', value: 'cnpj', width: '180px' },
              { text: 'Nome da Empresa', value: 'company_name' },
              { text: 'Status', value: 'status', align: 'center', width: '140px' },
            ]"
            :items="successfullySavedSuppliers"
          >
            <template #item-index="{ index }">
              <span class="text-caption text-grey">{{ (index ?? 0) + 1 }}</span>
            </template>
            <template #item-cnpj="{ item }">
              <span class="font-weight-medium font-monospace">{{ item.cnpj }}</span>
            </template>
            <template #item-company_name="{ item }">
              <span>{{ item.company_name }}</span>
            </template>
            <template #item-status>
              <UiChip color="success" size="xs" variant="soft"> Cadastrado </UiChip>
            </template>
          </UiTable>
        </div>

        <!-- Aba: Não Cadastrados -->
        <div v-else-if="completedTab === 'ignored'">
          <UiTable :headers="ignoredTableHeaders" :items="ignoredItems">
            <template #empty> Todos os fornecedores do lote foram cadastrados! </template>
            <template #item-index="{ index }">
              <span class="text-caption text-grey">{{ (index ?? 0) + 1 }}</span>
            </template>
            <template #item-cnpj="{ item }">
              <span class="font-monospace text-medium-emphasis">{{ item.cnpj || '-' }}</span>
            </template>
            <template #item-company_name="{ item }">
              <span>{{ item.company_name || '(Não informado)' }}</span>
            </template>
            <template #item-status="{ item }">
              <UiChip :color="getStatusChipColor(item.status)" size="xs" variant="soft">
                {{ getStatusChipLabel(item.status) }}
              </UiChip>
            </template>
            <template #item-reason="{ item }">
              <span class="text-caption text-grey-darken-1">{{ item.errorReason }}</span>
            </template>
          </UiTable>
        </div>

        <!-- Rodapé de Conclusão -->
        <div class="d-flex justify-space-between align-center mt-5">
          <UiButton variant="outlined" @click="resetState"> Cadastrar Outro Lote </UiButton>
          <UiButton color="primary" @click="closeModal"> Concluir e Fechar </UiButton>
        </div>
      </div>
    </div>
  </UiModal>
</template>
