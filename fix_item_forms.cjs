const fs = require('fs');
let code = fs.readFileSync('app/pages/demands/[id]/items/[itemId].vue', 'utf8');

if (!code.includes('useZodForm')) {
  code = code.replace(
    "import { formatDemandStatus, getDemandStatusColor, formatCurrency } from '~/utils/formatters'",
    "import { formatDemandStatus, getDemandStatusColor, formatCurrency } from '~/utils/formatters'\nimport { useZodForm } from '~/composables/useZodForm'\nimport { demandItemFormSchema } from '~/schemas/forms/demand-item'\nimport { demandBidFormSchema } from '~/schemas/forms/demand-bid'"
  );
}

// 1. Edit Item Form
const editFormRegex = /const editForm = ref\(\{[\s\S]*?bid_interval_type: 'percentage' as 'percentage' \| 'monetary',\s*\}\)/;
const editFormReplacement = `const { errors: eiErrors, defineField: eiDefine, resetForm: eiReset, handleSubmit: eiSubmit } = useZodForm(demandItemFormSchema, {
    quantity: 1,
    searchUnitText: '',
    reference_price: null,
    bid_interval: 3,
    bid_interval_type: 'percentage',
  })

  const [eiQuantity, eiQuantityProps] = eiDefine('quantity')
  const [eiSearchUnit, eiSearchUnitProps] = eiDefine('searchUnitText')
  const [eiReferencePrice, eiReferencePriceProps] = eiDefine('reference_price')
  const [eiBidInterval, eiBidIntervalProps] = eiDefine('bid_interval')
  const [eiBidIntervalType, eiBidIntervalTypeProps] = eiDefine('bid_interval_type')`;
code = code.replace(editFormRegex, editFormReplacement);

code = code.replace(
  /editForm\.value = \{[\s\S]*?bid_interval_type: item\.value\.bid_interval_type === 'monetary' \? 'monetary' : 'percentage',\s*\}/,
  `eiReset({
      values: {
        quantity: Number(item.value.quantity),
        searchUnitText: item.value.measurement_units?.name || '',
        reference_price: item.value.reference_price ? Number(item.value.reference_price) : null,
        bid_interval: item.value.bid_interval ? Number(item.value.bid_interval) : 3,
        bid_interval_type: item.value.bid_interval_type === 'monetary' ? 'monetary' : 'percentage',
      }
    })`
);

const saveItemRegex = /const saveItem = async \(\) => \{[\s\S]*?isSaving\.value = false\s*\}\s*\}/;
const saveItemReplacement = `const saveItem = eiSubmit(async (values) => {
    isSaving.value = true
    editError.value = ''
    try {
      await updateDemandItemWithDependencies({
        itemId,
        demandId,
        productId: item.value?.product_id || undefined,
        quantity: values.quantity,
        referencePrice: values.reference_price,
        bidInterval: values.bid_interval,
        bidIntervalType: values.bid_interval_type,
        finalUnitId: await resolveOrCreateUnit(values.searchUnitText || ''),
      })

      await refresh()
      closeEditModal()
    } catch (err: unknown) {
      editError.value = err instanceof Error ? err.message : String(err)
    } finally {
      isSaving.value = false
    }
  })`;
code = code.replace(saveItemRegex, saveItemReplacement);

// Update Edit Form template
code = code.replace(
  /<UiInput v-model="editForm\.quantity" label="Quantidade" type="number" \/>/,
  `<UiInput
          v-model.number="eiQuantity"
          v-bind="eiQuantityProps"
          :error-messages="eiErrors.quantity"
          label="Quantidade"
          type="number"
        />`
);

code = code.replace(
  /<UiInput\s*v-model\.number="editForm\.reference_price"\s*label="Valor Referencial \(R\$\)"\s*step="0\.0001"\s*type="number"\s*\/>/,
  `<UiInput
          v-model.number="eiReferencePrice"
          v-bind="eiReferencePriceProps"
          :error-messages="eiErrors.reference_price"
          label="Valor Referencial (R$)"
          step="0.0001"
          type="number"
        />`
);

code = code.replace(
  /v-model="editForm\.bid_interval_type"/,
  `v-model="eiBidIntervalType"
            v-bind="eiBidIntervalTypeProps"
            :error-messages="eiErrors.bid_interval_type"`
);

code = code.replace(
  /v-model\.number="editForm\.bid_interval"/,
  `v-model.number="eiBidInterval"
            v-bind="eiBidIntervalProps"
            :error-messages="eiErrors.bid_interval"`
);

code = code.replace(
  /<MeasurementUnitSelect v-model="editForm\.unitSearch" class="mb-4" :items="availableUnits" \/>/,
  `<MeasurementUnitSelect
          v-model="eiSearchUnit"
          v-bind="eiSearchUnitProps"
          :error-messages="eiErrors.searchUnitText"
          class="mb-4"
          :items="availableUnits"
        />`
);


// 2. Bid Form
const bidFormRegex = /const bidForm = ref\(\{[\s\S]*?amount: null as number \| null,\s*\}\)/;
const bidFormReplacement = `const { errors: bidErrors, defineField: bidDefine, resetForm: bidReset, handleSubmit: bidSubmit } = useZodForm(demandBidFormSchema, {
    isNewSupplier: false,
    supplierId: null,
    newSupplierCnpj: '',
    newSupplierName: '',
    newSupplierEmail: '',
    amount: null as any,
  })

  const [bidIsNew, bidIsNewProps] = bidDefine('isNewSupplier')
  const [bidSupplierId, bidSupplierIdProps] = bidDefine('supplierId')
  const [bidCnpj, bidCnpjProps] = bidDefine('newSupplierCnpj')
  const [bidName, bidNameProps] = bidDefine('newSupplierName')
  const [bidEmail, bidEmailProps] = bidDefine('newSupplierEmail')
  const [bidAmount, bidAmountProps] = bidDefine('amount')`;
code = code.replace(bidFormRegex, bidFormReplacement);

const openBidModalRegex = /bidForm\.value = \{[\s\S]*?amount: null,\s*\}/;
const openBidModalReplacement = `bidReset({
      values: {
        isNewSupplier: false,
        supplierId: null,
        newSupplierCnpj: '',
        newSupplierName: '',
        newSupplierEmail: '',
        amount: null as any,
      }
    })`;
code = code.replace(openBidModalRegex, openBidModalReplacement);

const saveBidRegex = /const saveBid = async \(\) => \{[\s\S]*?isBidSaving\.value = false\s*\}\s*\}/;
const saveBidReplacement = `const saveBid = bidSubmit(async (values) => {
    isBidSaving.value = true
    bidError.value = ''
    try {
      let finalSupplierId = values.supplierId
      if (values.isNewSupplier) {
        const sup = await createSupplierFast({
          cnpj: values.newSupplierCnpj!,
          name: values.newSupplierName!,
          email: values.newSupplierEmail || undefined,
        })
        finalSupplierId = sup.id
      }

      await addBid(itemId, {
        supplier_id: finalSupplierId!,
        amount: values.amount!,
        is_winner: false,
        delivery_time_days: null,
      })
      await refreshBids()
      closeBidModal()
    } catch (err: unknown) {
      bidError.value = err instanceof Error ? err.message : String(err)
    } finally {
      isBidSaving.value = false
    }
  })`;
code = code.replace(saveBidRegex, saveBidReplacement);

// Bid Form template
code = code.replace(
  /v-model="bidForm\.isNewSupplier"/,
  `v-model="bidIsNew"\n          v-bind="bidIsNewProps"\n          :error-messages="bidErrors.isNewSupplier"`
);

code = code.replace(
  /v-model="bidForm\.supplierId"/,
  `v-model="bidSupplierId"\n          v-bind="bidSupplierIdProps"\n          :error-messages="bidErrors.supplierId"`
);

code = code.replace(
  /v-model="bidForm\.newSupplierCnpj"/,
  `v-model="bidCnpj"\n            v-bind="bidCnpjProps"\n            :error-messages="bidErrors.newSupplierCnpj"`
);

code = code.replace(
  /v-model="bidForm\.newSupplierName"/,
  `v-model="bidName"\n            v-bind="bidNameProps"\n            :error-messages="bidErrors.newSupplierName"`
);

code = code.replace(
  /v-model="bidForm\.newSupplierEmail"/,
  `v-model="bidEmail"\n            v-bind="bidEmailProps"\n            :error-messages="bidErrors.newSupplierEmail"`
);

code = code.replace(
  /v-model\.number="bidForm\.amount"/,
  `v-model.number="bidAmount"\n          v-bind="bidAmountProps"\n          :error-messages="bidErrors.amount"`
);

// v-if fixes for bid form
code = code.replace(/v-if="!bidForm\.isNewSupplier"/g, `v-if="!bidIsNew"`);
code = code.replace(/v-if="bidForm\.isNewSupplier"/g, `v-if="bidIsNew"`);


fs.writeFileSync('app/pages/demands/[id]/items/[itemId].vue', code, 'utf8');
console.log('Fixed item forms');
