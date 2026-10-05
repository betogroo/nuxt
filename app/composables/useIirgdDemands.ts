import type { IirgdDemandStatus } from '~/constants/iirgd-status'

export interface IirgdCitizen {
  id?: string
  name: string
  rg?: string | null
  cpf?: string | null
  created_at?: string
  updated_at?: string
}

export interface IirgdDemand {
  id?: string
  citizen_id: string
  station_code: string
  observation?: string
  status?: string
  created_by?: string
  created_at?: string
  updated_at?: string
  iirgd_citizens?: IirgdCitizen
}

export const useIirgdDemands = () => {
  // Use 'any' temporarily or omit Database type if it gets complex, but we try to stick to strict typing.
  // We'll use useSupabaseClient without strict generics if the types aren't regenerated yet.
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()
  const { logAction } = useLogger()

  const fetchDemands = async () => {
    const { data, error } = await supabase
      .from('iirgd_demands')
      .select('*, iirgd_citizens(*)')
      .order('created_at', { ascending: false })

    if (error) {
      console.error(error)
      throw new Error('Erro ao buscar demandas do IIRGD')
    }
    return data
  }

  const createDemand = async (payload: {
    station_code: string
    name: string
    rg?: string | null
    cpf?: string | null
    observation?: string
  }) => {
    // 1. Try to find existing citizen by RG or CPF
    let citizenId = null
    let existingCitizen = null

    if (payload.rg || payload.cpf) {
      const query = supabase.from('iirgd_citizens').select('*')
      const orConditions = []
      if (payload.rg) orConditions.push(`rg.eq.${payload.rg}`)
      if (payload.cpf) orConditions.push(`cpf.eq.${payload.cpf}`)

      const { data: citizens, error: citError } = await query.or(orConditions.join(','))

      if (!citError && citizens && citizens.length > 0) {
        existingCitizen = citizens[0]
        citizenId = existingCitizen.id
      }
    }

    if (citizenId) {
      // Check for active demands
      const { data: activeDemands } = await supabase
        .from('iirgd_demands')
        .select('id, status')
        .eq('citizen_id', citizenId)
        .not('status', 'in', '("issued", "protocol_cancelled", "confrontation_failed")')

      if (activeDemands && activeDemands.length > 0) {
        throw new Error('Este cidadão já possui uma solicitação em andamento.')
      }

      // Update citizen if new docs provided
      const updates: Record<string, string> = {}
      if (payload.rg && !existingCitizen.rg) updates.rg = payload.rg
      if (payload.cpf && !existingCitizen.cpf) updates.cpf = payload.cpf

      if (Object.keys(updates).length > 0) {
        await supabase.from('iirgd_citizens').update(updates).eq('id', citizenId)
      }
    } else {
      // Create new citizen
      const { data: newCit, error: newCitError } = await supabase
        .from('iirgd_citizens')
        .insert([{ name: payload.name, rg: payload.rg || null, cpf: payload.cpf || null }])
        .select()
        .single()

      if (newCitError || !newCit) {
        console.error(newCitError)
        throw new Error('Erro ao registrar o cidadão.')
      }
      citizenId = newCit.id
    }

    // 2. Create Demand
    const { data, error } = await supabase
      .from('iirgd_demands')
      .insert([
        {
          citizen_id: citizenId,
          station_code: payload.station_code,
          observation: payload.observation,
          status: 'new',
        },
      ])
      .select('*, iirgd_citizens(*)')
      .single()

    if (error) {
      console.error(error)
      throw new Error('Erro ao criar demanda do IIRGD')
    }

    if (data) {
      // Registrar no histórico
      await supabase.from('iirgd_demand_status_history').insert([
        {
          demand_id: data.id,
          status: 'new',
          observation: payload.observation,
          created_by: user.value?.id || null,
        },
      ])

      await logAction(
        'CREATE_IIRGD_DEMAND',
        `Nova demanda IIRGD criada para ${payload.name} (Posto: ${payload.station_code})`,
      )
    }

    return data
  }

  const fetchDemandById = async (id: string) => {
    const { data, error } = await supabase
      .from('iirgd_demands')
      .select('*, iirgd_citizens(*)')
      .eq('id', id)
      .single()

    if (error) {
      console.error(error)
      throw new Error('Erro ao buscar a demanda do IIRGD')
    }
    return data
  }

  const fetchCitizenHistory = async (citizenId: string) => {
    const { data, error } = await supabase
      .from('iirgd_demands')
      .select('*')
      .eq('citizen_id', citizenId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error(error)
      throw new Error('Erro ao buscar histórico do cidadão')
    }
    return data
  }

  const fetchDemandStatusHistory = async (demandId: string) => {
    const { data, error } = await supabase
      .from('iirgd_demand_status_history')
      .select('*, profiles(name)')
      .eq('demand_id', demandId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error(error)
      throw new Error('Erro ao buscar histórico de status do IIRGD')
    }
    return data
  }

  const updateDemand = async (id: string, updates: Partial<IirgdDemand>) => {
    const { data, error } = await supabase
      .from('iirgd_demands')
      .update(updates)
      .eq('id', id)
      .select('*, iirgd_citizens(*)')
      .single()

    if (error) {
      console.error(error)
      throw new Error('Erro ao atualizar a demanda do IIRGD')
    }

    if (data) {
      if (updates.status) {
        await supabase.from('iirgd_demand_status_history').insert([
          {
            demand_id: data.id,
            status: updates.status as IirgdDemandStatus,
            observation: updates.observation || null,
            created_by: user.value?.id || null,
          },
        ])
      }

      await logAction('UPDATE_IIRGD_DEMAND', `Demanda IIRGD atualizada: ID ${data.id}`)
    }

    return data
  }

  return {
    fetchDemands,
    fetchDemandById,
    fetchCitizenHistory,
    fetchDemandStatusHistory,
    createDemand,
    updateDemand,
  }
}
