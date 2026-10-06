const fs = require('fs')

let content = fs.readFileSync('app/pages/products/index.vue', 'utf8')

// Imports
content = content.replace(
  /import type \{ ProductRow \} from '~\/composables\/useProducts'/,
  "import type { ProductRow } from '~/composables/useProducts'\n  import { useZodForm } from '~/composables/useZodForm'\n  import { productFormSchema, type ProductFormInput } from '~/schemas/forms/product'",
)

// Form State
const defaultFormRegex = /const modal = useModal\(\{[\s\S]*?is_active: true,\n {2}\}\)/
content = content.replace(
  defaultFormRegex,
  `const modal = useModal()
  const { errors, defineField, handleSubmit, resetForm } = useZodForm(productFormSchema, {
    id: '',
    name: '',
    expense_nature_id: null,
    is_suggesting_nature: false,
    suggested_nature_id: '',
    suggested_nature_name: '',
    product_class_id: null,
    is_suggesting_class: false,
    suggested_class_id: '',
    suggested_class_name: '',
    is_active: true,
  })

  const [name, nameProps] = defineField('name')
  const [expenseNatureId, expenseNatureIdProps] = defineField('expense_nature_id')
  const [isSuggestingNature, isSuggestingNatureProps] = defineField('is_suggesting_nature')
  const [suggestedNatureId, suggestedNatureIdProps] = defineField('suggested_nature_id')
  const [suggestedNatureName, suggestedNatureNameProps] = defineField('suggested_nature_name')
  const [productClassId, productClassIdProps] = defineField('product_class_id')
  const [isSuggestingClass, isSuggestingClassProps] = defineField('is_suggesting_class')
  const [suggestedClassId, suggestedClassIdProps] = defineField('suggested_class_id')
  const [suggestedClassName, suggestedClassNameProps] = defineField('suggested_class_name')
  const [isActive, isActiveProps] = defineField('is_active')
  const editingId = ref('')`,
)

content = content.replace(
  /const isEditing = computed\(\(\) => !!modal\.payload\.value\.id\)/,
  `const isEditing = computed(() => !!editingId.value)`,
)

content = content.replace(
  /const openAddModal = \(\) => \{[\s\S]*?\}\n/,
  `const openAddModal = () => {
    resetForm({ values: {
      id: '',
      name: '',
      expense_nature_id: null,
      is_suggesting_nature: false,
      suggested_nature_id: '',
      suggested_nature_name: '',
      product_class_id: null,
      is_suggesting_class: false,
      suggested_class_id: '',
      suggested_class_name: '',
      is_active: true,
    } })
    editingId.value = ''
    modal.open()
  }\n`,
)

content = content.replace(
  /const openEditModal = \(product: ProductRow\) => \{[\s\S]*?\}\n/,
  `const openEditModal = (product: ProductRow) => {
    resetForm({ values: {
      ...product,
      expense_nature_id: product.expense_nature_id || null,
      is_suggesting_nature: false,
      suggested_nature_id: '',
      suggested_nature_name: '',
      product_class_id: product.product_class_id || null,
      is_suggesting_class: false,
      suggested_class_id: '',
      suggested_class_name: '',
      is_active: product.is_active,
    } })
    editingId.value = product.id
    modal.open()
  }\n`,
)

const saveProductRegex =
  /const saveProduct = async \(\) => \{[\s\S]*?try \{[\s\S]*?\} finally \{[\s\S]*?\}\n {2}\}/
content = content.replace(
  saveProductRegex,
  `const saveProduct = handleSubmit(async (values: ProductFormInput) => {
    modal.startSaving()
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
  })`,
)

// Template refs replacements
content = content.replace(
  /<UiInput\s+v-model="modal\.payload\.value\.name"/g,
  '<UiInput v-model="name" v-bind="nameProps" :error-messages="errors.name"',
)
content = content.replace(
  /<UiSelect\s+v-model="modal\.payload\.value\.expense_nature_id"/g,
  '<UiSelect v-model="expenseNatureId" v-bind="expenseNatureIdProps" :error-messages="errors.expense_nature_id"',
)
content = content.replace(
  /<UiSwitch\s+v-model="modal\.payload\.value\.is_suggesting_nature"/g,
  '<UiSwitch v-model="isSuggestingNature" v-bind="isSuggestingNatureProps" :error-messages="errors.is_suggesting_nature"',
)
content = content.replace(
  /<UiInput\s+v-model="modal\.payload\.value\.suggested_nature_id"/g,
  '<UiInput v-model="suggestedNatureId" v-bind="suggestedNatureIdProps" :error-messages="errors.suggested_nature_id"',
)
content = content.replace(
  /<UiInput\s+v-model="modal\.payload\.value\.suggested_nature_name"/g,
  '<UiInput v-model="suggestedNatureName" v-bind="suggestedNatureNameProps" :error-messages="errors.suggested_nature_name"',
)

content = content.replace(
  /<UiSelect\s+v-model="modal\.payload\.value\.product_class_id"/g,
  '<UiSelect v-model="productClassId" v-bind="productClassIdProps" :error-messages="errors.product_class_id"',
)
content = content.replace(
  /<UiSwitch\s+v-model="modal\.payload\.value\.is_suggesting_class"/g,
  '<UiSwitch v-model="isSuggestingClass" v-bind="isSuggestingClassProps" :error-messages="errors.is_suggesting_class"',
)
content = content.replace(
  /<UiInput\s+v-model="modal\.payload\.value\.suggested_class_id"/g,
  '<UiInput v-model="suggestedClassId" v-bind="suggestedClassIdProps" :error-messages="errors.suggested_class_id"',
)
content = content.replace(
  /<UiInput\s+v-model="modal\.payload\.value\.suggested_class_name"/g,
  '<UiInput v-model="suggestedClassName" v-bind="suggestedClassNameProps" :error-messages="errors.suggested_class_name"',
)

content = content.replace(
  /<UiSwitch\s+v-model="modal\.payload\.value\.is_active"/g,
  '<UiSwitch v-model="isActive" v-bind="isActiveProps" :error-messages="errors.is_active"',
)

// Fix v-if
content = content.replace(
  /v-if="modal\.payload\.value\.is_suggesting_nature"/g,
  'v-if="isSuggestingNature"',
)
content = content.replace(/v-else-if="!modal\.payload\.value\.is_suggesting_nature"/g, 'v-else')
content = content.replace(
  /v-if="!modal\.payload\.value\.is_suggesting_nature"/g,
  'v-if="!isSuggestingNature"',
)

content = content.replace(
  /v-if="modal\.payload\.value\.is_suggesting_class"/g,
  'v-if="isSuggestingClass"',
)
content = content.replace(/v-else-if="!modal\.payload\.value\.is_suggesting_class"/g, 'v-else')
content = content.replace(
  /v-if="!modal\.payload\.value\.is_suggesting_class"/g,
  'v-if="!isSuggestingClass"',
)

fs.writeFileSync('app/pages/products/index.vue', content, 'utf8')
console.log('Products index page patched')
