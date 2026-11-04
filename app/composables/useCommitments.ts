import type { Database } from '~/types/database.types'
import type { DemandItemExecutionStatus } from '~/constants/demand-item-status'
import type { DemandItemStatusHistoryRow, DemandProductRow } from '~/composables/useDemandProducts'
import { getItemDisputeResult, getItemSubtotal } from '~/utils/bids'
import {
  isValidBankOrderNumber,
  isValidCommitmentNumber,
  isValidDisbursementProgramNumber,
  isValidLiquidationNumber,
  MIN_LIQUIDATIONS_FOR_PD,
  normalizeSiafemNumber,
} from '~/schemas/forms/commitment'

export type CommitmentLiquidationRow =
  Database['public']['Tables']['demand_commitment_liquidations']['Row']

export type CommitmentRow = Database['public']['Tables']['demand_commitments']['Row'] & {
  demands?: {
    id: string
    name: string
    internal_process_number: string | null
    process_number: string | null
    status: Database['public']['Enums']['demand_status']
  } | null
  suppliers?: {
    id: string
    company_name: string
    cnpj: string
  } | null
  expense_natures?: {
    id: string
    name: string
  } | null
  demand_commitment_liquidations?: CommitmentLiquidationRow[]
}

export type CommitmentListItem = CommitmentRow & {
  items_count: number
  total_amount: number
  liquidations_count: number
}

export type CommitmentItemWithTotals = DemandProductRow & {
  winning_unit_price: number
  total_item_value: number
}

export type CommitmentDetail = {
  commitment: CommitmentRow
  liquidations: CommitmentLiquidationRow[]
  items: CommitmentItemWithTotals[]
  total_amount: number
  status_history: DemandItemStatusHistoryRow[]
}

export const useCommitments = () => {
  const supabase = useSupabaseClient<Database>()
  const user = useSupabaseUser()
  const { logAction } = useLogger()

  const fetchCommitments = async (): Promise<CommitmentListItem[]> => {
    const [{ data: commitmentsData, error: commitmentsErr }, { data: itemsData, error: itemsErr }] =
      await Promise.all([
        supabase
          .from('demand_commitments')
          .select(
            '*, demands(id, name, internal_process_number, process_number, status), suppliers(id, company_name, cnpj), expense_natures(id, name), demand_commitment_liquidations(*)',
          )
          .order('commitment_number', { ascending: false }),
        supabase
          .from('demand_products')
          .select(
            'id, commitment_number, quantity, execution_status, demand_product_bids(id, supplier_id, amount, status, created_at)',
          )
          .not('commitment_number', 'is', null),
      ])

    if (commitmentsErr) throw commitmentsErr
    if (itemsErr) throw itemsErr

    const totalsByCommitment = new Map<
      string,
      { count: number; total: number; status?: DemandItemExecutionStatus }
    >()
    for (const item of itemsData || []) {
      const num = item.commitment_number ? normalizeSiafemNumber(item.commitment_number) : null
      if (!num) continue

      const dispute = getItemDisputeResult(item)
      if (dispute.outcome !== 'winner') continue

      const current = totalsByCommitment.get(num) || { count: 0, total: 0 }
      const unitPrice = dispute.winningAmount ?? 0
      const itemTotal = dispute.totalFinal ?? getItemSubtotal(unitPrice, item.quantity)

      current.count += 1
      current.total += itemTotal
      if (item.execution_status) {
        current.status = item.execution_status as DemandItemExecutionStatus
      }
      totalsByCommitment.set(num, current)
    }

    return ((commitmentsData || []) as unknown as CommitmentRow[]).map((row) => {
      const normalized = normalizeSiafemNumber(row.commitment_number)
      const metrics = totalsByCommitment.get(normalized) || { count: 0, total: 0 }
      const liquidations = row.demand_commitment_liquidations || []
      const resolvedStatus = row.status === 'cancelled' ? 'cancelled' : metrics.status || row.status

      return {
        ...row,
        status: resolvedStatus,
        items_count: metrics.count,
        total_amount: metrics.total,
        liquidations_count: liquidations.length,
      }
    })
  }

  const fetchCommitmentByNumber = async (
    commitmentNumber: string,
  ): Promise<CommitmentDetail | null> => {
    const normalized = normalizeSiafemNumber(commitmentNumber)
    if (!normalized) return null

    const { data: commitmentData, error: commitmentErr } = await supabase
      .from('demand_commitments')
      .select(
        '*, demands(id, name, internal_process_number, process_number, status), suppliers(id, company_name, cnpj), expense_natures(id, name), demand_commitment_liquidations(*)',
      )
      .eq('commitment_number', normalized)
      .maybeSingle()

    if (commitmentErr) throw commitmentErr
    if (!commitmentData) return null

    const commitment = commitmentData as unknown as CommitmentRow

    const { data: itemsData, error: itemsErr } = await supabase
      .from('demand_products')
      .select(
        '*, product:products(*, product_classes(id, name), expense_natures(id, name)), measurement_units(*), measurement_unit_aliases(*), demand_product_bids(*, suppliers(*))',
      )
      .eq('commitment_number', normalized)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (itemsErr) throw itemsErr

    const rawItems = (itemsData || []) as unknown as DemandProductRow[]
    let totalAmount = 0

    const validItems = rawItems.filter((item) => {
      const dispute = getItemDisputeResult(item)
      return (
        dispute.outcome === 'winner' &&
        (!commitment.supplier_id || dispute.winningBid?.supplier_id === commitment.supplier_id)
      )
    })

    const items: CommitmentItemWithTotals[] = validItems.map((item) => {
      const dispute = getItemDisputeResult(item)
      const unitPrice = dispute.winningAmount ?? 0
      const subtotal = dispute.totalFinal ?? getItemSubtotal(unitPrice, item.quantity)
      totalAmount += subtotal

      return {
        ...item,
        winning_unit_price: unitPrice,
        total_item_value: subtotal,
      }
    })

    const itemIds = items.map((i) => i.id)
    const statusHistory: DemandItemStatusHistoryRow[] = []

    if (itemIds.length > 0) {
      const { data: historyData, error: historyErr } = await supabase
        .from('demand_item_status_history')
        .select('*, profiles(id, name)')
        .in('demand_product_id', itemIds)
        .order('created_at', { ascending: false })

      if (historyErr) throw historyErr

      const seenBatchKeys = new Set<string>()
      for (const entry of (historyData || []) as DemandItemStatusHistoryRow[]) {
        const minuteTimestamp = entry.created_at ? entry.created_at.slice(0, 16) : ''
        const batchKey = `${entry.status}|${entry.commitment_number || ''}|${entry.observation || ''}|${entry.error_details || ''}|${minuteTimestamp}`
        if (!seenBatchKeys.has(batchKey)) {
          seenBatchKeys.add(batchKey)
          statusHistory.push(entry)
        }
      }
    }

    const liquidations = [...(commitment.demand_commitment_liquidations || [])].sort((a, b) =>
      a.liquidation_number.localeCompare(b.liquidation_number),
    )

    const effectiveCommitmentStatus: DemandItemExecutionStatus =
      commitment.status === 'cancelled'
        ? 'cancelled'
        : items.length > 0 &&
            items[0].execution_status &&
            items.every((it) => it.execution_status === items[0].execution_status)
          ? (items[0].execution_status as DemandItemExecutionStatus)
          : commitment.status

    const reconciledCommitment: CommitmentRow = {
      ...commitment,
      status: effectiveCommitmentStatus,
    }

    return {
      commitment: reconciledCommitment,
      liquidations,
      items,
      total_amount: totalAmount,
      status_history: statusHistory,
    }
  }

  const updateCommitmentLogisticsStatus = async (params: {
    commitmentId: string
    commitmentNumber: string
    status: DemandItemExecutionStatus
    observation?: string | null
    errorDetails?: string | null
  }) => {
    const normalized = normalizeSiafemNumber(params.commitmentNumber)
    if (params.status === 'completed') {
      throw new Error(
        'O encerramento do item ("Concluído") ocorre automaticamente mediante o cadastro da Ordem Bancária (OB).',
      )
    }

    if (params.status === 'cancelled') {
      throw new Error(
        'Para cancelar a Nota de Empenho, utilize o procedimento específico de cancelamento.',
      )
    }

    const now = new Date().toISOString()
    const cleanObservation = params.observation?.trim() || null
    const cleanErrorDetails = params.status === 'error' ? params.errorDetails?.trim() || null : null

    const { error: updateCommitmentErr } = await supabase
      .from('demand_commitments')
      .update({
        status: params.status,
        observation: cleanObservation,
        error_details: cleanErrorDetails,
        updated_at: now,
      })
      .eq('id', params.commitmentId)

    if (updateCommitmentErr) throw updateCommitmentErr

    const { data: linkedItems, error: fetchItemsErr } = await supabase
      .from('demand_products')
      .select(
        'id, execution_status, quantity, demand_product_bids(id, supplier_id, amount, status, created_at)',
      )
      .eq('commitment_number', normalized)

    if (fetchItemsErr) throw fetchItemsErr

    const validItemIds: string[] = []
    const invalidItemIds: string[] = []

    for (const item of (linkedItems || []) as unknown as DemandProductRow[]) {
      const dispute = getItemDisputeResult(item)
      if (dispute.outcome === 'winner') {
        validItemIds.push(item.id)
      } else {
        invalidItemIds.push(item.id)
      }
    }

    if (invalidItemIds.length > 0) {
      await supabase
        .from('demand_products')
        .update({
          commitment_number: null,
          execution_status: 'homologated',
          execution_error_details: null,
          execution_status_updated_at: now,
        })
        .in('id', invalidItemIds)
    }

    if (validItemIds.length > 0) {
      const { error: updateItemsErr } = await supabase
        .from('demand_products')
        .update({
          execution_status: params.status,
          execution_error_details: cleanErrorDetails,
          execution_status_updated_at: now,
        })
        .in('id', validItemIds)

      if (updateItemsErr) throw updateItemsErr

      const historyPayload: Database['public']['Tables']['demand_item_status_history']['Insert'][] =
        validItemIds.map((itemId) => ({
          demand_product_id: itemId,
          status: params.status,
          commitment_number: normalized,
          observation: cleanObservation,
          error_details: cleanErrorDetails,
          created_by: user.value?.id || null,
        }))

      const { error: historyErr } = await supabase
        .from('demand_item_status_history')
        .insert(historyPayload)

      if (historyErr) {
        console.error('Erro ao registrar histórico de status da NE:', historyErr)
      }
    }

    await logAction(
      'UPDATE_COMMITMENT_STATUS',
      `Status da Nota de Empenho ${normalized} atualizado para "${params.status}" (${validItemIds.length} itens)`,
      user.value?.id,
    )
  }

  const addLiquidationNote = async (params: {
    commitmentId: string
    commitmentNumber: string
    liquidationNumber: string
    issueDate: string
    observation?: string | null
    isCancellation?: boolean
  }): Promise<CommitmentLiquidationRow> => {
    const normalizedNE = normalizeSiafemNumber(params.commitmentNumber)
    const normalizedNL = normalizeSiafemNumber(params.liquidationNumber)

    if (!isValidLiquidationNumber(normalizedNL)) {
      throw new Error('O número da Nota de Liquidação deve seguir o padrão SIAFEM: 2026NL00000.')
    }

    const { data: commitment, error: checkErr } = await supabase
      .from('demand_commitments')
      .select('id, status, bank_order_number')
      .eq('id', params.commitmentId)
      .single()

    if (checkErr || !commitment) {
      throw new Error('Nota de Empenho não encontrada.')
    }

    if (commitment.bank_order_number || commitment.status === 'completed') {
      throw new Error(
        'Esta Nota de Empenho já possui Ordem Bancária emitida e encontra-se concluída.',
      )
    }

    const isCancellationNl = Boolean(params.isCancellation) || commitment.status === 'cancelled'

    if (commitment.status !== 'delivered' && !isCancellationNl) {
      throw new Error(
        'As Notas de Liquidação ordinárias só podem ser registradas após a entrega da mercadoria (status "Entregue"). Para empenhos cancelados, utilize a opção de NL de Cancelamento.',
      )
    }

    const { data: inserted, error: insertErr } = await supabase
      .from('demand_commitment_liquidations')
      .insert({
        commitment_id: params.commitmentId,
        liquidation_number: normalizedNL,
        issue_date: params.issueDate,
        observation: params.observation?.trim() || null,
        is_cancellation: isCancellationNl,
        created_by: user.value?.id || null,
      })
      .select('*')
      .single()

    if (insertErr) {
      if (insertErr.code === '23505') {
        throw new Error(`A Nota de Liquidação "${normalizedNL}" já está cadastrada no sistema.`)
      }
      throw insertErr
    }

    await logAction(
      'ADD_COMMITMENT_LIQUIDATION',
      `Nota de Liquidação ${normalizedNL} vinculada à Nota de Empenho ${normalizedNE}`,
      user.value?.id,
    )

    return inserted
  }

  const removeLiquidationNote = async (params: {
    liquidationId: string
    commitmentId: string
    commitmentNumber: string
    liquidationNumber: string
  }) => {
    const normalizedNE = normalizeSiafemNumber(params.commitmentNumber)
    const normalizedNL = normalizeSiafemNumber(params.liquidationNumber)

    const { data: commitment, error: checkErr } = await supabase
      .from('demand_commitments')
      .select(
        'id, status, disbursement_program_number, bank_order_number, demand_commitment_liquidations(id)',
      )
      .eq('id', params.commitmentId)
      .single()

    if (checkErr || !commitment) {
      throw new Error('Nota de Empenho não encontrada.')
    }

    if (commitment.bank_order_number || commitment.status === 'completed') {
      throw new Error(
        'Não é permitido excluir Notas de Liquidação de um empenho concluído com Ordem Bancária.',
      )
    }

    const currentCount = (commitment.demand_commitment_liquidations || []).length
    if (commitment.disbursement_program_number && currentCount <= MIN_LIQUIDATIONS_FOR_PD) {
      throw new Error(
        `Não é possível remover esta Nota de Liquidação pois o Programa de Desembolso (${commitment.disbursement_program_number}) exige no mínimo ${MIN_LIQUIDATIONS_FOR_PD} Notas de Liquidação.`,
      )
    }

    const { error: deleteErr } = await supabase
      .from('demand_commitment_liquidations')
      .delete()
      .eq('id', params.liquidationId)

    if (deleteErr) throw deleteErr

    await logAction(
      'REMOVE_COMMITMENT_LIQUIDATION',
      `Nota de Liquidação ${normalizedNL} removida da Nota de Empenho ${normalizedNE}`,
      user.value?.id,
    )
  }

  const saveDisbursementProgram = async (params: {
    commitmentId: string
    commitmentNumber: string
    disbursementProgramNumber: string
    issuedAt: string
    observation?: string | null
  }) => {
    const normalizedNE = normalizeSiafemNumber(params.commitmentNumber)
    const normalizedPD = normalizeSiafemNumber(params.disbursementProgramNumber)

    if (!isValidDisbursementProgramNumber(normalizedPD)) {
      throw new Error(
        'O número do Programa de Desembolso deve seguir o padrão SIAFEM: 2026PD00000.',
      )
    }

    const { data: commitment, error: checkErr } = await supabase
      .from('demand_commitments')
      .select('id, status, bank_order_number, demand_commitment_liquidations(id)')
      .eq('id', params.commitmentId)
      .single()

    if (checkErr || !commitment) {
      throw new Error('Nota de Empenho não encontrada.')
    }

    if (commitment.bank_order_number || commitment.status === 'completed') {
      throw new Error(
        'Esta Nota de Empenho já possui Ordem Bancária emitida e encontra-se concluída.',
      )
    }

    if (commitment.status === 'cancelled') {
      throw new Error(
        'Notas de Empenho canceladas não permitem registro de Programa de Desembolso (PD).',
      )
    }

    if (commitment.status !== 'delivered') {
      throw new Error(
        'O Programa de Desembolso só pode ser registrado após a entrega da mercadoria (status "Entregue").',
      )
    }

    const liquidationsCount = (commitment.demand_commitment_liquidations || []).length
    if (liquidationsCount < MIN_LIQUIDATIONS_FOR_PD) {
      throw new Error(
        `É necessário cadastrar no mínimo ${MIN_LIQUIDATIONS_FOR_PD} Notas de Liquidação (NL) antes de emitir o Programa de Desembolso (PD). Atualmente há ${liquidationsCount}.`,
      )
    }

    const { error: updateErr } = await supabase
      .from('demand_commitments')
      .update({
        disbursement_program_number: normalizedPD,
        disbursement_program_issued_at: params.issuedAt,
        disbursement_program_observation: params.observation?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.commitmentId)

    if (updateErr) {
      if (updateErr.code === '23505') {
        throw new Error(
          `O Programa de Desembolso "${normalizedPD}" já está vinculado a outra Nota de Empenho.`,
        )
      }
      throw updateErr
    }

    await logAction(
      'SAVE_COMMITMENT_DISBURSEMENT_PROGRAM',
      `Programa de Desembolso ${normalizedPD} registrado na Nota de Empenho ${normalizedNE}`,
      user.value?.id,
    )
  }

  const saveBankOrderAndComplete = async (params: {
    commitmentId: string
    commitmentNumber: string
    bankOrderNumber: string
    issuedAt: string
    observation?: string | null
  }) => {
    const normalizedNE = normalizeSiafemNumber(params.commitmentNumber)
    const normalizedOB = normalizeSiafemNumber(params.bankOrderNumber)

    if (!isValidBankOrderNumber(normalizedOB)) {
      throw new Error('O número da Ordem Bancária deve seguir o padrão SIAFEM: 2026OB00000.')
    }

    const { data: commitment, error: checkErr } = await supabase
      .from('demand_commitments')
      .select(
        'id, status, disbursement_program_number, bank_order_number, demand_commitment_liquidations(id)',
      )
      .eq('id', params.commitmentId)
      .single()

    if (checkErr || !commitment) {
      throw new Error('Nota de Empenho não encontrada.')
    }

    if (commitment.status === 'cancelled') {
      throw new Error('Notas de Empenho canceladas não permitem emissão de Ordem Bancária (OB).')
    }

    const liquidationsCount = (commitment.demand_commitment_liquidations || []).length
    if (liquidationsCount < MIN_LIQUIDATIONS_FOR_PD) {
      throw new Error(
        `É necessário possuir no mínimo ${MIN_LIQUIDATIONS_FOR_PD} Notas de Liquidação (NL) antes de registrar a Ordem Bancária (OB).`,
      )
    }

    if (!commitment.disbursement_program_number) {
      throw new Error(
        'É necessário registrar o Programa de Desembolso (PD) antes de emitir a Ordem Bancária (OB).',
      )
    }

    const now = new Date().toISOString()
    const cleanObservation = params.observation?.trim() || null

    const { error: updateCommitmentErr } = await supabase
      .from('demand_commitments')
      .update({
        bank_order_number: normalizedOB,
        bank_order_issued_at: params.issuedAt,
        bank_order_observation: cleanObservation,
        status: 'completed',
        error_details: null,
        updated_at: now,
      })
      .eq('id', params.commitmentId)

    if (updateCommitmentErr) {
      if (updateCommitmentErr.code === '23505') {
        throw new Error(
          `A Ordem Bancária "${normalizedOB}" já está vinculada a outra Nota de Empenho.`,
        )
      }
      throw updateCommitmentErr
    }

    const { data: linkedItems, error: fetchItemsErr } = await supabase
      .from('demand_products')
      .select(
        'id, execution_status, quantity, demand_product_bids(id, supplier_id, amount, status, created_at)',
      )
      .eq('commitment_number', normalizedNE)

    if (fetchItemsErr) throw fetchItemsErr

    const validItemIds = ((linkedItems || []) as unknown as DemandProductRow[])
      .filter((i) => getItemDisputeResult(i).outcome === 'winner')
      .map((i) => i.id)

    if (validItemIds.length > 0) {
      const { error: updateItemsErr } = await supabase
        .from('demand_products')
        .update({
          execution_status: 'completed',
          execution_error_details: null,
          execution_status_updated_at: now,
        })
        .in('id', validItemIds)

      if (updateItemsErr) throw updateItemsErr

      const historyObservation = `Encerrado via Ordem Bancária ${normalizedOB} (PD: ${commitment.disbursement_program_number})${cleanObservation ? ` — ${cleanObservation}` : ''}`

      const historyPayload: Database['public']['Tables']['demand_item_status_history']['Insert'][] =
        validItemIds.map((itemId) => ({
          demand_product_id: itemId,
          status: 'completed',
          commitment_number: normalizedNE,
          observation: historyObservation,
          error_details: null,
          created_by: user.value?.id || null,
        }))

      const { error: historyErr } = await supabase
        .from('demand_item_status_history')
        .insert(historyPayload)

      if (historyErr) {
        console.error('Erro ao registrar histórico de conclusão por OB:', historyErr)
      }
    }

    await logAction(
      'COMPLETE_COMMITMENT_BANK_ORDER',
      `Ordem Bancária ${normalizedOB} registrada na Nota de Empenho ${normalizedNE}, encerrando ${validItemIds.length} item(ns) como Concluído`,
      user.value?.id,
    )
  }

  const cancelCommitment = async (params: {
    commitmentId: string
    commitmentNumber: string
    reason: string
    cancellationNlNumber?: string | null
    cancellationNlIssueDate?: string | null
    cancellationNlObservation?: string | null
  }) => {
    const normalizedNE = normalizeSiafemNumber(params.commitmentNumber)
    const cleanReason = params.reason.trim()
    if (!cleanReason) {
      throw new Error('A justificativa do cancelamento é obrigatória.')
    }

    const { data: commitment, error: checkErr } = await supabase
      .from('demand_commitments')
      .select('id, status, bank_order_number')
      .eq('id', params.commitmentId)
      .single()

    if (checkErr || !commitment) {
      throw new Error('Nota de Empenho não encontrada.')
    }

    if (commitment.bank_order_number || commitment.status === 'completed') {
      throw new Error(
        'Não é permitido cancelar uma Nota de Empenho que já possui Ordem Bancária (OB) emitida e encontra-se concluída.',
      )
    }

    const now = new Date().toISOString()

    // 1. Update commitment status to cancelled
    const { error: updateCommitmentErr } = await supabase
      .from('demand_commitments')
      .update({
        status: 'cancelled',
        observation: cleanReason,
        updated_at: now,
      })
      .eq('id', params.commitmentId)

    if (updateCommitmentErr) throw updateCommitmentErr

    // 2. If cancellation NL was informed, register it
    const trimmedNl = params.cancellationNlNumber
      ? normalizeSiafemNumber(params.cancellationNlNumber)
      : null

    if (trimmedNl) {
      if (!isValidLiquidationNumber(trimmedNl)) {
        throw new Error('O número da NL de Cancelamento deve seguir o padrão SIAFEM: 2026NL00000.')
      }

      const nlIssueDate = params.cancellationNlIssueDate?.trim() || now.slice(0, 10)
      const nlObs =
        params.cancellationNlObservation?.trim() ||
        `Cancelamento/Anulação do Empenho ${normalizedNE}: ${cleanReason}`

      const { error: insertNlErr } = await supabase.from('demand_commitment_liquidations').insert({
        commitment_id: params.commitmentId,
        liquidation_number: trimmedNl,
        issue_date: nlIssueDate,
        observation: nlObs,
        is_cancellation: true,
        created_by: user.value?.id || null,
      })

      if (insertNlErr && insertNlErr.code !== '23505') {
        throw insertNlErr
      }
    }

    // 3. Update all linked demand items to cancelled
    const { data: linkedItems, error: fetchItemsErr } = await supabase
      .from('demand_products')
      .select(
        'id, execution_status, quantity, demand_product_bids(id, supplier_id, amount, status, created_at)',
      )
      .eq('commitment_number', normalizedNE)

    if (fetchItemsErr) throw fetchItemsErr

    const validItemIds = ((linkedItems || []) as unknown as DemandProductRow[])
      .filter((i) => getItemDisputeResult(i).outcome === 'winner')
      .map((i) => i.id)

    if (validItemIds.length > 0) {
      const { error: updateItemsErr } = await supabase
        .from('demand_products')
        .update({
          execution_status: 'cancelled',
          execution_error_details: cleanReason,
          execution_status_updated_at: now,
        })
        .in('id', validItemIds)

      if (updateItemsErr) throw updateItemsErr

      const historyObs = `Empenho ${normalizedNE} cancelado. Motivo: ${cleanReason}${trimmedNl ? ` (NL de Cancelamento: ${trimmedNl})` : ''}`

      const historyPayload: Database['public']['Tables']['demand_item_status_history']['Insert'][] =
        validItemIds.map((itemId) => ({
          demand_product_id: itemId,
          status: 'cancelled',
          commitment_number: normalizedNE,
          observation: historyObs,
          error_details: cleanReason,
          created_by: user.value?.id || null,
        }))

      const { error: historyErr } = await supabase
        .from('demand_item_status_history')
        .insert(historyPayload)

      if (historyErr) {
        console.error('Erro ao registrar histórico de cancelamento:', historyErr)
      }
    }

    await logAction(
      'CANCEL_COMMITMENT',
      `Nota de Empenho ${normalizedNE} cancelada (${validItemIds.length} itens marcados como fracassados). Motivo: ${cleanReason}${trimmedNl ? ` | NL: ${trimmedNl}` : ''}`,
      user.value?.id,
    )
  }

  return {
    isValidCommitmentNumber,
    fetchCommitments,
    fetchCommitmentByNumber,
    updateCommitmentLogisticsStatus,
    addLiquidationNote,
    removeLiquidationNote,
    saveDisbursementProgram,
    saveBankOrderAndComplete,
    cancelCommitment,
  }
}
