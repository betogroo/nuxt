const fs = require('fs')

let content = fs.readFileSync('app/pages/admin/units.vue', 'utf8')

// Imports
content = content.replace(
  /import type \{ UnitRow, UnitAliasRow \} from '~\/composables\/useMeasurementUnits'/,
  "import type { UnitRow, UnitAliasRow } from '~/composables/useMeasurementUnits'\n  import { useZodForm } from '~/composables/useZodForm'\n  import {\n    adminUnitFormSchema,\n    adminUnitAliasFormSchema,\n    adminUnitResolveSchema,\n    type AdminUnitFormInput,\n    type AdminUnitAliasFormInput,\n    type AdminUnitResolveInput\n  } from '~/schemas/forms/admin-unit'",
)

// Unit Form state and submit
content = content.replace(
  /const form = ref\(\{[\s\S]*?\}\)/,
  `const { errors: saveErrors, defineField: defineSaveField, handleSubmit: handleSaveSubmit, setValues: setSaveValues } = useZodForm(adminUnitFormSchema, { id: '', name: '', aliasIds: [], is_active: true })\n\n  const [name, nameProps] = defineSaveField('name')\n  const [aliasIds, aliasIdsProps] = defineSaveField('aliasIds')\n  const [isActive, isActiveProps] = defineSaveField('is_active')`,
)

content = content.replace(
  /form\.value = \{ id: '', name: '', aliasIds: \[\], is_active: true \}/,
  `setSaveValues({ id: '', name: '', aliasIds: [], is_active: true })`,
)

content = content.replace(
  /form\.value = \{[\s\S]*?id: unit\.id,[\s\S]*?name: unit\.name,[\s\S]*?aliasIds: unit\.measurement_unit_aliases\?\.map\(\(a\) => a\.id\) \|\| \[\],[\s\S]*?is_active: unit\.is_active,[\s\S]*?\}/,
  `setSaveValues({\n      id: unit.id,\n      name: unit.name,\n      aliasIds: unit.measurement_unit_aliases?.map((a) => a.id) || [],\n      is_active: unit.is_active,\n    })`,
)

const saveUnitRegex = /const saveUnit = async \(\) => \{[\s\S]*?\}\n\s*\}/
content = content.replace(
  saveUnitRegex,
  `const saveUnit = handleSaveSubmit(async (values: AdminUnitFormInput) => {
    try {
      isSaving.value = true
      saveError.value = ''

      if (isEditing.value && values.id) {
        await updateUnit(values.id, {
          name: values.name,
          aliasIds: values.aliasIds,
          is_active: values.is_active,
        })
      } else {
        await createUnit({
          name: values.name,
          aliasIds: values.aliasIds,
          is_active: values.is_active,
        })
      }

      await refreshUnits()
      await refreshAliases()
      closeModal()
    } catch (e: unknown) {
      saveError.value = e instanceof Error ? e.message : String(e)
    } finally {
      isSaving.value = false
    }
  })`,
)

// Alias Form state and submit
content = content.replace(
  /const aliasForm = ref\(\{[\s\S]*?\}\)/,
  `const { errors: aliasErrors, defineField: defineAliasField, handleSubmit: handleAliasSubmit, setValues: setAliasValues } = useZodForm(adminUnitAliasFormSchema, { id: '', name: '', code: undefined })\n\n  const [aliasCode, aliasCodeProps] = defineAliasField('code')\n  const [aliasName, aliasNameProps] = defineAliasField('name')`,
)

content = content.replace(
  /aliasForm\.value = \{ id: '', code: null, name: '' \}/,
  `setAliasValues({ id: '', name: '', code: undefined })`,
)

content = content.replace(
  /aliasForm\.value = \{ id: alias\.id, code: alias\.code, name: alias\.name \}/,
  `setAliasValues({ id: alias.id, code: alias.code, name: alias.name })`,
)

const saveAliasRegex = /const saveAlias = async \(\) => \{[\s\S]*?\}\n\s*\}/
content = content.replace(
  saveAliasRegex,
  `const saveAlias = handleAliasSubmit(async (values: AdminUnitAliasFormInput) => {
    try {
      isSaving.value = true
      saveError.value = ''

      if (isAliasEditing.value && values.id) {
        await updateAliasAsAdmin(values.id, {
          code: values.code,
          name: values.name,
        })
      } else {
        await createAliasAsAdmin({
          code: values.code,
          name: values.name,
        })
      }

      await refreshAliases()
      closeAliasModal()
    } catch (e: unknown) {
      saveError.value = e instanceof Error ? e.message : String(e)
    } finally {
      isSaving.value = false
    }
  })`,
)

// Resolve Form state and submit
content = content.replace(
  /const resolveMode = ref\('new'\)\n\s*const resolveNewName = ref\(''\)\n\s*const resolveLinkUnitId = ref\(''\)/,
  `const { errors: resolveErrors, defineField: defineResolveField, handleSubmit: handleResolveSubmit, setValues: setResolveValues } = useZodForm(adminUnitResolveSchema, { resolveMode: 'new', resolveNewName: '', resolveLinkUnitId: '' })\n\n  const [resolveMode, resolveModeProps] = defineResolveField('resolveMode')\n  const [resolveNewName, resolveNewNameProps] = defineResolveField('resolveNewName')\n  const [resolveLinkUnitId, resolveLinkUnitIdProps] = defineResolveField('resolveLinkUnitId')`,
)

content = content.replace(
  /resolveMode\.value = 'new'\n\s*resolveNewName\.value = unit\.name\n\s*resolveLinkUnitId\.value = ''/,
  `setResolveValues({ resolveMode: 'new', resolveNewName: unit.name, resolveLinkUnitId: '' })`,
)

const submitResolveRegex = /const submitResolve = async \(\) => \{[\s\S]*?\}\n\s*\}/
content = content.replace(
  submitResolveRegex,
  `const submitResolve = handleResolveSubmit(async (values: AdminUnitResolveInput) => {
    if (!targetPendingUnit.value) return

    try {
      isResolving.value = true
      resolveError.value = ''

      if (values.resolveMode === 'new' && values.resolveNewName) {
        await approvePendingUnit(targetPendingUnit.value, values.resolveNewName)
      } else if (values.resolveMode === 'link' && values.resolveLinkUnitId) {
        await mergePendingUnit(targetPendingUnit.value, values.resolveLinkUnitId)
      }

      await refreshUnits()
      closeResolveModal()
    } catch (e: unknown) {
      resolveError.value = e instanceof Error ? e.message : String(e)
    } finally {
      isResolving.value = false
    }
  })`,
)

// Template replacements (Units)
content = content.replace(
  /<UiInput\s+v-model="form\.name"/g,
  '<UiInput v-model="name" v-bind="nameProps" :error-messages="saveErrors.name"',
)
content = content.replace(
  /<UiAutocomplete[\s\n]*v-model="form\.aliasIds"/g,
  '<UiAutocomplete\n          v-model="aliasIds"\n          v-bind="aliasIdsProps"\n          :error-messages="saveErrors.aliasIds"',
)
content = content.replace(
  /<UiSwitch[\s\n]*v-model="form\.is_active"/g,
  '<UiSwitch\n          v-model="isActive"\n          v-bind="isActiveProps"\n          :error-messages="saveErrors.is_active"',
)

// Template replacements (Alias)
content = content.replace(
  /<UiInput v-model\.number="aliasForm\.code"/g,
  '<UiInput v-model.number="aliasCode" v-bind="aliasCodeProps" :error-messages="aliasErrors.code"',
)
content = content.replace(
  /<UiInput v-model="aliasForm\.name"/g,
  '<UiInput v-model="aliasName" v-bind="aliasNameProps" :error-messages="aliasErrors.name"',
)

// Template replacements (Resolve)
content = content.replace(
  /<UiRadioGroup\s+v-model="resolveMode"/g,
  '<UiRadioGroup v-model="resolveMode" v-bind="resolveModeProps" :error-messages="resolveErrors.resolveMode"',
)
content = content.replace(
  /<UiInput[\s\n]*v-model="resolveNewName"/g,
  '<UiInput\n              v-model="resolveNewName"\n              v-bind="resolveNewNameProps"\n              :error-messages="resolveErrors.resolveNewName"',
)
content = content.replace(
  /<UiSelect[\s\n]*v-model="resolveLinkUnitId"/g,
  '<UiSelect\n              v-model="resolveLinkUnitId"\n              v-bind="resolveLinkUnitIdProps"\n              :error-messages="resolveErrors.resolveLinkUnitId"',
)

fs.writeFileSync('app/pages/admin/units.vue', content, 'utf8')
console.log('units.vue patched successfully.')
