import { ref } from 'vue'
import type { Database } from '~/types/database.types'
import type { DemandRow, DemandProductRow } from '~/composables/useDemands'

export function useDemandWorkflow(demandId: string, demand: Ref<DemandRow | null>, items: Ref<DemandProductRow[] | null>) {
  const { advanceDemandStatus, revertDemandStatus, requestDemandReturn, fetchDemandById } = useDemands()

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

      if (targetStatus.value === 'quotation') {
        if (!items.value || items.value.length === 0) {
          throw new Error('Você precisa adicionar pelo menos um produto antes de iniciar a cotação.')
        }
      }

      if (targetStatus.value === 'bidding_notice') {
        const invalidItems = items.value?.filter(
          (i) =>
            !i.quantity ||
            !i.unit_id ||
            i.reference_price === null ||
            i.reference_price === undefined,
        )
        if (invalidItems && invalidItems.length > 0) {
          throw new Error('Todos os produtos devem ter quantidade, unidade de medida e valor referencial preenchidos antes de avançar.')
        }
        if (!advanceModal.payload.value.bidding_notice_number)
          throw new Error('O número do aviso é obrigatório.')
        payload.bidding_notice_number = advanceModal.payload.value.bidding_notice_number
      } else if (targetStatus.value === 'dispute') {
        if (!advanceModal.payload.value.dispute_number) throw new Error('O número da disputa é obrigatório.')
        if (!advanceModal.payload.value.dispute_date) throw new Error('A data da disputa é obrigatória.')

        let offerOpening = null
        if (advanceModal.payload.value.offer_opening_date || advanceModal.payload.value.offer_opening_time) {
          if (!advanceModal.payload.value.offer_opening_date || !advanceModal.payload.value.offer_opening_time) {
            throw new Error('Para a abertura de ofertas, informe tanto a data quanto a hora.')
          }
          offerOpening = new Date(
            `${advanceModal.payload.value.offer_opening_date}T${advanceModal.payload.value.offer_opening_time}`,
          ).toISOString()
        }

        payload.dispute_number = advanceModal.payload.value.dispute_number
        payload.dispute_date = advanceModal.payload.value.dispute_date
        payload.offer_opening_date = offerOpening
      } else if (targetStatus.value === 'homologation') {
        if (!advanceModal.payload.value.contract_number) throw new Error('O número da contratação é obrigatório.')
        payload.contract_number = advanceModal.payload.value.contract_number
      }

      await advanceDemandStatus(demandId, targetStatus.value as Database['public']['Enums']['demand_status'], payload)

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
    confirmAdvanceStatus
  }
}
