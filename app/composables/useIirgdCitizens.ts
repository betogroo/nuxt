import type { IirgdDemand } from './useIirgdDemands'

export interface IirgdCitizenWithDemands {
  id: string
  name: string
  rg: string | null
  cpf: string | null
  other_document: string | null
  created_by?: string | null
  created_at: string
  updated_at: string
  iirgd_demands: IirgdDemand[]
  profiles?: { name: string | null }
}

export const useIirgdCitizens = () => {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()
  const { logAction } = useLogger()

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
          `name.ilike.%${searchQuery}%,rg.ilike.%${searchNumber}%,cpf.ilike.%${searchNumber}%,other_document.ilike.%${searchQuery}%`,
        )
      } else {
        query = query.or(`name.ilike.%${searchQuery}%,other_document.ilike.%${searchQuery}%`)
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
      .select('*, iirgd_demands(*), profiles(name)')
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

  const fetchCitizenByDocument = async (type: 'rg' | 'cpf' | 'other_document', value: string) => {
    const cleanValue = type === 'other_document' ? value.trim().toUpperCase() : value.trim()
    const { data, error } = await supabase
      .from('iirgd_citizens')
      .select('*')
      .eq(type, cleanValue)
      .maybeSingle()

    if (error && error.code !== 'PGRST116') {
      console.error(error)
      throw new Error(`Erro ao buscar cidadão pelo ${type.toUpperCase()}`)
    }

    return data
  }

  const createCitizen = async (payload: {
    name: string
    rg?: string | null
    cpf?: string | null
    other_document?: string | null
  }) => {
    const sanitizedName = payload.name.trim().toUpperCase()
    const { data, error } = await supabase
      .from('iirgd_citizens')
      .insert([
        {
          name: sanitizedName,
          rg: payload.rg || null,
          cpf: payload.cpf || null,
          other_document: payload.other_document
            ? payload.other_document.trim().toUpperCase()
            : null,
          created_by: user.value?.id || null,
        },
      ])
      .select('*')
      .single()

    if (error) {
      console.error(error)
      if (error.code === '23505') {
        throw new Error(
          'Já existe um cidadão cadastrado com este documento (RG, CPF ou Outro Estado).',
        )
      }
      throw new Error('Erro ao cadastrar cidadão')
    }

    await logAction(
      'CREATE_IIRGD_CITIZEN',
      `Cidadão IIRGD cadastrado: ID ${data.id} - ${data.name}`,
    )

    return data
  }

  const updateCitizen = async (
    id: string,
    payload: {
      name: string
      cpf?: string | null
      rg?: string | null
      other_document?: string | null
    },
  ) => {
    const sanitizedName = payload.name.trim().toUpperCase()
    const { data, error } = await supabase
      .from('iirgd_citizens')
      .update({
        name: sanitizedName,
        cpf: payload.cpf || null,
        rg: payload.rg || null,
        other_document: payload.other_document ? payload.other_document.trim().toUpperCase() : null,
      })
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      console.error(error)
      if (error.code === '23505') {
        throw new Error(
          'Já existe um cidadão cadastrado com este documento (RG, CPF ou Outro Estado).',
        )
      }
      throw new Error('Erro ao atualizar cidadão')
    }

    await logAction(
      'UPDATE_IIRGD_CITIZEN',
      `Cidadão IIRGD atualizado: ID ${data.id} - ${data.name}`,
    )

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
