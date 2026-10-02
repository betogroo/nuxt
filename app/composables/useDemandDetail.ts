/* eslint-disable @typescript-eslint/no-explicit-any */
import { useToast } from '~/composables/useToast'

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
    const { process_number, internal_process_number, id_pca, type, contract_number } = demand.value
    return !process_number || !internal_process_number || !id_pca || !type || !contract_number
  })

  const updateDemand = async (payload: any) => {
    await updateDemandDb(demandId, payload)
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

  const saveNewOrder = async (newItems: unknown[]) => {
    isReordering.value = true
    try {
      const updates = newItems.map((item: Record<string, unknown>, idx) => ({
        id: item.id as string,
        sort_order: idx + 1,
      }))
      if (items.value) items.value = newItems as any
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
  const winningSuppliersSummary = computed(() => {
    if (!items.value) return []

    const supplierStats = new Map<
      string,
      {
        supplier: Record<string, unknown>
        participated: Set<string>
        won: Set<string>
        totalAmountWon: number
      }
    >()

    items.value.forEach((product) => {
      const bids = (product as any).demand_product_bids || []
      if (bids.length === 0) return

      let minAmount = Infinity
      let winningBid: Record<string, unknown> | null = null

      bids.forEach((bid: any) => {
        if (bid.amount < minAmount) {
          minAmount = bid.amount
          winningBid = bid
        }

        if (bid.suppliers) {
          const suppId = bid.supplier_id
          if (!supplierStats.has(suppId)) {
            supplierStats.set(suppId, {
              supplier: bid.suppliers,
              participated: new Set(),
              won: new Set(),
              totalAmountWon: 0,
            })
          }
          supplierStats.get(suppId)!.participated.add((product as any).id)
        }
      })

      if (winningBid && (winningBid as any).suppliers) {
        const stats = supplierStats.get((winningBid as any).supplier_id)!
        stats.won.add((product as any).id)
        stats.totalAmountWon += minAmount * ((product as any).quantity || 1)
      }
    })

    const winners = Array.from(supplierStats.values())
      .filter((s) => s.won.size > 0)
      .map((s) => ({
        ...s.supplier,
        participatedCount: s.participated.size,
        wonCount: s.won.size,
        totalAmountWon: s.totalAmountWon,
      }))

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
