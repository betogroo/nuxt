import type { IirgdDemand } from './useIirgdDemands'

export interface IirgdCitizenWithDemands {
  id: string
  name: string
  rg: string | null
  cpf: string | null
  created_at: string
  updated_at: string
  iirgd_demands: IirgdDemand[]
}

export const useIirgdCitizens = () => {
  const supabase = useSupabaseClient()

  const fetchCitizens = async (options?: {
    page?: number
    itemsPerPage?: number
    searchQuery?: string
  }) => {
    const { page = 1, itemsPerPage = 10, searchQuery } = options || {}

    let query = supabase
      .from('iirgd_citizens')
      .select('*', { count: 'exact' })
      .order('name', { ascending: true })

    if (searchQuery) {
      const searchNumber = searchQuery.replace(/\D/g, '')
      if (searchNumber.length >= 3) {
        query = query.or(
          `name.ilike.%${searchQuery}%,rg.ilike.%${searchNumber}%,cpf.ilike.%${searchNumber}%`,
        )
      } else {
        query = query.or(`name.ilike.%${searchQuery}%`)
      }
    }

    const from = (page - 1) * itemsPerPage
    const to = from + itemsPerPage - 1
    query = query.range(from, to)

    const { data, count, error } = await query

    if (error) {
      console.error(error)
      throw new Error('Erro ao buscar lista de cidadãos do IIRGD')
    }
    return { data, count: count || 0 }
  }

  const fetchCitizenById = async (id: string): Promise<IirgdCitizenWithDemands> => {
    const { data, error } = await supabase
      .from('iirgd_citizens')
      .select('*, iirgd_demands(*)')
      .eq('id', id)
      .single()

    if (error) {
      console.error(error)
      throw new Error('Erro ao buscar os detalhes do cidadão do IIRGD')
    }

    // Sort demands from newest to oldest
    if (data && Array.isArray(data.iirgd_demands)) {
      data.iirgd_demands.sort((a: IirgdDemand, b: IirgdDemand) => {
        return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
      })
    }

    return data as IirgdCitizenWithDemands
  }

  const fetchCitizenByDocument = async (type: 'rg' | 'cpf', value: string) => {
    const { data, error } = await supabase
      .from('iirgd_citizens')
      .select('*')
      .eq(type, value)
      .maybeSingle()

    if (error && error.code !== 'PGRST116') {
      console.error(error)
      throw new Error(`Erro ao buscar cidadão pelo ${type.toUpperCase()}`)
    }

    return data
  }

  const createCitizen = async (payload: { name: string; rg: string; cpf?: string | null }) => {
    const { data, error } = await supabase
      .from('iirgd_citizens')
      .insert([
        {
          name: payload.name,
          rg: payload.rg || null,
          cpf: payload.cpf || null,
        },
      ])
      .select('*')
      .single()

    if (error) {
      console.error(error)
      if (error.code === '23505') {
        throw new Error('Já existe um cidadão cadastrado com este RG ou CPF.')
      }
      throw new Error('Erro ao cadastrar cidadão')
    }

    return data
  }

  const updateCitizen = async (id: string, payload: { name: string; rg?: string | null }) => {
    const { data, error } = await supabase
      .from('iirgd_citizens')
      .update({
        name: payload.name,
        rg: payload.rg || null,
      })
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      console.error(error)
      if (error.code === '23505') {
        throw new Error('Já existe um cidadão cadastrado com este RG.')
      }
      throw new Error('Erro ao atualizar cidadão')
    }

    return data
  }

  return {
    fetchCitizens,
    fetchCitizenById,
    fetchCitizenByDocument,
    createCitizen,
    updateCitizen,
  }
}
