const fs = require('fs')

let content = fs.readFileSync('app/pages/suppliers/index.vue', 'utf8')

// Imports
content = content.replace(
  /import type \{ SupplierRow \} from '~\/composables\/useSuppliers'/,
  "import type { SupplierRow } from '~/composables/useSuppliers'\n  import { useZodForm } from '~/composables/useZodForm'\n  import { supplierFormSchema, type SupplierFormInput } from '~/schemas/forms/supplier'",
)

// Form State
const defaultFormRegex = /\/\/ Form State[\s\S]*?const form = ref\(\{ \.\.\.defaultForm \}\)/
content = content.replace(
  defaultFormRegex,
  `// Form State
  const defaultForm = {
    id: '',
    cnpj: '',
    company_name: '',
    responsible_name: '',
    email: '',
    cell_phone: '',
    landline: '',
    address: '',
    has_bb_account: '',
    is_simples_optant: false,
    simples_optant_verified_at: null as string | null,
    is_active: true,
  }
  
  const { errors, defineField, handleSubmit, resetForm } = useZodForm(supplierFormSchema, defaultForm)
  
  const [cnpj, cnpjProps] = defineField('cnpj')
  const [companyName, companyNameProps] = defineField('company_name')
  const [responsibleName, responsibleNameProps] = defineField('responsible_name')
  const [email, emailProps] = defineField('email')
  const [cellPhone, cellPhoneProps] = defineField('cell_phone')
  const [landline, landlineProps] = defineField('landline')
  const [address, addressProps] = defineField('address')
  const [hasBbAccount, hasBbAccountProps] = defineField('has_bb_account')
  const [isSimplesOptant, isSimplesOptantProps] = defineField('is_simples_optant')
  const [isActive, isActiveProps] = defineField('is_active')`,
)

// openAddModal
content = content.replace(
  /form\.value = \{ \.\.\.defaultForm \}/,
  `resetForm({ values: defaultForm })`,
)

// openEditModal
content = content.replace(
  /form\.value = \{[\s\S]*?\.\.\.supplier,[\s\S]*?responsible_name: supplier\.responsible_name \|\| '',[\s\S]*?cell_phone: supplier\.cell_phone \|\| '',[\s\S]*?landline: supplier\.landline \|\| '',[\s\S]*?address: supplier\.address \|\| '',[\s\S]*?has_bb_account: supplier\.has_bb_account \|\| '',[\s\S]*?\}/,
  `resetForm({ values: {
      ...supplier,
      responsible_name: supplier.responsible_name || '',
      cell_phone: supplier.cell_phone || '',
      landline: supplier.landline || '',
      address: supplier.address || '',
      has_bb_account: supplier.has_bb_account || '',
    } })`,
)

// saveSupplier
const saveSupplierRegex =
  /const saveSupplier = async \(\) => \{[\s\S]*?try \{[\s\S]*?\} finally \{[\s\S]*?\}\n {2}\}/
content = content.replace(
  saveSupplierRegex,
  `const saveSupplier = handleSubmit(async (values: SupplierFormInput) => {
    isSaving.value = true
    saveError.value = ''

    try {
      let verifiedAt = values.simples_optant_verified_at
      if (isEditing.value) {
        const original = suppliers.value?.find((s) => s.id === values.id)
        if (original && original.is_simples_optant !== values.is_simples_optant) {
          verifiedAt = new Date().toISOString()
        }
      } else if (values.is_simples_optant) {
        verifiedAt = new Date().toISOString()
      }

      const payload = {
        cnpj: values.cnpj,
        company_name: values.company_name,
        responsible_name: values.responsible_name || null,
        email: values.email,
        cell_phone: values.cell_phone || null,
        landline: values.landline || null,
        address: values.address || null,
        has_bb_account: values.has_bb_account || null,
        is_simples_optant: values.is_simples_optant,
        simples_optant_verified_at: verifiedAt,
        is_active: values.is_active,
      }

      if (isEditing.value && values.id) {
        await updateSupplier(values.id, payload)
      } else {
        await createSupplier(payload)
      }

      await refresh()
      closeModal()
    } catch (err: unknown) {
      const e = err as Error
      saveError.value = e.message
    } finally {
      isSaving.value = false
    }
  })`,
)

// Template inputs
content = content.replace(
  /<UiInput v-model="form\.cnpj" label="CNPJ \*" required \/>/g,
  '<UiInput v-model="cnpj" v-bind="cnpjProps" :error-messages="errors.cnpj" label="CNPJ *" required />',
)
content = content.replace(
  /<UiInput v-model="form\.company_name" label="Nome da Empresa \*" required \/>/g,
  '<UiInput v-model="companyName" v-bind="companyNameProps" :error-messages="errors.company_name" label="Nome da Empresa *" required />',
)
content = content.replace(
  /<UiInput v-model="form\.responsible_name" label="Nome do Respons(.)vel" \/>/g,
  '<UiInput v-model="responsibleName" v-bind="responsibleNameProps" :error-messages="errors.responsible_name" label="Nome do Responsável" />',
)
content = content.replace(
  /<UiInput v-model="form\.email" label="E-mail \*" required type="email" \/>/g,
  '<UiInput v-model="email" v-bind="emailProps" :error-messages="errors.email" label="E-mail *" required type="email" />',
)
content = content.replace(
  /<UiInput v-model="form\.cell_phone" label="Telefone Celular" \/>/g,
  '<UiInput v-model="cellPhone" v-bind="cellPhoneProps" :error-messages="errors.cell_phone" label="Telefone Celular" />',
)
content = content.replace(
  /<UiInput v-model="form\.landline" label="Telefone Fixo" \/>/g,
  '<UiInput v-model="landline" v-bind="landlineProps" :error-messages="errors.landline" label="Telefone Fixo" />',
)
content = content.replace(
  /<UiInput v-model="form\.address" label="Endere(.)o" \/>/g,
  '<UiInput v-model="address" v-bind="addressProps" :error-messages="errors.address" label="Endereço" />',
)
content = content.replace(
  /v-model="form\.has_bb_account"/g,
  'v-model="hasBbAccount" v-bind="hasBbAccountProps" :error-messages="errors.has_bb_account"',
)
content = content.replace(
  /v-model="form\.is_simples_optant"/g,
  'v-model="isSimplesOptant" v-bind="isSimplesOptantProps" :error-messages="errors.is_simples_optant"',
)
content = content.replace(
  /v-model="form\.is_active"/g,
  'v-model="isActive" v-bind="isActiveProps" :error-messages="errors.is_active"',
)

fs.writeFileSync('app/pages/suppliers/index.vue', content, 'utf8')
console.log('Suppliers index.vue patched')
