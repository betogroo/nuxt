const fs = require('fs');
let code = fs.readFileSync('app/pages/demands/[id]/index.vue', 'utf8');

const editItemStateRegex = /const isEditItemModalOpen = ref\(false\)\s*const editItemSaving = ref\(false\)\s*const editItemError = ref\(''\)\s*const editItemForm = ref\(\{[\s\S]*?searchUnitText: '',\s*\}\)/;
const editItemReplacement = `const isEditItemModalOpen = ref(false)
  const editItemSaving = ref(false)
  const editItemError = ref('')

  const { errors: eiErrors, defineField: eiDefine, resetForm: eiReset, handleSubmit: eiSubmit } = useZodForm(demandItemFormSchema, {
    productId: '',
    quantity: 1,
    reference_price: null,
    searchUnitText: '',
  })

  const [eiProductId, eiProductIdProps] = eiDefine('productId')
  const [eiQuantity, eiQuantityProps] = eiDefine('quantity')
  const [eiReferencePrice, eiReferencePriceProps] = eiDefine('reference_price')
  const [eiSearchUnitText, eiSearchUnitTextProps] = eiDefine('searchUnitText')

  const editItemFormMeta = ref({
    id: '',
    productName: '',
  })`;
code = code.replace(editItemStateRegex, editItemReplacement);

// Fix computed editItemAvailableUnits
code = code.replace(
  /allProducts\.value\?\.find\(\(p\) => p\.id === editItemForm\.value\.productId\)/,
  `allProducts.value?.find((p) => p.id === eiProductId.value)`
);

// Fix openEditItemModal
const openEditItemRegex = /editItemForm\.value = \{[\s\S]*?\}\s*editItemError\.value = ''\s*isEditItemModalOpen\.value = true/;
const openEditItemReplacement = `eiReset({
      values: {
        productId: item.product_id || item.product?.id || '',
        quantity: Number(item.quantity),
        reference_price: item.reference_price != null ? Number(item.reference_price) : null,
        searchUnitText: item.unit_id ? (allMeasurementUnits.value?.find((u) => u.id === item.unit_id)?.name || '') : '',
      }
    })
    editItemFormMeta.value = {
      id: item.id,
      productName: item.product?.name || 'Produto',
    }
    editItemError.value = ''
    isEditItemModalOpen.value = true`;
code = code.replace(openEditItemRegex, openEditItemReplacement);

// Fix saveEditItem
const saveEditItemStart = code.indexOf('const saveEditItem = async () => {');
const saveEditItemEnd = code.indexOf('editItemSaving.value = false', saveEditItemStart);
const eiBrace1 = code.indexOf('}', saveEditItemEnd);
const eiBrace2 = code.indexOf('}', eiBrace1 + 1);

const saveEditItemReplacement = `const saveEditItem = eiSubmit(async (values) => {
    editItemSaving.value = true
    editItemError.value = ''
    try {
      await updateDemandItemWithDependencies({
        itemId: editItemFormMeta.value.id,
        demandId: demandId,
        productId: values.productId,
        quantity: values.quantity,
        referencePrice: values.reference_price,
        finalUnitId: await resolveOrCreateUnit(values.searchUnitText),
      })

      await refreshAllMeasurementUnits()
      await refreshItems()
      isEditItemModalOpen.value = false
    } catch (err: unknown) {
      editItemError.value = err instanceof Error ? err.message : String(err)
    } finally {
      editItemSaving.value = false
    }
  })`;

code = code.slice(0, saveEditItemStart) + saveEditItemReplacement + code.slice(eiBrace2 + 1);

// Template replacement
code = code.replace(
  /<p class="text-body-1 font-weight-bold mb-4">{{ editItemForm\.productName }}<\/p>/,
  `<p class="text-body-1 font-weight-bold mb-4">{{ editItemFormMeta.productName }}</p>`
);

code = code.replace(
  /<UiInput v-model\.number="editItemForm\.quantity" label="Quantidade" min="1" type="number" \/>/,
  `<UiInput
        v-model.number="eiQuantity"
        v-bind="eiQuantityProps"
        :error-messages="eiErrors.quantity"
        label="Quantidade"
        min="1"
        type="number"
      />`
);

code = code.replace(
  /<MeasurementUnitSelect\s*v-model="editItemForm\.searchUnitText"\s*class="mt-3"\s*:items="editItemAvailableUnits"\s*\/>/,
  `<MeasurementUnitSelect
        v-model="eiSearchUnitText"
        v-bind="eiSearchUnitTextProps"
        :error-messages="eiErrors.searchUnitText"
        class="mt-3"
        :items="editItemAvailableUnits"
      />`
);

code = code.replace(
  /<UiInput\s*v-model\.number="editItemForm\.reference_price"\s*class="mt-3"\s*label="Valor Referencial \(R\$\)"\s*step="0\.0001"\s*type="number"\s*\/>/,
  `<UiInput
        v-model.number="eiReferencePrice"
        v-bind="eiReferencePriceProps"
        :error-messages="eiErrors.reference_price"
        class="mt-3"
        label="Valor Referencial (R$)"
        step="0.0001"
        type="number"
      />`
);

fs.writeFileSync('app/pages/demands/[id]/index.vue', code, 'utf8');
console.log('Fixed edit item modal');
