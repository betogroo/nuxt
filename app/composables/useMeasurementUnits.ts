import type { Database } from '~/types/database.types'

export type UnitAliasRow = Database['public']['Tables']['measurement_unit_aliases']['Row']
export type UnitRow = Database['public']['Tables']['measurement_units']['Row'] & {
  measurement_unit_aliases?: UnitAliasRow[]
}

export const useMeasurementUnits = () => {
  const supabase = useSupabaseClient<Database>()
  const user = useSupabaseUser()
  const { logAction } = useLogger()

  // --- Units ---

  const fetchUnits = async () => {
    const { data, error } = await supabase
      .from('measurement_units')
      .select('*, measurement_unit_aliases(*)')
      .order('name')
    if (error) throw error
    return data || []
  }

  const fetchAllActiveUnits = async () => {
    const { data, error } = await supabase
      .from('measurement_units')
      .select('*, measurement_unit_aliases(*)')
      .eq('is_active', true)
      .order('name')
    if (error) throw error
    return data || []
  }

  const createUnit = async (payload: { name: string; aliasIds: string[]; is_active: boolean }) => {
    const { data: unit, error } = await supabase
      .from('measurement_units')
      .insert({
        name: payload.name,
        is_active: payload.is_active,
      })
      .select()
      .single()

    if (error) throw error

    if ((payload.aliasIds || []).length > 0 && unit) {
      const { error: aliasErr } = await supabase
        .from('measurement_unit_aliases')
        .update({ unit_id: unit.id })
        .in('id', payload.aliasIds)
      if (aliasErr) throw aliasErr
    }

    await logAction('CREATE_UNIT', `Nova unidade de medida criada: ${payload.name}`, user.value?.id)
  }

  const updateUnit = async (
    id: string,
    payload: { name: string; aliasIds: string[]; is_active: boolean },
  ) => {
    const { error } = await supabase
      .from('measurement_units')
      .update({
        name: payload.name,
        is_active: payload.is_active,
      })
      .eq('id', id)
    if (error) throw error

    // Remove all old aliases from this unit
    await supabase.from('measurement_unit_aliases').update({ unit_id: null }).eq('unit_id', id)

    // Assign new aliases
    if ((payload.aliasIds || []).length > 0) {
      const { error: aliasErr } = await supabase
        .from('measurement_unit_aliases')
        .update({ unit_id: id })
        .in('id', payload.aliasIds)
      if (aliasErr) throw aliasErr
    }

    await logAction('UPDATE_UNIT', `Unidade de medida atualizada: ${payload.name}`, user.value?.id)
  }

  const toggleUnitStatus = async (unit: UnitRow) => {
    const newStatus = !unit.is_active
    const { error } = await supabase
      .from('measurement_units')
      .update({ is_active: newStatus })
      .eq('id', unit.id)

    if (error) throw error

    await logAction(
      'TOGGLE_UNIT_STATUS',
      `Unidade ${unit.name} alterada para ${newStatus ? 'ATIVO' : 'INATIVO'}`,
      user.value?.id,
    )
  }

  // --- Aliases ---

  const fetchAliases = async () => {
    const { data, error } = await supabase
      .from('measurement_unit_aliases')
      .select('*')
      .order('code')
    if (error) throw error
    return data || []
  }

  const fetchAvailableAliases = async () => {
    const { data, error } = await supabase
      .from('measurement_unit_aliases')
      .select('*')
      .is('unit_id', null)
      .order('code')
    if (error) throw error
    return data || []
  }

  const createAliasAsAdmin = async (payload: { code: number; name: string }) => {
    const { error } = await supabase.from('measurement_unit_aliases').insert({
      code: payload.code,
      name: payload.name,
      is_pending: false,
    })
    if (error) throw error
    await logAction(
      'CREATE_ALIAS',
      `Novo registro alternativo criado: ${payload.name} (Cód: ${payload.code})`,
      user.value?.id,
    )
  }

  const updateAliasAsAdmin = async (id: string, payload: { code: number; name: string }) => {
    const { error } = await supabase
      .from('measurement_unit_aliases')
      .update({
        code: payload.code,
        name: payload.name,
      })
      .eq('id', id)
    if (error) throw error
    await logAction(
      'UPDATE_ALIAS',
      `Registro alternativo atualizado: ${payload.name} (Cód: ${payload.code})`,
      user.value?.id,
    )
  }

  const deleteAliasAsAdmin = async (id: string, name: string) => {
    const { error } = await supabase.from('measurement_unit_aliases').delete().eq('id', id)
    if (error) throw error
    await logAction('DELETE_ALIAS', `Registro alternativo excluído: ${name}`, user.value?.id)
  }

  // --- User Flow (Pending) ---

  const registerPendingAliasAndUnit = async (payload: { code: number; name: string }) => {
    // 1. Create pending unit
    const { data: unit, error: unitErr } = await supabase
      .from('measurement_units')
      .insert({
        name: payload.name,
        is_pending: true,
        is_active: false,
      })
      .select()
      .single()

    if (unitErr || !unit) throw unitErr || new Error('Failed to create pending unit')

    // 2. Create pending alias linked to unit
    const { data: alias, error: aliasErr } = await supabase
      .from('measurement_unit_aliases')
      .insert({
        code: payload.code,
        name: payload.name,
        unit_id: unit.id,
        is_pending: true,
      })
      .select()
      .single()

    if (aliasErr) {
      // rollback unit
      await supabase.from('measurement_units').delete().eq('id', unit.id)
      throw aliasErr
    }

    await logAction(
      'CREATE_PENDING_ALIAS_UNIT',
      `Usuário sugeriu nova unidade/registro: ${payload.name}`,
      user.value?.id,
    )
    return { unit, alias }
  }

  // --- Pending Approvals ---

  const approvePendingUnit = async (targetUnit: UnitRow, newName?: string) => {
    const updatePayload: { is_pending: boolean; is_active: boolean; name?: string } = {
      is_pending: false,
      is_active: true,
    }
    if (newName && newName.trim() !== '') {
      updatePayload.name = newName.trim()
    }

    const { error: updateError } = await supabase
      .from('measurement_units')
      .update(updatePayload)
      .eq('id', targetUnit.id)

    if (updateError) throw updateError

    // Also unpend all its aliases
    await supabase
      .from('measurement_unit_aliases')
      .update({ is_pending: false })
      .eq('unit_id', targetUnit.id)

    await logAction('APPROVE_UNIT', `Unidade sugerida aprovada: ${targetUnit.name}`, user.value?.id)
  }

  const mergePendingUnit = async (targetUnit: UnitRow, finalUnitId: string) => {
    if (!finalUnitId) throw new Error('Selecione uma unidade existente para mesclar.')

    // Move aliases to the official unit and unpend them
    await supabase
      .from('measurement_unit_aliases')
      .update({ unit_id: finalUnitId, is_pending: false })
      .eq('unit_id', targetUnit.id)

    // Atualizar product_units
    const { data: productLinks } = await supabase
      .from('product_units')
      .select('*')
      .eq('unit_id', targetUnit.id)

    if (productLinks) {
      for (const link of productLinks) {
        const { error: updErr } = await supabase
          .from('product_units')
          .update({ unit_id: finalUnitId })
          .eq('id', link.id)
        if (updErr && updErr.code === '23505') {
          await supabase.from('product_units').delete().eq('id', link.id)
        }
      }
    }

    // Atualizar demand_products
    const { data: demandLinks } = await supabase
      .from('demand_products')
      .select('*')
      .eq('unit_id', targetUnit.id)

    if (demandLinks) {
      for (const link of demandLinks) {
        const { error: updErr } = await supabase
          .from('demand_products')
          .update({ unit_id: finalUnitId })
          .eq('id', link.id)
        if (updErr && updErr.code === '23505') {
          await supabase.from('demand_products').delete().eq('id', link.id)
        }
      }
    }

    // Deletar a pendente
    const { error: delError } = await supabase
      .from('measurement_units')
      .delete()
      .eq('id', targetUnit.id)
    if (delError) throw delError

    await logAction(
      'MERGE_UNIT',
      `Unidade sugerida "${targetUnit.name}" mesclada na oficial.`,
      user.value?.id,
    )
  }
  const resolveOrCreateUnit = async (searchStr: string) => {
    if (!searchStr) {
      // Fallback to "Unidade"
      const { data: defaultUnit } = await supabase.from('measurement_units').select('id').eq('name', 'Unidade').maybeSingle()
      if (defaultUnit) return defaultUnit.id
      throw new Error('Unidade de medida não informada.')
    }
    
    // 1. Procurar na lista existente (case-insensitive)
    const { data: existingUnit } = await supabase.from('measurement_units').select('id').ilike('name', searchStr.trim()).maybeSingle()
    if (existingUnit) return existingUnit.id

    // 2. Criar nova como pendente
    const { data: newUnit, error } = await supabase.from('measurement_units').insert({
      name: searchStr.trim(),
      is_pending: true,
      is_active: false
    }).select().single()

    if (error || !newUnit) throw error || new Error('Failed to create pending unit')
    
    return newUnit.id
  }

  return {
    resolveOrCreateUnit,
    fetchUnits,
    fetchAllActiveUnits,
    createUnit,
    updateUnit,
    toggleUnitStatus,
    fetchAliases,
    fetchAvailableAliases,
    createAliasAsAdmin,
    updateAliasAsAdmin,
    deleteAliasAsAdmin,
    registerPendingAliasAndUnit,
    approvePendingUnit,
    mergePendingUnit,
  }
}

