<script setup lang="ts">
  import { ref, computed, watch, onUnmounted } from 'vue'
  import { useZodForm } from '~/composables/useZodForm'
  import { profileFormSchema, type ProfileFormInput } from '~/schemas/forms/profile'
  import UiFileInput from '~/components/ui/UiFileInput.vue'

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
  const { profile, updateProfile, uploadAvatar, removeAvatar } = useProfile()
  const { logAction } = useLogger()

  const isSaving = ref(false)
  const saveMessage = ref('')
  const saveError = ref('')

  // Avatar local file state
  const selectedFile = ref<File | null>(null)
  const previewUrl = ref('')
  const fileError = ref('')
  const isPhotoRemoved = ref(false)

  // Campos do formulário clonados do perfil
  const { errors, defineField, handleSubmit, resetForm } = useZodForm(profileFormSchema, {
    name: '',
    avatar_url: '',
  })
  const [name, nameProps] = defineField('name')
  const [avatarUrl] = defineField('avatar_url')

  watch(
    () => profile.value,
    (newProfile) => {
      if (newProfile) {
        resetForm({
          values: { name: newProfile.name || '', avatar_url: newProfile.avatar_url || '' },
        })
        isPhotoRemoved.value = false
        selectedFile.value = null
        if (previewUrl.value) {
          URL.revokeObjectURL(previewUrl.value)
          previewUrl.value = ''
        }
      }
    },
    { immediate: true },
  )

  onUnmounted(() => {
    if (previewUrl.value) {
      URL.revokeObjectURL(previewUrl.value)
    }
  })

  const effectiveAvatarUrl = computed(() => {
    if (isPhotoRemoved.value) return ''
    if (previewUrl.value) return previewUrl.value
    return avatarUrl.value || ''
  })

  const onFileSelected = (val: File | File[] | null) => {
    const file = Array.isArray(val) ? val[0] : val
    fileError.value = ''

    if (file instanceof File) {
      const MAX_SIZE = 5 * 1024 * 1024
      if (file.size > MAX_SIZE) {
        fileError.value = 'A imagem selecionada deve ter no máximo 5MB.'
        return
      }

      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']
      if (!allowedTypes.includes(file.type)) {
        fileError.value = 'Formato inválido. Use imagens PNG, JPG, WEBP ou GIF.'
        return
      }

      if (previewUrl.value) {
        URL.revokeObjectURL(previewUrl.value)
      }

      selectedFile.value = file
      previewUrl.value = URL.createObjectURL(file)
      isPhotoRemoved.value = false
    } else {
      selectedFile.value = null
      if (previewUrl.value) {
        URL.revokeObjectURL(previewUrl.value)
        previewUrl.value = ''
      }
    }
  }

  const handleClearPhoto = () => {
    if (previewUrl.value) {
      URL.revokeObjectURL(previewUrl.value)
      previewUrl.value = ''
    }
    selectedFile.value = null
    isPhotoRemoved.value = true
    avatarUrl.value = ''
  }

  const saveProfile = handleSubmit(async (values: ProfileFormInput) => {
    if (!profile.value) return
    isSaving.value = true
    saveMessage.value = ''
    saveError.value = ''

    try {
      let finalAvatarUrl: string | null = values.avatar_url || null

      if (selectedFile.value) {
        finalAvatarUrl = await uploadAvatar(selectedFile.value)
      } else if (isPhotoRemoved.value) {
        await removeAvatar()
        finalAvatarUrl = null
      }

      await updateProfile({
        name: values.name,
        avatar_url: finalAvatarUrl,
      })

      selectedFile.value = null
      if (previewUrl.value) {
        URL.revokeObjectURL(previewUrl.value)
        previewUrl.value = ''
      }
      isPhotoRemoved.value = false

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
    'admin-election': 'Administrador de Eleições',
    'manager-election': 'Gestor de Eleições',
    'user-election': 'Eleitor',
  }

  const userInitial = computed(() => {
    const nameStr = name.value || profile.value?.name || user.value?.email || 'U'
    return nameStr.charAt(0).toUpperCase()
  })
</script>

<template>
  <div>
    <UiPageHeader subtitle="Gerencie suas informações de conta" title="Meu Perfil" />

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

          <!-- Avatar + Info do usuário com Ações de Foto -->
          <div
            class="d-flex flex-column flex-sm-row align-center ga-5 mb-6 pa-5 rounded-xl bg-surface-variant border"
          >
            <div class="position-relative">
              <UiAvatar color="primary" size="96" variant="soft">
                <UiImg
                  v-if="effectiveAvatarUrl"
                  :alt="profile?.name || 'Foto do perfil'"
                  class="rounded-circle"
                  cover
                  :src="effectiveAvatarUrl"
                />
                <span v-else class="text-h4 font-weight-bold">{{ userInitial }}</span>
              </UiAvatar>
            </div>

            <div class="flex-grow-1 text-center text-sm-left min-width-0">
              <div class="text-subtitle-1 font-weight-bold text-truncate">
                {{ profile?.name || 'Sem nome definido' }}
              </div>
              <div class="text-body-2 text-medium-emphasis text-truncate">{{ user?.email }}</div>
              <div class="d-flex align-center justify-center justify-sm-start ga-2 mt-2 flex-wrap">
                <UiChip v-if="profile?.role" color="primary" label size="xs" variant="soft">
                  {{ roleLabel[profile.role] || profile.role.toUpperCase() }}
                </UiChip>
                <UiChip v-if="selectedFile" color="success" label size="xs" variant="soft">
                  <UiIcon class="mr-1" name="check" size="12" />
                  Nova foto selecionada
                </UiChip>
                <UiChip v-else-if="isPhotoRemoved" color="warning" label size="xs" variant="soft">
                  Foto será removida
                </UiChip>
              </div>

              <!-- Ação de Limpeza da Foto -->
              <div
                v-if="effectiveAvatarUrl"
                class="d-flex align-center justify-center justify-sm-start ga-2 mt-3"
              >
                <UiButton
                  color="error"
                  prepend-icon="delete"
                  size="xs"
                  type="button"
                  variant="tonal"
                  @click="handleClearPhoto"
                >
                  Remover Foto
                </UiButton>
              </div>
            </div>
          </div>

          <UiForm @submit.prevent="saveProfile">
            <!-- Upload de Foto de Perfil (Supabase Storage) -->
            <div class="mb-4">
              <UiFileInput
                accept="image/png, image/jpeg, image/jpg, image/webp, image/gif"
                clearable
                :error-messages="fileError ? [fileError] : []"
                label="Alterar Foto de Perfil (Upload)"
                :model-value="selectedFile"
                placeholder="Selecione uma imagem do computador..."
                prepend-icon="upload"
                variant="outline"
                @update:model-value="onFileSelected"
              />
              <div class="text-caption text-medium-emphasis mt-1">
                Formatos aceitos: PNG, JPG, WEBP, GIF (Máx: 5MB). Armazenado de forma privada no
                Supabase Storage.
              </div>
            </div>

            <!-- Campos Editáveis -->
            <UiInput
              v-model="name"
              v-bind="nameProps"
              :error-messages="errors.name"
              label="Nome Completo"
              prepend-inner-icon="userOutline"
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
