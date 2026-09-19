<script setup lang="ts">
  import type { Database } from '~/types/database.types'

  useHead({ title: 'Meu Perfil' })

  // Proteção básica: apenas usuários logados
  definePageMeta({
    middleware: [
      function () {
        const user = useSupabaseUser()
        if (!user.value) return navigateTo('/login')
      },
    ],
  })

  const supabase = useSupabaseClient<Database>()
  const user = useSupabaseUser()
  const { profile, fetchProfile } = useProfile()

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

    const { error } = await supabase
      .from('profiles')
      .update({
        name: formData.value.name,
        avatar_url: formData.value.avatar_url,
        // Repare que NÃO enviamos a 'role'. O banco também rejeitaria graças ao RLS.
      })
      .eq('id', profile.value.id)

    if (error) {
      saveError.value = 'Erro ao salvar o perfil: ' + error.message
    } else {
      saveMessage.value = 'Perfil atualizado com sucesso!'
      await logAction('UPDATE_PROFILE', 'O usuário atualizou seus dados de perfil.')
      await fetchProfile() // Sincroniza a memória global novamente
    }
    isSaving.value = false
  }
</script>

<template>
  <v-container max-width="600">
    <v-card class="mt-4 elevation-2">
      <v-card-title class="pa-4 d-flex align-center">
        <v-icon class="mr-2">mdi-account-circle</v-icon>
        Configurações do Perfil
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-5">
        <!-- Avatar Preview -->
        <div class="d-flex flex-column align-center mb-6">
          <v-avatar class="mb-2" color="primary" size="100" variant="tonal">
            <v-img v-if="formData.avatar_url" :src="formData.avatar_url" />
            <v-icon v-else size="50">mdi-camera</v-icon>
          </v-avatar>
          <div class="text-caption text-grey">Sua foto de perfil</div>
        </div>

        <v-alert
          v-if="saveMessage"
          class="mb-4"
          closable
          density="compact"
          type="success"
          variant="tonal"
        >
          {{ saveMessage }}
        </v-alert>

        <v-alert
          v-if="saveError"
          class="mb-4"
          closable
          density="compact"
          type="error"
          variant="tonal"
        >
          {{ saveError }}
        </v-alert>

        <v-form @submit.prevent="saveProfile">
          <!-- Campos Editáveis -->
          <v-text-field
            v-model="formData.name"
            class="mb-3"
            density="comfortable"
            label="Nome Completo"
            prepend-inner-icon="mdi-account"
            variant="outlined"
          />

          <v-text-field
            v-model="formData.avatar_url"
            class="mb-5"
            density="comfortable"
            hint="Cole um link direto para uma imagem"
            label="URL da Foto (Avatar)"
            persistent-hint
            prepend-inner-icon="mdi-link"
            variant="outlined"
          />

          <!-- Campos Somente Leitura -->
          <v-divider class="mb-5" />
          <h3 class="text-subtitle-2 mb-3 text-grey-darken-1">
            Informações da Conta (Somente leitura)
          </h3>

          <v-text-field
            class="mb-3"
            density="comfortable"
            disabled
            label="E-mail"
            :model-value="user?.email"
            prepend-inner-icon="mdi-email"
            readonly
            variant="outlined"
          />

          <div class="d-flex gap-4">
            <v-text-field
              class="mr-2"
              density="comfortable"
              disabled
              label="Cargo (Role)"
              :model-value="profile?.role?.toUpperCase()"
              prepend-inner-icon="mdi-shield-account"
              readonly
              variant="outlined"
            />

            <v-text-field
              class="ml-2"
              density="comfortable"
              disabled
              label="Membro Desde"
              :model-value="
                profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : ''
              "
              prepend-inner-icon="mdi-calendar"
              readonly
              variant="outlined"
            />
          </div>

          <div class="d-flex justify-end mt-4">
            <v-btn
              color="primary"
              :loading="isSaving"
              prepend-icon="mdi-content-save"
              size="large"
              type="submit"
              variant="flat"
            >
              Salvar Alterações
            </v-btn>
          </div>
        </v-form>
      </v-card-text>
    </v-card>
  </v-container>
</template>
