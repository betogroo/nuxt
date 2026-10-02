<script setup lang="ts">
  definePageMeta({ layout: 'auth' })
  const { user, signUp: register, getRedirectUrl } = useAuth()
  const email = ref('')
  const password = ref('')
  const loading = ref(false)
  const message = ref('')
  useHead({ title: 'Registrar' })

  // Redireciona se já estiver logado
  watchEffect(() => {
    if (user.value) {
      navigateTo(getRedirectUrl(), { replace: true })
    }
  })

  const signUp = async () => {
    loading.value = true
    message.value = ''

    const { data, error } = await register(
      email.value,
      password.value,
      `${window.location.origin}/confirm`,
    )

    if (error) {
      message.value = error.message
    } else if (data.session) {
      // Ambiente local: confirmação de e-mail desligada, session existe → login automático
      return navigateTo(getRedirectUrl(), { replace: true })
    } else {
      // Produção: confirmação de e-mail ligada, usuário precisa clicar no link
      message.value = 'Cadastro bem-sucedido! Verifique seu e-mail para confirmar.'
    }
    loading.value = false
  }
</script>

<template>
  <UiCard class="w-100" rounded="xl">
    <template #header>
      <UiIcon class="mr-2" color="primary" name="addUser" />
      Criar sua conta
    </template>

    <UiAlert v-if="message" class="mb-4" type="info">{{ message }}</UiAlert>

    <UiInput v-model="email" label="E-mail" prepend-inner-icon="mdi-email-outline" type="email" />
    <UiInput
      v-model="password"
      label="Senha"
      prepend-inner-icon="mdi-lock-outline"
      type="password"
      @keyup.enter="signUp"
    />

    <UiButton
      block
      color="primary"
      :loading="loading"
      rounded="lg"
      size="large"
      variant="flat"
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
