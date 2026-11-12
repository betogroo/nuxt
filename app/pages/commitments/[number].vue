<script setup lang="ts">
  import { computed, onMounted, ref, watch } from 'vue'
  import { useRoute } from 'vue-router'
  import CancelCommitmentModal from '~/components/demands/CancelCommitmentModal.vue'
  import { isOrdinaryLiquidationNote, useCommitments } from '~/composables/useCommitments'
  import { useFormModal } from '~/composables/useFormModal'
  import { useLogger } from '~/composables/useLogger'
  import { useToast } from '~/composables/useToast'
  import {
    DEMAND_ITEM_EXECUTION_FLOW,
    DEMAND_ITEM_EXECUTION_STATUS_OPTIONS,
    formatDemandItemExecutionStatus,
    getDemandItemExecutionStatusColor,
    getDemandItemExecutionStatusIcon,
    getDemandItemExecutionStatusStepIndex,
    type DemandItemExecutionStatus,
  } from '~/constants/demand-item-status'
  import {
    bankOrderFormSchema,
    disbursementProgramFormSchema,
    liquidationNoteFormSchema,
  } from '~/schemas/forms/commitment'
  import { downloadFile } from '~/utils/download'
  import {
    formatCnpj,
    formatCurrency,
    formatDate,
    formatUnitPrice,
    getTodayDateString,
  } from '~/utils/formatters'
  import { escapeCsvField } from '~/utils/reportCsv'
  import { toSafeFilename } from '~/utils/reportFilename'
  import { APP_ROUTES } from '~/utils/routes'

  definePageMeta({
    middleware: ['uge'],
  })

  const route = useRoute()
  const toast = useToast()
  const { logAction } = useLogger()

  const commitmentNumberParam = computed(() =>
    decodeURIComponent(String(route.params.number || ''))
      .trim()
      .toUpperCase(),
  )

  useHead(() => ({
    title: `Nota de Empenho ${commitmentNumberParam.value || ''}`,
  }))

  const {
    fetchCommitmentByNumber,
    updateCommitmentLogisticsStatus,
    addLiquidationNote,
    updateLiquidationNote,
    removeLiquidationNote,
    saveDisbursementProgram,
    removeDisbursementProgram,
    saveBankOrderAndComplete,
    removeBankOrder,
  } = useCommitments()

  const {
    data: detail,
    pending,
    error: fetchError,
    refresh,
  } = useAsyncData(
    () => `commitment-detail-${commitmentNumberParam.value}`,
    () => fetchCommitmentByNumber(commitmentNumberParam.value),
    {
      watch: [commitmentNumberParam],
    },
  )

  onMounted(() => {
    refresh()
  })

  const commitment = computed(() => detail.value?.commitment || null)
  const items = computed(() => detail.value?.items || [])
  const liquidations = computed(
    () => detail.value?.liquidations || commitment.value?.demand_commitment_liquidations || [],
  )
  const totalAmount = computed(() => detail.value?.total_amount ?? 0)

  const isSupplierSimplesOptant = computed(() =>
    Boolean(commitment.value?.suppliers?.is_simples_optant),
  )

  const currentStepIndex = computed(() => {
    if (!commitment.value) return 0
    return getDemandItemExecutionStatusStepIndex(commitment.value.status)
  })

  const canManageFinancialDocs = computed(() => {
    if (!commitment.value) return false
    if (commitment.value.status === 'cancelled') return false
    return commitment.value.status === 'delivered' || commitment.value.status === 'completed'
  })

  const ordinaryLiquidations = computed(() => liquidations.value.filter(isOrdinaryLiquidationNote))
  const irLiquidations = computed(() => liquidations.value.filter((nl) => nl.is_ir_retention))
  const totalIrRetentionAmount = computed(() =>
    irLiquidations.value.reduce((acc, nl) => acc + Number(nl.ir_retention_amount || 0), 0),
  )
  const hasMinLiquidations = computed(() => ordinaryLiquidations.value.length >= 2)
  const hasDisbursementProgram = computed(() =>
    Boolean(commitment.value?.disbursement_program_number),
  )
  const hasBankOrder = computed(() => Boolean(commitment.value?.bank_order_number))
  const hasAnyFinancialDoc = computed(() => {
    return (
      liquidations.value.length > 0 ||
      Boolean(commitment.value?.disbursement_program_number) ||
      Boolean(commitment.value?.bank_order_number)
    )
  })
  const isCancelModalOpen = ref(false)

  const itemsTableHeaders = [
    { text: 'Item', value: 'item_number', width: 70 },
    { text: 'Produto / Especificação', value: 'product' },
    { text: 'Unidade', value: 'unit' },
    { text: 'Qtd.', value: 'quantity', align: 'right' as const },
    { text: 'Valor Unit. Homologado', value: 'unit_price', align: 'right' as const },
    { text: 'Subtotal', value: 'subtotal', align: 'right' as const },
    { text: 'Status Sincronizado', value: 'status', align: 'center' as const },
    { text: 'Ações', value: 'actions', align: 'right' as const },
  ]

  // --- Modal de Atualização de Status Logístico ---
  const statusModal = useFormModal()
  const selectedNewStatus = ref<DemandItemExecutionStatus>('commitment_issued')
  const statusNotes = ref('')
  const statusErrorDetails = ref('')

  const logisticsStatusOptions = computed(() =>
    DEMAND_ITEM_EXECUTION_STATUS_OPTIONS.filter(
      (opt) => opt.value !== 'completed' && opt.value !== 'cancelled',
    ),
  )

  const openLogisticsStatusModal = () => {
    if (!commitment.value) return
    selectedNewStatus.value =
      commitment.value.status === 'completed' ? 'delivered' : commitment.value.status
    statusNotes.value = commitment.value.observation || ''
    statusErrorDetails.value = commitment.value.error_details || ''
    statusModal.openAdd()
  }

  const handleSaveLogisticsStatus = async () => {
    if (!commitment.value) return
    await statusModal.executeSave(async () => {
      await updateCommitmentLogisticsStatus({
        commitmentId: commitment.value!.id,
        commitmentNumber: commitment.value!.commitment_number,
        status: selectedNewStatus.value,
        observation: statusNotes.value || null,
        errorDetails: selectedNewStatus.value === 'error' ? statusErrorDetails.value : null,
      })
      await refresh()
      toast.success('Status logístico da Nota de Empenho atualizado!')
      statusModal.close()
    })
  }

  // --- Modal de Nota de Liquidação (NL) ---
  const nlModal = useFormModal()
  const isEditingNl = ref(false)
  const editingNlId = ref<string | null>(null)
  const nlNumber = ref('')
  const nlIssueDate = ref(getTodayDateString())
  const nlNotes = ref('')
  const nlIsIrRetention = ref(false)
  const nlIrRetentionAmount = ref<string | number>('')

  const openAddNlModal = () => {
    isEditingNl.value = false
    editingNlId.value = null
    const yearPrefix = commitment.value?.commitment_number.slice(0, 4) || '2026'
    nlNumber.value = `${yearPrefix}NL`
    nlIssueDate.value = getTodayDateString()
    nlNotes.value = ''
    nlIsIrRetention.value = false
    nlIrRetentionAmount.value = ''
    nlModal.openAdd()
  }

  const openEditNlModal = (nl: {
    id: string
    liquidation_number: string
    issue_date: string | null
    observation: string | null
    is_ir_retention?: boolean | null
    ir_retention_amount?: number | null
  }) => {
    isEditingNl.value = true
    editingNlId.value = nl.id
    nlNumber.value = nl.liquidation_number
    nlIssueDate.value = nl.issue_date || getTodayDateString()
    nlNotes.value = nl.observation || ''
    nlIsIrRetention.value = !isSupplierSimplesOptant.value && Boolean(nl.is_ir_retention)
    nlIrRetentionAmount.value = nl.ir_retention_amount != null ? String(nl.ir_retention_amount) : ''
    nlModal.openEdit()
  }

  const handleSaveNl = async () => {
    if (!commitment.value) return
    const effectiveIsIrRetention = !isSupplierSimplesOptant.value && Boolean(nlIsIrRetention.value)
    const parsed = liquidationNoteFormSchema.safeParse({
      liquidation_number: nlNumber.value,
      issue_date: nlIssueDate.value || '',
      observation: nlNotes.value || '',
      is_ir_retention: effectiveIsIrRetention,
      ir_retention_amount: effectiveIsIrRetention ? nlIrRetentionAmount.value : null,
    })

    if (!parsed.success) {
      nlModal.error.value = parsed.error.issues[0]?.message || 'Dados inválidos para NL.'
      return
    }

    await nlModal.executeSave(async () => {
      if (isEditingNl.value && editingNlId.value) {
        await updateLiquidationNote({
          liquidationId: editingNlId.value,
          commitmentId: commitment.value!.id,
          commitmentNumber: commitment.value!.commitment_number,
          liquidationNumber: parsed.data.liquidation_number,
          issueDate: parsed.data.issue_date,
          observation: parsed.data.observation || null,
          isIrRetention: parsed.data.is_ir_retention,
          irRetentionAmount: parsed.data.ir_retention_amount,
        })
        await refresh()
        toast.success(`Nota de Liquidação ${parsed.data.liquidation_number} atualizada!`)
      } else {
        await addLiquidationNote({
          commitmentId: commitment.value!.id,
          commitmentNumber: commitment.value!.commitment_number,
          liquidationNumber: parsed.data.liquidation_number,
          issueDate: parsed.data.issue_date,
          observation: parsed.data.observation || null,
          isIrRetention: parsed.data.is_ir_retention,
          irRetentionAmount: parsed.data.ir_retention_amount,
        })
        await refresh()
        toast.success(`Nota de Liquidação ${parsed.data.liquidation_number} cadastrada!`)
      }
      nlModal.close()
    })
  }

  const isDeletingNlId = ref<string | null>(null)
  const handleRemoveNl = async (nlId: string, liquidationNumber: string) => {
    if (!commitment.value) return
    isDeletingNlId.value = nlId
    try {
      await removeLiquidationNote({
        liquidationId: nlId,
        commitmentId: commitment.value.id,
        commitmentNumber: commitment.value.commitment_number,
        liquidationNumber,
      })
      await refresh()
      toast.success(`Nota de Liquidação ${liquidationNumber} removida.`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao remover NL.')
    } finally {
      isDeletingNlId.value = null
    }
  }

  // --- Modal de Programa de Desembolso (PD) e Pagamento com OB ---
  const pdModal = useFormModal()
  const pdNumber = ref('')
  const pdIssueDate = ref(getTodayDateString())
  const pdPaidDate = ref('')
  const pdBankOrderNumber = ref('')
  const pdNotes = ref('')
  const isDeletingPd = ref(false)

  watch(pdPaidDate, (newPaidDate) => {
    if (newPaidDate && newPaidDate.trim().length > 0 && !pdBankOrderNumber.value.trim()) {
      const yearPrefix = commitment.value?.commitment_number.slice(0, 4) || '2026'
      pdBankOrderNumber.value = commitment.value?.bank_order_number || `${yearPrefix}OB`
    } else if (
      (!newPaidDate || !newPaidDate.trim()) &&
      /^(\d{4})OB$/i.test(pdBankOrderNumber.value.trim())
    ) {
      pdBankOrderNumber.value = ''
    }
  })

  const openPdModal = () => {
    if (!commitment.value) return
    const yearPrefix = commitment.value.commitment_number.slice(0, 4) || '2026'
    pdNumber.value = commitment.value.disbursement_program_number || `${yearPrefix}PD`
    pdIssueDate.value = commitment.value.disbursement_program_issued_at || getTodayDateString()
    pdPaidDate.value = commitment.value.disbursement_program_paid_at || ''
    pdBankOrderNumber.value = commitment.value.bank_order_number || ''
    pdNotes.value = commitment.value.disbursement_program_observation || ''
    pdModal.openAdd()
  }

  const handleSavePd = async () => {
    if (!commitment.value) return
    const parsed = disbursementProgramFormSchema.safeParse({
      disbursement_program_number: pdNumber.value,
      disbursement_program_issued_at: pdIssueDate.value || '',
      disbursement_program_paid_at: pdPaidDate.value || '',
      bank_order_number: pdBankOrderNumber.value || '',
      disbursement_program_observation: pdNotes.value || '',
    })

    if (!parsed.success) {
      pdModal.error.value = parsed.error.issues[0]?.message || 'Dados inválidos para PD.'
      return
    }

    await pdModal.executeSave(async () => {
      await saveDisbursementProgram({
        commitmentId: commitment.value!.id,
        commitmentNumber: commitment.value!.commitment_number,
        disbursementProgramNumber: parsed.data.disbursement_program_number,
        issuedAt: parsed.data.disbursement_program_issued_at,
        paidAt: parsed.data.disbursement_program_paid_at || null,
        bankOrderNumber: parsed.data.bank_order_number || null,
        observation: parsed.data.disbursement_program_observation || null,
      })
      await refresh()
      if (parsed.data.bank_order_number && parsed.data.disbursement_program_paid_at) {
        toast.success(
          `Pagamento da PD ${parsed.data.disbursement_program_number} e Ordem Bancária ${parsed.data.bank_order_number} registrados! NE concluída.`,
        )
      } else {
        toast.success(
          `Programa de Desembolso ${parsed.data.disbursement_program_number} salvo com sucesso!`,
        )
      }
      pdModal.close()
    })
  }

  const handleRemovePd = async () => {
    if (!commitment.value) return
    if (hasBankOrder.value) {
      toast.error(
        'Não é possível excluir o Programa de Desembolso enquanto houver uma Ordem Bancária vinculada.',
      )
      return
    }
    const pdNum = commitment.value.disbursement_program_number || 'PD'
    if (!(await toast.confirm(`Deseja realmente excluir o Programa de Desembolso ${pdNum}?`))) {
      return
    }
    isDeletingPd.value = true
    try {
      await removeDisbursementProgram({
        commitmentId: commitment.value.id,
        commitmentNumber: commitment.value.commitment_number,
      })
      await refresh()
      toast.success(`Programa de Desembolso ${pdNum} excluído com sucesso!`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao excluir PD.')
    } finally {
      isDeletingPd.value = false
    }
  }

  // --- Modal de Pagamento da PD / Ordem Bancária (OB) + Conclusão ---
  const obModal = useFormModal()
  const obNumber = ref('')
  const obIssueDate = ref(getTodayDateString())
  const obPaidDate = ref('')
  const obNotes = ref('')
  const isDeletingOb = ref(false)

  const openObModal = () => {
    if (!commitment.value) return
    const yearPrefix = commitment.value.commitment_number.slice(0, 4) || '2026'
    obNumber.value = commitment.value.bank_order_number || `${yearPrefix}OB`
    const existingPaidDate =
      commitment.value.disbursement_program_paid_at || commitment.value.bank_order_paid_at || ''
    obIssueDate.value =
      commitment.value.bank_order_issued_at || existingPaidDate || getTodayDateString()
    obPaidDate.value = existingPaidDate
    obNotes.value = commitment.value.bank_order_observation || ''
    obModal.openAdd()
  }

  const handleSaveOb = async () => {
    if (!commitment.value) return
    const effectiveIssuedAt = obIssueDate.value || obPaidDate.value || getTodayDateString()
    const effectivePaidAt = obPaidDate.value || effectiveIssuedAt
    const parsed = bankOrderFormSchema.safeParse({
      bank_order_number: obNumber.value,
      bank_order_issued_at: effectiveIssuedAt,
      bank_order_paid_at: effectivePaidAt,
      bank_order_observation: obNotes.value || '',
    })

    if (!parsed.success) {
      obModal.error.value =
        parsed.error.issues[0]?.message || 'Dados inválidos para Ordem Bancária.'
      return
    }

    await obModal.executeSave(async () => {
      await saveBankOrderAndComplete({
        commitmentId: commitment.value!.id,
        commitmentNumber: commitment.value!.commitment_number,
        bankOrderNumber: parsed.data.bank_order_number,
        issuedAt: parsed.data.bank_order_issued_at,
        paidAt: parsed.data.bank_order_paid_at || null,
        observation: parsed.data.bank_order_observation || null,
      })
      await refresh()
      toast.success(
        `Ordem Bancária ${parsed.data.bank_order_number} emitida! Nota de Empenho e itens concluídos.`,
      )
      obModal.close()
    })
  }

  const handleRemoveOb = async () => {
    if (!commitment.value) return
    const obNum = commitment.value.bank_order_number || 'OB'
    if (
      !(await toast.confirm(
        `Deseja realmente excluir a Ordem Bancária ${obNum}? A Nota de Empenho e seus itens retornarão ao status "Entregue".`,
      ))
    ) {
      return
    }
    isDeletingOb.value = true
    try {
      await removeBankOrder({
        commitmentId: commitment.value.id,
        commitmentNumber: commitment.value.commitment_number,
      })
      await refresh()
      toast.success(`Ordem Bancária ${obNum} excluída. Status retornado para Entregue!`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao excluir OB.')
    } finally {
      isDeletingOb.value = false
    }
  }

  // --- Exportação da Lista de Documentos Financeiros em CSV ---
  const handleExportFinancialDocsCsv = () => {
    if (!commitment.value || !hasAnyFinancialDoc.value) {
      toast.error('Nenhum documento financeiro registrado para exportação.')
      return
    }

    const headers = [
      'Tipo de Documento',
      'Número do Documento',
      'Data de Emissão',
      'Data de Pagamento',
      'Nota de Empenho',
      'Processo',
      'Fornecedor',
      'CNPJ',
      'Status / Natureza',
      'Observações',
    ]

    const rows: string[][] = []
    const neNumber = commitment.value.commitment_number
    const processNumber = commitment.value.demands?.internal_process_number || '-'
    const supplierName = commitment.value.suppliers?.company_name || '-'
    const supplierCnpj = commitment.value.suppliers?.cnpj
      ? formatCnpj(commitment.value.suppliers.cnpj)
      : '-'
    const pdPaidFormatted = commitment.value.disbursement_program_paid_at
      ? formatDate(commitment.value.disbursement_program_paid_at)
      : '-'

    // 1. Notas de Liquidação (NL)
    for (const nl of liquidations.value) {
      const nlNature = nl.is_cancellation
        ? 'Cancelamento'
        : nl.is_ir_retention
          ? `Retenção de IR (${formatCurrency(nl.ir_retention_amount || 0)})`
          : 'Ordinária'

      rows.push([
        'Nota de Liquidação (NL)',
        nl.liquidation_number,
        nl.issue_date ? formatDate(nl.issue_date) : '-',
        nl.is_ir_retention ? pdPaidFormatted : '-',
        neNumber,
        processNumber,
        supplierName,
        supplierCnpj,
        nlNature,
        nl.observation || '-',
      ])
    }

    // 2. Programa de Desembolso (PD)
    if (commitment.value.disbursement_program_number) {
      rows.push([
        'Programa de Desembolso (PD)',
        commitment.value.disbursement_program_number,
        commitment.value.disbursement_program_issued_at
          ? formatDate(commitment.value.disbursement_program_issued_at)
          : '-',
        pdPaidFormatted,
        neNumber,
        processNumber,
        supplierName,
        supplierCnpj,
        'Emitido',
        commitment.value.disbursement_program_observation || '-',
      ])
    }

    // 3. Ordem Bancária (OB)
    if (commitment.value.bank_order_number) {
      rows.push([
        'Ordem Bancária (OB)',
        commitment.value.bank_order_number,
        commitment.value.bank_order_issued_at
          ? formatDate(commitment.value.bank_order_issued_at)
          : '-',
        commitment.value.bank_order_paid_at
          ? formatDate(commitment.value.bank_order_paid_at)
          : pdPaidFormatted,
        neNumber,
        processNumber,
        supplierName,
        supplierCnpj,
        'Emitida',
        commitment.value.bank_order_observation || '-',
      ])
    }

    const csvRows = [
      headers.map((h) => escapeCsvField(h)).join(';'),
      ...rows.map((row) => row.map((field) => escapeCsvField(field)).join(';')),
    ]

    const csvContent = '\uFEFF' + csvRows.join('\r\n')
    const filename = `documentos-financeiros-${toSafeFilename(neNumber, 'empenho')}-${new Date().toISOString().slice(0, 10)}.csv`

    downloadFile(csvContent, filename, 'text/csv;charset=utf-8;')
    logAction(
      'EXPORT_COMMITMENT_FINANCIAL_DOCS_CSV',
      `Exportada lista CSV de documentos financeiros (NL, PD, OB) da NE ${neNumber}`,
    )
    toast.success('Lista CSV de documentos financeiros baixada com sucesso!')
  }
</script>

<template>
  <div>
    <!-- Navegação Superior -->
    <div class="d-flex flex-wrap justify-space-between align-center mb-4 ga-2">
      <div class="d-flex flex-wrap align-center ga-2">
        <UiButton
          color="secondary"
          prepend-icon="back"
          size="sm"
          :to="APP_ROUTES.commitments.index"
          variant="soft"
        >
          Todas as Notas de Empenho
        </UiButton>
        <UiButton
          v-if="commitment?.demand_id"
          color="primary"
          prepend-icon="folder"
          size="sm"
          :to="`/demands/${commitment.demand_id}`"
          variant="ghost"
        >
          Abrir Demanda
          <template v-if="commitment.demands?.internal_process_number">
            ({{ commitment.demands.internal_process_number }})
          </template>
        </UiButton>
      </div>

      <div class="d-flex align-center ga-2">
        <UiButton
          v-if="
            commitment && commitment.status !== 'completed' && commitment.status !== 'cancelled'
          "
          color="error"
          prepend-icon="closeCircle"
          size="sm"
          variant="solid"
          @click="isCancelModalOpen = true"
        >
          Cancelar Empenho
        </UiButton>
        <UiButton
          color="primary"
          :loading="pending"
          prepend-icon="refresh"
          size="sm"
          variant="soft"
          @click="() => refresh()"
        >
          Atualizar Dados
        </UiButton>
      </div>
    </div>

    <!-- Alerta de Erro de Busca -->
    <UiAlert v-if="fetchError" class="mb-4" type="error" variant="soft">
      <div class="d-flex align-center justify-space-between w-100 flex-wrap ga-2">
        <span>Erro ao buscar detalhes da NE: {{ fetchError.message || fetchError }}</span>
        <UiButton color="error" size="xs" variant="outline" @click="() => refresh()">
          Tentar novamente
        </UiButton>
      </div>
    </UiAlert>

    <div v-if="pending && !commitment" class="text-center py-8">
      <UiProgressCircular color="primary" indeterminate size="36" />
    </div>

    <UiCard v-else-if="!commitment" class="pa-8 text-center" elevation="1" variant="outline">
      <UiIcon class="mb-3" color="warning" name="alert" size="48" />
      <div class="text-h6 font-weight-bold">
        Nota de Empenho {{ commitmentNumberParam }} não encontrada
      </div>
      <div class="text-body-2 text-grey mt-1 mb-4">
        Verifique se o número está correto (formato 2026NE00000) ou volte para a listagem de
        empenhos.
      </div>
      <UiButton color="primary" :to="APP_ROUTES.commitments.index">
        Voltar para Notas de Empenho
      </UiButton>
    </UiCard>

    <template v-else>
      <!-- Card Principal de Cabeçalho da NE -->
      <UiCard class="pa-5 mb-6" elevation="1" variant="outline">
        <div class="d-flex flex-wrap justify-space-between align-start ga-4">
          <div>
            <div class="d-flex flex-wrap align-center ga-3">
              <span class="text-overline text-primary font-weight-bold">NOTA DE EMPENHO</span>
              <UiChip
                :color="getDemandItemExecutionStatusColor(commitment.status)"
                :prepend-icon="getDemandItemExecutionStatusIcon(commitment.status)"
                size="sm"
                variant="soft"
              >
                {{ formatDemandItemExecutionStatus(commitment.status) }}
              </UiChip>
            </div>

            <div class="d-flex align-center ga-2 mt-1">
              <h1 class="text-h4 font-weight-bold text-primary">
                {{ commitment.commitment_number }}
              </h1>
              <UiCopyButton
                color="primary"
                size="sm"
                success-message="Número da NE copiado!"
                tooltip="Copiar número da Nota de Empenho"
                :value="commitment.commitment_number"
              />
            </div>

            <div class="d-flex flex-wrap ga-4 mt-3 text-body-2 text-grey-darken-2">
              <div v-if="commitment.demands">
                <strong>Demanda:</strong>
                <NuxtLink
                  class="text-decoration-none text-primary font-weight-medium ml-1"
                  :to="`/demands/${commitment.demand_id}`"
                >
                  {{ commitment.demands.name }}
                </NuxtLink>
              </div>
              <div v-if="commitment.suppliers" class="d-inline-flex align-center flex-wrap ga-1">
                <strong>Fornecedor:</strong>
                <span class="ml-1 font-weight-medium">{{ commitment.suppliers.company_name }}</span>
                <span class="text-caption text-grey">
                  ({{ formatCnpj(commitment.suppliers.cnpj) }})
                </span>
                <UiChip v-if="isSupplierSimplesOptant" color="info" size="xs" variant="soft">
                  Simples Nacional
                </UiChip>
              </div>
              <div v-if="commitment.expense_natures">
                <strong>Natureza de Despesa:</strong>
                <span class="ml-1 font-weight-medium">
                  {{ commitment.expense_natures.name }}
                </span>
              </div>
            </div>
          </div>

          <div class="text-right">
            <div class="text-caption text-uppercase font-weight-bold text-grey">
              Valor Total do Empenho ({{ items.length }} item(ns))
            </div>
            <div
              class="text-h4 font-weight-bold mt-1"
              :class="
                commitment.status === 'cancelled'
                  ? 'text-decoration-line-through text-error'
                  : 'text-success'
              "
            >
              {{ formatCurrency(totalAmount) }}
            </div>
            <div
              v-if="commitment.status === 'cancelled'"
              class="text-caption text-error font-weight-bold mt-1"
            >
              (Empenho Cancelado / Estornado)
            </div>
            <div v-if="commitment.issue_date" class="text-caption text-grey mt-1">
              Data de Emissão: {{ formatDate(commitment.issue_date) }}
            </div>

            <div
              v-if="commitment.status !== 'completed' && commitment.status !== 'cancelled'"
              class="mt-3"
            >
              <UiButton
                color="error"
                prepend-icon="closeCircle"
                size="sm"
                variant="outlined"
                @click="isCancelModalOpen = true"
              >
                Cancelar Empenho
              </UiButton>
            </div>
          </div>
        </div>

        <!-- Alerta de Erro se aplicável -->
        <UiAlert
          v-if="commitment.status === 'error'"
          class="mt-4"
          icon="alertCircle"
          type="error"
          variant="soft"
        >
          <div class="font-weight-bold">Pendência / Erro na Execução da NE</div>
          <div class="text-body-2">
            {{ commitment.error_details || 'Sem detalhes adicionais.' }}
          </div>
        </UiAlert>

        <!-- Alerta de Cancelamento se aplicável -->
        <UiAlert
          v-if="commitment.status === 'cancelled'"
          class="mt-4"
          icon="closeCircle"
          type="error"
          variant="tonal"
        >
          <div class="font-weight-bold text-subtitle-2">
            {{
              commitment.cancels_commitment_number
                ? 'Nota de Empenho de Cancelamento / Anulação'
                : 'Nota de Empenho Cancelada'
            }}
          </div>
          <div v-if="commitment.cancels_commitment_number" class="text-body-2 mt-1">
            Esta Nota de Empenho anula e cancela formalmente a Nota de Empenho
            <NuxtLink
              class="font-weight-bold text-primary text-decoration-none"
              :to="APP_ROUTES.commitments.detail(commitment.cancels_commitment_number)"
            >
              {{ commitment.cancels_commitment_number }} </NuxtLink
            >. Os valores e itens foram estornados do teto de gastos.
          </div>
          <div v-else class="text-body-2 mt-1">
            Esta Nota de Empenho foi cancelada
            <template v-if="commitment.cancellation_commitment_number">
              pela Nota de Empenho
              <NuxtLink
                class="font-weight-bold text-primary text-decoration-none"
                :to="APP_ROUTES.commitments.detail(commitment.cancellation_commitment_number)"
              >
                {{ commitment.cancellation_commitment_number }}
              </NuxtLink> </template
            >. Os itens vinculados foram convertidos para <strong>Fracassado</strong> e o valor
            correspondente foi estornado do teto/cota anual de gastos. Não é permitida a emissão de
            Programa de Desembolso (PD) nem Ordem Bancária (OB).
          </div>
          <div v-if="commitment.observation" class="text-caption mt-2 text-error-darken-1">
            <strong>Motivo registrado:</strong> {{ commitment.observation }}
          </div>
        </UiAlert>
      </UiCard>

      <!-- Stepper Logístico e Financeiro da NE -->
      <UiCard class="pa-5 mb-6" elevation="1" variant="outline">
        <div class="d-flex flex-wrap justify-space-between align-center mb-4 ga-2">
          <div>
            <div class="text-subtitle-1 font-weight-bold">
              1. Fluxo Logístico e Entrega da Mercadoria
            </div>
            <div class="text-caption text-grey-darken-1">
              O status logístico abaixo é aplicado de forma unificada a todos os itens desta Nota de
              Empenho.
            </div>
          </div>

          <div
            v-if="commitment.status !== 'completed' && commitment.status !== 'cancelled'"
            class="d-flex align-center ga-2"
          >
            <UiButton
              color="error"
              prepend-icon="closeCircle"
              size="sm"
              variant="soft"
              @click="isCancelModalOpen = true"
            >
              Cancelar Empenho
            </UiButton>
            <UiButton
              color="primary"
              prepend-icon="edit"
              size="sm"
              variant="soft"
              @click="openLogisticsStatusModal"
            >
              Atualizar Etapa Logística
            </UiButton>
          </div>
        </div>

        <!-- Linha do Tempo de Etapas -->
        <div class="d-flex flex-wrap ga-2 align-center">
          <template v-for="(stepKey, idx) in DEMAND_ITEM_EXECUTION_FLOW" :key="stepKey">
            <UiChip
              :color="
                commitment.status === stepKey
                  ? getDemandItemExecutionStatusColor(stepKey)
                  : idx < currentStepIndex
                    ? 'success'
                    : 'default'
              "
              :prepend-icon="
                idx < currentStepIndex ? 'checkCircle' : getDemandItemExecutionStatusIcon(stepKey)
              "
              size="sm"
              :variant="commitment.status === stepKey ? 'solid' : 'soft'"
            >
              {{ idx + 1 }}. {{ formatDemandItemExecutionStatus(stepKey) }}
            </UiChip>
            <UiIcon
              v-if="idx < DEMAND_ITEM_EXECUTION_FLOW.length - 1"
              color="grey"
              name="chevronRight"
              size="16"
            />
          </template>
        </div>

        <div v-if="commitment.observation" class="mt-3 text-caption text-grey-darken-2">
          <strong>Observações da NE:</strong> {{ commitment.observation }}
        </div>
      </UiCard>

      <!-- Seção 2: Execução Financeira (NL -> PD -> OB) -->
      <UiCard class="pa-5 mb-6" elevation="1" variant="outline">
        <div class="d-flex flex-wrap justify-space-between align-center mb-4 ga-2">
          <div>
            <div class="text-subtitle-1 font-weight-bold">
              2. Execução Financeira (Liquidação, Desembolso e Ordem Bancária)
            </div>
            <div class="text-caption text-grey-darken-1">
              Após a entrega definitiva da mercadoria, o financeiro emite as Notas de Liquidação
              (mínimo 2 normais), o Programa de Desembolso e, ao registrar a data de pagamento,
              informa o número da Ordem Bancária que encerra o item.
            </div>
          </div>
          <div class="d-flex align-center ga-2 flex-wrap">
            <UiButton
              color="secondary"
              :disabled="!hasAnyFinancialDoc"
              prepend-icon="download"
              size="sm"
              tooltip="Baixar lista de NLs, PD e OB em formato CSV"
              variant="soft"
              @click="handleExportFinancialDocsCsv"
            >
              Baixar CSV (NL, PD, OB)
            </UiButton>
            <UiChip
              :color="
                commitment.status === 'cancelled'
                  ? 'error'
                  : hasBankOrder
                    ? 'success'
                    : canManageFinancialDocs
                      ? 'primary'
                      : 'warning'
              "
              size="sm"
              variant="soft"
            >
              <template v-if="commitment.status === 'cancelled'"
                >Cancelado (Sem Desembolso)</template
              >
              <template v-else-if="hasBankOrder"
                >Execução Financeira Concluída (OB Emitida)</template
              >
              <template v-else-if="canManageFinancialDocs">
                Liberado para Lançamentos Financeiros
              </template>
              <template v-else>Aguardando Entrega da Mercadoria</template>
            </UiChip>
          </div>
        </div>

        <UiAlert
          v-if="commitment.status === 'cancelled'"
          class="mb-4"
          icon="alertCircle"
          type="error"
          variant="soft"
        >
          Empenho cancelado / estornado. Não serão gerados Notas de Liquidação (NL), Programa de
          Desembolso (PD) nem Ordem Bancária (OB).
        </UiAlert>
        <UiAlert
          v-else-if="!canManageFinancialDocs"
          class="mb-4"
          icon="info"
          type="info"
          variant="soft"
        >
          Para cadastrar as <strong>Notas de Liquidação (NL)</strong>, o
          <strong>Programa de Desembolso (PD)</strong> e a <strong>Ordem Bancária (OB)</strong>,
          avance a etapa logística acima até <strong>Entregue</strong>.
        </UiAlert>

        <UiRow>
          <!-- Passo Financeiro 2.1: Notas de Liquidação (1:N, mín. 2 normais) -->
          <UiCol cols="12" md="4">
            <UiCard class="pa-4 h-100" variant="outline">
              <div class="d-flex justify-space-between align-center mb-2">
                <div class="font-weight-bold text-body-1 d-flex align-center ga-1">
                  <UiIcon
                    :color="hasMinLiquidations ? 'success' : 'primary'"
                    name="document"
                    size="18"
                  />
                  2.1. Notas de Liquidação (NL)
                </div>
                <div class="d-flex align-center ga-1">
                  <UiChip
                    :color="hasMinLiquidations ? 'success' : 'warning'"
                    size="xs"
                    variant="soft"
                  >
                    {{ ordinaryLiquidations.length }} / mín. 2
                  </UiChip>
                  <UiChip v-if="irLiquidations.length > 0" color="warning" size="xs" variant="soft">
                    +{{ irLiquidations.length }} IR
                  </UiChip>
                </div>
              </div>
              <div class="text-caption text-grey mb-3">
                Padrão <code>2026NL00000</code>. São necessárias no mínimo 2 NLs ordinárias por Nota
                de Empenho (além da NL de Retenção de IR, quando aplicável).
              </div>

              <div v-if="liquidations.length === 0" class="text-caption text-grey py-3 text-center">
                Nenhuma Nota de Liquidação cadastrada.
              </div>

              <div v-else class="d-flex flex-column ga-2 mb-3">
                <div
                  v-for="nl in liquidations"
                  :key="nl.id"
                  class="d-flex justify-space-between align-center pa-2 rounded border"
                >
                  <div>
                    <div class="d-flex align-center flex-wrap ga-1">
                      <div class="font-weight-bold text-body-2 text-primary">
                        {{ nl.liquidation_number }}
                      </div>
                      <UiCopyButton
                        color="primary"
                        size="xs"
                        success-message="Número da NL copiado!"
                        tooltip="Copiar número da NL"
                        :value="nl.liquidation_number"
                      />
                      <UiChip v-if="nl.is_cancellation" color="error" size="xs" variant="soft">
                        Cancelamento
                      </UiChip>
                      <UiChip v-if="nl.is_ir_retention" color="warning" size="xs" variant="soft">
                        (IR) {{ formatCurrency(nl.ir_retention_amount || 0) }}
                      </UiChip>
                    </div>
                    <div v-if="nl.issue_date" class="text-caption text-grey">
                      Emissão: {{ formatDate(nl.issue_date) }}
                    </div>
                    <div
                      v-if="nl.is_ir_retention && commitment.disbursement_program_paid_at"
                      class="text-caption text-warning-darken-2 font-weight-medium"
                    >
                      Pagto. PD: {{ formatDate(commitment.disbursement_program_paid_at) }}
                    </div>
                    <div v-if="nl.observation" class="text-caption text-grey-darken-1">
                      {{ nl.observation }}
                    </div>
                  </div>
                  <div class="d-flex align-center ga-1">
                    <UiButton
                      v-if="!hasBankOrder"
                      color="primary"
                      icon="edit"
                      size="xs"
                      tooltip="Editar data / observação da NL"
                      variant="ghost"
                      @click="openEditNlModal(nl)"
                    />
                    <UiButton
                      v-if="!hasBankOrder"
                      color="error"
                      icon="delete"
                      :loading="isDeletingNlId === nl.id"
                      size="xs"
                      tooltip="Remover NL"
                      variant="ghost"
                      @click="handleRemoveNl(nl.id, nl.liquidation_number)"
                    />
                  </div>
                </div>
              </div>

              <UiButton
                v-if="commitment.status !== 'cancelled'"
                block
                color="primary"
                :disabled="!canManageFinancialDocs || hasBankOrder"
                prepend-icon="add"
                size="sm"
                variant="soft"
                @click="openAddNlModal"
              >
                Adicionar Nota de Liquidação
              </UiButton>
            </UiCard>
          </UiCol>

          <!-- Passo Financeiro 2.2: Programa de Desembolso (PD - 1:1) -->
          <UiCol cols="12" md="4">
            <UiCard class="pa-4 h-100" variant="outline">
              <div class="d-flex justify-space-between align-center mb-2">
                <div class="font-weight-bold text-body-1 d-flex align-center ga-1">
                  <UiIcon
                    :color="hasDisbursementProgram ? 'success' : 'primary'"
                    name="calendar"
                    size="18"
                  />
                  2.2. Programa de Desembolso (PD)
                </div>
                <UiChip
                  :color="
                    commitment.status === 'cancelled'
                      ? 'error'
                      : commitment.disbursement_program_paid_at
                        ? 'success'
                        : hasDisbursementProgram
                          ? 'info'
                          : 'default'
                  "
                  size="xs"
                  variant="soft"
                >
                  {{
                    commitment.status === 'cancelled'
                      ? 'Bloqueado'
                      : commitment.disbursement_program_paid_at
                        ? 'Pago'
                        : hasDisbursementProgram
                          ? 'Emitido'
                          : 'Pendente'
                  }}
                </UiChip>
              </div>
              <div class="text-caption text-grey mb-3">
                Padrão <code>2026PD00000</code>. Requer ao menos 2 NLs ordinárias. Ao registrar a
                data de pagamento da PD, informe o número da OB.
              </div>

              <div v-if="commitment.disbursement_program_number" class="pa-3 rounded border mb-3">
                <div class="d-flex justify-space-between align-start">
                  <div>
                    <div class="text-overline text-grey">NÚMERO DO PD</div>
                    <div class="d-flex align-center ga-1">
                      <div class="text-h6 font-weight-bold text-info">
                        {{ commitment.disbursement_program_number }}
                      </div>
                      <UiCopyButton
                        color="info"
                        size="xs"
                        success-message="Número do PD copiado!"
                        tooltip="Copiar número do PD"
                        :value="commitment.disbursement_program_number"
                      />
                    </div>
                  </div>
                  <UiButton
                    v-if="!hasBankOrder"
                    color="error"
                    icon="delete"
                    :loading="isDeletingPd"
                    size="xs"
                    tooltip="Excluir Programa de Desembolso"
                    variant="ghost"
                    @click="handleRemovePd"
                  />
                </div>
                <div
                  v-if="commitment.disbursement_program_issued_at"
                  class="text-caption text-grey mt-1"
                >
                  Data de Emissão: {{ formatDate(commitment.disbursement_program_issued_at) }}
                </div>
                <div
                  v-if="commitment.disbursement_program_paid_at"
                  class="text-caption text-success font-weight-bold mt-1"
                >
                  Data do Pagamento: {{ formatDate(commitment.disbursement_program_paid_at) }}
                </div>
                <div v-else class="text-caption text-warning-darken-2 mt-1">
                  Pagamento pendente (sem data de pagamento)
                </div>
                <div
                  v-if="totalIrRetentionAmount > 0"
                  class="text-caption text-warning-darken-2 font-weight-medium mt-1"
                >
                  Retenção de IR vinculada: {{ formatCurrency(totalIrRetentionAmount) }}
                </div>
                <div
                  v-if="commitment.disbursement_program_observation"
                  class="text-caption text-grey-darken-1 mt-1"
                >
                  {{ commitment.disbursement_program_observation }}
                </div>
              </div>
              <div v-else class="text-caption text-grey py-3 text-center">
                {{
                  commitment.status === 'cancelled'
                    ? 'Não aplicável para empenho cancelado.'
                    : 'Nenhum Programa de Desembolso registrado.'
                }}
              </div>

              <UiButton
                block
                color="info"
                :disabled="
                  commitment.status === 'cancelled' ||
                  !canManageFinancialDocs ||
                  !hasMinLiquidations ||
                  hasBankOrder
                "
                :prepend-icon="commitment.disbursement_program_number ? 'edit' : 'add'"
                size="sm"
                variant="soft"
                @click="openPdModal"
              >
                {{
                  commitment.status === 'cancelled'
                    ? 'Bloqueado (Empenho Cancelado)'
                    : commitment.disbursement_program_number
                      ? 'Editar PD / Informar Pagamento e OB'
                      : 'Informar Programa de Desembolso'
                }}
              </UiButton>
            </UiCard>
          </UiCol>

          <!-- Passo Financeiro 2.3: Ordem Bancária (OB - 1:1) -->
          <UiCol cols="12" md="4">
            <UiCard class="pa-4 h-100" variant="outline">
              <div class="d-flex justify-space-between align-center mb-2">
                <div class="font-weight-bold text-body-1 d-flex align-center ga-1">
                  <UiIcon :color="hasBankOrder ? 'success' : 'primary'" name="cash" size="18" />
                  2.3. Ordem Bancária (OB)
                </div>
                <UiChip
                  :color="
                    commitment.status === 'cancelled'
                      ? 'error'
                      : hasBankOrder
                        ? 'success'
                        : 'default'
                  "
                  size="xs"
                  variant="soft"
                >
                  {{
                    commitment.status === 'cancelled'
                      ? 'Bloqueado'
                      : hasBankOrder
                        ? 'Concluído'
                        : 'Pendente'
                  }}
                </UiChip>
              </div>
              <div class="text-caption text-grey mb-3">
                Padrão <code>2026OB00000</code> ou <code>2026OBC0000</code>. Informada ao registrar
                a data de pagamento da PD, encerrando a Nota de Empenho e todos os seus itens.
              </div>

              <div v-if="commitment.bank_order_number" class="pa-3 rounded border mb-3">
                <div class="d-flex justify-space-between align-start">
                  <div>
                    <div class="text-overline text-success font-weight-bold">
                      ORDEM BANCÁRIA EMITIDA
                    </div>
                    <div class="d-flex align-center ga-1">
                      <div class="text-h6 font-weight-bold text-success">
                        {{ commitment.bank_order_number }}
                      </div>
                      <UiCopyButton
                        color="success"
                        size="xs"
                        success-message="Número da OB copiado!"
                        tooltip="Copiar número da OB"
                        :value="commitment.bank_order_number"
                      />
                    </div>
                  </div>
                  <UiButton
                    color="error"
                    icon="delete"
                    :loading="isDeletingOb"
                    size="xs"
                    tooltip="Excluir Ordem Bancária"
                    variant="ghost"
                    @click="handleRemoveOb"
                  />
                </div>
                <div v-if="commitment.bank_order_issued_at" class="text-caption text-grey mt-1">
                  Data de Emissão: {{ formatDate(commitment.bank_order_issued_at) }}
                </div>
                <div v-if="commitment.bank_order_paid_at" class="text-caption text-grey mt-1">
                  Data do Pagamento: {{ formatDate(commitment.bank_order_paid_at) }}
                </div>
                <div
                  v-if="commitment.bank_order_observation"
                  class="text-caption text-grey-darken-1 mt-1"
                >
                  {{ commitment.bank_order_observation }}
                </div>
              </div>
              <div v-else class="text-caption text-grey py-3 text-center">
                {{
                  commitment.status === 'cancelled'
                    ? 'Não aplicável para empenho cancelado.'
                    : 'Nenhuma Ordem Bancária registrada.'
                }}
              </div>

              <UiButton
                block
                color="success"
                :disabled="
                  commitment.status === 'cancelled' ||
                  !canManageFinancialDocs ||
                  !hasMinLiquidations ||
                  !hasDisbursementProgram
                "
                :prepend-icon="commitment.bank_order_number ? 'edit' : 'checkCircle'"
                size="sm"
                variant="solid"
                @click="openObModal"
              >
                {{
                  commitment.status === 'cancelled'
                    ? 'Bloqueado (Empenho Cancelado)'
                    : commitment.bank_order_number
                      ? 'Atualizar Ordem Bancária'
                      : 'Registrar OB e Concluir Item(ns)'
                }}
              </UiButton>
            </UiCard>
          </UiCol>
        </UiRow>
      </UiCard>

      <!-- Seção 3: Itens Vinculados a esta Nota de Empenho -->
      <UiCard elevation="1" variant="outline">
        <div class="pa-4 border-b d-flex justify-space-between align-center">
          <div>
            <div class="text-subtitle-1 font-weight-bold">
              3. Itens da Demanda cobertos pela NE {{ commitment.commitment_number }}
            </div>
            <div class="text-caption text-grey">
              Todos os itens abaixo compartilham o mesmo ciclo logístico e são concluídos ao emitir
              a Ordem Bancária.
            </div>
          </div>
          <UiChip color="primary" size="sm" variant="soft"> {{ items.length }} item(ns) </UiChip>
        </div>

        <UiTable :headers="itemsTableHeaders" :items="items">
          <template #empty>
            <div class="text-center py-4 text-grey">
              Nenhum item de demanda vinculado a esta Nota de Empenho.
            </div>
          </template>

          <template #item-item_number="{ item, index }">
            <span class="font-weight-bold">#{{ item.demand_item_number ?? index + 1 }}</span>
          </template>

          <template #item-product="{ item }">
            <div class="font-weight-medium">
              {{ item.product?.name || 'Produto' }}
            </div>
            <div v-if="item.product?.expense_natures" class="text-caption text-grey">
              Natureza: {{ item.product.expense_natures.name }}
            </div>
          </template>

          <template #item-unit="{ item }">
            {{ item.unit_name_snapshot || item.measurement_units?.name || 'UN' }}
          </template>

          <template #item-quantity="{ item }">
            {{ item.quantity }}
          </template>

          <template #item-unit_price="{ item }">
            {{ formatUnitPrice(item.winning_unit_price || 0) }}
          </template>

          <template #item-subtotal="{ item }">
            <span class="font-weight-bold">
              {{ formatCurrency(item.total_item_value || 0) }}
            </span>
          </template>

          <template #item-status="{ item }">
            <UiChip
              :color="getDemandItemExecutionStatusColor(item.execution_status)"
              :prepend-icon="getDemandItemExecutionStatusIcon(item.execution_status)"
              size="xs"
              variant="soft"
            >
              {{ formatDemandItemExecutionStatus(item.execution_status) }}
            </UiChip>
          </template>

          <template #item-actions="{ item }">
            <UiButton
              color="primary"
              prepend-icon="eye"
              size="xs"
              :to="`/demands/${item.demand_id}/items/${item.id}`"
              variant="ghost"
            >
              Ver Item
            </UiButton>
          </template>
        </UiTable>
      </UiCard>
    </template>

    <!-- Modal 1: Atualizar Status Logístico -->
    <UiModal
      v-model="statusModal.isOpen.value"
      max-width="520px"
      title="Atualizar Etapa Logística da NE"
      transparent-header
    >
      <UiAlert v-if="statusModal.error.value" class="mb-3" type="error" variant="soft">
        {{ statusModal.error.value }}
      </UiAlert>

      <UiSelect
        v-model="selectedNewStatus"
        class="mb-3"
        item-title="title"
        item-value="value"
        :items="logisticsStatusOptions"
        label="Nova Etapa Logística"
        variant="outline"
      />

      <UiTextarea
        v-if="selectedNewStatus === 'error'"
        v-model="statusErrorDetails"
        class="mb-3"
        label="Detalhes do Erro / Pendência (Obrigatório)"
        rows="3"
        variant="outline"
      />

      <UiTextarea
        v-model="statusNotes"
        label="Observações Logísticas (Opcional)"
        rows="2"
        variant="outline"
      />

      <UiAlert class="mt-3" type="info" variant="tonal">
        <div class="d-flex align-center justify-space-between flex-wrap ga-2">
          <span class="text-caption">
            Precisa cancelar este empenho por inadimplemento ou desistência do fornecedor?
          </span>
          <UiButton
            color="error"
            prepend-icon="closeCircle"
            size="xs"
            variant="flat"
            @click="
              () => {
                statusModal.close()
                isCancelModalOpen = true
              }
            "
          >
            Cancelar Empenho
          </UiButton>
        </div>
      </UiAlert>

      <template #actions>
        <UiButton variant="ghost" @click="statusModal.close()">Cancelar</UiButton>
        <UiButton
          color="primary"
          :loading="statusModal.isSaving.value"
          @click="handleSaveLogisticsStatus"
        >
          Salvar Status
        </UiButton>
      </template>
    </UiModal>

    <!-- Modal 2: Adicionar / Editar Nota de Liquidação (NL) -->
    <UiModal
      v-model="nlModal.isOpen.value"
      max-width="480px"
      :title="isEditingNl ? 'Editar Nota de Liquidação (NL)' : 'Nova Nota de Liquidação (NL)'"
      transparent-header
    >
      <UiAlert v-if="nlModal.error.value" class="mb-3" type="error" variant="soft">
        {{ nlModal.error.value }}
      </UiAlert>

      <UiInput
        v-model="nlNumber"
        class="mb-3"
        :disabled="isEditingNl"
        hint="Formato obrigatório: 2026NL00000"
        label="Número da NL"
        persistent-hint
        placeholder="2026NL00000"
        variant="outline"
      />

      <UiInput
        v-model="nlIssueDate"
        class="mb-3"
        label="Data de Emissão"
        type="date"
        variant="outline"
      />

      <template v-if="!isSupplierSimplesOptant">
        <UiCheckbox
          v-model="nlIsIrRetention"
          class="mb-2"
          label="NL de Retenção de Imposto de Renda (IR)"
        />

        <UiInput
          v-if="nlIsIrRetention"
          v-model="nlIrRetentionAmount"
          class="mb-3"
          hint="Obrigatório para NL de Retenção de IR (vinculado à data de pagamento da PD)"
          label="Valor da Retenção de IR (R$)"
          min="0.01"
          persistent-hint
          placeholder="Ex: 24,50"
          step="0.01"
          type="number"
          variant="outline"
        />
      </template>
      <UiAlert v-else class="mb-3" type="info" variant="tonal">
        <span class="text-caption">
          Fornecedor optante pelo Simples Nacional — opção de NL de Retenção de IR indisponível.
        </span>
      </UiAlert>

      <UiTextarea v-model="nlNotes" label="Observação (Opcional)" rows="2" variant="outline" />

      <template #actions>
        <UiButton variant="ghost" @click="nlModal.close()">Cancelar</UiButton>
        <UiButton color="primary" :loading="nlModal.isSaving.value" @click="handleSaveNl">
          {{ isEditingNl ? 'Salvar Alterações' : 'Adicionar NL' }}
        </UiButton>
      </template>
    </UiModal>

    <!-- Modal 3: Programa de Desembolso (PD) e Pagamento com OB -->
    <UiModal
      v-model="pdModal.isOpen.value"
      max-width="500px"
      title="Programa de Desembolso (PD)"
      transparent-header
    >
      <UiAlert v-if="pdModal.error.value" class="mb-3" type="error" variant="soft">
        {{ pdModal.error.value }}
      </UiAlert>

      <UiInput
        v-model="pdNumber"
        class="mb-3"
        hint="Formato obrigatório: 2026PD00000"
        label="Número do PD"
        persistent-hint
        placeholder="2026PD00000"
        variant="outline"
      />

      <UiInput
        v-model="pdIssueDate"
        class="mb-3"
        label="Data de Emissão"
        type="date"
        variant="outline"
      />

      <UiInput
        v-model="pdPaidDate"
        class="mb-3"
        hint="Opcional no cadastro da PD. Ao informar a data de pagamento, informe também o número da OB."
        label="Data do Pagamento (Opcional)"
        persistent-hint
        type="date"
        variant="outline"
      />

      <UiInput
        v-if="pdPaidDate || pdBankOrderNumber"
        v-model="pdBankOrderNumber"
        class="mb-3"
        hint="Obrigatório ao registrar a data de pagamento da PD (Padrão: 2026OB00000 ou 2026OBC0000)"
        label="Número da Ordem Bancária (OB)"
        persistent-hint
        placeholder="2026OB00000 / 2026OBC0000"
        variant="outline"
      />

      <UiTextarea v-model="pdNotes" label="Observação (Opcional)" rows="2" variant="outline" />

      <template #actions>
        <UiButton variant="ghost" @click="pdModal.close()">Cancelar</UiButton>
        <UiButton color="info" :loading="pdModal.isSaving.value" @click="handleSavePd">
          {{ pdPaidDate ? 'Salvar Pagamento e Emitir OB' : 'Salvar PD' }}
        </UiButton>
      </template>
    </UiModal>

    <!-- Modal 4: Ordem Bancária (OB) -->
    <UiModal
      v-model="obModal.isOpen.value"
      max-width="500px"
      title="Pagamento da PD e Ordem Bancária (OB)"
      transparent-header
    >
      <UiAlert class="mb-3" icon="checkCircle" type="success" variant="soft">
        Ao registrar a <strong>Data de Pagamento da PD</strong> e a
        <strong>Ordem Bancária (OB)</strong>, esta Nota de Empenho e todos os seus itens vinculados
        serão marcados automaticamente como <strong>Concluídos</strong>.
      </UiAlert>

      <UiAlert v-if="obModal.error.value" class="mb-3" type="error" variant="soft">
        {{ obModal.error.value }}
      </UiAlert>

      <UiInput
        v-model="obNumber"
        class="mb-3"
        hint="Formato obrigatório: 2026OB00000 ou 2026OBC0000"
        label="Número da Ordem Bancária"
        persistent-hint
        placeholder="2026OB00000 / 2026OBC0000"
        variant="outline"
      />

      <UiInput
        v-model="obIssueDate"
        class="mb-3"
        label="Data de Emissão"
        type="date"
        variant="outline"
      />

      <UiInput
        v-model="obPaidDate"
        class="mb-3"
        label="Data do Pagamento (PD / OB)"
        type="date"
        variant="outline"
      />

      <UiTextarea v-model="obNotes" label="Observação (Opcional)" rows="2" variant="outline" />

      <template #actions>
        <UiButton variant="ghost" @click="obModal.close()">Cancelar</UiButton>
        <UiButton color="success" :loading="obModal.isSaving.value" @click="handleSaveOb">
          Emitir OB e Concluir
        </UiButton>
      </template>
    </UiModal>

    <!-- Modal de Cancelamento de Empenho -->
    <CancelCommitmentModal
      v-model="isCancelModalOpen"
      :commitment="commitment"
      :items-count="items.length"
      @cancelled="refresh"
    />
  </div>
</template>
