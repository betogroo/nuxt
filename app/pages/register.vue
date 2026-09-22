<script setup lang="ts">
  definePageMeta({ layout: 'auth' })
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()
  const email = ref('')
  const password = ref('')
  const loading = ref(false)
  const message = ref('')
  useHead({ title: 'Registrar' })

  // Redireciona se já estiver logado
  watchEffect(() => {
    if (user.value) {
      navigateTo('/')
    }
  })

  const { logAction } = useLogger()

  const signUp = async () => {
    loading.value = true
    message.value = ''

    const { data, error } = await supabase.auth.signUp({
      email: email.value,
      password: password.value,
      options: {
        // Endereço de callback após o usuário clicar no link de confirmação
        emailRedirectTo: `${window.location.origin}/confirm`,
      },
    })

    if (error) {
      message.value = error.message
    } else if (data.session) {
      // Ambiente local: confirmação de e-mail desligada, session existe → login automático
      await logAction(
        'REGISTER',
        'Novo usuário registrado no sistema (login automático)',
        data.session.user.id,
      )
      return navigateTo('/')
    } else {
      // Produção: confirmação de e-mail ligada, usuário precisa clicar no link
      message.value = 'Cadastro bem-sucedido! Verifique seu e-mail para confirmar.'
    }
    loading.value = false
  }
</script>

<template>
  <v-container class="fill-height">
    <v-row justify="center">
      <v-col cols="12" md="5" sm="8">
        <UiCard title="Registrar" transparent-header>
          <v-alert v-if="message" class="mb-4" type="info">{{ message }}</v-alert>

          <UiInput v-model="email" label="E-mail" type="email" />
          <UiInput v-model="password" label="Senha" type="password" />

          <UiButton block color="primary" :loading="loading" @click="signUp"> Registrar </UiButton>
        </UiCard>

        <p class="text-center mt-4">
          Já tem uma conta?
          <NuxtLink to="/login">Entrar</NuxtLink>
        </p>
      </v-col>
    </v-row>
  </v-container>
</template>
