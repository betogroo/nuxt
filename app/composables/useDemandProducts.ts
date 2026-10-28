import type { Database } from '~/types/database.types'
import type { DemandItemExecutionStatus } from '~/constants/demand-item-status'
import { getWinningBid } from '~/utils/bids'
import {
  type AddDemandItemWithDependenciesParams,
  createProductForDemand,
  ensureProductDefaultAndFinalUnits,
  ensureUnitAliasLink,
  resolveDemandUnitAlias,
  upsertDemandProductItem,
} from '~/utils/demandItemDependencies'

export type DemandProductCharacteristic = {
  id: string
  value: string
  key_id: string
  key?: {
    id: string
    name: string
    is_pending: boolean
    is_active: boolean
  } | null
}

export type DemandProductRow = Database['public']['Tables']['demand_products']['Row'] & {
  product?:
    | (Database['public']['Tables']['products']['Row'] & {
        product_classes?: Database['public']['Tables']['product_classes']['Row'] | null
        expense_natures?: Database['public']['Tables']['expense_natures']['Row'] | null
        product_characteristics?: DemandProductCharacteristic[]
      })
    | null
  measurement_units?: Database['public']['Tables']['measurement_units']['Row'] | null
  measurement_unit_aliases?: Database['public']['Tables']['measurement_unit_aliases']['Row'] | null
  demand_product_bids?: (Database['public']['Tables']['demand_product_bids']['Row'] & {
    suppliers?: Database['public']['Tables']['suppliers']['Row'] | null
  })[]
}

export type DemandItemStatusHistoryRow =
  Database['public']['Tables']['demand_item_status_history']['Row'] & {
    profiles?: { id: string; name: string | null } | null
  }

export const useDemandProducts = () => {
  const supabase = useSupabaseClient<Database>()
  const user = useSupabaseUser()
  const { logAction } = useLogger()

  const fetchDemandProducts = async (demandId: string) => {
    const { data, error } = await supabase
      .from('demand_products')
      .select(
        '*, product:products(*, product_classes(id, name), expense_natures(id, name), product_characteristics(id, value, key_id, key:product_characteristic_keys(id, name, is_pending, is_active))), measurement_units(*), measurement_unit_aliases(*), demand_product_bids(*, suppliers(*))',
      )
      .eq('demand_id', demandId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) {
      console.error(error)
      throw error
    }

    return data as unknown as DemandProductRow[]
  }

  const addDemandProduct = async (
    payload: Database['public']['Tables']['demand_products']['Insert'],
  ) => {
    const { error } = await supabase.from('demand_products').insert(payload)
    if (error) {
      if (error.code === '23505') {
        throw new Error('Este produto já foi adicionado a esta demanda.')
      }
      throw error
    }

    await logAction(
      'ADD_DEMAND_PRODUCT',
      `Produto ${payload.product_id} adicionado à demanda ${payload.demand_id}`,
      user.value?.id,
    )
  }

  // Complex operation that orchestrates Product creation, Unit creation, and linking
  const addDemandItemWithDependencies = async (params: AddDemandItemWithDependenciesParams) => {
    const ctx = { supabase, userId: user.value?.id, logAction }
    let finalProductId = params.selectedProductId || ''
    const finalUnitId = params.finalUnitId

    if (params.isNewProductMode) {
      finalProductId = await createProductForDemand(ctx, params)
    }

    if (!finalUnitId) throw new Error('Unidade de medida inválida.')

    const finalAliasId = await resolveDemandUnitAlias(ctx, params)

    await ensureProductDefaultAndFinalUnits(supabase, finalProductId, finalUnitId)

    await upsertDemandProductItem(ctx, {
      demandId: params.demandId,
      productId: finalProductId,
      unitId: finalUnitId,
      aliasId: finalAliasId,
      quantity: params.itemQuantity,
      referencePrice: params.itemReferencePrice,
    })
  }

  const fetchDemandItemDetails = async (itemId: string) => {
    const { data, error } = await supabase
      .from('demand_products')
      .select(
        '*, product:products(*, product_characteristics(id, value, key_id, key:product_characteristic_keys(id, name, is_pending, is_active))), measurement_units(*), measurement_unit_aliases(*), demand:demands(status)',
      )
      .eq('id', itemId)
      .single()

    if (error) throw error
    return data
  }

  const updateDemandItemWithDependencies = async (params: {
    itemId: string
    demandId?: string
    productId?: string
    quantity: number
    referencePrice: number | null
    bidInterval?: number | null
    bidIntervalType?: 'percentage' | 'monetary'
    finalUnitId: string
    finalAliasId?: string | null
  }) => {
    const finalUnitId = params.finalUnitId
    if (!finalUnitId) throw new Error('Unidade de medida inválida.')

    // Link unit to product if productId is provided
    if (params.productId && finalUnitId) {
      const { data: existingLink } = await supabase
        .from('product_units')
        .select('id')
        .eq('product_id', params.productId)
        .eq('unit_id', finalUnitId)
        .maybeSingle()

      if (!existingLink) {
        await supabase
          .from('product_units')
          .insert({ product_id: params.productId, unit_id: finalUnitId })
      }
    }

    // Link alias to unit if alias is provided
    if (params.finalAliasId && finalUnitId) {
      await ensureUnitAliasLink(supabase, finalUnitId, params.finalAliasId)
    }

    // Update the demand_product record
    const updatePayload: Database['public']['Tables']['demand_products']['Update'] = {
      quantity: params.quantity,
      unit_id: finalUnitId,
      alias_id: params.finalAliasId !== undefined ? params.finalAliasId : undefined,
      reference_price: params.referencePrice,
    }

    if (params.bidInterval !== undefined) updatePayload.bid_interval = params.bidInterval
    if (params.bidIntervalType !== undefined)
      updatePayload.bid_interval_type = params.bidIntervalType

    const { error: updateErr } = await supabase
      .from('demand_products')
      .update(updatePayload)
      .eq('id', params.itemId)

    if (updateErr) {
      if (updateErr.code === '23505')
        throw new Error('Já existe esse produto com essa mesma unidade nesta demanda.')
      throw updateErr
    }

    await logAction(
      'UPDATE_DEMAND_ITEM',
      `Item ${params.itemId} atualizado na demanda`,
      user.value?.id,
    )
  }

  const updateDemandProduct = async (
    itemId: string,
    payload: Database['public']['Tables']['demand_products']['Update'],
  ) => {
    const { error } = await supabase.from('demand_products').update(payload).eq('id', itemId)
    if (error) throw error

    await logAction('UPDATE_DEMAND_PRODUCT', `Item ${itemId} atualizado na demanda`, user.value?.id)
  }

  const removeDemandProduct = async (itemId: string, demandId: string) => {
    const { error } = await supabase.from('demand_products').delete().eq('id', itemId)
    if (error) throw error

    await logAction(
      'REMOVE_DEMAND_PRODUCT',
      `Item ${itemId} removido da demanda ${demandId}`,
      user.value?.id,
    )
  }

  const reorderDemandItems = async (updates: { id: string; sort_order: number }[]) => {
    // Supabase JS doesn't support bulk updates directly with a single call returning data nicely,
    // but we can do it via a loop since we don't have an RPC function right now,
    // or use Promise.all
    const promises = updates.map((update) =>
      supabase
        .from('demand_products')
        .update({ sort_order: update.sort_order })
        .eq('id', update.id),
    )
    const results = await Promise.all(promises)
    const errors = results.filter((r) => r.error).map((r) => r.error)
    if (errors.length > 0) throw new Error('Erro ao reordenar os itens')
  }
  const validateCommitmentNumberSupplier = async (params: {
    itemId: string
    commitmentNumber: string
    supplierId?: string | null
  }): Promise<void> => {
    const trimmed = params.commitmentNumber.trim().toUpperCase()
    if (!trimmed) return

    let currentSupplierId = params.supplierId || null
    if (!currentSupplierId) {
      const { data: currentBids } = await supabase
        .from('demand_product_bids')
        .select('id, supplier_id, amount, status, created_at')
        .eq('demand_product_id', params.itemId)
      const winner = getWinningBid(currentBids || [])
      currentSupplierId = winner?.supplier_id || null
    }

    if (!currentSupplierId) return

    const { data: otherItems, error } = await supabase
      .from('demand_products')
      .select(
        'id, commitment_number, demand_product_bids(id, supplier_id, amount, status, created_at, suppliers(id, company_name, cnpj))',
      )
      .ilike('commitment_number', trimmed)
      .neq('id', params.itemId)

    if (error) {
      console.error('Erro ao verificar empenho em outros itens:', error)
      throw error
    }

    if (!otherItems || otherItems.length === 0) return

    for (const otherItem of otherItems) {
      const winningBid = getWinningBid(otherItem.demand_product_bids || [])
      if (winningBid && winningBid.supplier_id && winningBid.supplier_id !== currentSupplierId) {
        const otherSupplier = winningBid.suppliers
        const supplierName =
          otherSupplier?.company_name ||
          (otherSupplier?.cnpj ? `CNPJ ${otherSupplier.cnpj}` : null) ||
          'outro fornecedor'
        throw new Error(
          `O número de empenho "${trimmed}" já está vinculado a ${supplierName}. Não é permitido utilizar o mesmo empenho para fornecedores diferentes.`,
        )
      }
    }
  }

  const updateDemandItemExecutionStatus = async (params: {
    itemId: string
    status: DemandItemExecutionStatus
    commitmentNumber?: string | null
    observation?: string | null
    errorDetails?: string | null
    supplierId?: string | null
  }) => {
    const trimmedCommitment = params.commitmentNumber
      ? params.commitmentNumber.trim().toUpperCase()
      : null

    if (params.status === 'commitment_issued' && trimmedCommitment) {
      await validateCommitmentNumberSupplier({
        itemId: params.itemId,
        commitmentNumber: trimmedCommitment,
        supplierId: params.supplierId,
      })
    }

    const now = new Date().toISOString()
    const updatePayload: Database['public']['Tables']['demand_products']['Update'] = {
      execution_status: params.status,
      execution_error_details: params.status === 'error' ? params.errorDetails || null : null,
      execution_status_updated_at: now,
    }

    if (params.status === 'commitment_issued' && trimmedCommitment) {
      updatePayload.commitment_number = trimmedCommitment
    }

    const { error: updateErr } = await supabase
      .from('demand_products')
      .update(updatePayload)
      .eq('id', params.itemId)

    if (updateErr) throw updateErr

    const { error: historyErr } = await supabase.from('demand_item_status_history').insert({
      demand_product_id: params.itemId,
      status: params.status,
      commitment_number: trimmedCommitment,
      observation: params.observation ? params.observation.trim() : null,
      error_details:
        params.status === 'error' && params.errorDetails ? params.errorDetails.trim() : null,
      created_by: user.value?.id || null,
    })

    if (historyErr) {
      console.error('Erro ao inserir histórico de execução do item:', historyErr)
    }

    await logAction(
      'UPDATE_DEMAND_ITEM_EXECUTION_STATUS',
      `Status de execução do item ${params.itemId} atualizado para "${params.status}"${trimmedCommitment ? ` (Empenho: ${trimmedCommitment})` : ''}`,
      user.value?.id,
    )
  }

  const fetchDemandItemStatusHistory = async (
    itemId: string,
  ): Promise<DemandItemStatusHistoryRow[]> => {
    const { data, error } = await supabase
      .from('demand_item_status_history')
      .select('*, profiles(id, name)')
      .eq('demand_product_id', itemId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erro ao buscar histórico de execução do item:', error)
      throw error
    }

    return (data || []) as DemandItemStatusHistoryRow[]
  }

  const batchUpdateCommitmentsByNature = async (params: {
    demandId: string
    supplierId: string
    updates: Array<{
      expenseNatureId: string
      commitmentNumber: string | null
    }>
  }) => {
    // 1. Fetch current demand items for this demand with their products & bids
    const { data: demandItems, error: itemsErr } = await supabase
      .from('demand_products')
      .select(
        'id, commitment_number, execution_status, product_id, product:products(expense_nature_id), demand_product_bids(id, supplier_id, amount, status, created_at)',
      )
      .eq('demand_id', params.demandId)

    if (itemsErr) throw itemsErr
    if (!demandItems || demandItems.length === 0) return

    // 2. Validate that within the updates, two different expense natures don't have the same commitment number
    const seenCommitments = new Map<string, string>()
    for (const update of params.updates) {
      const trimmed = update.commitmentNumber?.trim().toUpperCase() || null
      if (trimmed) {
        if (
          seenCommitments.has(trimmed) &&
          seenCommitments.get(trimmed) !== update.expenseNatureId
        ) {
          throw new Error(
            `O número de empenho "${trimmed}" foi informado para mais de uma natureza de despesa diferente. Cada natureza deve possuir uma nota de empenho exclusiva.`,
          )
        }
        seenCommitments.set(trimmed, update.expenseNatureId)
      }
    }

    // 3. For each update, find the matching won items
    const now = new Date().toISOString()
    const updatePromises: Promise<unknown>[] = []
    const historyInserts: Database['public']['Tables']['demand_item_status_history']['Insert'][] =
      []
    let updatedItemsCount = 0

    for (const update of params.updates) {
      const trimmedCommitment = update.commitmentNumber?.trim().toUpperCase() || null

      const matchingItems = demandItems.filter((item) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const prod = Array.isArray(item.product) ? item.product[0] : (item.product as any)
        const itemNatureId = prod?.expense_nature_id || 'none'
        if (itemNatureId !== update.expenseNatureId) return false

        const bids = item.demand_product_bids || []
        const winner = getWinningBid(bids)
        return winner && winner.supplier_id === params.supplierId
      })

      if (matchingItems.length === 0) continue

      if (trimmedCommitment) {
        await validateCommitmentNumberSupplier({
          itemId: matchingItems[0].id,
          commitmentNumber: trimmedCommitment,
          supplierId: params.supplierId,
        })
      }

      for (const item of matchingItems) {
        const currentCommitment = item.commitment_number?.trim().toUpperCase() || null
        if (trimmedCommitment !== currentCommitment) {
          updatedItemsCount++
          const newStatus: DemandItemExecutionStatus = trimmedCommitment
            ? 'commitment_issued'
            : item.execution_status === 'commitment_issued'
              ? 'homologated'
              : (item.execution_status as DemandItemExecutionStatus) || 'homologated'

          updatePromises.push(
            supabase
              .from('demand_products')
              .update({
                commitment_number: trimmedCommitment,
                execution_status: newStatus,
                execution_status_updated_at: now,
              })
              .eq('id', item.id),
          )

          historyInserts.push({
            demand_product_id: item.id,
            status: newStatus,
            commitment_number: trimmedCommitment,
            observation: trimmedCommitment
              ? 'Empenho atribuído em lote por Natureza de Despesa'
              : 'Empenho desvinculado em lote',
            created_by: user.value?.id || null,
          })
        }
      }
    }

    if (updatePromises.length > 0) {
      const results = await Promise.all(updatePromises)
      for (const res of results) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const err = (res as any)?.error
        if (err) throw err
      }

      if (historyInserts.length > 0) {
        const { error: histErr } = await supabase
          .from('demand_item_status_history')
          .insert(historyInserts)
        if (histErr) console.error('Erro ao inserir histórico de empenhos em lote:', histErr)
      }

      await logAction(
        'BATCH_UPDATE_DEMAND_COMMITMENTS',
        `Empenhos atualizados em lote para o fornecedor ${params.supplierId} na demanda ${params.demandId} (${updatedItemsCount} itens)`,
        user.value?.id,
      )
    }
  }

  return {
    reorderDemandItems,
    fetchDemandProducts,
    fetchDemandItemDetails,
    addDemandProduct,
    addDemandItemWithDependencies,
    updateDemandProduct,
    updateDemandItemWithDependencies,
    removeDemandProduct,
    validateCommitmentNumberSupplier,
    updateDemandItemExecutionStatus,
    batchUpdateCommitmentsByNature,
    fetchDemandItemStatusHistory,
  }
}
