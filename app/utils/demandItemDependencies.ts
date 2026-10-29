import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'
import { PENDING_ITEM_FLAGS } from '~/utils/pendingCatalog'

export interface DemandItemDependenciesContext {
  supabase: SupabaseClient<Database>
  userId?: string
  logAction: (action: string, details?: string, userId?: string) => Promise<void>
}

export interface AddDemandItemWithDependenciesParams {
  demandId: string
  isNewProductMode: boolean
  newProductName?: string | null
  newProductExpenseNatureId?: string | null
  isSuggestingNature?: boolean
  suggestedNatureId?: string
  suggestedNatureName?: string
  newProductClassId?: string | null
  isSuggestingClass?: boolean
  suggestedClassId?: string
  suggestedClassName?: string
  newProductCatMat?: number | null
  newProductCatBec?: number | null
  selectedProductId?: string | null
  finalUnitId: string
  selectedAliasId?: string | null
  isSuggestingAlias?: boolean
  suggestedAliasCode?: number | null
  suggestedAliasName?: string | null
  itemQuantity: number
  itemReferencePrice: number
}

/**
 * Maps a PostgreSQL unique constraint violation (`23505`) on `products` into
 * a user-friendly error message for CATMAT, CATBEC, or generic identifier.
 */
export function mapProductDuplicateError(prodError: {
  code?: string
  message?: string
  details?: string | null
}): unknown {
  if (prodError.code === '23505') {
    const detail = `${prodError.message || ''} ${prodError.details || ''}`
    if (detail.includes('cat_mat')) {
      return new Error('Já existe um produto cadastrado com este código CATMAT.')
    }
    if (detail.includes('cat_bec')) {
      return new Error('Já existe um produto cadastrado com este código CATBEC.')
    }
    return new Error('Já existe um produto cadastrado com este código identificador.')
  }
  return prodError
}

/**
 * Resolves or registers a pending expense nature when creating a product from a demand.
 */
export async function resolveDemandExpenseNature(
  ctx: DemandItemDependenciesContext,
  params: Pick<
    AddDemandItemWithDependenciesParams,
    'newProductExpenseNatureId' | 'isSuggestingNature' | 'suggestedNatureId' | 'suggestedNatureName'
  >,
): Promise<string | null | undefined> {
  if (!params.isSuggestingNature) {
    return params.newProductExpenseNatureId
  }

  if (!params.suggestedNatureId || !params.suggestedNatureName) {
    throw new Error('Código e Nome da nova natureza são obrigatórios.')
  }

  const { data: existing } = await ctx.supabase
    .from('expense_natures')
    .select('id')
    .eq('id', params.suggestedNatureId)
    .maybeSingle()

  if (!existing) {
    const { error: insErr } = await ctx.supabase.from('expense_natures').insert({
      id: params.suggestedNatureId,
      name: params.suggestedNatureName,
      ...PENDING_ITEM_FLAGS,
    })
    if (insErr) throw insErr
    await ctx.logAction(
      'CREATE_PENDING_EXPENSE_NATURE',
      `Sugerida via Demanda: ${params.suggestedNatureName}`,
      ctx.userId,
    )
  }

  return params.suggestedNatureId
}

/**
 * Resolves or registers a pending product class when creating a product from a demand.
 */
export async function resolveDemandProductClass(
  ctx: DemandItemDependenciesContext,
  params: Pick<
    AddDemandItemWithDependenciesParams,
    'newProductClassId' | 'isSuggestingClass' | 'suggestedClassId' | 'suggestedClassName'
  >,
): Promise<string | null> {
  if (!params.isSuggestingClass) {
    return params.newProductClassId || null
  }

  if (!params.suggestedClassId || !params.suggestedClassName) {
    throw new Error('Código e Nome da nova classe são obrigatórios.')
  }

  const { data: existingClass } = await ctx.supabase
    .from('product_classes')
    .select('id')
    .eq('id', params.suggestedClassId)
    .maybeSingle()

  if (!existingClass) {
    const { error: insClassErr } = await ctx.supabase.from('product_classes').insert({
      id: params.suggestedClassId,
      name: params.suggestedClassName,
      ...PENDING_ITEM_FLAGS,
    })
    if (insClassErr) throw insClassErr
    await ctx.logAction(
      'CREATE_PENDING_PRODUCT_CLASS',
      `Sugerida via Demanda: ${params.suggestedClassName}`,
      ctx.userId,
    )
  }

  return params.suggestedClassId
}

/**
 * Creates a new product for a demand item after resolving its expense nature and product class.
 */
export async function createProductForDemand(
  ctx: DemandItemDependenciesContext,
  params: AddDemandItemWithDependenciesParams,
): Promise<string> {
  const expenseNatureId = await resolveDemandExpenseNature(ctx, params)
  const productClassId = await resolveDemandProductClass(ctx, params)

  if (!params.newProductName || !expenseNatureId) {
    throw new Error('Nome e Natureza de Despesa são obrigatórios para novo produto.')
  }

  const { data: newProd, error: prodError } = await ctx.supabase
    .from('products')
    .insert({
      name: params.newProductName,
      expense_nature_id: expenseNatureId,
      product_class_id: productClassId,
      cat_mat: params.newProductCatMat || null,
      cat_bec: params.newProductCatBec || null,
    })
    .select()
    .single()

  if (prodError) {
    throw mapProductDuplicateError(prodError)
  }

  await ctx.logAction(
    'CREATE_PRODUCT',
    `Novo produto criado via demanda: ${newProd.name}`,
    ctx.userId,
  )
  return newProd.id
}

/**
 * Ensures a link exists in `measurement_unit_alias_links` between `unitId` and `aliasId`.
 */
export async function ensureUnitAliasLink(
  supabase: SupabaseClient<Database>,
  unitId: string,
  aliasId: string,
): Promise<void> {
  const { data: existingLink } = await supabase
    .from('measurement_unit_alias_links')
    .select('id')
    .eq('unit_id', unitId)
    .eq('alias_id', aliasId)
    .maybeSingle()

  if (!existingLink) {
    const { error: linkErr } = await supabase.from('measurement_unit_alias_links').insert({
      unit_id: unitId,
      alias_id: aliasId,
    })
    if (linkErr && linkErr.code !== '23505') throw linkErr
  }
}

/**
 * Resolves an existing or newly suggested measurement unit alias and links it to `finalUnitId`.
 */
export async function resolveDemandUnitAlias(
  ctx: DemandItemDependenciesContext,
  params: Pick<
    AddDemandItemWithDependenciesParams,
    | 'finalUnitId'
    | 'selectedAliasId'
    | 'isSuggestingAlias'
    | 'suggestedAliasCode'
    | 'suggestedAliasName'
  >,
): Promise<string | null> {
  const finalUnitId = params.finalUnitId
  let finalAliasId: string | null = null

  if (params.isSuggestingAlias) {
    if (!params.suggestedAliasCode || !params.suggestedAliasName?.trim()) {
      throw new Error('Código e Nome do registro alternativo (alias) são obrigatórios.')
    }

    const { data: existingAlias } = await ctx.supabase
      .from('measurement_unit_aliases')
      .select('id, name')
      .eq('code', params.suggestedAliasCode)
      .maybeSingle()

    if (existingAlias) {
      finalAliasId = existingAlias.id
    } else {
      const { data: newAlias, error: aliasErr } = await ctx.supabase
        .from('measurement_unit_aliases')
        .insert({
          code: params.suggestedAliasCode,
          name: params.suggestedAliasName.trim(),
          is_pending: true,
        })
        .select('id')
        .single()

      if (aliasErr) throw aliasErr
      finalAliasId = newAlias.id
      await ctx.logAction(
        'CREATE_PENDING_ALIAS',
        `Registro alternativo sugerido via Demanda: ${params.suggestedAliasName} (${params.suggestedAliasCode})`,
        ctx.userId,
      )
    }

    if (finalAliasId && finalUnitId) {
      await ensureUnitAliasLink(ctx.supabase, finalUnitId, finalAliasId)
    }
  } else if (params.selectedAliasId) {
    finalAliasId = params.selectedAliasId

    if (finalAliasId && finalUnitId) {
      await ensureUnitAliasLink(ctx.supabase, finalUnitId, finalAliasId)
    }
  }

  return finalAliasId
}

/**
 * Links both the default `'Unidade'` measurement unit (if registered) and `finalUnitId` to `productId`.
 */
export async function ensureProductDefaultAndFinalUnits(
  supabase: SupabaseClient<Database>,
  productId: string,
  finalUnitId: string,
): Promise<void> {
  const { data: defaultUnit } = await supabase
    .from('measurement_units')
    .select('id')
    .ilike('name', 'unidade')
    .maybeSingle()

  if (defaultUnit) {
    const { data: existingDefaultLink } = await supabase
      .from('product_units')
      .select('id')
      .eq('product_id', productId)
      .eq('unit_id', defaultUnit.id)
      .maybeSingle()

    if (!existingDefaultLink) {
      const { error: defLinkErr } = await supabase
        .from('product_units')
        .insert({ product_id: productId, unit_id: defaultUnit.id })
      if (defLinkErr && defLinkErr.code !== '23505') throw defLinkErr
    }
  }

  if (finalUnitId && (!defaultUnit || finalUnitId !== defaultUnit.id)) {
    const { data: existingLink } = await supabase
      .from('product_units')
      .select('id')
      .eq('product_id', productId)
      .eq('unit_id', finalUnitId)
      .maybeSingle()

    if (!existingLink) {
      const { error: linkError } = await supabase
        .from('product_units')
        .insert({ product_id: productId, unit_id: finalUnitId })
      if (linkError && linkError.code !== '23505') throw linkError
    }
  }
}

/**
 * Inserts a new `demand_products` row or increments `quantity` if the product already exists in the demand.
 */
export async function upsertDemandProductItem(
  ctx: DemandItemDependenciesContext,
  params: {
    demandId: string
    productId: string
    unitId: string
    aliasId: string | null
    quantity: number
    referencePrice: number
  },
): Promise<void> {
  const { data: existingItems } = await ctx.supabase
    .from('demand_products')
    .select('id, quantity')
    .eq('demand_id', params.demandId)
    .eq('product_id', params.productId)

  const alreadyExists = existingItems?.length ? existingItems[0] : null

  if (alreadyExists) {
    const { error } = await ctx.supabase
      .from('demand_products')
      .update({ quantity: Number(alreadyExists.quantity) + Number(params.quantity) })
      .eq('id', alreadyExists.id)
    if (error) throw error
  } else {
    const { data: lastItem } = await ctx.supabase
      .from('demand_products')
      .select('sort_order')
      .eq('demand_id', params.demandId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle()

    const nextSortOrder = (lastItem?.sort_order ?? 0) + 1

    const { error } = await ctx.supabase.from('demand_products').insert({
      demand_id: params.demandId,
      product_id: params.productId,
      unit_id: params.unitId,
      alias_id: params.aliasId,
      quantity: params.quantity,
      reference_price: params.referencePrice,
      sort_order: nextSortOrder,
    })
    if (error) throw error
    await ctx.logAction(
      'ADD_DEMAND_PRODUCT',
      `Produto adicionado à demanda ${params.demandId}`,
      ctx.userId,
    )
  }
}
