<script setup lang="ts">
  useHead({ title: 'Meu Perfil' })

  // Proteção básica: apenas usuários logados
  definePageMeta({
    icon: 'mdi-account-circle-outline',
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
  const formData = ref({
    name: '',
    avatar_url: '',
  })

  // Quando a página carrega, preenchemos o formulário com os dados atuais
  watchEffect(() => {
    if (profile.value) {
      formData.value.name = profile.value.name || ''
      formData.value.avatar_url = profile.value.avatar_url || ''
    }
  })

  const { logAction } = useLogger()

  const saveProfile = async () => {
    if (!profile.value) return
    isSaving.value = true
    saveMessage.value = ''
    saveError.value = ''

    try {
      await updateProfile({
        name: formData.value.name,
        avatar_url: formData.value.avatar_url,
      })
      saveMessage.value = 'Perfil atualizado com sucesso!'
      await logAction('UPDATE_PROFILE', 'O usuário atualizou seus dados de perfil.', user.value?.id)
    } catch (error: unknown) {
      saveError.value =
        'Erro ao salvar o perfil: ' + (error instanceof Error ? error.message : String(error))
    } finally {
      isSaving.value = false
    }
  }

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

    <v-row justify="center">
      <v-col cols="12" lg="6" md="8">
        <UiCard>
          <template #header>
            <v-icon class="mr-2" color="primary" icon="mdi-account-circle-outline" />
            Informações Pessoais
          </template>

          <UiAlert v-if="saveMessage" class="mb-5" closable type="success" variant="tonal">
            {{ saveMessage }}
          </UiAlert>

          <UiAlert v-if="saveError" class="mb-5" closable type="error" variant="tonal">
            {{ saveError }}
          </UiAlert>

          <!-- Avatar + Info do usuário -->
          <div class="d-flex align-center gap-5 mb-6 pa-4 rounded-xl bg-surface-variant">
            <v-avatar color="primary" size="80" variant="tonal">
              <v-img v-if="formData.avatar_url" :src="formData.avatar_url" />
              <span v-else class="text-h5 font-weight-bold">{{ userInitial }}</span>
            </v-avatar>
            <div>
              <div class="text-subtitle-1 font-weight-bold">
                {{ profile?.name || 'Sem nome definido' }}
              </div>
              <div class="text-body-2 text-medium-emphasis">{{ user?.email }}</div>
              <v-chip
                v-if="profile?.role"
                class="mt-2"
                color="primary"
                label
                size="x-small"
                variant="tonal"
              >
                {{ roleLabel[profile.role] || profile.role.toUpperCase() }}
              </v-chip>
            </div>
          </div>

          <v-form @submit.prevent="saveProfile">
            <!-- Campos Editáveis -->
            <UiInput
              v-model="formData.name"
              label="Nome Completo"
              prepend-inner-icon="mdi-account-outline"
            />

            <UiInput
              v-model="formData.avatar_url"
              hint="Cole um link direto para uma imagem (ex: URL do Gravatar)"
              label="URL da Foto (Avatar)"
              persistent-hint
              prepend-inner-icon="mdi-link-variant"
            />

            <!-- Campos Somente Leitura -->
            <v-divider class="my-5" />
            <div class="text-caption text-medium-emphasis font-weight-bold text-uppercase mb-3">
              Informações da Conta (somente leitura)
            </div>

            <UiInput
              disabled
              label="E-mail"
              :model-value="user?.email"
              prepend-inner-icon="mdi-email-outline"
              readonly
            />

            <v-row>
              <v-col cols="12" sm="6">
                <UiInput
                  disabled
                  label="Cargo (Role)"
                  :model-value="
                    profile?.role ? roleLabel[profile.role] || profile.role.toUpperCase() : ''
                  "
                  prepend-inner-icon="mdi-shield-account-outline"
                  readonly
                />
              </v-col>
              <v-col cols="12" sm="6">
                <UiInput
                  disabled
                  label="Membro Desde"
                  :model-value="
                    profile?.created_at
                      ? new Date(profile.created_at).toLocaleDateString('pt-BR')
                      : ''
                  "
                  prepend-inner-icon="mdi-calendar-outline"
                  readonly
                />
              </v-col>
            </v-row>

            <div class="d-flex justify-end mt-2">
              <UiButton
                color="primary"
                :loading="isSaving"
                prepend-icon="mdi-content-save-outline"
                size="large"
                type="submit"
                variant="flat"
              >
                Salvar Alterações
              </UiButton>
            </div>
          </v-form>
        </UiCard>
      </v-col>
    </v-row>
  </div>
</template>
