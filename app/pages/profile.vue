<script setup lang="ts">
  import { useZodForm } from '~/composables/useZodForm'
  import { profileFormSchema, type ProfileFormInput } from '~/schemas/forms/profile'
  useHead({ title: 'Meu Perfil' })

  // Proteção básica: apenas usuários logados
  definePageMeta({
    icon: 'userProfile',
    middleware: [
      function () {
        const { user } = useAuth()
        if (!user.value) return navigateTo('/login')
      },
    ],
  })

  const { user } = useAuth()
  const { profile, updateProfile } = useProfile()

  const isSaving = ref(false)
  const saveMessage = ref('')
  const saveError = ref('')

  // Campos do formulário clonados do perfil
  const { errors, defineField, handleSubmit, resetForm } = useZodForm(profileFormSchema, {
    name: '',
    avatar_url: '',
  })
  const [name, nameProps] = defineField('name')
  const [avatarUrl, avatarUrlProps] = defineField('avatar_url')

  // Quando a página carrega, preenchemos o formulário com os dados atuais
  watch(
    () => profile.value,
    (newProfile) => {
      if (newProfile) {
        resetForm({
          values: { name: newProfile.name || '', avatar_url: newProfile.avatar_url || '' },
        })
      }
    },
    { immediate: true },
  )

  const { logAction } = useLogger()

  const saveProfile = handleSubmit(async (values: ProfileFormInput) => {
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
      saveError.value =
        'Erro ao salvar o perfil: ' + (error instanceof Error ? error.message : String(error))
    } finally {
      isSaving.value = false
    }
  })

  const roleLabel: Record<string, string> = {
    admin: 'Administrador',
    uge: 'UGE',
    iirgd: 'IIRGD',
    user: 'Usuário',
  }

  const userInitial = computed(() => {
    const name = profile.value?.name || user.value?.email || 'U'
    return name.charAt(0).toUpperCase()
  })
</script>

<template>
  <div>
    <PageHeader subtitle="Gerencie suas informações de conta" title="Meu Perfil" />

    <UiRow justify="center">
      <UiCol cols="12" lg="6" md="8">
        <UiCard>
          <template #header>
            <UiIcon class="mr-2" color="primary" name="userProfile" />
            Informações Pessoais
          </template>

          <UiAlert v-if="saveMessage" class="mb-5" closable type="success" variant="soft">
            {{ saveMessage }}
          </UiAlert>

          <UiAlert v-if="saveError" class="mb-5" closable type="error" variant="soft">
            {{ saveError }}
          </UiAlert>

          <!-- Avatar + Info do usuário -->
          <div class="d-flex align-center gap-5 mb-6 pa-4 rounded-xl bg-surface-variant">
            <UiAvatar color="primary" size="80" variant="tonal">
              <UiImg v-if="avatarUrl" :src="avatarUrl" />
              <span v-else class="text-h5 font-weight-bold">{{ userInitial }}</span>
            </UiAvatar>
            <div>
              <div class="text-subtitle-1 font-weight-bold">
                {{ profile?.name || 'Sem nome definido' }}
              </div>
              <div class="text-body-2 text-medium-emphasis">{{ user?.email }}</div>
              <UiChip
                v-if="profile?.role"
                class="mt-2"
                color="primary"
                label
                size="xs"
                variant="soft"
              >
                {{ roleLabel[profile.role] || profile.role.toUpperCase() }}
              </UiChip>
            </div>
          </div>

          <UiForm @submit.prevent="saveProfile">
            <!-- Campos Editáveis -->
            <UiInput
              v-model="name"
              v-bind="nameProps"
              :error-messages="errors.name"
              label="Nome Completo"
              prepend-inner-icon="userOutline"
            />

            <UiInput
              v-model="avatarUrl"
              v-bind="avatarUrlProps"
              :error-messages="errors.avatar_url"
              hint="Cole um link direto para uma imagem (ex: URL do Gravatar)"
              label="URL da Foto (Avatar)"
              persistent-hint
              prepend-inner-icon="link"
            />

            <!-- Campos Somente Leitura -->
            <UiDivider class="my-5" />
            <div class="text-caption text-medium-emphasis font-weight-bold text-uppercase mb-3">
              Informações da Conta (somente leitura)
            </div>

            <UiInput
              disabled
              label="E-mail"
              :model-value="user?.email"
              prepend-inner-icon="emailAlt"
              readonly
            />

            <UiRow>
              <UiCol cols="12" sm="6">
                <UiInput
                  disabled
                  label="Cargo (Role)"
                  :model-value="
                    profile?.role ? roleLabel[profile.role] || profile.role.toUpperCase() : ''
                  "
                  prepend-inner-icon="shieldUser"
                  readonly
                />
              </UiCol>
              <UiCol cols="12" sm="6">
                <UiInput
                  disabled
                  label="Membro Desde"
                  :model-value="
                    profile?.created_at
                      ? new Date(profile.created_at).toLocaleDateString('pt-BR')
                      : ''
                  "
                  prepend-inner-icon="calendarOutline"
                  readonly
                />
              </UiCol>
            </UiRow>

            <div class="d-flex justify-end mt-2">
              <UiButton
                color="primary"
                :loading="isSaving"
                prepend-icon="save"
                size="lg"
                type="submit"
                variant="solid"
              >
                Salvar Alterações
              </UiButton>
            </div>
          </UiForm>
        </UiCard>
      </UiCol>
    </UiRow>
  </div>
</template>
