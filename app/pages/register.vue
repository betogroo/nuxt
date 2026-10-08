<script setup lang="ts">
  import { useZodForm } from '~/composables/useZodForm'
  import { registerSchema } from '~/schemas/forms/auth'
  definePageMeta({ layout: 'auth' })
  const { user, signUp: register, getRedirectUrl } = useAuth()
  const loading = ref(false)
  const message = ref('')

  const { errors, defineField, handleSubmit } = useZodForm(registerSchema, {
    email: '',
    password: '',
  })
  const [email, emailProps] = defineField('email')
  const [password, passwordProps] = defineField('password')
  useHead({ title: 'Registrar' })

  // Redireciona se já estiver logado
  watchEffect(() => {
    if (user.value) {
      navigateTo(getRedirectUrl(), { replace: true })
    }
  })

  const signUp = handleSubmit(async (values) => {
    loading.value = true
    message.value = ''

    const { data, error } = await register(
      values.email,
      values.password,
      `${window.location.origin}/confirm`,
    )

    if (error) {
      message.value = error.message
    } else if (data.session) {
      return navigateTo(getRedirectUrl(), { replace: true })
    } else {
      message.value = 'Cadastro bem-sucedido! Verifique seu e-mail para confirmar.'
    }
    loading.value = false
  })
</script>

<template>
  <UiCard class="w-100" rounded="xl">
    <template #header>
      <UiIcon class="mr-2" color="primary" name="addUser" />
      Criar sua conta
    </template>

    <UiAlert v-if="message" class="mb-4" type="info">{{ message }}</UiAlert>

    <UiInput
      v-model="email"
      v-bind="emailProps"
      :error-messages="errors.email"
      label="E-mail"
      prepend-inner-icon="emailAlt"
      required
      type="email"
    />
    <UiInput
      v-model="password"
      v-bind="passwordProps"
      :error-messages="errors.password"
      label="Senha"
      prepend-inner-icon="lock"
      required
      type="password"
      @keyup.enter="signUp"
    />

    <UiButton
      block
      color="primary"
      :loading="loading"
      rounded="lg"
      size="lg"
      variant="solid"
      @click="signUp"
    >
      Criar Conta
    </UiButton>

    <p class="text-center text-body-2 text-medium-emphasis mt-5 mb-0">
      Já tem uma conta?
      <NuxtLink class="text-primary font-weight-medium text-decoration-none" to="/login">
        Entrar
      </NuxtLink>
    </p>
  </UiCard>
</template>
