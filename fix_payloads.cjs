const fs = require('fs')

let content = fs.readFileSync('app/composables/useAdminCrud.ts', 'utf8')
content = content.replace(
  /resetSaveForm\(\{ values: \{.*?\} \}\)\s*isEditing\.value = true/s,
  `resetSaveForm({ values: { id: item.id, name: item.name, is_active: item.is_active ?? true } })\n    isEditing.value = true`,
)
fs.writeFileSync('app/composables/useAdminCrud.ts', content, 'utf8')

let units = fs.readFileSync('app/pages/admin/units.vue', 'utf8')
units = units.replace(
  /resetSaveForm\(\{ values: \{.*?\} \}\)\s*isEditing\.value = true/s,
  `resetSaveForm({ values: { id: unit.id, name: unit.name, aliasIds: unit.measurement_unit_aliases?.map((a) => a.id) || [], is_active: unit.is_active } })\n    isEditing.value = true`,
)
units = units.replace(
  /resetAliasForm\(\{ values: \{.*?\} \}\)\s*isAliasEditing\.value = true/s,
  `resetAliasForm({ values: { id: alias.id, code: alias.code, name: alias.name } })\n    isAliasEditing.value = true`,
)
fs.writeFileSync('app/pages/admin/units.vue', units, 'utf8')
