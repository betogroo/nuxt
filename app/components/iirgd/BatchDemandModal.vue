<script setup lang="ts">
  import { ref, computed, watch } from 'vue'
  import {
    useIirgdDemands,
    type IirgdDemand,
    type BatchCreateIirgdDemandInput,
  } from '~/composables/useIirgdDemands'
  import {
    useIirgdDocumentTypes,
    type IirgdDocumentTypeRow,
  } from '~/composables/useIirgdDocumentTypes'
  import {
    parseBatchIirgdDemandsText,
    normalizeIirgdCatalogText,
    type ParsedBatchIirgdDemandItem,
    type ParseBatchIirgdDemandsResult,
  } from '~/utils/parseBatchIirgdDemands'
  import { formatCitizenName, padAndFormatRg } from '~/utils/formatters'

  const emit = defineEmits<{
    (e: 'created', count: number): void
  }>()

  const isOpen = defineModel<boolean>({ default: false })

  const { checkExistingCitizensAndActiveDemands, createDemandsBatch } = useIirgdDemands()
  const { fetchAllActiveDocumentTypes, fetchPendingDocumentTypes, createPendingDocumentType } =
    useIirgdDocumentTypes()
  const toast = useToast()

  // State
  const rawText = ref('')
  const isProcessing = ref(false)
  const isSaving = ref(false)
  const saveError = ref('')
  const hasParsed = ref(false)
  const isCompleted = ref(false)

  const parsedItems = ref<ParsedBatchIirgdDemandItem[]>([])
  const ignoredHeaderLines = ref<Array<{ lineNumber: number; line: string; reason: string }>>([])
  const activeTab = ref<'ready' | 'ignored'>('ready')
  const completedTab = ref<'saved' | 'ignored'>('saved')

  const successfullySavedDemands = ref<IirgdDemand[]>([])

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
    successfullySavedDemands.value = []
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
      const result: ParseBatchIirgdDemandsResult = parseBatchIirgdDemandsText(rawText.value)
      ignoredHeaderLines.value = result.ignoredLines

      const validRgs = result.items
        .filter((item) => item.isValid && Boolean(item.rg))
        .map((item) => item.rg as string)

      const validCpfs = result.items
        .filter((item) => item.isValid && Boolean(item.cpf))
        .map((item) => item.cpf as string)

      const [activeDocTypes, pendingDocTypes, existingCitizensLookup] = await Promise.all([
        fetchAllActiveDocumentTypes(),
        fetchPendingDocumentTypes().catch(() => [] as IirgdDocumentTypeRow[]),
        checkExistingCitizensAndActiveDemands({ rgs: validRgs, cpfs: validCpfs }),
      ])

      const docTypesByNormalizedName = new Map<string, IirgdDocumentTypeRow>()
      for (const dt of [...activeDocTypes, ...pendingDocTypes]) {
        docTypesByNormalizedName.set(normalizeIirgdCatalogText(dt.name), dt)
      }

      const seenExistingCitizenIds = new Set<string>()

      result.items.forEach((item) => {
        if (item.document_type_name) {
          const matchedDoc = docTypesByNormalizedName.get(
            normalizeIirgdCatalogText(item.document_type_name),
          )
          if (matchedDoc) {
            item.document_type_id = matchedDoc.id
            item.document_type_name = matchedDoc.name
            item.isNewDocumentType = false
          } else {
            item.document_type_id = null
            item.isNewDocumentType = true
          }
        }

        if (item.isValid) {
          const existingEntry =
            (item.rg ? existingCitizensLookup.byRg.get(item.rg) : undefined) ||
            (item.cpf ? existingCitizensLookup.byCpf.get(item.cpf) : undefined)

          if (existingEntry) {
            const citId = existingEntry.citizen.id
            if (citId && seenExistingCitizenIds.has(citId)) {
              item.isValid = false
              item.status = 'duplicate_in_batch'
              item.errorReason = 'Este cidadão já está incluído em outra linha deste lote.'
            } else {
              item.existingCitizenId = citId || null
              if (citId) {
                seenExistingCitizenIds.add(citId)
              }
              if (existingEntry.hasActiveDemand) {
                item.hasActiveDemandWarning = true
              }
            }
          }
        }
      })

      parsedItems.value = result.items
      hasParsed.value = true

      if (result.items.some((i) => i.isValid && i.status === 'ready')) {
        activeTab.value = 'ready'
      } else {
        activeTab.value = 'ignored'
      }
    } catch (err: unknown) {
      console.error('Erro ao processar texto do lote IIRGD:', err)
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
      saveError.value = 'Não há demandas válidas para cadastrar.'
      return
    }

    isSaving.value = true
    saveError.value = ''

    try {
      const pendingTypesCache = new Map<string, string>()

      for (const item of toSave) {
        if (!item.document_type_id && item.document_type_name) {
          const normKey = normalizeIirgdCatalogText(item.document_type_name)
          let resolvedId = pendingTypesCache.get(normKey)
          if (!resolvedId) {
            const createdPending = await createPendingDocumentType(item.document_type_name)
            resolvedId = createdPending.id
            pendingTypesCache.set(normKey, resolvedId)
          }
          item.document_type_id = resolvedId
        }
      }

      const payloads: BatchCreateIirgdDemandInput[] = toSave.map((item) => ({
        station_code: item.station_code,
        name: item.name,
        rg: item.rg,
        cpf: item.cpf,
        document_type_id: item.document_type_id as string,
        existingCitizenId: item.existingCitizenId,
      }))

      const created = await createDemandsBatch(payloads)
      successfullySavedDemands.value = created
      isCompleted.value = true
      toast.success(
        `${created.length} ${created.length === 1 ? 'demanda criada' : 'demandas criadas'} com sucesso!`,
      )
      emit('created', created.length)
    } catch (err: unknown) {
      console.error('Erro ao salvar lote de demandas IIRGD:', err)
      saveError.value =
        err instanceof Error
          ? err.message
          : 'Falha ao cadastrar as demandas em lote. Tente novamente.'
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
      case 'active_demand_exists':
        return 'secondary'
      case 'duplicate_in_batch':
        return 'warning'
      case 'invalid_station':
      case 'invalid_document':
      case 'missing_name':
      case 'missing_document_type':
      default:
        return 'error'
    }
  }

  const getStatusChipLabel = (status: string) => {
    switch (status) {
      case 'ready':
        return 'Pronta para Cadastrar'
      case 'active_demand_exists':
        return 'Em Andamento'
      case 'duplicate_in_batch':
        return 'Duplicado no Lote'
      case 'invalid_station':
        return 'Posto Inválido'
      case 'invalid_document':
        return 'RG/CPF Inválido'
      case 'missing_name':
        return 'Nome Ausente'
      case 'missing_document_type':
        return 'Tipo Doc. Ausente'
      default:
        return 'Inválido'
    }
  }

  const readyTableHeaders = [
    { text: '#', value: 'index', width: '50px' },
    { text: 'Posto', value: 'station_code', width: '100px' },
    { text: 'RG / CPF', value: 'formattedDocument', width: '170px' },
    { text: 'Nome do Cidadão', value: 'name' },
    { text: 'Tipo de Documento', value: 'document_type_name', width: '210px' },
    { text: 'Status', value: 'status', align: 'center' as const, width: '170px' },
  ]

  const ignoredTableHeaders = [
    { text: '#', value: 'index', width: '50px' },
    { text: 'Posto', value: 'station_code', width: '100px' },
    { text: 'RG / CPF', value: 'formattedDocument', width: '170px' },
    { text: 'Nome do Cidadão', value: 'name' },
    { text: 'Motivo', value: 'status', width: '150px' },
    { text: 'Detalhe', value: 'reason' },
  ]
</script>

<template>
  <UiModal v-model="isOpen" max-width="1024px" persistent title="Inserir Demandas IIRGD em Lote">
    <template #header>
      <div class="d-flex align-center ga-2">
        <UiIcon color="primary" name="playlistAdd" />
        <span class="text-h6 font-weight-bold">Inserir Demandas IIRGD em Lote</span>
      </div>
    </template>

    <div class="pa-4">
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
            Cole as linhas diretamente do <strong>Excel / Google Sheets</strong> ou texto separado
            por tabulação (<code>TAB</code>) ou ponto-e-vírgula (<code>;</code>) na ordem:
            <strong>Posto</strong>, <strong>RG ou CPF</strong>, <strong>Nome do Cidadão</strong> e
            <strong>Tipo de Documento</strong>. O sistema valida automaticamente o dígito
            verificador do RG/CPF, reaproveita cidadãos já cadastrados e ignora solicitações que já
            estejam em andamento.
          </div>
        </UiAlert>

        <UiCard class="mb-3" variant="outline">
          <div class="pa-3">
            <div class="text-caption font-weight-bold text-medium-emphasis mb-2">
              Exemplo de formato esperado (Posto | RG ou CPF | Nome | Tipo de Documento):
            </div>
            <pre
              class="text-caption text-grey-darken-1 bg-grey-lighten-4 pa-2 rounded"
              style="overflow-x: auto; font-family: monospace"
            >
1342-5	49770365-8	CAROLINA SANTOS DA CRUZ	Antecedentes Numeral
1062-9	73271119-8	MARIA FERNANDA SICOLI BRUNHARA	Primeira Via CIN
1062-9	11864903-6	ANTONIO DE SOUZA LEITE	Segunda Via
1342-5	14376013-0	ZÉLIA DE JESUS SILVA	Segunda Via</pre>
          </div>
        </UiCard>

        <UiTextarea
          v-model="rawText"
          class="mb-3"
          hide-details="auto"
          label="Cole a lista de demandas aqui"
          placeholder="1342-5	49770365-8	CAROLINA SANTOS DA CRUZ	Antecedentes Numeral..."
          :rows="10"
          variant="outline"
        />

        <div class="d-flex justify-end ga-2 mt-4">
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
        <UiRow class="mb-4" dense>
          <UiCol cols="12" md="4" sm="4">
            <UiCard class="pa-3" variant="outline">
              <div class="text-caption text-medium-emphasis">Total de Linhas</div>
              <div class="text-h6 font-weight-bold">{{ parsedItems.length }}</div>
            </UiCard>
          </UiCol>
          <UiCol cols="12" md="4" sm="4">
            <UiCard class="pa-3" variant="outline">
              <div class="text-caption text-success font-weight-bold">A Cadastrar (Válidas)</div>
              <div class="text-h6 font-weight-bold text-success">{{ readyItems.length }}</div>
            </UiCard>
          </UiCol>
          <UiCol cols="12" md="4" sm="4">
            <UiCard class="pa-3" variant="outline">
              <div class="text-caption text-secondary font-weight-bold">Ignoradas / Inválidas</div>
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
          Nenhuma demanda válida foi identificada para cadastro. Todos os registros informados já
          possuem solicitação em andamento ou contêm erros de validação.
        </UiAlert>

        <UiAlert
          v-else-if="ignoredItems.length > 0"
          class="mb-4"
          size="sm"
          type="info"
          variant="soft"
        >
          {{ readyItems.length }} demanda(s) pronta(s) para cadastro.
          {{ ignoredItems.length }} linha(s) não serão cadastradas e serão ignoradas conforme
          demonstrado na aba correspondente.
        </UiAlert>

        <UiTabs v-model="activeTab" class="mb-3" color="primary">
          <UiTab value="ready">
            Prontas para Cadastrar
            <UiChip class="ml-2" color="success" size="xs" variant="soft">
              {{ readyItems.length }}
            </UiChip>
          </UiTab>
          <UiTab value="ignored">
            Não Cadastradas / Ignoradas
            <UiChip class="ml-2" color="secondary" size="xs" variant="soft">
              {{ ignoredItems.length }}
            </UiChip>
          </UiTab>
        </UiTabs>

        <!-- Aba: Prontas para Cadastrar -->
        <div v-if="activeTab === 'ready'">
          <UiTable :headers="readyTableHeaders" :items="readyItems">
            <template #empty> Nenhuma demanda pronta para cadastro. </template>
            <template #item-index="{ index }">
              <span class="text-caption text-grey">{{ (index ?? 0) + 1 }}</span>
            </template>
            <template #item-station_code="{ item }">
              <UiChip color="blue-grey" label size="xs" variant="soft">
                {{ item.station_code }}
              </UiChip>
            </template>
            <template #item-formattedDocument="{ item }">
              <div class="d-flex align-center ga-1">
                <span class="font-weight-medium font-monospace">{{ item.formattedDocument }}</span>
                <UiChip
                  :color="item.citizenDocumentType === 'cpf' ? 'indigo' : 'primary'"
                  size="xs"
                  variant="soft"
                >
                  {{ item.citizenDocumentType === 'cpf' ? 'CPF' : 'RG' }}
                </UiChip>
              </div>
            </template>
            <template #item-name="{ item }">
              <div class="d-flex align-center ga-2">
                <span>{{ item.name }}</span>
                <UiChip v-if="item.existingCitizenId" color="info" size="xs" variant="soft">
                  Cidadão Existente
                </UiChip>
              </div>
            </template>
            <template #item-document_type_name="{ item }">
              <div class="d-flex align-center ga-1">
                <span>{{ item.document_type_name }}</span>
                <UiChip v-if="item.isNewDocumentType" color="warning" size="xs" variant="soft">
                  Novo (Pendente)
                </UiChip>
              </div>
            </template>
            <template #item-status="{ item }">
              <div class="d-flex align-center ga-1">
                <UiChip :color="getStatusChipColor(item.status)" size="xs" variant="soft">
                  {{ getStatusChipLabel(item.status) }}
                </UiChip>
                <UiChip v-if="item.hasActiveDemandWarning" color="warning" size="xs" variant="soft">
                  Demanda anterior aberta
                </UiChip>
              </div>
            </template>
          </UiTable>
        </div>

        <!-- Aba: Não Cadastradas / Ignoradas -->
        <div v-else-if="activeTab === 'ignored'">
          <UiTable :headers="ignoredTableHeaders" :items="ignoredItems">
            <template #empty>
              Nenhuma linha ignorada. Todas as demandas do lote são válidas!
            </template>
            <template #item-index="{ index }">
              <span class="text-caption text-grey">{{ (index ?? 0) + 1 }}</span>
            </template>
            <template #item-station_code="{ item }">
              <span class="font-monospace text-medium-emphasis">{{
                item.station_code || '-'
              }}</span>
            </template>
            <template #item-formattedDocument="{ item }">
              <span class="font-monospace text-medium-emphasis">{{
                item.formattedDocument || '-'
              }}</span>
            </template>
            <template #item-name="{ item }">
              <span>{{ item.name || '(Não informado)' }}</span>
            </template>
            <template #item-status="{ item }">
              <div class="d-flex align-center ga-1">
                <UiChip :color="getStatusChipColor(item.status)" size="xs" variant="soft">
                  {{ getStatusChipLabel(item.status) }}
                </UiChip>
                <UiChip v-if="item.hasActiveDemandWarning" color="warning" size="xs" variant="soft">
                  Demanda anterior aberta
                </UiChip>
              </div>
            </template>
            <template #item-reason="{ item }">
              <span class="text-caption text-grey-darken-1">{{ item.errorReason }}</span>
            </template>
          </UiTable>
        </div>

        <div class="d-flex justify-space-between align-center mt-5">
          <UiButton variant="outlined" @click="handleBackToEdit"> Voltar / Editar Texto </UiButton>
          <div class="d-flex ga-2">
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
          <div class="d-flex align-center ga-2">
            <UiIcon color="success" name="checkCircle" />
            <div>
              <strong>Lote processado com sucesso!</strong>
              <div>
                {{ successfullySavedDemands.length }} demanda(s) foram cadastradas e
                {{ ignoredItems.length }} linha(s) não foram cadastradas.
              </div>
            </div>
          </div>
        </UiAlert>

        <UiTabs v-model="completedTab" class="mb-3" color="primary">
          <UiTab value="saved">
            Cadastradas com Sucesso
            <UiChip class="ml-2" color="success" size="xs" variant="soft">
              {{ successfullySavedDemands.length }}
            </UiChip>
          </UiTab>
          <UiTab value="ignored">
            Não Cadastradas
            <UiChip class="ml-2" color="secondary" size="xs" variant="soft">
              {{ ignoredItems.length }}
            </UiChip>
          </UiTab>
        </UiTabs>

        <div v-if="completedTab === 'saved'">
          <UiTable
            :headers="[
              { text: '#', value: 'index', width: '50px' },
              { text: 'Posto', value: 'station_code', width: '100px' },
              { text: 'RG / CPF', value: 'document', width: '170px' },
              { text: 'Nome do Cidadão', value: 'name' },
              { text: 'Tipo de Documento', value: 'document_type', width: '210px' },
              { text: 'Status', value: 'status', align: 'center', width: '140px' },
            ]"
            :items="successfullySavedDemands"
          >
            <template #item-index="{ index }">
              <span class="text-caption text-grey">{{ (index ?? 0) + 1 }}</span>
            </template>
            <template #item-station_code="{ item }">
              <UiChip color="blue-grey" label size="xs" variant="soft">
                {{ item.station_code }}
              </UiChip>
            </template>
            <template #item-document="{ item }">
              <span class="font-weight-medium font-monospace">
                {{
                  item.iirgd_citizens?.rg
                    ? padAndFormatRg(item.iirgd_citizens.rg, true)
                    : item.iirgd_citizens?.cpf || '-'
                }}
              </span>
            </template>
            <template #item-name="{ item }">
              <span>{{ formatCitizenName(item.iirgd_citizens?.name) || '-' }}</span>
            </template>
            <template #item-document_type="{ item }">
              <span>{{ item.iirgd_document_types?.name || '-' }}</span>
            </template>
            <template #item-status>
              <UiChip color="success" size="xs" variant="soft"> Cadastrada </UiChip>
            </template>
          </UiTable>
        </div>

        <div v-else-if="completedTab === 'ignored'">
          <UiTable :headers="ignoredTableHeaders" :items="ignoredItems">
            <template #empty> Todas as demandas do lote foram cadastradas! </template>
            <template #item-index="{ index }">
              <span class="text-caption text-grey">{{ (index ?? 0) + 1 }}</span>
            </template>
            <template #item-station_code="{ item }">
              <span class="font-monospace text-medium-emphasis">{{
                item.station_code || '-'
              }}</span>
            </template>
            <template #item-formattedDocument="{ item }">
              <span class="font-monospace text-medium-emphasis">{{
                item.formattedDocument || '-'
              }}</span>
            </template>
            <template #item-name="{ item }">
              <span>{{ item.name || '(Não informado)' }}</span>
            </template>
            <template #item-status="{ item }">
              <div class="d-flex align-center ga-1">
                <UiChip :color="getStatusChipColor(item.status)" size="xs" variant="soft">
                  {{ getStatusChipLabel(item.status) }}
                </UiChip>
                <UiChip v-if="item.hasActiveDemandWarning" color="warning" size="xs" variant="soft">
                  Demanda anterior aberta
                </UiChip>
              </div>
            </template>
            <template #item-reason="{ item }">
              <span class="text-caption text-grey-darken-1">{{ item.errorReason }}</span>
            </template>
          </UiTable>
        </div>

        <div class="d-flex justify-space-between align-center mt-5">
          <UiButton variant="outlined" @click="resetState"> Inserir Outro Lote </UiButton>
          <UiButton color="primary" @click="closeModal"> Concluir e Fechar </UiButton>
        </div>
      </div>
    </div>
  </UiModal>
</template>
