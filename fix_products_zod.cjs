const fs = require('fs');
let code = fs.readFileSync('app/pages/products/index.vue', 'utf8');

code = code.replace(
  'const { errors, defineField, resetForm } = useZodForm(productFormSchema',
  'const { errors, defineField, resetForm, handleSubmit } = useZodForm(productFormSchema'
);

code = code.replace(
  "const [name, nameProps] = defineField('name')",
  "const [name, nameProps] = defineField('name')\n    const [expenseNatureId, expenseNatureIdProps] = defineField('expense_nature_id')\n    const [productClassId, productClassIdProps] = defineField('product_class_id')"
);

const saveRegex = /const saveProduct = async \(\) => \{[\s\S]*?finally \{\s*modal\.stopSaving\(\)\s*\}\n\s*\}/;
code = code.replace(saveRegex, `const saveProduct = handleSubmit(async (values) => {
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
        expense_nature_id: finalExpenseNatureId as string,
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
    } catch (err: unknown) {
      modal.error.value = err instanceof Error ? err.message : String(err)
    } finally {
      modal.stopSaving()
    }
  })`);

code = code.replace(
  /<UiAutocomplete[\s\n]*v-if="!isSuggestingNature"[\s\n]*v-model="modal\.payload\.value\.expense_nature_id"/g,
  '<UiAutocomplete\n          v-if="!isSuggestingNature"\n          v-model="expenseNatureId"\n          v-bind="expenseNatureIdProps"\n          :error-messages="errors.expense_nature_id"'
);

code = code.replace(
  /<UiAutocomplete[\s\n]*v-if="!isSuggestingClass"[\s\n]*v-model="modal\.payload\.value\.product_class_id"/g,
  '<UiAutocomplete\n          v-if="!isSuggestingClass"\n          v-model="productClassId"\n          v-bind="productClassIdProps"\n          :error-messages="errors.product_class_id"'
);

fs.writeFileSync('app/pages/products/index.vue', code, 'utf8');
console.log('Fixed Products Zod');
