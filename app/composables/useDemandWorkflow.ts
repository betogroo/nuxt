import { ref } from 'vue'
import type { Database } from '~/types/database.types'
import type { DemandRow } from '~/composables/useDemands'
import type { DemandProductRow } from '~/composables/useDemandProducts'
import { splitDateTime, combineDateTime, validateOfferOpeningRules } from '~/utils/formatters'
import { getItemDisputeResult } from '~/utils/bids'

export function useDemandWorkflow(
  demandId: string,
  demand: Ref<DemandRow | null | undefined>,
  items: Ref<DemandProductRow[] | null | undefined>,
  refreshItems?: () => Promise<unknown>,
) {
  const { advanceDemandStatus, revertDemandStatus, requestDemandReturn, fetchDemandById } =
    useDemands()
  const supabase = useSupabaseClient<Database>()
  const user = useSupabaseUser()

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
      if (refreshItems) {
        await refreshItems()
      }
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

  const openAdvanceModal = async () => {
    if (!demand.value) return
    const next = getNextStatus(demand.value.status)
    if (!next) return
    targetStatus.value = next as Database['public']['Enums']['demand_status']

    if (targetStatus.value === 'homologation' && refreshItems) {
      await refreshItems()
    }

    const { date: offerDate, time: offerTime } = splitDateTime(demand.value.offer_opening_date)
    advanceModal.open({
      bidding_notice_number: demand.value.bidding_notice_number || '',
      dispute_number: demand.value.dispute_number || '',
      dispute_date: demand.value.dispute_date
        ? String(demand.value.dispute_date).split('T')[0]
        : '',
      offer_opening_date: offerDate,
      offer_opening_time: offerTime,
      contract_number: demand.value.contract_number ? String(demand.value.contract_number) : '',
    })
  }

  const confirmAdvanceStatus = async () => {
    advanceModal.startSaving()

    try {
      const payload: Partial<Database['public']['Tables']['demands']['Update']> = {}

      if (targetStatus.value === 'quotation') {
        if (
          !demand.value?.process_number ||
          !demand.value?.internal_process_number ||
          !demand.value?.id_pca ||
          !demand.value?.type ||
          !demand.value?.contract_number ||
          !demand.value?.siafem_number
        ) {
          throw new Error(
            'Preencha todos os dados do planejamento (Processo Oficial, Processo Interno, ID PCA, Tipo, Nº Contratação e Nº SIAFEM) antes de avançar para a cotação.',
          )
        }
      } else if (targetStatus.value === 'bidding_notice') {
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

        // Bidding notice and dispute fields are optional when advancing to bidding_notice
        if (advanceModal.payload.value.bidding_notice_number?.trim()) {
          payload.bidding_notice_number = advanceModal.payload.value.bidding_notice_number.trim()
        }
        if (advanceModal.payload.value.dispute_number?.trim()) {
          payload.dispute_number = advanceModal.payload.value.dispute_number.trim()
        }
        if (advanceModal.payload.value.dispute_date) {
          payload.dispute_date = advanceModal.payload.value.dispute_date
        }
        if (
          advanceModal.payload.value.offer_opening_date ||
          advanceModal.payload.value.offer_opening_time
        ) {
          const offerDate = advanceModal.payload.value.offer_opening_date?.trim()
          const offerTime = advanceModal.payload.value.offer_opening_time?.trim()
          if (!offerDate || !offerTime) {
            throw new Error('Informe tanto a data quanto a hora de abertura de ofertas.')
          }
          const dateError = validateOfferOpeningRules(
            offerDate,
            offerTime,
            advanceModal.payload.value.dispute_date,
            undefined,
            Boolean(demand.value?.is_historical),
          )
          if (dateError) {
            throw new Error(dateError)
          }
          payload.offer_opening_date = combineDateTime(offerDate, offerTime)
        }
      } else if (targetStatus.value === 'dispute') {
        const biddingNoticeNumber =
          advanceModal.payload.value.bidding_notice_number?.trim() ||
          demand.value?.bidding_notice_number?.trim() ||
          null
        const disputeNumber =
          advanceModal.payload.value.dispute_number?.trim() ||
          demand.value?.dispute_number?.trim() ||
          null
        const disputeDate =
          advanceModal.payload.value.dispute_date || demand.value?.dispute_date || null

        const offerDate = advanceModal.payload.value.offer_opening_date?.trim()
        const offerTime = advanceModal.payload.value.offer_opening_time?.trim()

        if (!biddingNoticeNumber) {
          throw new Error(
            'O número do aviso de contratação é obrigatório para avançar para a disputa.',
          )
        }
        if (!disputeNumber) {
          throw new Error('O número da disputa é obrigatório para avançar para a disputa.')
        }
        if (!disputeDate) {
          throw new Error('A data da disputa é obrigatória para avançar para a disputa.')
        }
        if (!offerDate || !offerTime) {
          throw new Error(
            'A data e hora de abertura de ofertas são obrigatórias para avançar para a disputa.',
          )
        }

        const dateError = validateOfferOpeningRules(
          offerDate,
          offerTime,
          disputeDate,
          undefined,
          Boolean(demand.value?.is_historical),
        )
        if (dateError) {
          throw new Error(dateError)
        }

        const offerOpening = combineDateTime(offerDate, offerTime)

        payload.bidding_notice_number = biddingNoticeNumber
        payload.dispute_number = disputeNumber
        payload.dispute_date = disputeDate
        payload.offer_opening_date = offerOpening
      } else if (targetStatus.value === 'homologation') {
        if (refreshItems) {
          await refreshItems()
        }
        if (!items.value || items.value.length === 0) {
          throw new Error('Não é possível finalizar a disputa de uma demanda sem itens.')
        }
        if (advanceModal.payload.value.contract_number) {
          payload.contract_number = advanceModal.payload.value.contract_number
        }
      }

      await advanceDemandStatus(
        demandId,
        targetStatus.value as Database['public']['Enums']['demand_status'],
        payload,
      )

      if (targetStatus.value === 'homologation' && items.value) {
        for (const item of items.value) {
          const disputeRes = getItemDisputeResult(item)
          if (disputeRes.outcome === 'winner' && !item.execution_status) {
            try {
              await supabase
                .from('demand_products')
                .update({
                  execution_status: 'homologated',
                  execution_status_updated_at: new Date().toISOString(),
                })
                .eq('id', item.id)

              await supabase.from('demand_item_status_history').insert({
                demand_product_id: item.id,
                status: 'homologated',
                observation: 'Demanda homologada',
                created_by: user.value?.id || null,
              })
            } catch (initErr) {
              console.error('Erro ao inicializar status de execução do item:', initErr)
            }
          }
        }
      }

      advanceModal.close()
      await reloadDemand()
      if (refreshItems) {
        await refreshItems()
      }
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
