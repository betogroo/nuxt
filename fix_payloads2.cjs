const fs = require('fs')

function fixAdminCrud() {
  let content = fs.readFileSync('app/composables/useAdminCrud.ts', 'utf8')

  // Change destructured variable
  content = content.replace('setValues: setSaveValues,', 'resetForm: resetSaveForm,')
  content = content.replace('setValues: setResolveValues,', 'resetForm: resetResolveForm,')

  // openAddModal
  content = content.replace(
    /setSaveValues\(\{ id: '', name: '', is_active: true \}\)/g,
    "resetSaveForm({ values: { id: '', name: '', is_active: true } })",
  )

  // openEditModal
  content = content.replace(
    /setSaveValues\(\{[\s\n]*id: item\.id,[\s\n]*name: item\.name,[\s\n]*is_active: item\.is_active \?\? true,[\s\n]*\}\)/g,
    'resetSaveForm({ values: { id: item.id, name: item.name, is_active: item.is_active ?? true } })',
  )

  // openResolveModal
  content = content.replace(
    /setResolveValues\(\{[\s\n]*resolveMode: 'approve',[\s\n]*newName: item\.name,[\s\n]*finalTargetId: '',[\s\n]*finalNatureId: '',[\s\n]*finalClassId: '',[\s\n]*\}\)/g,
    "resetResolveForm({ values: { resolveMode: 'approve', newName: item.name, finalTargetId: '', finalNatureId: '', finalClassId: '' } })",
  )

  fs.writeFileSync('app/composables/useAdminCrud.ts', content, 'utf8')
}

function fixUnits() {
  let content = fs.readFileSync('app/pages/admin/units.vue', 'utf8')

  content = content.replace(
    'setValues: setSaveValues } = useZodForm',
    'resetForm: resetSaveForm } = useZodForm',
  )
  content = content.replace(
    'setValues: setAliasValues } = useZodForm',
    'resetForm: resetAliasForm } = useZodForm',
  )
  content = content.replace(
    'setValues: setResolveValues } = useZodForm',
    'resetForm: resetResolveForm } = useZodForm',
  )

  content = content.replace(
    /setSaveValues\(\{ id: '', name: '', aliasIds: \[\], is_active: true \}\)/g,
    "resetSaveForm({ values: { id: '', name: '', aliasIds: [], is_active: true } })",
  )
  content = content.replace(
    /setSaveValues\(\{[\s\n]*id: unit\.id,[\s\n]*name: unit\.name,[\s\n]*aliasIds: unit\.measurement_unit_aliases\?\.map\(\(a\) => a\.id\) \|\| \[\],[\s\n]*is_active: unit\.is_active,[\s\n]*\}\)/g,
    'resetSaveForm({ values: { id: unit.id, name: unit.name, aliasIds: unit.measurement_unit_aliases?.map((a) => a.id) || [], is_active: unit.is_active } })',
  )

  content = content.replace(
    /setAliasValues\(\{ id: '', name: '', code: undefined \}\)/g,
    "resetAliasForm({ values: { id: '', name: '', code: undefined } })",
  )
  content = content.replace(
    /setAliasValues\(\{ id: alias\.id, code: alias\.code, name: alias\.name \}\)/g,
    'resetAliasForm({ values: { id: alias.id, code: alias.code, name: alias.name } })',
  )

  content = content.replace(
    /setResolveValues\(\{ resolveMode: 'new', resolveNewName: unit\.name, resolveLinkUnitId: '' \}\)/g,
    "resetResolveForm({ values: { resolveMode: 'new', resolveNewName: unit.name, resolveLinkUnitId: '' } })",
  )

  fs.writeFileSync('app/pages/admin/units.vue', content, 'utf8')
}

fixAdminCrud()
fixUnits()
console.log('Fixed correctly')
