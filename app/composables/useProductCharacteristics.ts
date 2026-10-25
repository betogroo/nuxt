import type { Database } from '~/types/database.types'

export type ProductCharacteristicKeyRow =
  Database['public']['Tables']['product_characteristic_keys']['Row']
export type ProductCharacteristicKeyInsert =
  Database['public']['Tables']['product_characteristic_keys']['Insert']
export type ProductCharacteristicRow =
  Database['public']['Tables']['product_characteristics']['Row']

export interface ProductCharacteristicKeyWithStats extends ProductCharacteristicKeyRow {
  usage_count: number
}

interface RawKeyWithCount extends ProductCharacteristicKeyRow {
  product_characteristics?: { count: number }[] | null
}

export const useProductCharacteristics = () => {
  const supabase = useSupabaseClient<Database>()
  const user = useSupabaseUser()
  const { logAction } = useLogger()

  const mapKeyWithUsage = (row: RawKeyWithCount): ProductCharacteristicKeyWithStats => {
    const countArr = row.product_characteristics
    const usageCount =
      Array.isArray(countArr) && countArr.length > 0 && typeof countArr[0]?.count === 'number'
        ? countArr[0].count
        : 0
    return {
      id: row.id,
      name: row.name,
      is_active: row.is_active,
      is_pending: row.is_pending,
      created_at: row.created_at,
      updated_at: row.updated_at,
      usage_count: usageCount,
    }
  }

  const fetchCharacteristicKeys = async (
    currentPage: number,
    itemsPerPage: number,
    searchQuery?: string,
  ) => {
    const from = (currentPage - 1) * itemsPerPage
    const to = from + itemsPerPage - 1

    let query = supabase
      .from('product_characteristic_keys')
      .select('*, product_characteristics(count)', { count: 'exact' })
      .eq('is_pending', false)
      .order('name', { ascending: true })
      .range(from, to)

    if (searchQuery && searchQuery.trim() !== '') {
      query = query.ilike('name', `%${searchQuery.trim()}%`)
    }

    const { data, count, error } = await query

    if (error) throw error
    const mapped = ((data as unknown as RawKeyWithCount[]) || []).map(mapKeyWithUsage)
    return { data: mapped, count: count || 0 }
  }

  const fetchAllOfficialCharacteristicKeys = async (): Promise<ProductCharacteristicKeyRow[]> => {
    const { data, error } = await supabase
      .from('product_characteristic_keys')
      .select('*')
      .eq('is_pending', false)
      .order('name', { ascending: true })

    if (error) throw error
    return (data as ProductCharacteristicKeyRow[]) || []
  }

  const fetchAllSelectableKeys = async (): Promise<ProductCharacteristicKeyRow[]> => {
    const { data, error } = await supabase
      .from('product_characteristic_keys')
      .select('*')
      .or('is_active.eq.true,is_pending.eq.true')
      .order('name', { ascending: true })

    if (error) throw error
    return (data as ProductCharacteristicKeyRow[]) || []
  }

  const fetchPendingCharacteristicKeys = async (): Promise<ProductCharacteristicKeyWithStats[]> => {
    const { data, error } = await supabase
      .from('product_characteristic_keys')
      .select('*, product_characteristics(count)')
      .eq('is_pending', true)
      .order('created_at', { ascending: false })

    if (error) throw error
    return ((data as unknown as RawKeyWithCount[]) || []).map(mapKeyWithUsage)
  }

  const fetchDistinctValuesForKey = async (keyName: string): Promise<string[]> => {
    const cleanName = keyName.trim()
    if (!cleanName) return []

    const { data: keyData, error: keyError } = await supabase
      .from('product_characteristic_keys')
      .select('id')
      .ilike('name', cleanName)
      .maybeSingle()

    if (keyError || !keyData) return []

    const { data: valuesData, error: valuesError } = await supabase
      .from('product_characteristics')
      .select('value')
      .eq('key_id', keyData.id)
      .order('value', { ascending: true })

    if (valuesError || !valuesData) return []

    const uniqueMap = new Map<string, string>()
    for (const item of valuesData) {
      const val = item.value?.trim()
      if (val && !uniqueMap.has(val.toLowerCase())) {
        uniqueMap.set(val.toLowerCase(), val)
      }
    }
    return Array.from(uniqueMap.values())
  }

  const resolveOrCreateCharacteristicKey = async (
    keyName: string,
  ): Promise<ProductCharacteristicKeyRow> => {
    const cleanName = keyName.trim()
    if (!cleanName) {
      throw new Error('O nome da característica não pode ser vazio.')
    }

    const { data: existing, error: findError } = await supabase
      .from('product_characteristic_keys')
      .select('*')
      .ilike('name', cleanName)
      .maybeSingle()

    if (findError) throw findError
    if (existing) return existing as ProductCharacteristicKeyRow

    const { data: created, error: insertError } = await supabase
      .from('product_characteristic_keys')
      .insert({
        name: cleanName,
        is_pending: true,
        is_active: false,
      })
      .select()
      .single()

    if (insertError) throw insertError

    await logAction(
      'CREATE_PENDING_CHARACTERISTIC_KEY',
      `Nova chave de característica sugerida: "${cleanName}"`,
      user.value?.id,
    )

    return created as ProductCharacteristicKeyRow
  }

  const createCharacteristicKey = async (payload: { name: string; is_active?: boolean }) => {
    const cleanName = payload.name.trim()
    const { data: existing } = await supabase
      .from('product_characteristic_keys')
      .select('id')
      .ilike('name', cleanName)
      .maybeSingle()

    if (existing) {
      throw new Error(`Já existe uma chave cadastrada com o nome "${cleanName}".`)
    }

    const { data, error } = await supabase
      .from('product_characteristic_keys')
      .insert({
        name: cleanName,
        is_active: payload.is_active ?? true,
        is_pending: false,
      })
      .select()
      .single()

    if (error) throw error

    await logAction(
      'CREATE_CHARACTERISTIC_KEY',
      `Nova chave de característica oficial cadastrada: "${cleanName}"`,
      user.value?.id,
    )

    return data as ProductCharacteristicKeyRow
  }

  const updateCharacteristicKey = async (
    id: string,
    payload: { name?: string; is_active?: boolean },
  ) => {
    const updateData: Partial<ProductCharacteristicKeyInsert> = {}
    if (payload.name !== undefined) {
      updateData.name = payload.name.trim()
    }
    if (payload.is_active !== undefined) {
      updateData.is_active = payload.is_active
    }

    const { error } = await supabase
      .from('product_characteristic_keys')
      .update(updateData)
      .eq('id', id)

    if (error) throw error

    await logAction(
      'UPDATE_CHARACTERISTIC_KEY',
      `Chave de característica atualizada: ${updateData.name || id}`,
      user.value?.id,
    )
  }

  const toggleCharacteristicKeyStatus = async (keyItem: ProductCharacteristicKeyRow) => {
    const newStatus = !keyItem.is_active
    const { error } = await supabase
      .from('product_characteristic_keys')
      .update({ is_active: newStatus })
      .eq('id', keyItem.id)

    if (error) throw error

    await logAction(
      'TOGGLE_CHARACTERISTIC_KEY_STATUS',
      `Status da chave de característica "${keyItem.name}" alterado para ${newStatus ? 'Ativo' : 'Inativo'}`,
      user.value?.id,
    )
  }

  const deleteCharacteristicKey = async (id: string) => {
    const { error } = await supabase.from('product_characteristic_keys').delete().eq('id', id)

    if (error) throw error

    await logAction(
      'DELETE_CHARACTERISTIC_KEY',
      `Chave de característica removida: ${id}`,
      user.value?.id,
    )
  }

  const mergeCharacteristicKeys = async (
    sourceKey: ProductCharacteristicKeyRow,
    targetKeyId: string,
  ) => {
    if (!targetKeyId) {
      throw new Error('Selecione uma chave de destino para realizar a unificação.')
    }
    if (sourceKey.id === targetKeyId) {
      throw new Error('A chave de origem e a chave de destino não podem ser a mesma.')
    }

    const { data: sourceLinks, error: linksError } = await supabase
      .from('product_characteristics')
      .select('*')
      .eq('key_id', sourceKey.id)

    if (linksError) throw linksError

    if (sourceLinks && sourceLinks.length > 0) {
      for (const link of sourceLinks) {
        const { data: existingTarget, error: targetLookupError } = await supabase
          .from('product_characteristics')
          .select('*')
          .eq('product_id', link.product_id)
          .eq('key_id', targetKeyId)
          .maybeSingle()

        if (targetLookupError) throw targetLookupError

        if (existingTarget) {
          const targetVal = existingTarget.value.trim()
          const sourceVal = link.value.trim()

          if (targetVal.toLowerCase() !== sourceVal.toLowerCase()) {
            const combinedValue = `${targetVal} / ${sourceVal}`
            const { error: updateValError } = await supabase
              .from('product_characteristics')
              .update({ value: combinedValue })
              .eq('id', existingTarget.id)

            if (updateValError) throw updateValError
          }

          const { error: removeDupError } = await supabase
            .from('product_characteristics')
            .delete()
            .eq('id', link.id)

          if (removeDupError) throw removeDupError
        } else {
          const { error: migrateError } = await supabase
            .from('product_characteristics')
            .update({ key_id: targetKeyId })
            .eq('id', link.id)

          if (migrateError) throw migrateError
        }
      }
    }

    const { error: deleteSourceError } = await supabase
      .from('product_characteristic_keys')
      .delete()
      .eq('id', sourceKey.id)

    if (deleteSourceError) throw deleteSourceError

    await logAction(
      'MERGE_CHARACTERISTIC_KEY',
      `Chave de característica "${sourceKey.name}" unificada na chave (${targetKeyId})`,
      user.value?.id,
    )
  }

  const approvePendingCharacteristicKey = async (
    targetKey: ProductCharacteristicKeyRow,
    newName?: string,
  ) => {
    const finalName = newName && newName.trim() !== '' ? newName.trim() : targetKey.name

    const { data: collidingKey, error: checkError } = await supabase
      .from('product_characteristic_keys')
      .select('*')
      .ilike('name', finalName)
      .neq('id', targetKey.id)
      .maybeSingle()

    if (checkError) throw checkError

    if (collidingKey) {
      await mergeCharacteristicKeys(targetKey, collidingKey.id)
      return
    }

    const { error } = await supabase
      .from('product_characteristic_keys')
      .update({
        name: finalName,
        is_pending: false,
        is_active: true,
      })
      .eq('id', targetKey.id)

    if (error) throw error

    await logAction(
      'APPROVE_CHARACTERISTIC_KEY',
      `Chave de característica sugerida aprovada: "${finalName}"`,
      user.value?.id,
    )
  }

  return {
    fetchCharacteristicKeys,
    fetchAllOfficialCharacteristicKeys,
    fetchAllSelectableKeys,
    fetchPendingCharacteristicKeys,
    fetchDistinctValuesForKey,
    resolveOrCreateCharacteristicKey,
    createCharacteristicKey,
    updateCharacteristicKey,
    toggleCharacteristicKeyStatus,
    deleteCharacteristicKey,
    approvePendingCharacteristicKey,
    mergeCharacteristicKeys,
  }
}
