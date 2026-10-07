const fs = require('fs');
let code = fs.readFileSync('app/pages/products/index.vue', 'utf8');

const startIdx = code.indexOf('const saveProduct = async () => {');
const stopIdx = code.indexOf('modal.stopSaving()', startIdx);
const endBrace1 = code.indexOf('}', stopIdx);
const endBrace2 = code.indexOf('}', endBrace1 + 1);

const replacement = `const saveProduct = handleSubmit(async (values) => {
    modal.startSaving()
    modal.error.value = ''
    try {
      let finalExpenseNatureId = values.expense_nature_id
      let finalProductClassId = values.product_class_id

      if (values.is_suggesting_nature && values.suggested_nature_id && values.suggested_nature_name) {
        const expenseNature = await registerPendingExpenseNature({
          id: values.suggested_nature_id,
          name: values.suggested_nature_name,
        })
        finalExpenseNatureId = expenseNature.id
      }

      if (values.is_suggesting_class && values.suggested_class_id && values.suggested_class_name) {
        const pClass = await registerPendingProductClass({
          id: values.suggested_class_id,
          name: values.suggested_class_name,
        })
        finalProductClassId = pClass.id
      }

      const payload = {
        name: values.name,
        expense_nature_id: finalExpenseNatureId,
        product_class_id: finalProductClassId,
        is_active: values.is_active,
      }

      if (isEditing.value && editingId.value) {
        await updateProduct(editingId.value, payload)
      } else {
        await createProduct(payload)
      }

      await refresh()
      modal.close()
    } catch (err) {
      modal.error.value = err instanceof Error ? err.message : String(err)
    } finally {
      modal.stopSaving()
    }
  })`;

code = code.slice(0, startIdx) + replacement + code.slice(endBrace2 + 1);

fs.writeFileSync('app/pages/products/index.vue', code, 'utf8');
console.log('Fixed for real');
