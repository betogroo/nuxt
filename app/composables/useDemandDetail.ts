import type { Database } from '~/types/database.types'
import type { DemandProductRow } from '~/composables/useDemandProducts'
import { useToast } from '~/composables/useToast'
import { getWinningBid, getItemSubtotal } from '~/utils/bids'

export interface SupplierCommitmentGroup {
  commitmentNumber: string
  itemsCount: number
  totalAmount: number
  itemNames: string[]
}

export interface WinningSupplierSummaryItem {
  id: string
  company_name: string
  cnpj: string
  email?: string | null
  participatedCount: number
  wonCount: number
  totalAmountWon: number
  commitments: SupplierCommitmentGroup[]
  pendingCommitmentsCount: number
  pendingCommitmentsAmount: number
  allPendingCommitments: boolean
  hasPendingCommitments: boolean
  [key: string]: unknown
}

export function useDemandDetail(demandId: string) {
  const toast = useToast()

  const {
    fetchDemandById,
    fetchDemandResponsibles,
    addResponsible: addResponsibleDb,
    removeResponsible: removeResponsibleDb,
    updateDemand: updateDemandDb,
  } = useDemands()
  const { fetchDemandProducts, removeDemandProduct, reorderDemandItems } = useDemandProducts()

  // 1. Demand Core
  const { data: demand, refresh: refreshDemand } = useAsyncData(`demand-${demandId}`, async () => {
    return await fetchDemandById(demandId)
  })

  const isPlanningIncomplete = computed(() => {
    if (demand.value?.status !== 'planning') return false
    const {
      process_number,
      internal_process_number,
      id_pca,
      type,
      contract_number,
      siafem_number,
    } = demand.value
    return (
      !process_number ||
      !internal_process_number ||
      !id_pca ||
      !type ||
      !contract_number ||
      !siafem_number
    )
  })

  const updateDemand = async (
    demandIdOrPayload: string | Database['public']['Tables']['demands']['Update'],
    maybePayload?: Database['public']['Tables']['demands']['Update'],
  ) => {
    const payload =
      typeof demandIdOrPayload === 'string'
        ? (maybePayload as Database['public']['Tables']['demands']['Update'])
        : demandIdOrPayload
    const targetId = typeof demandIdOrPayload === 'string' ? demandIdOrPayload : demandId
    await updateDemandDb(targetId, payload)
    await refreshDemand()
  }

  // 2. Responsibles
  const { data: responsibles, refresh: refreshResponsibles } = useAsyncData(
    `demand-responsibles-${demandId}`,
    async () => {
      return await fetchDemandResponsibles(demandId)
    },
  )

  const isAddingResponsible = ref(false)
  const addResponsible = async (userId: string) => {
    if (!userId) {
      toast.warning('Selecione um usuário.')
      return false
    }
    isAddingResponsible.value = true
    try {
      await addResponsibleDb(demandId, userId)
      await refreshResponsibles()
      return true
    } catch (err: unknown) {
      toast.error((err as Error).message)
      return false
    } finally {
      isAddingResponsible.value = false
    }
  }

  const removeResponsible = async (userId: string) => {
    if (!(await toast.confirm('Deseja realmente remover este responsável?'))) return false
    try {
      await removeResponsibleDb(demandId, userId)
      await refreshResponsibles()
      return true
    } catch (err: unknown) {
      toast.error(`Erro ao remover: ${(err as Error).message}`)
      return false
    }
  }

  // 3. Items / Products
  const {
    data: items,
    pending: itemsPending,
    refresh: refreshItems,
  } = useAsyncData(`demand-items-${demandId}`, async () => {
    return await fetchDemandProducts(demandId)
  })

  const isReordering = ref(false)

  const saveNewOrder = async (newItems: DemandProductRow[]) => {
    isReordering.value = true
    try {
      const updates = newItems.map((item, idx) => ({
        id: item.id,
        sort_order: idx + 1,
      }))
      if (items.value) items.value = newItems
      await reorderDemandItems(updates)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
      await refreshItems()
    } finally {
      isReordering.value = false
    }
  }

  const moveItemUp = async (index: number) => {
    if (!items.value || index <= 0) return
    const newItems = [...items.value]
    const temp = newItems[index]
    newItems[index] = newItems[index - 1]
    newItems[index - 1] = temp
    await saveNewOrder(newItems)
  }

  const moveItemDown = async (index: number) => {
    if (!items.value || index >= items.value.length - 1) return
    const newItems = [...items.value]
    const temp = newItems[index]
    newItems[index] = newItems[index + 1]
    newItems[index + 1] = temp
    await saveNewOrder(newItems)
  }

  const removeItem = async (itemId: string, productName: string) => {
    if (!(await toast.confirm(`Deseja realmente remover '${productName}' da demanda?`)))
      return false
    try {
      await removeDemandProduct(itemId, demandId)
      await refreshItems()
      return true
    } catch (err: unknown) {
      toast.error(`Erro ao remover item: ${(err as Error).message}`)
      return false
    }
  }

  // 4. Winning Suppliers Summary
  const winningSuppliersSummary = computed<WinningSupplierSummaryItem[]>(() => {
    if (!items.value) return []

    const supplierStats = new Map<
      string,
      {
        supplier: Record<string, unknown>
        participated: Set<string>
        won: Set<string>
        totalAmountWon: number
        commitmentsMap: Map<
          string,
          { itemsCount: number; totalAmount: number; itemNames: string[] }
        >
        pendingCommitmentsCount: number
        pendingCommitmentsAmount: number
      }
    >()

    items.value.forEach((product) => {
      const bids = product.demand_product_bids || []
      bids.forEach((bid) => {
        if (bid.suppliers) {
          const suppId = bid.supplier_id
          if (!supplierStats.has(suppId)) {
            supplierStats.set(suppId, {
              supplier: bid.suppliers as unknown as Record<string, unknown>,
              participated: new Set(),
              won: new Set(),
              totalAmountWon: 0,
              commitmentsMap: new Map(),
              pendingCommitmentsCount: 0,
              pendingCommitmentsAmount: 0,
            })
          }
          supplierStats.get(suppId)!.participated.add(product.id)
        }
      })

      const winningBid = getWinningBid(bids)
      if (winningBid && winningBid.suppliers) {
        const stats = supplierStats.get(winningBid.supplier_id)
        if (stats) {
          stats.won.add(product.id)
          const subtotal = getItemSubtotal(winningBid.amount, product.quantity)
          stats.totalAmountWon += subtotal

          const trimmedCommitment = product.commitment_number?.trim() || null
          const itemName = product.product_name_snapshot || product.product?.name || 'Item'

          if (trimmedCommitment) {
            const existing = stats.commitmentsMap.get(trimmedCommitment)
            if (existing) {
              existing.itemsCount += 1
              existing.totalAmount = Number((existing.totalAmount + subtotal).toFixed(2))
              existing.itemNames.push(itemName)
            } else {
              stats.commitmentsMap.set(trimmedCommitment, {
                itemsCount: 1,
                totalAmount: subtotal,
                itemNames: [itemName],
              })
            }
          } else {
            stats.pendingCommitmentsCount += 1
            stats.pendingCommitmentsAmount = Number(
              (stats.pendingCommitmentsAmount + subtotal).toFixed(2),
            )
          }
        }
      }
    })

    const winners: WinningSupplierSummaryItem[] = Array.from(supplierStats.values())
      .filter((s) => s.won.size > 0)
      .map((s) => {
        const commitments: SupplierCommitmentGroup[] = Array.from(s.commitmentsMap.entries())
          .map(([commitmentNumber, group]) => ({
            commitmentNumber,
            itemsCount: group.itemsCount,
            totalAmount: group.totalAmount,
            itemNames: group.itemNames,
          }))
          .sort((a, b) => a.commitmentNumber.localeCompare(b.commitmentNumber))

        const wonCount = s.won.size
        const pendingCommitmentsCount = s.pendingCommitmentsCount
        const pendingCommitmentsAmount = s.pendingCommitmentsAmount
        const hasCommitments = commitments.length > 0
        const hasPendingCommitments = pendingCommitmentsCount > 0
        const allPendingCommitments = hasPendingCommitments && !hasCommitments

        return {
          ...s.supplier,
          id: String(s.supplier.id || ''),
          company_name: String(s.supplier.company_name || ''),
          cnpj: String(s.supplier.cnpj || ''),
          email: (s.supplier.email as string | null) || null,
          participatedCount: s.participated.size,
          wonCount,
          totalAmountWon: Number(s.totalAmountWon.toFixed(2)),
          commitments,
          pendingCommitmentsCount,
          pendingCommitmentsAmount,
          allPendingCommitments,
          hasPendingCommitments,
        }
      })

    return winners.sort((a, b) => b.wonCount - a.wonCount)
  })

  return {
    demand,
    refreshDemand,
    updateDemand,
    isPlanningIncomplete,

    responsibles,
    refreshResponsibles,
    isAddingResponsible,
    addResponsible,
    removeResponsible,

    items,
    itemsPending,
    refreshItems,
    isReordering,
    moveItemUp,
    moveItemDown,
    removeItem,

    winningSuppliersSummary,
  }
}
