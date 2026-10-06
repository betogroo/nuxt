const fs = require('fs')

let content = fs.readFileSync('app/pages/profile.vue', 'utf8')

content = content.replace(
  /const \{ profile, updateProfile \} = useProfile\(\)/,
  "const { profile, updateProfile } = useProfile()\n  import { useZodForm } from '~/composables/useZodForm'\n  import { profileFormSchema, type ProfileFormInput } from '~/schemas/forms/profile'",
)

content = content.replace(
  /const formData = ref\(\{[\s\n]*name: '',[\s\n]*avatar_url: '',[\s\n]*\}\)/,
  `const { errors, defineField, handleSubmit, resetForm } = useZodForm(profileFormSchema, { name: '', avatar_url: '' })\n  const [name, nameProps] = defineField('name')\n  const [avatarUrl, avatarUrlProps] = defineField('avatar_url')`,
)

content = content.replace(
  /formData\.value\.name = profile\.value\.name \|\| ''\n\s*formData\.value\.avatar_url = profile\.value\.avatar_url \|\| ''/,
  `resetForm({ values: { name: profile.value.name || '', avatar_url: profile.value.avatar_url || '' } })`,
)

const saveProfileRegex =
  /const saveProfile = async \(\) => \{[\s\S]*?try \{[\s\S]*?\} finally \{[\s\S]*?\}\n {2}\}/
content = content.replace(
  saveProfileRegex,
  `const saveProfile = handleSubmit(async (values: ProfileFormInput) => {
    if (!profile.value) return
    isSaving.value = true
    saveMessage.value = ''
    saveError.value = ''

    try {
      await updateProfile({
        name: values.name,
        avatar_url: values.avatar_url,
      })
      saveMessage.value = 'Perfil atualizado com sucesso!'
      await logAction('UPDATE_PROFILE', 'O usuário atualizou seus dados de perfil.', user.value?.id)
    } catch (error: unknown) {
      saveError.value = 'Erro ao salvar o perfil: ' + (error instanceof Error ? error.message : String(error))
    } finally {
      isSaving.value = false
    }
  })`,
)

// Template replacements
content = content.replace(/<UiImg v-if="formData\.avatar_url"/, '<UiImg v-if="avatarUrl"')
content = content.replace(/:src="formData\.avatar_url"/, ':src="avatarUrl"')

content = content.replace(
  /<UiInput\s+v-model="formData\.name"/,
  '<UiInput v-model="name" v-bind="nameProps" :error-messages="errors.name"',
)
content = content.replace(
  /<UiInput\s+v-model="formData\.avatar_url"/,
  '<UiInput v-model="avatarUrl" v-bind="avatarUrlProps" :error-messages="errors.avatar_url"',
)

fs.writeFileSync('app/pages/profile.vue', content, 'utf8')
console.log('Profile page patched')
