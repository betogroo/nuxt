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
      await logAction('UPDATE_PROFILE', 'O usuário atualizou seus dados de perfil.', user.value?.id)
      await fetchProfile() // Sincroniza a memória global novamente
    }
    isSaving.value = false
  }
</script>

<template>
  <div class="mx-auto" style="max-width: 600px">
    <PageHeader subtitle="Gerencie suas informações de conta" title="Meu Perfil" />

    <UiCard class="mt-4" transparent-header>
      <!-- Avatar Preview -->
      <div class="d-flex flex-column align-center mb-6 mt-4">
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
        <UiInput v-model="formData.name" label="Nome Completo" prepend-inner-icon="mdi-account" />

        <UiInput
          v-model="formData.avatar_url"
          class="mb-5"
          hint="Cole um link direto para uma imagem"
          label="URL da Foto (Avatar)"
          persistent-hint
          prepend-inner-icon="mdi-link"
        />

        <!-- Campos Somente Leitura -->
        <v-divider class="mb-5" />
        <h3 class="text-subtitle-2 mb-3 text-grey-darken-1">
          Informações da Conta (Somente leitura)
        </h3>

        <UiInput
          disabled
          label="E-mail"
          :model-value="user?.email"
          prepend-inner-icon="mdi-email"
          readonly
        />

        <div class="d-flex gap-4">
          <UiInput
            class="mr-2"
            disabled
            label="Cargo (Role)"
            :model-value="profile?.role?.toUpperCase()"
            prepend-inner-icon="mdi-shield-account"
            readonly
          />

          <UiInput
            class="ml-2"
            disabled
            label="Membro Desde"
            :model-value="
              profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : ''
            "
            prepend-inner-icon="mdi-calendar"
            readonly
          />
        </div>

        <div class="d-flex justify-end mt-4">
          <UiButton
            color="primary"
            :loading="isSaving"
            prepend-icon="mdi-content-save"
            size="large"
            type="submit"
          >
            Salvar Alterações
          </UiButton>
        </div>
      </v-form>
    </UiCard>
  </div>
</template>
