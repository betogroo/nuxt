import { ref } from 'vue'
import type { Database } from '~/types/database.types'
import type { DemandRow } from '~/composables/useDemands'
import type { DemandProductRow } from '~/composables/useDemandProducts'

export function useDemandWorkflow(
  demandId: string,
  demand: Ref<DemandRow | null | undefined>,
  items: Ref<DemandProductRow[] | null | undefined>,
) {
  const { advanceDemandStatus, revertDemandStatus, requestDemandReturn, fetchDemandById } =
    useDemands()

  const statusList: Database['public']['Enums']['demand_status'][] = [
    'planning',
    'quotation',
    'bidding_notice',
    'dispute',
    'homologation',
    'completed',
  ]

  const getNextStatus = (current: string) => {
    const idx = statusList.indexOf(current as Database['public']['Enums']['demand_status'])
    if (idx >= 0 && idx < statusList.length - 1) {
      return statusList[idx + 1]
    }
    return null
  }

  const getPreviousStatus = (current: string) => {
    const idx = statusList.indexOf(current as Database['public']['Enums']['demand_status'])
    if (idx > 0) {
      return statusList[idx - 1]
    }
    return null
  }

  // Reload demand state after operations
  const reloadDemand = async () => {
    const reloaded = await fetchDemandById(demandId)
    if (reloaded) demand.value = reloaded
  }

  // --- REVERT MODAL ---
  const revertModal = useModal()

  const openRevertModal = () => {
    if (!demand.value) return
    const prev = getPreviousStatus(demand.value.status)
    if (!prev) return
    revertModal.open()
  }

  const confirmRevertStatus = async () => {
    if (!demand.value) return
    const prev = getPreviousStatus(demand.value.status)
    if (!prev) return

    revertModal.startSaving()

    try {
      await revertDemandStatus(demandId, prev as Database['public']['Enums']['demand_status'])
      revertModal.close()
      await reloadDemand()
    } catch (err: unknown) {
      revertModal.error.value = err instanceof Error ? err.message : String(err)
    } finally {
      revertModal.stopSaving()
    }
  }

  // --- RETURN REQUEST ---
  const isReturnRequesting = ref(false)
  const requestReturn = async () => {
    if (!demand.value) return
    isReturnRequesting.value = true

    try {
      await requestDemandReturn(demandId)
      await reloadDemand()
    } catch (err: unknown) {
      console.error(err)
    } finally {
      isReturnRequesting.value = false
    }
  }

  // --- ADVANCE MODAL ---
  const advanceModal = useModal({
    bidding_notice_number: '',
    dispute_number: '',
    dispute_date: '',
    offer_opening_date: '',
    offer_opening_time: '',
    contract_number: '',
  })
  const targetStatus = ref<Database['public']['Enums']['demand_status'] | ''>('')

  const openAdvanceModal = () => {
    if (!demand.value) return
    const next = getNextStatus(demand.value.status)
    if (!next) return
    targetStatus.value = next as Database['public']['Enums']['demand_status']
    advanceModal.open()
  }

  const confirmAdvanceStatus = async () => {
    advanceModal.startSaving()

    try {
      const payload: Partial<Database['public']['Tables']['demands']['Update']> = {}

      if (targetStatus.value === 'bidding_notice') {
        if (!items.value || items.value.length === 0) {
          throw new Error(
            'Você precisa adicionar pelo menos um produto antes de avançar para o aviso de contratação.',
          )
        }

        const invalidItems = items.value?.filter(
          (i) =>
            !i.quantity ||
            !i.unit_id ||
            i.reference_price === null ||
            i.reference_price === undefined,
        )
        if (invalidItems && invalidItems.length > 0) {
          throw new Error(
            'Todos os produtos devem ter quantidade, unidade de medida e valor referencial preenchidos antes de avançar.',
          )
        }
      } else if (targetStatus.value === 'dispute') {
        if (!advanceModal.payload.value.bidding_notice_number)
          throw new Error('O número do aviso de contratação é obrigatório.')
        if (!advanceModal.payload.value.dispute_number)
          throw new Error('O número da disputa é obrigatório.')
        if (!advanceModal.payload.value.dispute_date)
          throw new Error('A data da disputa é obrigatória.')

        let offerOpening = null
        if (
          !advanceModal.payload.value.offer_opening_date ||
          !advanceModal.payload.value.offer_opening_time
        ) {
          throw new Error('A data e hora de abertura de ofertas são obrigatórias.')
        } else {
          offerOpening = new Date(
            `${advanceModal.payload.value.offer_opening_date}T${advanceModal.payload.value.offer_opening_time}`,
          ).toISOString()
        }

        payload.bidding_notice_number = advanceModal.payload.value.bidding_notice_number
        payload.dispute_number = advanceModal.payload.value.dispute_number
        payload.dispute_date = advanceModal.payload.value.dispute_date
        payload.offer_opening_date = offerOpening
      } else if (targetStatus.value === 'homologation') {
        const supabase = useSupabaseClient()
        const { data: bids } = await supabase
          .from('product_bids')
          .select('id, amount, product_id, is_winner')
          .in('product_id', items.value?.map((i) => i.id) || [])

        if (items.value) {
          for (const item of items.value) {
            const itemBids = bids?.filter((b) => b.product_id === item.id) || []
            const hasWinner = itemBids.some((b) => b.is_winner)
            const isFailed =
              itemBids.length === 0 ||
              !itemBids.some((b) => b.amount <= (item.reference_price || 0))

            if (!hasWinner && !isFailed) {
              throw new Error(
                `O produto "${item.products?.name || 'Sem nome'}" não possui um vencedor válido e nem foi declarado fracassado. Todos os produtos devem ser resolvidos para avançar para a Documentação.`,
              )
            }
          }
        }

        if (!advanceModal.payload.value.contract_number)
          throw new Error('O número da contratação (Contrato/Ata) é obrigatório.')
        payload.contract_number = advanceModal.payload.value.contract_number
      }

      await advanceDemandStatus(
        demandId,
        targetStatus.value as Database['public']['Enums']['demand_status'],
        payload,
      )

      advanceModal.close()
      await reloadDemand()
    } catch (err: unknown) {
      advanceModal.error.value = err instanceof Error ? err.message : String(err)
    } finally {
      advanceModal.stopSaving()
    }
  }

  return {
    statusList,
    getNextStatus,
    getPreviousStatus,

    revertModal,
    openRevertModal,
    confirmRevertStatus,

    isReturnRequesting,
    requestReturn,

    advanceModal,
    targetStatus,
    openAdvanceModal,
    confirmAdvanceStatus,
  }
}
