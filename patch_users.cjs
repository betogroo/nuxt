const fs = require('fs')

let content = fs.readFileSync('app/pages/users.vue', 'utf8')

content = content.replace(
  /import type \{ ProfileRow \} from '~\/composables\/useUsers'/,
  "import type { ProfileRow } from '~/composables/useUsers'\n  import { useZodForm } from '~/composables/useZodForm'\n  import { adminUserEditSchema, adminUserCreateSchema, type AdminUserEditInput, type AdminUserCreateInput } from '~/schemas/forms/user'",
)

// EDIT FORM
content = content.replace(
  /const editingUser = ref<ProfileRow \| null>\(null\)/,
  `const editingUser = ref<ProfileRow | null>(null)\n  const { errors: editErrors, defineField: defineEditField, handleSubmit: handleEditSubmit, resetForm: resetEditForm } = useZodForm(adminUserEditSchema, { id: '', name: '', role: 'user', is_active: true })\n\n  const [editName, editNameProps] = defineEditField('name')\n  const [editRole, editRoleProps] = defineEditField('role')\n  const [editIsActive, editIsActiveProps] = defineEditField('is_active')`,
)

content = content.replace(
  /editingUser\.value = \{ \.\.\.user \}/,
  `editingUser.value = { ...user }\n    resetEditForm({ values: { id: user.id, name: user.name, role: user.role as any, is_active: user.is_active } })`,
)

const saveUserRegex =
  /const saveUser = async \(\) => \{[\s\S]*?try \{[\s\S]*?\} finally \{[\s\S]*?\}\n {2}\}/
content = content.replace(
  saveUserRegex,
  `const saveUser = handleEditSubmit(async (values: AdminUserEditInput) => {
    if (!editingUser.value) return
    isSaving.value = true
    saveError.value = ''

    try {
      await updateUser(values.id, {
        name: values.name,
        role: values.role,
        is_active: values.is_active,
      })

      await logAction(
        'ADMIN_UPDATE_USER',
        \`Administrador atualizou o usuário: \${values.id}\`,
        loggedProfile.value?.id,
      )
      await refresh()
      closeEditModal()
    } catch (e: unknown) {
      saveError.value = e instanceof Error ? e.message : String(e)
    } finally {
      isSaving.value = false
    }
  })`,
)

// CREATE FORM
const createFormStateRegex =
  /const defaultNewUserForm = \{[\s\S]*?const newUserForm = ref\(\{ \.\.\.defaultNewUserForm \}\)/
content = content.replace(
  createFormStateRegex,
  `const { errors: createErrors, defineField: defineCreateField, handleSubmit: handleCreateSubmit, resetForm: resetCreateForm } = useZodForm(adminUserCreateSchema, { name: '', email: '', password: '', role: 'user' })\n\n  const [createName, createNameProps] = defineCreateField('name')\n  const [createEmail, createEmailProps] = defineCreateField('email')\n  const [createPassword, createPasswordProps] = defineCreateField('password')\n  const [createRole, createRoleProps] = defineCreateField('role')`,
)

content = content.replace(
  /newUserForm\.value = \{ \.\.\.defaultNewUserForm \}/,
  `resetCreateForm({ values: { name: '', email: '', password: '', role: 'user' } })`,
)

const createUserRegex =
  /const createUser = async \(\) => \{[\s\S]*?try \{[\s\S]*?\} finally \{[\s\S]*?\}\n {2}\}/
content = content.replace(
  createUserRegex,
  `const createUser = handleCreateSubmit(async (values: AdminUserCreateInput) => {
    isCreating.value = true
    createError.value = ''

    try {
      await $fetch('/api/admin/users', {
        method: 'POST',
        body: values,
      })

      await logAction(
        'ADMIN_CREATE_USER',
        \`Administrador criou novo usuário: \${values.email}\`,
        loggedProfile.value?.id,
      )

      await refresh()
      closeAddModal()
    } catch (err: unknown) {
      const fetchErr = err as { data?: { statusMessage?: string }; message?: string }
      createError.value = fetchErr.data?.statusMessage || fetchErr.message || 'Erro ao criar usuário'
    } finally {
      isCreating.value = false
    }
  })`,
)

// Template EDIT
content = content.replace(
  /<UiInput\s+v-model="editingUser\.name"/,
  '<UiInput v-model="editName" v-bind="editNameProps" :error-messages="editErrors.name"',
)
content = content.replace(
  /<UiSelect\s+v-model="editingUser\.role"/,
  '<UiSelect v-model="editRole" v-bind="editRoleProps" :error-messages="editErrors.role"',
)
content = content.replace(
  /<UiSwitch\s+v-model="editingUser\.is_active"/,
  '<UiSwitch v-model="editIsActive" v-bind="editIsActiveProps" :error-messages="editErrors.is_active"',
)

// Template CREATE
content = content.replace(
  /<UiInput\s+v-model="newUserForm\.name"/,
  '<UiInput v-model="createName" v-bind="createNameProps" :error-messages="createErrors.name"',
)
content = content.replace(
  /<UiInput\s+v-model="newUserForm\.email"/,
  '<UiInput v-model="createEmail" v-bind="createEmailProps" :error-messages="createErrors.email"',
)
content = content.replace(
  /<UiInput\s+v-model="newUserForm\.password"/,
  '<UiInput v-model="createPassword" v-bind="createPasswordProps" :error-messages="createErrors.password"',
)
content = content.replace(
  /<UiSelect\s+v-model="newUserForm\.role"/,
  '<UiSelect v-model="createRole" v-bind="createRoleProps" :error-messages="createErrors.role"',
)

fs.writeFileSync('app/pages/users.vue', content, 'utf8')
console.log('Users page patched')
