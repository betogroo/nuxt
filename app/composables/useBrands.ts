import type { Database } from '~/types/database.types'
import {
  PENDING_ITEM_FLAGS,
  APPROVED_ITEM_FLAGS,
  buildApprovePayload,
  registerPendingItem,
} from '~/utils/pendingCatalog'

export type BrandRow = Database['public']['Tables']['brands']['Row']
export type BrandInsert = Database['public']['Tables']['brands']['Insert']
export type BrandUpdate = Database['public']['Tables']['brands']['Update']

export interface BrandWithUsage extends BrandRow {
  real_products_count?: number
}

export interface BrandProductItem {
  id: string
  name: string
  brand: string
  brand_id: string | null
  link: string | null
  created_at: string
  product?: {
    id: string
    name: string
    cat_mat: number | null
    cat_bec: number | null
    is_active: boolean
    expense_natures?: { id: string; name: string } | null
    product_classes?: { id: string; name: string } | null
  } | null
}

export const useBrands = () => {
  const supabase = useSupabaseClient<Database>()
  const user = useSupabaseUser()
  const { isAdmin } = usePermissions()
  const { logAction } = useLogger()

  /**
   * Busca paginada de marcas ativas/inativas (itens não pendentes).
   */
  const fetchBrands = async (
    currentPage: number,
    itemsPerPage: number,
    searchQuery?: string,
  ): Promise<{ data: BrandRow[]; count: number }> => {
    const from = (currentPage - 1) * itemsPerPage
    const to = from + itemsPerPage - 1

    let query = supabase.from('brands').select('*', { count: 'exact' }).eq('is_pending', false)

    if (searchQuery && searchQuery.trim() !== '') {
      query = query.ilike('name', `%${searchQuery.trim()}%`)
    }

    const { data, count, error } = await query.order('name', { ascending: true }).range(from, to)

    if (error) throw error
    return { data: (data || []) as BrandRow[], count: count || 0 }
  }

  /**
   * Busca todas as marcas pendentes de aprovação administrativa.
   */
  const fetchPendingBrands = async (): Promise<BrandRow[]> => {
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .eq('is_pending', true)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data || []) as BrandRow[]
  }

  /**
   * Busca todas as marcas ativas e aprovadas para preenchimento de comboboxes/seletores.
   */
  const fetchAllActiveBrands = async (): Promise<BrandRow[]> => {
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .eq('is_active', true)
      .eq('is_pending', false)
      .order('name', { ascending: true })

    if (error) throw error
    return (data || []) as BrandRow[]
  }

  /**
   * Garante a existência da marca na tabela `brands`.
   * Se já existir (busca case-insensitive), retorna a marca existente.
   * Se não existir:
   *  - Para administradores: cadastra diretamente como aprovada (`is_active: true, is_pending: false`).
   *  - Para UGE / outros usuários: cadastra com pendência de aprovação (`is_active: false, is_pending: true`).
   */
  const ensureBrand = async (brandName: string): Promise<BrandRow> => {
    const cleanName = brandName?.trim()
    if (!cleanName) {
      throw new Error('O nome da marca é obrigatório.')
    }

    const { data: existing, error: findError } = await supabase
      .from('brands')
      .select('*')
      .ilike('name', cleanName)
      .maybeSingle()

    if (findError) throw findError
    if (existing) {
      return existing as BrandRow
    }

    if (isAdmin.value) {
      const { data: created, error: createError } = await supabase
        .from('brands')
        .insert({
          name: cleanName,
          ...APPROVED_ITEM_FLAGS,
          created_by: user.value?.id,
        })
        .select()
        .single()

      if (createError) throw createError

      await logAction('CREATE_BRAND', `Nova marca cadastrada: "${cleanName}"`, user.value?.id)
      return created as BrandRow
    }

    // Usuário não-admin (ex: uge): cadastrar como pendente
    return await registerPendingItem<BrandRow>(
      () =>
        supabase
          .from('brands')
          .insert({
            name: cleanName,
            ...PENDING_ITEM_FLAGS,
            created_by: user.value?.id,
          })
          .select()
          .single(),
      async (row) => {
        await logAction(
          'CREATE_PENDING_BRAND',
          `Nova marca sugerida para aprovação: "${row.name}"`,
          user.value?.id,
        )
      },
    )
  }

  /**
   * Criação manual de marca (geralmente via interface de administração).
   */
  const createBrand = async (payload: {
    name: string
    is_active?: boolean
    is_pending?: boolean
  }): Promise<BrandRow> => {
    const cleanName = payload.name?.trim()
    if (!cleanName) {
      throw new Error('O nome da marca é obrigatório.')
    }

    const { data, error } = await supabase
      .from('brands')
      .insert({
        name: cleanName,
        is_active: payload.is_active ?? true,
        is_pending: payload.is_pending ?? false,
        created_by: user.value?.id,
      })
      .select()
      .single()

    if (error) throw error

    await logAction('CREATE_BRAND', `Marca cadastrada: "${cleanName}"`, user.value?.id)
    return data as BrandRow
  }

  /**
   * Atualização de marca.
   * Se o nome for alterado, sincroniza também o snapshot textual `brand` nos produtos reais vinculados.
   */
  const updateBrand = async (
    id: string,
    payload: { name?: string; is_active?: boolean; is_pending?: boolean },
  ): Promise<BrandRow> => {
    const updateData: BrandUpdate = {}
    if (payload.name !== undefined) {
      const cleanName = payload.name.trim()
      if (!cleanName) throw new Error('O nome da marca não pode ser vazio.')
      updateData.name = cleanName
    }
    if (payload.is_active !== undefined) {
      updateData.is_active = payload.is_active
    }
    if (payload.is_pending !== undefined) {
      updateData.is_pending = payload.is_pending
    }

    const { data, error } = await supabase
      .from('brands')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // Sincronizar o nome textual em real_products caso o nome tenha sido alterado
    if (updateData.name) {
      await supabase.from('real_products').update({ brand: updateData.name }).eq('brand_id', id)
    }

    await logAction('UPDATE_BRAND', `Marca ID ${id} atualizada`, user.value?.id)
    return data as BrandRow
  }

  /**
   * Alterna o status ativo/inativo da marca.
   */
  const toggleBrandStatus = async (brand: BrandRow): Promise<void> => {
    const newStatus = !brand.is_active
    const { error } = await supabase
      .from('brands')
      .update({ is_active: newStatus })
      .eq('id', brand.id)

    if (error) throw error

    await logAction(
      'TOGGLE_BRAND_STATUS',
      `Marca "${brand.name}" alterada para ${newStatus ? 'Ativa' : 'Inativa'}`,
      user.value?.id,
    )
  }

  /**
   * Exclusão de marca com verificação prévia de produtos reais vinculados.
   */
  const deleteBrand = async (id: string, brandName?: string): Promise<void> => {
    const { count, error: countError } = await supabase
      .from('real_products')
      .select('id', { count: 'exact', head: true })
      .eq('brand_id', id)

    if (countError) throw countError

    if (count && count > 0) {
      throw new Error(
        `Não é possível excluir esta marca pois ela possui ${count} produto(s) real(is) vinculado(s). Inative a marca se não desejar novas utilizações.`,
      )
    }

    const { error } = await supabase.from('brands').delete().eq('id', id)

    if (error) throw error

    await logAction('DELETE_BRAND', `Marca removida: ${brandName || id}`, user.value?.id)
  }

  /**
   * Aprovação de marca pendente por um administrador.
   */
  const approvePendingBrand = async (brand: BrandRow, newName?: string): Promise<BrandRow> => {
    const payload = buildApprovePayload(newName)
    const { data, error } = await supabase
      .from('brands')
      .update(payload)
      .eq('id', brand.id)
      .select()
      .single()

    if (error) throw error

    if (payload.name && payload.name !== brand.name) {
      await supabase.from('real_products').update({ brand: payload.name }).eq('brand_id', brand.id)
    }

    await logAction(
      'APPROVE_PENDING_BRAND',
      `Marca pendente aprovada: "${payload.name || brand.name}"`,
      user.value?.id,
    )

    return data as BrandRow
  }

  /**
   * Unificação/Mesclagem de marca pendente em uma marca oficial já existente.
   */
  const mergePendingBrand = async (
    pendingBrand: BrandRow,
    targetBrandId: string,
  ): Promise<void> => {
    // 1. Obter marca de destino
    const { data: targetBrand, error: targetError } = await supabase
      .from('brands')
      .select('id, name')
      .eq('id', targetBrandId)
      .single()

    if (targetError || !targetBrand) {
      throw new Error('Marca de destino não encontrada para mesclagem.')
    }

    // 2. Apontar produtos reais vinculados à marca pendente para a marca de destino
    const { error: updateProductsError } = await supabase
      .from('real_products')
      .update({
        brand_id: targetBrand.id,
        brand: targetBrand.name,
      })
      .eq('brand_id', pendingBrand.id)

    if (updateProductsError) throw updateProductsError

    // 3. Excluir a marca pendente
    const { error: deleteError } = await supabase.from('brands').delete().eq('id', pendingBrand.id)

    if (deleteError) throw deleteError

    await logAction(
      'MERGE_PENDING_BRAND',
      `Marca pendente "${pendingBrand.name}" mesclada na marca oficial "${targetBrand.name}"`,
      user.value?.id,
    )
  }

  /**
   * Busca uma marca específica pelo seu identificador primário.
   */
  const fetchBrandById = async (id: string): Promise<BrandRow | null> => {
    const { data, error } = await supabase.from('brands').select('*').eq('id', id).maybeSingle()

    if (error) throw error
    return data as BrandRow | null
  }

  /**
   * Busca todos os produtos reais vinculados à marca informada,
   * incluindo os dados do produto técnico do catálogo associado.
   */
  const fetchBrandProducts = async (
    brandId: string,
    brandName?: string,
  ): Promise<BrandProductItem[]> => {
    let query = supabase.from('real_products').select(
      `
        id,
        name,
        brand,
        brand_id,
        link,
        created_at,
        product:products (
          id,
          name,
          cat_mat,
          cat_bec,
          is_active,
          expense_natures (id, name),
          product_classes (id, name)
        )
      `,
    )

    if (brandName && brandName.trim()) {
      query = query.or(`brand_id.eq.${brandId},brand.ilike.${brandName.trim()}`)
    } else {
      query = query.eq('brand_id', brandId)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw error
    return (data || []) as unknown as BrandProductItem[]
  }

  return {
    fetchBrands,
    fetchPendingBrands,
    fetchAllActiveBrands,
    fetchBrandById,
    fetchBrandProducts,
    ensureBrand,
    createBrand,
    updateBrand,
    toggleBrandStatus,
    deleteBrand,
    approvePendingBrand,
    mergePendingBrand,
  }
}
