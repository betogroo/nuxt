import type { Database } from '~/types/database.types'
import type { DemandItemExecutionStatus } from '~/constants/demand-item-status'
import type { DemandItemStatusHistoryRow, DemandProductRow } from '~/composables/useDemandProducts'
import { getItemDisputeResult, getItemSubtotal, getWinningBid } from '~/utils/bids'
import {
  isValidBankOrderNumber,
  isValidCommitmentNumber,
  isValidDisbursementProgramNumber,
  isValidLiquidationNumber,
  MIN_LIQUIDATIONS_FOR_PD,
  normalizeSiafemNumber,
  parseRetentionAmount,
} from '~/schemas/forms/commitment'

export type CommitmentLiquidationRow =
  Database['public']['Tables']['demand_commitment_liquidations']['Row']

export interface BatchLiquidationItemInput {
  liquidationNumber: string
  isIrRetention?: boolean
  irRetentionAmount?: number | string | null
  observation?: string | null
}

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
    is_simples_optant?: boolean
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
  demand_item_number?: number
}

export type CommitmentDetail = {
  commitment: CommitmentRow
  liquidations: CommitmentLiquidationRow[]
  items: CommitmentItemWithTotals[]
  total_amount: number
  status_history: DemandItemStatusHistoryRow[]
}

export const isOrdinaryLiquidationNote = (nl: {
  is_cancellation?: boolean | null
  is_ir_retention?: boolean | null
}): boolean => !nl.is_cancellation && !nl.is_ir_retention

export const useCommitments = () => {
  const supabase = useSupabaseClient<Database>()
  const user = useSupabaseUser()
  const { logAction } = useLogger()

  const completeCommitmentItems = async (params: {
    normalizedNE: string
    normalizedOB: string
    pdNumber: string
    observation: string | null
    now: string
  }): Promise<number> => {
    const { data: linkedItems, error: fetchItemsErr } = await supabase
      .from('demand_products')
      .select(
        'id, execution_status, quantity, demand_product_bids(id, supplier_id, amount, status, created_at)',
      )
      .eq('commitment_number', params.normalizedNE)

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
          execution_status_updated_at: params.now,
        })
        .in('id', validItemIds)

      if (updateItemsErr) throw updateItemsErr

      const historyObservation = `Encerrado via Ordem Bancária ${params.normalizedOB} (PD: ${params.pdNumber})${params.observation ? ` — ${params.observation}` : ''}`

      const historyPayload: Database['public']['Tables']['demand_item_status_history']['Insert'][] =
        validItemIds.map((itemId) => ({
          demand_product_id: itemId,
          status: 'completed',
          commitment_number: params.normalizedNE,
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

    return validItemIds.length
  }

  const fetchCommitments = async (): Promise<CommitmentListItem[]> => {
    const [{ data: commitmentsData, error: commitmentsErr }, { data: itemsData, error: itemsErr }] =
      await Promise.all([
        supabase
          .from('demand_commitments')
          .select(
            '*, demands(id, name, internal_process_number, process_number, status), suppliers(id, company_name, cnpj, is_simples_optant), expense_natures(id, name), demand_commitment_liquidations(*)',
          )
          .order('commitment_number', { ascending: true }),
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
        liquidations_count: liquidations.filter(isOrdinaryLiquidationNote).length,
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
        '*, demands(id, name, internal_process_number, process_number, status), suppliers(id, company_name, cnpj, is_simples_optant), expense_natures(id, name), demand_commitment_liquidations(*)',
      )
      .eq('commitment_number', normalized)
      .maybeSingle()

    if (commitmentErr) throw commitmentErr
    if (!commitmentData) return null

    const commitment = commitmentData as unknown as CommitmentRow
    const effectiveItemsCommitmentNumber = commitment.cancels_commitment_number
      ? normalizeSiafemNumber(commitment.cancels_commitment_number)
      : normalized

    const [{ data: itemsData, error: itemsErr }, { data: allDemandItems, error: demandItemsErr }] =
      await Promise.all([
        supabase
          .from('demand_products')
          .select(
            '*, product:products(*, product_classes(id, name), expense_natures(id, name)), measurement_units(*), measurement_unit_aliases(*), demand_product_bids(*, suppliers(*))',
          )
          .eq('commitment_number', effectiveItemsCommitmentNumber)
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: true }),
        commitment.demand_id
          ? supabase
              .from('demand_products')
              .select('id')
              .eq('demand_id', commitment.demand_id)
              .order('sort_order', { ascending: true })
              .order('created_at', { ascending: true })
          : Promise.resolve({ data: null, error: null }),
      ])

    if (itemsErr) throw itemsErr
    if (demandItemsErr) throw demandItemsErr

    const demandItemNumberMap = new Map<string, number>()
    if (allDemandItems) {
      allDemandItems.forEach((row, idx) => {
        demandItemNumberMap.set(row.id, idx + 1)
      })
    }

    const rawItems = (itemsData || []) as unknown as DemandProductRow[]
    let totalAmount = 0

    const validItems = rawItems.filter((item) => {
      const dispute = getItemDisputeResult(item)
      if (dispute.outcome === 'winner') {
        return !commitment.supplier_id || dispute.winningBid?.supplier_id === commitment.supplier_id
      }
      if (commitment.status === 'cancelled' || item.execution_status === 'cancelled') {
        const winningBid = getWinningBid(item.demand_product_bids || [])
        return Boolean(
          winningBid &&
          (!commitment.supplier_id || winningBid.supplier_id === commitment.supplier_id),
        )
      }
      return false
    })

    const items: CommitmentItemWithTotals[] = validItems.map((item, fallbackIndex) => {
      const dispute = getItemDisputeResult(item)
      const winningBid = dispute.winningBid || getWinningBid(item.demand_product_bids || [])
      const unitPrice =
        dispute.winningAmount && dispute.winningAmount > 0
          ? dispute.winningAmount
          : winningBid
            ? Number(winningBid.amount)
            : 0
      const subtotal =
        dispute.totalFinal && dispute.totalFinal > 0
          ? dispute.totalFinal
          : getItemSubtotal(unitPrice, item.quantity)
      totalAmount += subtotal

      return {
        ...item,
        winning_unit_price: unitPrice,
        total_item_value: subtotal,
        demand_item_number: demandItemNumberMap.get(item.id) ?? fallbackIndex + 1,
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
    isIrRetention?: boolean
    irRetentionAmount?: number | string | null
  }): Promise<CommitmentLiquidationRow> => {
    const normalizedNE = normalizeSiafemNumber(params.commitmentNumber)
    const normalizedNL = normalizeSiafemNumber(params.liquidationNumber)

    if (!isValidLiquidationNumber(normalizedNL)) {
      throw new Error('O número da Nota de Liquidação deve seguir o padrão SIAFEM: 2026NL00000.')
    }

    const { data: commitmentData, error: checkErr } = await supabase
      .from('demand_commitments')
      .select('id, status, bank_order_number, suppliers(id, is_simples_optant)')
      .eq('id', params.commitmentId)
      .single()

    if (checkErr || !commitmentData) {
      throw new Error('Nota de Empenho não encontrada.')
    }

    const commitment = commitmentData as unknown as {
      id: string
      status: DemandItemExecutionStatus
      bank_order_number: string | null
      suppliers?: { id: string; is_simples_optant?: boolean } | null
    }

    if (commitment.bank_order_number || commitment.status === 'completed') {
      throw new Error(
        'Esta Nota de Empenho já possui Ordem Bancária emitida e encontra-se concluída.',
      )
    }

    if (commitment.status === 'cancelled') {
      throw new Error(
        'Notas de Empenho canceladas não permitem registro de Notas de Liquidação (NL).',
      )
    }

    if (commitment.status !== 'delivered') {
      throw new Error(
        'As Notas de Liquidação só podem ser registradas após a entrega da mercadoria (status "Entregue").',
      )
    }

    const isIrRetention = Boolean(params.isIrRetention)
    let irRetentionAmount: number | null = null

    if (isIrRetention) {
      if (commitment.suppliers?.is_simples_optant === true) {
        throw new Error(
          'Fornecedores optantes pelo Simples Nacional não permitem cadastro de NL de Retenção de IR.',
        )
      }
      const parsedAmount = parseRetentionAmount(params.irRetentionAmount)
      if (parsedAmount === null || parsedAmount <= 0) {
        throw new Error('É obrigatório informar o valor da retenção para NL de Retenção de IR.')
      }
      irRetentionAmount = parsedAmount
    }

    const { data: inserted, error: insertErr } = await supabase
      .from('demand_commitment_liquidations')
      .insert({
        commitment_id: params.commitmentId,
        liquidation_number: normalizedNL,
        issue_date: params.issueDate,
        observation: params.observation?.trim() || null,
        is_cancellation: false,
        is_ir_retention: isIrRetention,
        ir_retention_amount: irRetentionAmount,
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

    const irSuffix =
      isIrRetention && irRetentionAmount !== null
        ? ` (Retenção de IR: R$ ${irRetentionAmount.toFixed(2)})`
        : ''

    await logAction(
      'ADD_COMMITMENT_LIQUIDATION',
      `Nota de Liquidação ${normalizedNL}${irSuffix} vinculada à Nota de Empenho ${normalizedNE}`,
      user.value?.id,
    )

    return inserted
  }

  const addMultipleLiquidationNotes = async (params: {
    commitmentId: string
    commitmentNumber: string
    issueDate: string
    items: BatchLiquidationItemInput[]
    observation?: string | null
  }): Promise<CommitmentLiquidationRow[]> => {
    if (!params.items || params.items.length === 0) {
      throw new Error('Nenhuma Nota de Liquidação informada para cadastro.')
    }

    const normalizedNE = normalizeSiafemNumber(params.commitmentNumber)

    const normalizedItems = params.items.map((item) => ({
      ...item,
      liquidationNumber: normalizeSiafemNumber(item.liquidationNumber),
    }))

    for (const item of normalizedItems) {
      if (!isValidLiquidationNumber(item.liquidationNumber)) {
        throw new Error(
          `O número da Nota de Liquidação "${item.liquidationNumber}" deve seguir o padrão SIAFEM: 2026NL00000.`,
        )
      }
    }

    const uniqueNlSet = new Set<string>()
    for (const item of normalizedItems) {
      if (uniqueNlSet.has(item.liquidationNumber)) {
        throw new Error(
          `O número de Nota de Liquidação "${item.liquidationNumber}" foi informado mais de uma vez no mesmo cadastro.`,
        )
      }
      uniqueNlSet.add(item.liquidationNumber)
    }

    const { data: commitmentData, error: checkErr } = await supabase
      .from('demand_commitments')
      .select(
        'id, status, bank_order_number, suppliers(id, is_simples_optant), demand_commitment_liquidations(id, liquidation_number)',
      )
      .eq('id', params.commitmentId)
      .single()

    if (checkErr || !commitmentData) {
      throw new Error('Nota de Empenho não encontrada.')
    }

    const commitment = commitmentData as unknown as {
      id: string
      status: DemandItemExecutionStatus
      bank_order_number: string | null
      suppliers?: { id: string; is_simples_optant?: boolean } | null
      demand_commitment_liquidations?: Array<{ id: string; liquidation_number: string }>
    }

    if (commitment.bank_order_number || commitment.status === 'completed') {
      throw new Error(
        'Esta Nota de Empenho já possui Ordem Bancária emitida e encontra-se concluída.',
      )
    }

    if (commitment.status === 'cancelled') {
      throw new Error(
        'Notas de Empenho canceladas não permitem registro de Notas de Liquidação (NL).',
      )
    }

    if (commitment.status !== 'delivered') {
      throw new Error(
        'As Notas de Liquidação só podem ser registradas após a entrega da mercadoria (status "Entregue").',
      )
    }

    const existingNls = new Set(
      (commitment.demand_commitment_liquidations || []).map((nl) =>
        nl.liquidation_number.toUpperCase(),
      ),
    )
    for (const item of normalizedItems) {
      if (existingNls.has(item.liquidationNumber)) {
        throw new Error(
          `A Nota de Liquidação "${item.liquidationNumber}" já está cadastrada nesta Nota de Empenho.`,
        )
      }
    }

    const insertPayload = normalizedItems.map((item) => {
      const isIrRetention = Boolean(item.isIrRetention)
      let irRetentionAmount: number | null = null

      if (isIrRetention) {
        if (commitment.suppliers?.is_simples_optant === true) {
          throw new Error(
            'Fornecedores optantes pelo Simples Nacional não permitem cadastro de NL de Retenção de IR.',
          )
        }
        const parsedAmount = parseRetentionAmount(item.irRetentionAmount)
        if (parsedAmount === null || parsedAmount <= 0) {
          throw new Error(
            `É obrigatório informar o valor da retenção para a NL de Retenção de IR "${item.liquidationNumber}".`,
          )
        }
        irRetentionAmount = parsedAmount
      }

      return {
        commitment_id: params.commitmentId,
        liquidation_number: item.liquidationNumber,
        issue_date: params.issueDate,
        observation: (item.observation || params.observation)?.trim() || null,
        is_cancellation: false,
        is_ir_retention: isIrRetention,
        ir_retention_amount: irRetentionAmount,
        created_by: user.value?.id || null,
      }
    })

    const { data: insertedList, error: insertErr } = await supabase
      .from('demand_commitment_liquidations')
      .insert(insertPayload)
      .select('*')

    if (insertErr) {
      if (insertErr.code === '23505') {
        throw new Error('Uma ou mais Notas de Liquidação já estão cadastradas no sistema.')
      }
      throw insertErr
    }

    const insertedCount = (insertedList || []).length
    const nlSummary = normalizedItems.map((it) => it.liquidationNumber).join(', ')

    await logAction(
      'ADD_MULTIPLE_COMMITMENT_LIQUIDATIONS',
      `${insertedCount} Notas de Liquidação (${nlSummary}) vinculadas à Nota de Empenho ${normalizedNE}`,
      user.value?.id,
    )

    return (insertedList || []) as CommitmentLiquidationRow[]
  }

  const updateLiquidationNote = async (params: {
    liquidationId: string
    commitmentId: string
    commitmentNumber: string
    liquidationNumber: string
    issueDate: string
    observation?: string | null
    isIrRetention?: boolean
    irRetentionAmount?: number | string | null
  }): Promise<CommitmentLiquidationRow> => {
    const normalizedNE = normalizeSiafemNumber(params.commitmentNumber)
    const normalizedNL = normalizeSiafemNumber(params.liquidationNumber)

    const { data: commitmentData, error: checkErr } = await supabase
      .from('demand_commitments')
      .select(
        'id, status, disbursement_program_number, bank_order_number, suppliers(id, is_simples_optant), demand_commitment_liquidations(id, is_cancellation, is_ir_retention)',
      )
      .eq('id', params.commitmentId)
      .single()

    if (checkErr || !commitmentData) {
      throw new Error('Nota de Empenho não encontrada.')
    }

    const commitment = commitmentData as unknown as {
      id: string
      status: DemandItemExecutionStatus
      disbursement_program_number?: string | null
      bank_order_number: string | null
      suppliers?: { id: string; is_simples_optant?: boolean } | null
      demand_commitment_liquidations?: Array<{
        id: string
        is_cancellation?: boolean | null
        is_ir_retention?: boolean | null
      }>
    }

    if (commitment.bank_order_number || commitment.status === 'completed') {
      throw new Error(
        'Não é permitido alterar Notas de Liquidação de um empenho concluído com Ordem Bancária. Exclua a Ordem Bancária primeiro.',
      )
    }

    const updatePayload: Database['public']['Tables']['demand_commitment_liquidations']['Update'] =
      {
        issue_date: params.issueDate,
        observation: params.observation?.trim() || null,
      }

    if (params.isIrRetention !== undefined) {
      if (params.isIrRetention) {
        if (commitment.suppliers?.is_simples_optant === true) {
          throw new Error(
            'Fornecedores optantes pelo Simples Nacional não permitem cadastro de NL de Retenção de IR.',
          )
        }
        const parsedAmount = parseRetentionAmount(params.irRetentionAmount)
        if (parsedAmount === null || parsedAmount <= 0) {
          throw new Error('É obrigatório informar o valor da retenção para NL de Retenção de IR.')
        }

        if (commitment.disbursement_program_number) {
          const remainingOrdinaryCount = (commitment.demand_commitment_liquidations || []).filter(
            (nl) => nl.id !== params.liquidationId && isOrdinaryLiquidationNote(nl),
          ).length
          if (remainingOrdinaryCount < MIN_LIQUIDATIONS_FOR_PD) {
            throw new Error(
              `Não é possível converter esta NL para Retenção de IR pois o Programa de Desembolso (${commitment.disbursement_program_number}) exige no mínimo ${MIN_LIQUIDATIONS_FOR_PD} Notas de Liquidação ordinárias.`,
            )
          }
        }

        updatePayload.is_ir_retention = true
        updatePayload.ir_retention_amount = parsedAmount
      } else {
        updatePayload.is_ir_retention = false
        updatePayload.ir_retention_amount = null
      }
    }

    const { data: updated, error: updateErr } = await supabase
      .from('demand_commitment_liquidations')
      .update(updatePayload)
      .eq('id', params.liquidationId)
      .select('*')
      .single()

    if (updateErr) throw updateErr

    await logAction(
      'UPDATE_COMMITMENT_LIQUIDATION',
      `Nota de Liquidação ${normalizedNL} atualizada na Nota de Empenho ${normalizedNE} (Data: ${params.issueDate})`,
      user.value?.id,
    )

    return updated
  }

  const removeLiquidationNote = async (params: {
    liquidationId: string
    commitmentId: string
    commitmentNumber: string
    liquidationNumber: string
  }) => {
    const normalizedNE = normalizeSiafemNumber(params.commitmentNumber)
    const normalizedNL = normalizeSiafemNumber(params.liquidationNumber)

    const { data: commitmentData, error: checkErr } = await supabase
      .from('demand_commitments')
      .select(
        'id, status, disbursement_program_number, bank_order_number, demand_commitment_liquidations(id, is_cancellation, is_ir_retention)',
      )
      .eq('id', params.commitmentId)
      .single()

    if (checkErr || !commitmentData) {
      throw new Error('Nota de Empenho não encontrada.')
    }

    const commitment = commitmentData as unknown as {
      id: string
      status: DemandItemExecutionStatus
      disbursement_program_number: string | null
      bank_order_number: string | null
      demand_commitment_liquidations?: Array<{
        id: string
        is_cancellation?: boolean | null
        is_ir_retention?: boolean | null
      }>
    }

    if (commitment.bank_order_number || commitment.status === 'completed') {
      throw new Error(
        'Não é permitido excluir Notas de Liquidação de um empenho concluído com Ordem Bancária.',
      )
    }

    const allLiquidations = commitment.demand_commitment_liquidations || []
    const targetNl = allLiquidations.find((nl) => nl.id === params.liquidationId)
    const isTargetOrdinary = targetNl ? isOrdinaryLiquidationNote(targetNl) : true
    const currentOrdinaryCount = allLiquidations.filter(isOrdinaryLiquidationNote).length

    if (
      commitment.disbursement_program_number &&
      isTargetOrdinary &&
      currentOrdinaryCount <= MIN_LIQUIDATIONS_FOR_PD
    ) {
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
    paidAt?: string | null
    bankOrderNumber?: string | null
    observation?: string | null
  }) => {
    const normalizedNE = normalizeSiafemNumber(params.commitmentNumber)
    const normalizedPD = normalizeSiafemNumber(params.disbursementProgramNumber)
    const cleanPaidAt = params.paidAt?.trim() || null
    const cleanObservation = params.observation?.trim() || null
    const normalizedOB = params.bankOrderNumber?.trim()
      ? normalizeSiafemNumber(params.bankOrderNumber)
      : null

    if (!isValidDisbursementProgramNumber(normalizedPD)) {
      throw new Error(
        'O número do Programa de Desembolso deve seguir o padrão SIAFEM: 2026PD00000.',
      )
    }

    if (normalizedOB && !isValidBankOrderNumber(normalizedOB)) {
      throw new Error(
        'O número da Ordem Bancária deve seguir o padrão SIAFEM: 2026OB00000 ou 2026OBC0000.',
      )
    }

    if (normalizedOB && !cleanPaidAt) {
      throw new Error('Informe a data de pagamento da PD para registrar a Ordem Bancária (OB).')
    }

    const { data: commitmentData, error: checkErr } = await supabase
      .from('demand_commitments')
      .select(
        'id, status, bank_order_number, demand_commitment_liquidations(id, is_cancellation, is_ir_retention)',
      )
      .eq('id', params.commitmentId)
      .single()

    if (checkErr || !commitmentData) {
      throw new Error('Nota de Empenho não encontrada.')
    }

    const commitment = commitmentData as unknown as {
      id: string
      status: DemandItemExecutionStatus
      bank_order_number: string | null
      demand_commitment_liquidations?: Array<{
        id: string
        is_cancellation?: boolean | null
        is_ir_retention?: boolean | null
      }>
    }

    if (commitment.status === 'cancelled') {
      throw new Error(
        'Notas de Empenho canceladas não permitem registro de Programa de Desembolso (PD).',
      )
    }

    if ((commitment.bank_order_number || commitment.status === 'completed') && !normalizedOB) {
      throw new Error(
        'Esta Nota de Empenho já possui Ordem Bancária emitida e encontra-se concluída.',
      )
    }

    if (commitment.status !== 'delivered' && commitment.status !== 'completed') {
      throw new Error(
        'O Programa de Desembolso só pode ser registrado após a entrega da mercadoria (status "Entregue").',
      )
    }

    const ordinaryLiquidationsCount = (commitment.demand_commitment_liquidations || []).filter(
      isOrdinaryLiquidationNote,
    ).length
    if (ordinaryLiquidationsCount < MIN_LIQUIDATIONS_FOR_PD) {
      throw new Error(
        `É necessário cadastrar no mínimo ${MIN_LIQUIDATIONS_FOR_PD} Notas de Liquidação (NL) antes de emitir o Programa de Desembolso (PD). Atualmente há ${ordinaryLiquidationsCount}.`,
      )
    }

    const now = new Date().toISOString()

    if (normalizedOB && cleanPaidAt) {
      const { error: updateErr } = await supabase
        .from('demand_commitments')
        .update({
          disbursement_program_number: normalizedPD,
          disbursement_program_issued_at: params.issuedAt,
          disbursement_program_paid_at: cleanPaidAt,
          disbursement_program_observation: cleanObservation,
          bank_order_number: normalizedOB,
          bank_order_issued_at: cleanPaidAt,
          bank_order_paid_at: cleanPaidAt,
          bank_order_observation: cleanObservation,
          status: 'completed',
          error_details: null,
          updated_at: now,
        })
        .eq('id', params.commitmentId)

      if (updateErr) {
        if (updateErr.code === '23505') {
          throw new Error(
            `O Programa de Desembolso "${normalizedPD}" ou a Ordem Bancária "${normalizedOB}" já está vinculado(a) a outra Nota de Empenho.`,
          )
        }
        throw updateErr
      }

      const completedCount = await completeCommitmentItems({
        normalizedNE,
        normalizedOB,
        pdNumber: normalizedPD,
        observation: cleanObservation,
        now,
      })

      await logAction(
        'COMPLETE_COMMITMENT_BANK_ORDER',
        `Pagamento do PD ${normalizedPD} (em ${cleanPaidAt}) e Ordem Bancária ${normalizedOB} registrados na Nota de Empenho ${normalizedNE}, encerrando ${completedCount} item(ns) como Concluído`,
        user.value?.id,
      )
      return
    }

    const { error: updateErr } = await supabase
      .from('demand_commitments')
      .update({
        disbursement_program_number: normalizedPD,
        disbursement_program_issued_at: params.issuedAt,
        disbursement_program_paid_at: cleanPaidAt,
        disbursement_program_observation: cleanObservation,
        updated_at: now,
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

  const removeDisbursementProgram = async (params: {
    commitmentId: string
    commitmentNumber: string
  }) => {
    const normalizedNE = normalizeSiafemNumber(params.commitmentNumber)

    const { data: commitment, error: checkErr } = await supabase
      .from('demand_commitments')
      .select('id, status, disbursement_program_number, bank_order_number')
      .eq('id', params.commitmentId)
      .single()

    if (checkErr || !commitment) {
      throw new Error('Nota de Empenho não encontrada.')
    }

    if (commitment.bank_order_number || commitment.status === 'completed') {
      throw new Error(
        'Não é possível excluir o Programa de Desembolso (PD) enquanto houver uma Ordem Bancária (OB) vinculada. Exclua a Ordem Bancária primeiro.',
      )
    }

    if (!commitment.disbursement_program_number) {
      throw new Error('Esta Nota de Empenho não possui Programa de Desembolso registrado.')
    }

    const pdNumber = commitment.disbursement_program_number

    const { error: updateErr } = await supabase
      .from('demand_commitments')
      .update({
        disbursement_program_number: null,
        disbursement_program_issued_at: null,
        disbursement_program_paid_at: null,
        disbursement_program_observation: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.commitmentId)

    if (updateErr) throw updateErr

    await logAction(
      'REMOVE_COMMITMENT_DISBURSEMENT_PROGRAM',
      `Programa de Desembolso ${pdNumber} removido da Nota de Empenho ${normalizedNE}`,
      user.value?.id,
    )
  }

  const saveBankOrderAndComplete = async (params: {
    commitmentId: string
    commitmentNumber: string
    bankOrderNumber: string
    issuedAt: string
    paidAt?: string | null
    observation?: string | null
  }) => {
    const normalizedNE = normalizeSiafemNumber(params.commitmentNumber)
    const normalizedOB = normalizeSiafemNumber(params.bankOrderNumber)

    if (!isValidBankOrderNumber(normalizedOB)) {
      throw new Error(
        'O número da Ordem Bancária deve seguir o padrão SIAFEM: 2026OB00000 ou 2026OBC0000.',
      )
    }

    const { data: commitmentData, error: checkErr } = await supabase
      .from('demand_commitments')
      .select(
        'id, status, disbursement_program_number, disbursement_program_paid_at, bank_order_number, demand_commitment_liquidations(id, is_cancellation, is_ir_retention)',
      )
      .eq('id', params.commitmentId)
      .single()

    if (checkErr || !commitmentData) {
      throw new Error('Nota de Empenho não encontrada.')
    }

    const commitment = commitmentData as unknown as {
      id: string
      status: DemandItemExecutionStatus
      disbursement_program_number: string | null
      disbursement_program_paid_at?: string | null
      bank_order_number: string | null
      demand_commitment_liquidations?: Array<{
        id: string
        is_cancellation?: boolean | null
        is_ir_retention?: boolean | null
      }>
    }

    if (commitment.status === 'cancelled') {
      throw new Error('Notas de Empenho canceladas não permitem emissão de Ordem Bancária (OB).')
    }

    const ordinaryLiquidationsCount = (commitment.demand_commitment_liquidations || []).filter(
      isOrdinaryLiquidationNote,
    ).length
    if (ordinaryLiquidationsCount < MIN_LIQUIDATIONS_FOR_PD) {
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
    const cleanPaidAt = params.paidAt?.trim() || null
    const effectivePdPaidAt =
      cleanPaidAt || commitment.disbursement_program_paid_at || params.issuedAt

    const { error: updateCommitmentErr } = await supabase
      .from('demand_commitments')
      .update({
        disbursement_program_paid_at: effectivePdPaidAt,
        bank_order_number: normalizedOB,
        bank_order_issued_at: params.issuedAt,
        bank_order_paid_at: cleanPaidAt,
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

    const completedCount = await completeCommitmentItems({
      normalizedNE,
      normalizedOB,
      pdNumber: commitment.disbursement_program_number,
      observation: cleanObservation,
      now,
    })

    await logAction(
      'COMPLETE_COMMITMENT_BANK_ORDER',
      `Ordem Bancária ${normalizedOB} registrada na Nota de Empenho ${normalizedNE}, encerrando ${completedCount} item(ns) como Concluído`,
      user.value?.id,
    )
  }

  const removeBankOrder = async (params: { commitmentId: string; commitmentNumber: string }) => {
    const normalizedNE = normalizeSiafemNumber(params.commitmentNumber)

    const { data: commitment, error: checkErr } = await supabase
      .from('demand_commitments')
      .select('id, status, bank_order_number')
      .eq('id', params.commitmentId)
      .single()

    if (checkErr || !commitment) {
      throw new Error('Nota de Empenho não encontrada.')
    }

    if (!commitment.bank_order_number) {
      throw new Error('Esta Nota de Empenho não possui Ordem Bancária registrada.')
    }

    const obNumber = commitment.bank_order_number
    const now = new Date().toISOString()

    const { error: updateCommitmentErr } = await supabase
      .from('demand_commitments')
      .update({
        disbursement_program_paid_at: null,
        bank_order_number: null,
        bank_order_issued_at: null,
        bank_order_paid_at: null,
        bank_order_observation: null,
        status: 'delivered',
        updated_at: now,
      })
      .eq('id', params.commitmentId)

    if (updateCommitmentErr) throw updateCommitmentErr

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
          execution_status: 'delivered',
          execution_status_updated_at: now,
        })
        .in('id', validItemIds)

      if (updateItemsErr) throw updateItemsErr

      const historyPayload: Database['public']['Tables']['demand_item_status_history']['Insert'][] =
        validItemIds.map((itemId) => ({
          demand_product_id: itemId,
          status: 'delivered',
          commitment_number: normalizedNE,
          observation: `Ordem Bancária ${obNumber} excluída. Status retornado para Entregue.`,
          error_details: null,
          created_by: user.value?.id || null,
        }))

      const { error: historyErr } = await supabase
        .from('demand_item_status_history')
        .insert(historyPayload)

      if (historyErr) {
        console.error('Erro ao registrar histórico de reversão de OB:', historyErr)
      }
    }

    await logAction(
      'REMOVE_COMMITMENT_BANK_ORDER',
      `Ordem Bancária ${obNumber} removida da Nota de Empenho ${normalizedNE}. Status retornado para Entregue.`,
      user.value?.id,
    )
  }

  const cancelCommitment = async (params: {
    commitmentId: string
    commitmentNumber: string
    reason: string
    cancellationCommitmentNumber: string
    cancellationIssueDate?: string | null
    cancellationObservation?: string | null
  }) => {
    const normalizedNE = params.commitmentNumber
      ? normalizeSiafemNumber(params.commitmentNumber)
      : ''
    const normalizedCancellationNE = params.cancellationCommitmentNumber
      ? normalizeSiafemNumber(params.cancellationCommitmentNumber)
      : ''
    const cleanReason = params.reason ? params.reason.trim() : ''
    if (!cleanReason) {
      throw new Error('A justificativa do cancelamento é obrigatória.')
    }
    if (!normalizedCancellationNE) {
      throw new Error('O número da NE de Cancelamento é obrigatório.')
    }
    if (!isValidCommitmentNumber(normalizedCancellationNE)) {
      throw new Error('O número da NE de Cancelamento deve seguir o padrão SIAFEM: 2026NE00000.')
    }
    if (normalizedCancellationNE === normalizedNE) {
      throw new Error(
        'O número da NE de Cancelamento deve ser diferente do número da Nota de Empenho atual.',
      )
    }

    const { data: commitment, error: checkErr } = await supabase
      .from('demand_commitments')
      .select('id, demand_id, supplier_id, expense_nature_id, status, bank_order_number')
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

    // Check if cancellation commitment number already exists
    const { data: existingNE } = await supabase
      .from('demand_commitments')
      .select('id, commitment_number')
      .eq('commitment_number', normalizedCancellationNE)
      .maybeSingle()

    if (existingNE) {
      throw new Error(
        `A Nota de Empenho "${normalizedCancellationNE}" já está cadastrada no sistema.`,
      )
    }

    const now = new Date().toISOString()
    const cancellationIssueDate = params.cancellationIssueDate?.trim() || now.slice(0, 10)
    const cancellationObs =
      params.cancellationObservation?.trim() ||
      `Nota de Empenho de Cancelamento referente ao empenho ${normalizedNE}. Motivo: ${cleanReason}`

    // 1. Update original commitment status to cancelled and record cancellation_commitment_number
    const { error: updateCommitmentErr } = await supabase
      .from('demand_commitments')
      .update({
        status: 'cancelled',
        observation: cleanReason,
        cancellation_commitment_number: normalizedCancellationNE,
        updated_at: now,
      })
      .eq('id', params.commitmentId)

    if (updateCommitmentErr) throw updateCommitmentErr

    // 2. Insert the new cancellation commitment row
    const { error: insertCancellationErr } = await supabase.from('demand_commitments').insert({
      commitment_number: normalizedCancellationNE,
      demand_id: commitment.demand_id,
      supplier_id: commitment.supplier_id,
      expense_nature_id: commitment.expense_nature_id,
      status: 'cancelled',
      issue_date: cancellationIssueDate,
      observation: cancellationObs,
      cancels_commitment_number: normalizedNE,
      created_by: user.value?.id || null,
      created_at: now,
      updated_at: now,
    })

    if (insertCancellationErr) throw insertCancellationErr

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

      const historyObs = `Empenho ${normalizedNE} cancelado via NE de Cancelamento ${normalizedCancellationNE}. Motivo: ${cleanReason}`

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
      `Nota de Empenho ${normalizedNE} cancelada pela NE ${normalizedCancellationNE} (${validItemIds.length} itens marcados como fracassados). Motivo: ${cleanReason}`,
      user.value?.id,
    )
  }

  return {
    isValidCommitmentNumber,
    fetchCommitments,
    fetchCommitmentByNumber,
    updateCommitmentLogisticsStatus,
    addLiquidationNote,
    addMultipleLiquidationNotes,
    updateLiquidationNote,
    removeLiquidationNote,
    saveDisbursementProgram,
    removeDisbursementProgram,
    saveBankOrderAndComplete,
    removeBankOrder,
    cancelCommitment,
  }
}
