const fs = require('fs')
const path = require('path')

const files = [
  path.join(__dirname, 'app/pages/admin/expense-natures.vue'),
  path.join(__dirname, 'app/pages/admin/product-classes.vue'),
  path.join(__dirname, 'app/pages/admin/units.vue'),
]

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8')

  // Replace destructured form
  content = content.replace(
    /saveError,\s*form,\s*openAddModal/g,
    'saveError,\n    saveErrors,\n    defineSaveField,\n    openAddModal',
  )
  content = content.replace(/saveItem: ([a-zA-Z]+),/g, 'submitSaveForm: $1,')

  content = content.replace(
    /resolveError,\s*resolveMode,\s*targetPendingItem/g,
    'resolveError,\n    resolveErrors,\n    defineResolveField,\n    targetPendingItem',
  )
  content = content.replace(
    /resolveForm,\s*openResolveModal/g,
    'rawResolveValues: resolveForm,\n    openResolveModal',
  )
  content = content.replace(/executeResolve: ([a-zA-Z]+),/g, 'submitResolveForm: $1,')

  // Insert defineFields after useAdminCrud call
  const defFields = `\n  const [id, idProps] = defineSaveField('id')\n  const [name, nameProps] = defineSaveField('name')\n  const [isActive, isActiveProps] = defineSaveField('is_active')\n\n  const [resolveMode, resolveModeProps] = defineResolveField('resolveMode')\n  const [newName, newNameProps] = defineResolveField('newName')\n  const [finalNatureId, finalNatureIdProps] = defineResolveField('finalNatureId')\n  const [finalClassId, finalClassIdProps] = defineResolveField('finalClassId')\n  const [finalTargetId, finalTargetIdProps] = defineResolveField('finalTargetId')\n\n  const { currentPage, totalPages } = pagination`

  content = content.replace(/\s*const \{ currentPage, totalPages \} = pagination/, defFields)

  // Replace form.id with id, etc. in template
  content = content.replace(
    /v-model="form\.id"/g,
    'v-model="id" v-bind="idProps" :error-messages="saveErrors.id"',
  )
  content = content.replace(
    /v-model="form\.name"/g,
    'v-model="name" v-bind="nameProps" :error-messages="saveErrors.name"',
  )
  content = content.replace(
    /v-model="form\.is_active"/g,
    'v-model="isActive" v-bind="isActiveProps" :error-messages="saveErrors.is_active"',
  )

  // Replace resolve fields
  content = content.replace(
    /v-model="resolveMode"/g,
    'v-model="resolveMode" v-bind="resolveModeProps" :error-messages="resolveErrors.resolveMode"',
  )
  content = content.replace(
    /v-model="resolveForm\.newName"/g,
    'v-model="newName" v-bind="newNameProps" :error-messages="resolveErrors.newName"',
  )
  content = content.replace(
    /v-model="resolveForm\.finalNatureId"/g,
    'v-model="finalNatureId" v-bind="finalNatureIdProps" :error-messages="resolveErrors.finalTargetId"',
  )
  content = content.replace(
    /v-model="resolveForm\.finalClassId"/g,
    'v-model="finalClassId" v-bind="finalClassIdProps" :error-messages="resolveErrors.finalTargetId"',
  )
  content = content.replace(
    /v-model="resolveForm\.finalTargetId"/g,
    'v-model="finalTargetId" v-bind="finalTargetIdProps" :error-messages="resolveErrors.finalTargetId"',
  )

  fs.writeFileSync(file, content, 'utf8')
}
console.log('Replaced successfully.')
