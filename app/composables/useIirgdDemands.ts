import type { Database } from '~/types/supabase'

export interface IirgdDemand {
  id?: string
  station_code: string
  rg: string
  cpf: string
  name: string
  observation?: string
  status?: string
  created_by?: string
  created_at?: string
  updated_at?: string
}

export const useIirgdDemands = () => {
  const supabase = useSupabaseClient<Database>()
  const { logAction } = useLogger()

  const fetchDemands = async () => {
    const { data, error } = await supabase
      .from('iirgd_demands')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error(error)
      throw new Error('Erro ao buscar demandas do IIRGD')
    }
    return data
  }

  const createDemand = async (demand: IirgdDemand) => {
    const { data, error } = await supabase
      .from('iirgd_demands')
      .insert([
        {
          station_code: demand.station_code,
          rg: demand.rg,
          cpf: demand.cpf,
          name: demand.name,
          observation: demand.observation,
          status: demand.status || 'Novo',
        },
      ])
      .select()
      .single()

    if (error) {
      console.error(error)
      throw new Error('Erro ao criar demanda do IIRGD')
    }

    if (data) {
      await logAction('create', 'iirgd_demand', data.id, null, { name: demand.name, rg: demand.rg })
    }

    return data
  }

  return {
    fetchDemands,
    createDemand,
  }
}
