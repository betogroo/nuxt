const fs = require('fs');
let code = fs.readFileSync('app/pages/demands/[id]/index.vue', 'utf8');

// Imports
code = code.replace(
  "import { demandItemFormSchema } from '~/schemas/forms/demand-item'",
  "import { demandItemFormSchema } from '~/schemas/forms/demand-item'\nimport { demandAdvanceSchema } from '~/schemas/forms/demand-advance'"
);

// Advance Modal State
const advanceModalRegex = /const advanceModal = useModal<Record<string, string \| null>>\(\{[\s\S]*?contract_number: '',\s*\}\)/;
const advanceModalReplacement = `const advanceModal = useModal({})
  const { errors: advErrors, defineField: advDefine, resetForm: advReset, handleSubmit: advSubmit } = useZodForm(demandAdvanceSchema, {
    targetStatus: '',
    bidding_notice_number: '',
    dispute_number: '',
    dispute_date: '',
    offer_opening_date: '',
    offer_opening_time: '',
    contract_number: '',
  })

  const [advTargetStatus, advTargetStatusProps] = advDefine('targetStatus')
  const [advBiddingNotice, advBiddingNoticeProps] = advDefine('bidding_notice_number')
  const [advDisputeNumber, advDisputeNumberProps] = advDefine('dispute_number')
  const [advDisputeDate, advDisputeDateProps] = advDefine('dispute_date')
  const [advOfferOpeningDate, advOfferOpeningDateProps] = advDefine('offer_opening_date')
  const [advOfferOpeningTime, advOfferOpeningTimeProps] = advDefine('offer_opening_time')
  const [advContractNumber, advContractNumberProps] = advDefine('contract_number')`;
code = code.replace(advanceModalRegex, advanceModalReplacement);

// openAdvanceModal
const openAdvanceModalRegex = /advanceModal\.open\(\{[\s\S]*?contract_number: '',\s*\}\)/;
const openAdvanceModalReplacement = `advReset({
        values: {
          targetStatus: status,
          bidding_notice_number: '',
          dispute_number: '',
          dispute_date: '',
          offer_opening_date: '',
          offer_opening_time: '',
          contract_number: '',
        }
      })
      advanceModal.open()`;
code = code.replace(openAdvanceModalRegex, openAdvanceModalReplacement);

// confirmAdvanceStatus
const confirmAdvanceStatusRegex = /const confirmAdvanceStatus = async \(\) => \{[\s\S]*?advanceModal\.stopSaving\(\)\s*\}\s*\}/;
const confirmAdvanceStatusReplacement = `const confirmAdvanceStatus = advSubmit(async (values) => {
    advanceModal.startSaving()
    advanceModal.error.value = ''
    try {
      const payload: Record<string, string | null> = {}
      if (values.targetStatus === 'bidding_notice') {
        payload.bidding_notice_number = values.bidding_notice_number || null
      } else if (values.targetStatus === 'dispute') {
        payload.dispute_number = values.dispute_number || null
        payload.dispute_date = values.dispute_date || null
        payload.offer_opening_date = values.offer_opening_date || null
        payload.offer_opening_time = values.offer_opening_time || null
      } else if (values.targetStatus === 'homologation') {
        payload.contract_number = values.contract_number || null
      }

      await advanceDemandStatus(demandId, values.targetStatus, payload)
      await refreshDemand()
      advanceModal.close()
    } catch (err: unknown) {
      advanceModal.error.value = err instanceof Error ? err.message : String(err)
    } finally {
      advanceModal.stopSaving()
    }
  })`;
code = code.replace(confirmAdvanceStatusRegex, confirmAdvanceStatusReplacement);

// Template fixes
code = code.replace(
  /<UiInput\s*v-model="advanceModal\.payload\.value\.bidding_notice_number"\s*label="Nǧmero do Aviso de Contrataǜo"\s*required\s*\/>/,
  `<UiInput
          v-model="advBiddingNotice"
          v-bind="advBiddingNoticeProps"
          :error-messages="advErrors.bidding_notice_number"
          label="Número do Aviso de Contratação"
          required
        />`
);

code = code.replace(
  /<UiInput\s*v-model="advanceModal\.payload\.value\.dispute_number"\s*label="Nǧmero da Disputa"\s*required\s*\/>/,
  `<UiInput
          v-model="advDisputeNumber"
          v-bind="advDisputeNumberProps"
          :error-messages="advErrors.dispute_number"
          label="Número da Disputa"
          required
        />`
);

code = code.replace(
  /<UiInput\s*v-model="advanceModal\.payload\.value\.dispute_date"\s*label="Data da Disputa"\s*required\s*type="date"\s*\/>/,
  `<UiInput
          v-model="advDisputeDate"
          v-bind="advDisputeDateProps"
          :error-messages="advErrors.dispute_date"
          label="Data da Disputa"
          required
          type="date"
        />`
);

code = code.replace(
  /<UiInput\s*v-model="advanceModal\.payload\.value\.offer_opening_date"\s*label="Data de Abertura"\s*type="date"\s*\/>/,
  `<UiInput
              v-model="advOfferOpeningDate"
              v-bind="advOfferOpeningDateProps"
              :error-messages="advErrors.offer_opening_date"
              label="Data de Abertura"
              type="date"
            />`
);

code = code.replace(
  /<UiInput\s*v-model="advanceModal\.payload\.value\.offer_opening_time"\s*label="Hora de Abertura"\s*type="time"\s*\/>/,
  `<UiInput
              v-model="advOfferOpeningTime"
              v-bind="advOfferOpeningTimeProps"
              :error-messages="advErrors.offer_opening_time"
              label="Hora de Abertura"
              type="time"
            />`
);

code = code.replace(
  /<UiInput\s*v-model="advanceModal\.payload\.value\.contract_number"\s*label="Nǧmero da Contrataǜo \(Contrato\/Ata\)"\s*required\s*\/>/,
  `<UiInput
          v-model="advContractNumber"
          v-bind="advContractNumberProps"
          :error-messages="advErrors.contract_number"
          label="Número da Contratação (Contrato/Ata)"
          required
        />`
);

fs.writeFileSync('app/pages/demands/[id]/index.vue', code, 'utf8');
console.log('Fixed advance modal');
