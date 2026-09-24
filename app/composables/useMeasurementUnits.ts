import type { Database } from '~/types/database.types'

export type UnitRow = Database['public']['Tables']['measurement_units']['Row']

export const useMeasurementUnits = () => {
  const supabase = useSupabaseClient<Database>()
  const user = useSupabaseUser()
  const { logAction } = useLogger()

  const fetchUnits = async () => {
    const { data, error } = await supabase.from('measurement_units').select('*').order('name')
    if (error) throw error
    return data || []
  }

  const fetchAllActiveUnits = async () => {
    const { data, error } = await supabase
      .from('measurement_units')
      .select('*')
      .eq('is_active', true)
      .order('name')
    if (error) throw error
    return data || []
  }

  const createUnit = async (payload: {
    name: string
    legacy_alias: string | null
    is_active: boolean
  }) => {
    const { error } = await supabase.from('measurement_units').insert(payload)
    if (error) throw error
    await logAction('CREATE_UNIT', `Nova unidade de medida criada: ${payload.name}`, user.value?.id)
  }

  const updateUnit = async (
    id: string,
    payload: { name: string; legacy_alias: string | null; is_active: boolean },
  ) => {
    const { error } = await supabase.from('measurement_units').update(payload).eq('id', id)
    if (error) throw error
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

    await logAction('APPROVE_UNIT', `Unidade sugerida aprovada: ${targetUnit.name}`, user.value?.id)
  }

  const mergePendingUnit = async (targetUnit: UnitRow, finalUnitId: string) => {
    if (!finalUnitId) throw new Error('Selecione uma unidade existente para mesclar.')

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

  return {
    fetchUnits,
    fetchAllActiveUnits,
    createUnit,
    updateUnit,
    toggleUnitStatus,
    approvePendingUnit,
    mergePendingUnit,
  }
}
